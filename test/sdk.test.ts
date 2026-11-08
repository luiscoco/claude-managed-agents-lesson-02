import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { LiveProvider } from "../src/server/lab.js";
import { BETA, DEFAULT_MODEL, V1, V2 } from "../src/shared/lesson.js";

test("official SDK uses management endpoints, expected versions, and real pagination", async () => {
  const calls: {
    path: string;
    query: string;
    method: string;
    body: Record<string, unknown>;
    beta: string | null;
  }[] = [];
  const base = {
    id: "agent-owned",
    name: V1.name,
    version: 1,
    model: { id: DEFAULT_MODEL },
    system: V1.system,
    description: V1.description,
    metadata: { team: V1.team },
    tools: [],
    mcp_servers: [],
    created_at: "2026-11-08T10:00:00Z",
    updated_at: "2026-11-08T10:00:00Z",
    archived_at: null,
  };
  const client = new Anthropic({
    apiKey: "test-placeholder",
    maxRetries: 0,
    fetch: async (input, init) => {
      const req = new Request(input, init),
        url = new URL(req.url),
        raw = req.method === "POST" ? await req.text() : "",
        body = JSON.parse(raw || "{}") as Record<string, unknown>;
      calls.push({
        path: url.pathname,
        query: url.search,
        method: req.method,
        body,
        beta: req.headers.get("anthropic-beta"),
      });
      if (req.method === "GET" && url.pathname === "/v1/agents")
        return Response.json(
          url.searchParams.get("page")
            ? { data: [base], next_page: null }
            : {
                data: [{ ...base, id: "unrelated-agent" }],
                next_page: "next-agents",
              },
        );
      if (url.pathname.endsWith("/versions"))
        return Response.json(
          url.searchParams.get("page")
            ? {
                data: [{ ...base, version: 2, system: V2.system }],
                next_page: null,
              }
            : { data: [base], next_page: "next-versions" },
        );
      if (url.pathname.endsWith("/archive"))
        return Response.json({ ...base, archived_at: "2026-11-08T10:30:00Z" });
      return Response.json({
        ...base,
        ...body,
        model: { id: DEFAULT_MODEL },
        version: body.version ? 2 : 1,
      });
    },
  });
  const p = new LiveProvider(client);
  const a = await p.create(V1);
  await p.retrieve(a.id);
  await p.update(a.id, V2, a.version);
  const list = await p.list(new Set([a.id]));
  assert.deepEqual(
    list.map((a) => a.id),
    [a.id],
  );
  const history = await p.versions(a.id);
  assert.deepEqual(
    history.map((a) => a.version),
    [1, 2],
  );
  await p.archive(a.id);
  assert.ok(calls.every((c) => c.beta?.includes(BETA)));
  assert.ok(calls.every((c) => c.path.startsWith("/v1/agents")));
  assert.equal(
    calls.find(
      (c) => c.path === "/v1/agents/agent-owned" && c.method === "POST",
    )!.body.version,
    1,
  );
  assert.ok(calls.some((c) => c.query.includes("page=next-agents")));
  assert.ok(calls.some((c) => c.query.includes("page=next-versions")));
  assert.equal(calls[0].body.model, DEFAULT_MODEL);
  assert.deepEqual(calls[0].body.tools, []);
});
