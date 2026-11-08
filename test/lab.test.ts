import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DemoProvider,
  Lab,
  LabError,
  validateDraft,
} from "../src/server/lab.js";
import { V1, V2 } from "../src/shared/lesson.js";

test("same ID, changed version, immutable history, and no-op semantics", async () => {
  const lab = new Lab({ demo: new DemoProvider() });
  let state = await lab.perform("demo", "create", { draft: V1 });
  const id = state.selectedId;
  assert.equal(state.agents[0].version, 1);
  state = await lab.perform("demo", "update", {
    agentId: id,
    draft: V2,
    version: 1,
  });
  assert.equal(state.agents[0].id, id);
  assert.equal(state.agents[0].version, 2);
  state = await lab.perform("demo", "update", {
    agentId: id,
    draft: V2,
    version: 2,
  });
  assert.equal(state.agents[0].version, 2);
  state = await lab.perform("demo", "versions", { agentId: id });
  assert.equal(state.histories[id].length, 2);
  assert.equal(state.histories[id][0].system, V1.system);
  assert.equal(state.histories[id][1].system, V2.system);
});
test("a stale expected version cannot overwrite the current definition", async () => {
  const lab = new Lab({ demo: new DemoProvider() });
  const s = await lab.perform("demo", "create", { draft: V1 });
  const id = s.selectedId;
  await lab.perform("demo", "update", { agentId: id, draft: V2, version: 1 });
  await assert.rejects(
    () => lab.perform("demo", "update", { agentId: id, draft: V1, version: 1 }),
    (e: unknown) => e instanceof LabError && e.status === 409,
  );
  assert.equal(s.agents[0].system, V2.system);
  assert.equal(s.traces[0].status, "error");
});
test("archival requires an exact name and leaves historical revisions inspectable", async () => {
  const lab = new Lab({ demo: new DemoProvider() });
  const s = await lab.perform("demo", "create", { draft: V1 });
  const id = s.selectedId;
  await assert.rejects(
    () => lab.perform("demo", "archive", { agentId: id, confirmName: "wrong" }),
    /exact agent name/,
  );
  await lab.perform("demo", "archive", { agentId: id, confirmName: V1.name });
  assert.ok(s.agents[0].archived_at);
  await assert.rejects(
    () => lab.perform("demo", "update", { agentId: id, draft: V2, version: 1 }),
    /read-only/,
  );
  await lab.perform("demo", "versions", { agentId: id });
  assert.equal(s.histories[id].length, 1);
  await lab.perform("demo", "list", {});
  assert.equal(s.agents.length, 1);
  assert.ok(s.agents[0].archived_at);
});
test("ownership and mode boundaries reject arbitrary external agent IDs", async () => {
  const lab = new Lab({ demo: new DemoProvider(), live: new DemoProvider() });
  const s = await lab.perform("demo", "create", { draft: V1 });
  await assert.rejects(
    () =>
      lab.perform("live", "archive", {
        agentId: s.selectedId,
        confirmName: V1.name,
      }),
    /created by this lab/,
  );
  await assert.rejects(
    () => lab.perform("demo", "retrieve", { agentId: "external-agent" }),
    /created by this lab/,
  );
});
test("server validates fields and expected versions before updating", async () => {
  assert.throws(() => validateDraft({ ...V1, system: "" }), /system/);
  assert.throws(() => validateDraft({ ...V1, name: "a".repeat(121) }), /name/);
  const lab = new Lab({ demo: new DemoProvider() });
  const s = await lab.perform("demo", "create", { draft: V1 });
  await assert.rejects(
    () =>
      lab.perform("demo", "update", {
        agentId: s.selectedId,
        draft: V2,
        version: 0,
      }),
    /version you retrieved/,
  );
  await assert.rejects(
    () => new Lab({}).perform("live", "create", { draft: V1 }),
    /ANTHROPIC_API_KEY/,
  );
});
test("only live ownership IDs are persisted and restored across host restarts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lesson02-test-")),
    p = new DemoProvider();
  try {
    const lab = new Lab({ live: p }, dir);
    const state = await lab.perform("live", "create", { draft: V1 });
    const id = state.selectedId;
    const saved = JSON.parse(await readFile(join(dir, "agents.json"), "utf8"));
    assert.deepEqual(saved, { ids: [id] });
    const restored = new Lab({ live: p }, dir);
    await restored.load();
    assert.equal(restored.states.live.knownCount, 1);
    await restored.perform("live", "list", {});
    assert.equal(restored.states.live.agents[0].id, id);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("overlapping mutations are rejected until the first operation completes", async () => {
  const p = new DemoProvider(),
    original = p.create.bind(p);
  let release!: () => void;
  p.create = async (draft) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return original(draft);
  };
  const lab = new Lab({ demo: p });
  const first = lab.perform("demo", "create", { draft: V1 });
  await assert.rejects(
    () => lab.perform("demo", "create", { draft: V1 }),
    /in progress/,
  );
  release();
  await first;
  assert.equal(lab.states.demo.agents.length, 1);
});
