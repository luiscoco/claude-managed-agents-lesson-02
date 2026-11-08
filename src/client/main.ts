import "./style.css";
import {
  createCodeBlock,
  highlightCodeElements,
  renderResponse,
} from "./formatting.js";
import { createWorkflowGuide } from "./workflow.js";
import exampleCode from "../examples/agent-lifecycle.ts?raw";
import {
  BETA,
  SDK_VERSION,
  V1,
  V2,
  METHODS,
  FIELDS,
  QUESTIONS,
  type Action,
  type AgentSnapshot,
  type Draft,
  type LabState,
  type Mode,
} from "../shared/lesson.js";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.querySelector("#app")!.innerHTML = `
<a class="skip" href="#main">Skip to lesson</a><header class="top"><a class="brand" href="/" aria-label="Agent Version Lab home"><span class="brand-mark">&lt;/&gt;</span><span>Claude Managed Agents<small>Practical course · Lesson 02</small></span></a><div class="header-actions"><span class="badge">TypeScript SDK ${SDK_VERSION}</span><a class="source" href="https://github.com/luiscoco/claude-managed-agents-lesson-02" target="_blank" rel="noreferrer">Source ↗</a><div class="size" role="group" aria-label="Text size"><button id="comfortable" aria-pressed="true">Comfortable</button><button id="larger" aria-pressed="false">Larger</button></div></div></header>
<main id="main" class="container"><section class="hero"><div><p class="eyebrow">LESSON 02 / AGENTS & VERSIONS</p><h1>One agent.<br><em>A history of better ideas.</em></h1><p class="intro">Improve a course-support assistant. Create its reusable definition, revise its instructions, and see exactly what changed between versions.</p><div class="chips"><span>① Define</span><span>② Inspect</span><span>③ Revise</span><span>④ Compare</span></div></div><figure class="mascot"><img src="/course-astronaut.png" width="220" height="287" alt="Course astronaut mascot"><figcaption>A stable identity.<br>A visible version history.</figcaption></figure></section>
<details class="focus"><summary>Lesson focus & author <span>What you will learn</span></summary><div><p><strong>By the end:</strong> explain reusable agent fields; create, retrieve, update, list, and inspect versions; distinguish a no-op from a new version; and understand terminal archival.</p><p>Practical application by <strong>Luis Coco Enríquez</strong>. This companion to Lesson 2 uses the official Anthropic SDK’s Claude Managed Agents API.</p></div></details>
<nav class="tabs" role="tablist" aria-label="Lesson activities"><button role="tab" id="tab-lab" aria-controls="panel-lab" aria-selected="true">01 · Version lab</button><button role="tab" id="tab-map" aria-controls="panel-map" aria-selected="false" tabindex="-1">02 · API & fields</button><button role="tab" id="tab-how" aria-controls="panel-how" aria-selected="false" tabindex="-1">03 · How it works</button><button role="tab" id="tab-quiz" aria-controls="panel-quiz" aria-selected="false" tabindex="-1">04 · Check understanding</button></nav>
<section role="tabpanel" id="panel-lab" aria-labelledby="tab-lab"><div class="section-heading"><div><p class="eyebrow">THE PRACTICAL EXAMPLE</p><h2>Release a better support definition.</h2><p>The first instructions are concise. The revision adds a clarifying question, numbered steps, and an exercise.</p></div><span class="lesson-number">02</span></div><div class="flow">${[
  ["create", "Create", "Reusable agent · v1"],
  ["inspect", "Inspect", "Read fields + version"],
  ["update", "Revise", "Same ID · new version"],
  ["compare", "Compare", "History + field differences"],
]
  .map(
    ([id, title, desc], i) =>
      `<div id="stage-${id}" class="flow-card"><span>${i + 1}</span><strong>${title}</strong><small>${desc}</small></div>`,
  )
  .join("")}</div>
<div class="workspace"><aside class="panel controls"><h3>Manage the support agent</h3><label for="mode">Execution mode</label><select id="mode"><option value="demo">Guided demo · simulated API</option><option value="live" disabled>Live · checking configuration…</option></select><p id="mode-note" class="note">A local simulation of agent management. No AI calls or cloud resources. You can edit the definition and explore its version history.</p><button id="walkthrough" class="primary">▶ Run guided walkthrough</button><p class="note">Creates v1 → retrieves it → revises to v2 → lists agents and history. It never archives an agent.</p><details class="manual"><summary>Or manage the definition manually</summary><div class="button-stack"><button id="new-draft">Prepare a fresh definition</button><button id="create-agent">Create a new agent from these fields</button><button id="retrieve-agent">Retrieve latest configuration</button><button id="load-revision">Load suggested v2 instructions</button><button id="update-agent">Apply changes with version check</button><button id="list-agents">Refresh agent collection</button><button id="list-versions">Refresh version history</button></div></details><p id="editor-baseline" class="note"></p><label for="agent-name">Name</label><input id="agent-name" maxlength="120"><label for="agent-description">Description</label><textarea id="agent-description" rows="2" maxlength="500"></textarea><label for="agent-system">System instructions</label><textarea id="agent-system" rows="7" maxlength="4000"></textarea><label for="agent-team">Metadata · team</label><input id="agent-team" maxlength="64"><p class="note">Tools and MCP connections stay empty in this lab. The model is configured on the server.</p><p id="status" class="status" role="status">Ready to create and compare.</p></aside>
<div class="observations"><section class="panel resources"><div class="panel-heading"><h3>Watch identity and version</h3><span id="lifecycle" class="badge">Not created</span></div><dl><dt>Agent ID · stable identity</dt><dd id="agent-id">Not created yet</dd><dt>Current version · configuration revision</dt><dd id="agent-version">—</dd><dt>Configured model</dt><dd id="agent-model">Checking server configuration…</dd></dl><label for="agent-select">This lab’s agent collection</label><select id="agent-select"><option value="">No agents yet</option></select><p id="collection-note" class="note">Only agents created by this application are editable here.</p><details><summary>Inspect current configuration</summary><div id="current-json"></div></details></section><section class="panel timeline-panel"><div class="panel-heading"><h3>Management request timeline</h3><span id="trace-count" class="badge">0 operations</span></div><p class="note">These are application traces of API operations, not a session event stream.</p><ol id="timeline" class="timeline"></ol><p id="trace-empty" class="empty">Run the walkthrough to inspect requests and returned agent snapshots.</p></section></div></div>
<section class="panel version-comparison"><div class="panel-heading"><h3>Compare the versions</h3><span id="history-count" class="badge">0 versions</span></div><div class="comparison-controls"><div><label for="before-version">Before</label><select id="before-version"></select></div><span aria-hidden="true">→</span><div><label for="after-version">After</label><select id="after-version"></select></div></div><div id="changes"><p class="empty">Version snapshots will appear after the walkthrough.</p></div></section><section class="panel release-brief"><h3>Explain the release</h3><div id="release-brief"></div></section>
<details class="panel archive-panel"><summary>Retire an agent · permanent archival</summary><p>Archiving is irreversible. The definition becomes read-only, new sessions cannot reference it, and existing sessions continue. This action is separate from the walkthrough.</p><label for="archive-name">Type the selected agent’s exact name</label><input id="archive-name" autocomplete="off"><button id="archive-agent" class="danger">Permanently archive selected agent</button><p class="note">Only the selected agent registered by this lab can be archived here.</p></details><div class="teaching-callout"><strong>Try this next</strong><p>Apply the unchanged v2 fields again. Does the version increase? Then change one instruction and compare the next revision. An agent definition is configuration; none of these actions starts an AI conversation.</p></div></section>
<section role="tabpanel" id="panel-map" aria-labelledby="tab-map" hidden><div class="section-heading"><div><p class="eyebrow">METHODS, FIELDS & STATUS</p><h2>The agent management surface.</h2><p>Every card includes a highlighted TypeScript example. Expanding a card does not execute a request.</p></div></div><div id="method-grid" class="namespace-grid"></div><h2 class="fields-heading">Read the definition, field by field.</h2><div id="field-grid" class="namespace-grid"></div><div class="teaching-callout"><strong>Beta is a contract, not deprecation.</strong><p>This app pins SDK ${SDK_VERSION} and the core beta contract <code>${BETA}</code>. The SDK adds the header automatically. Verify release notes and installed types when upgrading. The slide’s general “execution policy” concept maps to specific tool, environment, and session fields; this app does not invent an agent-level policy field.</p></div></section>
<section role="tabpanel" id="panel-how" aria-labelledby="tab-how" hidden><div class="section-heading"><div><p class="eyebrow">TRACE THE RESPONSIBILITY</p><h2>Definition first. Execution later.</h2><p>Lesson 2 manages reusable configuration and history. A session and user input are needed to run the assistant.</p></div></div><div id="workflow-guide"></div><div class="two-columns"><article class="panel"><h3>1. Set up locally</h3><pre><code id="setup-code"></code></pre><p>Open <code>http://127.0.0.1:4322</code>. The demo works without credentials. For live management, set your own <code>ANTHROPIC_API_KEY</code> and restart the Node server.</p></article><article class="panel"><h3>2. Keep the boundaries clear</h3><ul><li><strong>Browser:</strong> editor, comparison, learning panels.</li><li><strong>Node:</strong> credentials, validation, ownership registry, official SDK.</li><li><strong>Managed Agents:</strong> definitions, revisions, lifecycle state.</li></ul><p>The live lab calls agent management endpoints only. It creates no environment, session, or model inference request.</p></article></div><article class="panel code-example"><h3>3. Read the complete TypeScript example</h3><p><code>src/examples/agent-lifecycle.ts</code> creates, retrieves, updates, lists, and reads history. It does not archive automatically.</p><pre><code id="example-code"></code></pre></article><div class="two-columns"><article class="panel"><h3>4. Update deliberately</h3><p>Read the current version, edit the instructions, and send the expected <code>version</code>. A conflict returns 409. Retrieve the new state and review the other change before retrying.</p><p>Unchanged fields are preserved when omitted. Arrays are replaced when supplied; metadata is merged by key. A no-op does not create a version.</p></article><article class="panel"><h3>5. Preserve identity, inspect history</h3><p>The ID names the reusable agent. The version names its configuration revision. In a future session, a pinned reference can select a specific revision:</p><div id="pin-code"></div><p>Inspecting history does not automatically roll back an agent. Archival is a terminal lifecycle action, not a reset button.</p></article></div><p class="source-links">Official references: <a href="https://platform.claude.com/docs/en/managed-agents/agent-setup" target="_blank" rel="noreferrer">Agents & versions ↗</a> · <a href="https://github.com/anthropics/anthropic-sdk-typescript" target="_blank" rel="noreferrer">TypeScript SDK ↗</a></p></section>
<section role="tabpanel" id="panel-quiz" aria-labelledby="tab-quiz" hidden><div class="section-heading"><div><p class="eyebrow">RETRIEVE, THEN APPLY</p><h2>Can you explain the revision?</h2><p>Six questions connect the resource lifecycle to the code you just used.</p></div><span id="score" class="badge">0 / 6 correct</span></div><div id="quiz"></div><div class="teaching-callout"><h3>Your practical challenge</h3><ol><li>Create the support definition and note its ID and version.</li><li>Improve the system instructions. Identify the fields that changed.</li><li>Apply the same fields again and explain the no-op result.</li><li>Read the agent collection and one agent’s version history. Explain the difference.</li><li>In demo mode, archive an agent and explain why updates are now unavailable.</li></ol><p><strong>Expected observation:</strong> one stable agent ID, versioned configuration changes, preserved historical snapshots, and a separate terminal archive state.</p></div></section><footer><span>Claude Managed Agents · Lesson 02</span><span>Luis Coco Enríquez · Learn by inspecting.</span></footer></main>`;

function card(
  title: string,
  path: string,
  description: string,
  snippet: string,
) {
  const article = document.createElement("article");
  article.className = "panel namespace current";
  const h = document.createElement("h3");
  h.textContent = title;
  const code = document.createElement("code");
  code.textContent = path;
  const p = document.createElement("p");
  p.textContent = description;
  const details = document.createElement("details"),
    summary = document.createElement("summary");
  summary.textContent = "Inspect the code example";
  details.append(summary, createCodeBlock(snippet, "typescript"));
  article.append(h, code, p, details);
  return article;
}
for (const m of METHODS)
  $("method-grid").append(card(m.name, m.path, m.description, m.snippet));
for (const f of FIELDS)
  $("field-grid").append(card(f.name, f.role, f.description, f.snippet));
$("workflow-guide").append(createWorkflowGuide());
$("setup-code").textContent =
  "npm ci\nCopy-Item .env.example .env\n# Set ANTHROPIC_API_KEY in .env for live mode\nnpm run dev";
$("setup-code").dataset.language = "powershell";
$("example-code").textContent = exampleCode;
$("example-code").dataset.language = "typescript";
$("pin-code").append(
  createCodeBlock(
    'const pinnedAgent = {\n  type: "agent" as const, id: agentId, version: 1,\n};\n// Pass this reference as session.create({ agent: pinnedAgent, ... }).agent.',
    "typescript",
  ),
);
highlightCodeElements(document);
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
function activate(tab: HTMLButtonElement) {
  tabs.forEach((t) => {
    const active = t === tab;
    t.setAttribute("aria-selected", String(active));
    t.tabIndex = active ? 0 : -1;
    $(t.getAttribute("aria-controls")!).hidden = !active;
  });
}
tabs.forEach((tab, i) => {
  tab.onclick = () => activate(tab);
  tab.onkeydown = (e) => {
    let next: number | undefined;
    if (e.key === "ArrowRight") next = (i + 1) % 4;
    if (e.key === "ArrowLeft") next = (i + 3) % 4;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = 3;
    if (next !== undefined) {
      e.preventDefault();
      activate(tabs[next]);
      tabs[next].focus();
    }
  };
});
function setSize(size: string) {
  document.documentElement.dataset.text = size;
  for (const id of ["comfortable", "larger"])
    $(id).setAttribute("aria-pressed", String(size === id));
  try {
    localStorage.setItem("lesson-text-size", size);
  } catch {}
}
try {
  setSize(
    localStorage.getItem("lesson-text-size") === "larger"
      ? "larger"
      : "comfortable",
  );
} catch {}
$("comfortable").onclick = () => setSize("comfortable");
$("larger").onclick = () => setSize("larger");
const answers = new Map<number, boolean>();
QUESTIONS.forEach((q, i) => {
  const field = document.createElement("fieldset");
  field.className = "panel question";
  const legend = document.createElement("legend");
  legend.textContent = `${i + 1}. ${q.question}`;
  field.append(legend);
  const feedback = document.createElement("p");
  feedback.className = "feedback";
  feedback.setAttribute("aria-live", "polite");
  q.answers.forEach((answer, j) => {
    const label = document.createElement("label"),
      radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `q-${i}`;
    radio.value = String(j);
    label.append(radio, document.createTextNode(answer));
    radio.onchange = () => {
      const correct = j === q.correct;
      answers.set(i, correct);
      feedback.textContent = `${correct ? "Correct." : "Try again."} ${q.explanation}`;
      feedback.classList.toggle("correct", correct);
      $("score").textContent =
        `${[...answers.values()].filter(Boolean).length} / 6 correct`;
    };
    field.append(label);
  });
  field.append(feedback);
  $("quiz").append(field);
});
let mode: Mode = "demo",
  state: LabState = {
    mode: "demo",
    agents: [],
    selectedId: "",
    histories: {},
    traces: [],
    knownCount: 0,
  },
  busy = false,
  editorVersion: number | undefined,
  serverModel = "";
function current() {
  return state.agents.find((a) => a.id === state.selectedId);
}
function status(text: string) {
  $("status").textContent = text;
}
function loadDraft(d: Draft, version?: number) {
  editorVersion = version;
  $<HTMLInputElement>("agent-name").value = d.name;
  $<HTMLTextAreaElement>("agent-description").value = d.description;
  $<HTMLTextAreaElement>("agent-system").value = d.system;
  $<HTMLInputElement>("agent-team").value = d.team;
}
function draft(): Draft {
  return {
    name: $<HTMLInputElement>("agent-name").value,
    description: $<HTMLTextAreaElement>("agent-description").value,
    system: $<HTMLTextAreaElement>("agent-system").value,
    team: $<HTMLInputElement>("agent-team").value,
  };
}
function fillCurrent() {
  const a = current();
  if (a)
    loadDraft(
      {
        name: a.name,
        description: a.description ?? "",
        system: a.system ?? "",
        team: a.metadata.team ?? "student-success",
      },
      a.version,
    );
}
loadDraft(V1);
async function api(path: string, data?: unknown) {
  const response = await fetch(
    path,
    data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : undefined,
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}
async function operation(action: Action, extra: Record<string, unknown> = {}) {
  state = await api("/api/action", {
    mode,
    action,
    agentId: state.selectedId,
    ...extra,
  });
  if (["create", "retrieve", "update"].includes(action)) fillCurrent();
  render();
}
async function action(work: () => Promise<void>) {
  if (busy) return;
  busy = true;
  render();
  try {
    await work();
  } catch (e) {
    status(e instanceof Error ? e.message : "Operation failed.");
    state = await api(`/api/state?mode=${mode}`).catch(() => state);
  } finally {
    busy = false;
    render();
  }
}
function render() {
  const a = current();
  $("editor-baseline").textContent = editorVersion
    ? `Editing baseline: version ${editorVersion}. Collection refreshes do not replace this baseline.`
    : "Preparing a new reusable definition.";
  $("agent-id").textContent = a?.id ?? "Not created yet";
  $("agent-version").textContent = a ? String(a.version) : "—";
  $("agent-model").textContent = a?.model.id ?? serverModel;
  $("lifecycle").textContent = a
    ? a.archived_at
      ? "Archived · read-only"
      : "Active"
    : "Not created";
  const select = $<HTMLSelectElement>("agent-select");
  select.replaceChildren();
  select.add(
    new Option(
      state.agents.length ? "Prepare a new definition" : "No agents loaded yet",
      "",
    ),
  );
  for (const agent of state.agents)
    select.add(
      new Option(
        `${agent.name} · v${agent.version}${agent.archived_at ? " · archived" : ""}`,
        agent.id,
      ),
    );
  select.value = state.selectedId;
  $("collection-note").textContent =
    state.knownCount > state.agents.length
      ? `${state.knownCount} registered IDs. Use Refresh agent collection to load saved live agents after a restart.`
      : `${state.agents.length} agent(s) registered by this lab. The API collection is filtered to these IDs.`;
  $("current-json").replaceChildren();
  if (a)
    $("current-json").append(
      createCodeBlock(JSON.stringify(a, null, 2), "json"),
    );
  $("timeline").replaceChildren();
  for (const trace of [...state.traces].reverse()) {
    const li = document.createElement("li"),
      h = document.createElement("strong"),
      p = document.createElement("p"),
      d = document.createElement("details"),
      s = document.createElement("summary");
    h.textContent = `${trace.number}. ${trace.operation} · ${trace.status}`;
    p.textContent = trace.explanation;
    s.textContent = "Inspect request and response";
    d.append(
      s,
      createCodeBlock(
        JSON.stringify(
          { request: trace.request, response: trace.response },
          null,
          2,
        ),
        "json",
      ),
    );
    li.append(h, p, d);
    $("timeline").append(li);
  }
  $("trace-count").textContent = `${state.traces.length} operations`;
  $("trace-empty").hidden = state.traces.length > 0;
  const versions = state.histories[state.selectedId] ?? [];
  $("history-count").textContent =
    `${versions.length} version${versions.length === 1 ? "" : "s"}`;
  for (const id of ["before-version", "after-version"]) {
    const s = $<HTMLSelectElement>(id),
      old = s.value;
    s.replaceChildren();
    for (const v of versions)
      s.add(new Option(`Version ${v.version}`, String(v.version)));
    s.value = versions.some((v) => String(v.version) === old)
      ? old
      : String(
          id === "before-version"
            ? versions[0]?.version
            : versions.at(-1)?.version,
        );
  }
  renderComparison();
  const writeDisabled = busy || Boolean(a?.archived_at);
  for (const id of [
    "walkthrough",
    "create-agent",
    "new-draft",
    "list-agents",
    "mode",
    "agent-select",
  ])
    $<HTMLButtonElement>(id).disabled = busy;
  for (const id of ["retrieve-agent", "list-versions"])
    $<HTMLButtonElement>(id).disabled = busy || !a;
  for (const id of ["load-revision", "update-agent"])
    $<HTMLButtonElement>(id).disabled = writeDisabled || !a;
  for (const id of [
    "agent-name",
    "agent-description",
    "agent-system",
    "agent-team",
  ])
    $<HTMLInputElement>(id).disabled = writeDisabled;
  $<HTMLButtonElement>("archive-agent").disabled =
    busy ||
    !a ||
    Boolean(a.archived_at) ||
    $<HTMLInputElement>("archive-name").value !== a.name;
  for (const [id, ready] of [
    ["create", Boolean(a)],
    [
      "inspect",
      state.traces.some(
        (t) => t.operation === "retrieve" && t.status === "success",
      ),
    ],
    ["update", Boolean(a && a.version > 1)],
    ["compare", versions.length > 1],
  ] as const)
    $(`stage-${id}`).classList.toggle("ready", ready);
}
function renderComparison() {
  const a = current(),
    versions = state.histories[state.selectedId] ?? [],
    before = versions.find(
      (v) => String(v.version) === $<HTMLSelectElement>("before-version").value,
    ),
    after = versions.find(
      (v) => String(v.version) === $<HTMLSelectElement>("after-version").value,
    );
  $("changes").replaceChildren();
  $("release-brief").replaceChildren();
  if (!before || !after) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent =
      "Create or select an agent, then retrieve its version history.";
    $("changes").append(p);
    $("release-brief").append(
      renderResponse(
        "Start the walkthrough to see how a reusable definition evolves. **No AI inference is run by this management lab.**",
      ),
    );
    return;
  }
  const keys = [
    "name",
    "description",
    "system",
    "model",
    "tools",
    "mcp_servers",
    "metadata",
  ] as const;
  const changed = keys.filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
  if (!changed.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent =
      "No configuration differences between these selected snapshots.";
    $("changes").append(p);
  }
  for (const key of changed) {
    const article = document.createElement("article");
    article.className = "change-card";
    const h = document.createElement("h4");
    h.textContent = key;
    const grid = document.createElement("div");
    grid.className = "two-columns";
    for (const [v, label] of [
      [before, "Before"],
      [after, "After"],
    ] as const) {
      const side = document.createElement("div"),
        title = document.createElement("strong");
      title.textContent = `${label} · v${v.version}`;
      side.append(
        title,
        createCodeBlock(JSON.stringify(v[key], null, 2), "json"),
      );
      grid.append(side);
    }
    article.append(h, grid);
    $("changes").append(article);
  }
  $("release-brief").append(
    renderResponse(
      `### Configuration review\n\n- **Identity:** the same agent ID across revisions.\n- **Compared:** version ${before.version} → version ${after.version}.\n- **Changed fields:** ${changed.length ? changed.map((k) => `\`${k}\``).join(", ") : "none"}.\n- **Lifecycle:** ${a?.archived_at ? "archived and read-only" : "active"}.\n\n${changed.length ? "Review these instruction changes before referencing the updated agent in new sessions." : "An update that leaves the configuration unchanged returns its existing version."}\n\nThis summary describes stored configuration, not a generated support answer.`,
    ),
  );
}
$("before-version").onchange = renderComparison;
$("after-version").onchange = renderComparison;
$("walkthrough").onclick = () =>
  void action(async () => {
    status("Creating the first definition…");
    loadDraft(V1);
    await operation("create", { draft: V1 });
    await operation("retrieve");
    const version = current()!.version;
    status("Revising the same agent with a version check…");
    loadDraft(V2);
    await operation("update", { draft: V2, version });
    await operation("list");
    await operation("versions");
    $<HTMLSelectElement>("before-version").value = "1";
    $<HTMLSelectElement>("after-version").value = String(current()!.version);
    renderComparison();
    status(
      "Walkthrough complete. Same agent ID, revised configuration. Compare v1 and v2 below.",
    );
  });
$("new-draft").onclick = () => {
  state.selectedId = "";
  loadDraft(V1);
  $<HTMLInputElement>("archive-name").value = "";
  render();
  status("Fresh definition ready. Edit the fields, then create a new agent.");
};
$("create-agent").onclick = () =>
  void action(async () => {
    await operation("create", { draft: draft() });
    status(
      "Agent created. Its definition is reusable; no session has started.",
    );
  });
$("retrieve-agent").onclick = () =>
  void action(async () => {
    await operation("retrieve");
    fillCurrent();
    status(
      "Latest configuration retrieved. Review these fields before updating.",
    );
  });
$("load-revision").onclick = () => {
  loadDraft(
    { ...draft(), description: V2.description, system: V2.system },
    editorVersion,
  );
  status(
    "Suggested instructions loaded into the editor. Apply changes to create the revision.",
  );
};
$("update-agent").onclick = () =>
  void action(async () => {
    const previous = editorVersion;
    if (!previous)
      throw new Error("Retrieve the current definition before editing.");
    await operation("update", { draft: draft(), version: previous });
    await operation("versions");
    $<HTMLSelectElement>("after-version").value = String(current()!.version);
    renderComparison();
    status(
      current()!.version === previous
        ? "No configuration change. The existing version was preserved."
        : `Revision saved. Same agent ID, version ${previous} → ${current()!.version}.`,
    );
  });
$("list-agents").onclick = () =>
  void action(async () => {
    await operation("list");
    status(
      "Collection refreshed using auto-pagination; only this lab’s agents are shown.",
    );
  });
$("list-versions").onclick = () =>
  void action(async () => {
    await operation("versions");
    status("Version history loaded for this agent.");
  });
$<HTMLSelectElement>("agent-select").onchange = () => {
  state.selectedId = $<HTMLSelectElement>("agent-select").value;
  $("archive-name").textContent = "";
  $<HTMLInputElement>("archive-name").value = "";
  fillCurrent();
  if (!current()) loadDraft(V1);
  render();
  status(
    "Selected another reusable definition. Refresh its history if needed.",
  );
};
$<HTMLInputElement>("archive-name").oninput = render;
$("archive-agent").onclick = () =>
  void action(async () => {
    await operation("archive", {
      confirmName: $<HTMLInputElement>("archive-name").value,
    });
    status(
      "Agent archived permanently. It is read-only; existing sessions are not deleted.",
    );
  });
$<HTMLSelectElement>("mode").onchange = () =>
  void action(async () => {
    mode = $<HTMLSelectElement>("mode").value as Mode;
    state = await api(`/api/state?mode=${mode}`);
    loadDraft(V1);
    fillCurrent();
    $<HTMLInputElement>("archive-name").value = "";
    $("mode-note").textContent =
      mode === "demo"
        ? "A local simulation of agent management. No AI calls or cloud resources. You can edit the definition and explore its version history."
        : "Real Managed Agents management requests. Creates and changes this lab’s cloud agent definitions. No model inference or sessions are started.";
    status(
      mode === "demo"
        ? "Simulated API ready."
        : "Live management ready. Use the walkthrough or create explicitly.",
    );
  });
void (async () => {
  try {
    const info = await api("/api/lesson");
    serverModel = info.model;
    const live = $<HTMLSelectElement>("mode").options[1];
    live.disabled = !info.liveReady;
    live.textContent = info.liveReady
      ? "Live · Claude Managed Agents"
      : "Live · set ANTHROPIC_API_KEY on server";
    state = await api(`/api/state?mode=${mode}`);
    fillCurrent();
    render();
  } catch (e) {
    status(e instanceof Error ? e.message : "Cannot reach server.");
  }
})();
