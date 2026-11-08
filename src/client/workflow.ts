import { createCodeBlock } from "./formatting.js";
const steps = [
  {
    title: "Edit the support definition",
    owner: "Student / browser",
    text: "Choose demo or live, then edit name, description, system instructions, and team metadata. The form describes reusable behavior; it is not a chat prompt.",
    code: 'const draft = {\n  name: "Course Support Agent",\n  system: "Answer clearly and do not invent policies.",\n};',
  },
  {
    title: "Validate on the host",
    owner: "Node application",
    text: "The host checks field lengths, the mode, and ownership of the selected ID. Credentials stay in Node. Live updates and archival only target agents registered by this lab.",
    code: '// Browser → local host\nPOST /api/action\n{ mode: "live", action: "create", draft }',
  },
  {
    title: "Create version 1",
    owner: "Managed Agents API",
    text: "A new agent gets an ID and starts at version 1. Keep the ID instead of creating a distinct agent for every edit. Created live IDs are saved in the ignored local registry.",
    code: "const agent = await client.beta.agents.create({\n  name, model, system, tools: [],\n});",
  },
  {
    title: "Retrieve before editing",
    owner: "Node → Managed Agents",
    text: "Read the current definition and version. Review that baseline before sending a patch. A version number guards against stale edits; it is not the agent’s identity.",
    code: "const current = await client.beta.agents.retrieve(agentId);\nconst expectedVersion = current.version;",
  },
  {
    title: "Apply a guarded update",
    owner: "Node → Managed Agents",
    text: "Send edited fields and the version you read. Changed configuration yields a new revision. Matching fields return the existing version. A stale version yields 409; re-read and review before retrying.",
    code: 'const next = await client.beta.agents.update(agentId, {\n  version: expectedVersion,\n  system: "Ask one clarifying question, then give three steps.",\n});',
  },
  {
    title: "Read collection and history",
    owner: "Managed Agents → Node",
    text: "List agents to find different definitions, and list versions to inspect one definition’s revisions. Async iteration fetches subsequent pages. The UI collection is filtered to this application’s registered IDs.",
    code: "for await (const agent of client.beta.agents.list()) {\n  console.log(agent.id);\n}\nfor await (const revision of client.beta.agents.versions.list(agentId)) {\n  console.log(revision.version);\n}",
  },
  {
    title: "Compare and explain the change",
    owner: "Browser",
    text: "Select before and after snapshots, compare the changed fields, and explain the release. The configuration review is derived from those snapshots; it is not an AI support answer or evidence of model behavior.",
    code: "const changed = before.system !== after.system;\n// Same agent ID; different configuration revisions.\nconsole.log(before.id === after.id, changed);",
  },
  {
    title: "Archive only when retiring",
    owner: "Student → host → Managed Agents",
    text: "The optional archive action requires the selected agent’s exact name. It is outside the walkthrough. Archival is permanent: the agent becomes read-only and new sessions cannot use it. Existing sessions continue.",
    code: "// Deliberate, terminal operation:\nconst archived = await client.beta.agents.archive(agentId);\nconsole.log(archived.archived_at);",
  },
] as const;
const architecture = `<svg viewBox="0 0 1040 300" role="img" aria-labelledby="arch-title arch-desc"><title id="arch-title">UML component architecture</title><desc id="arch-desc">The browser editor calls the local Node host. Node validates inputs and owned agent IDs and holds the API key. The official SDK manages agent definitions and history in the cloud. A local simulated provider implements the demo. There are no session or inference calls.</desc><defs><marker id="arch-arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0 L10 4 L0 8 Z"/></marker></defs><g class="uml-box"><rect x="20" y="55" width="270" height="170" rx="8"/><text x="155" y="85" class="uml-stereotype">«component»</text><text x="155" y="115" class="uml-title">Browser version lab</text><text x="155" y="150">Editor · diff · history · quiz</text><text x="155" y="180">Formatted code + API traces</text><text x="155" y="210">No API key</text></g><g class="uml-box"><rect x="385" y="55" width="270" height="170" rx="8"/><text x="520" y="85" class="uml-stereotype">«component»</text><text x="520" y="115" class="uml-title">Node management host</text><text x="520" y="150">Validation + ownership registry</text><text x="520" y="180">SDK + server-side credentials</text><text x="520" y="210">Demo / live provider</text></g><g class="uml-box cloud"><rect x="750" y="55" width="270" height="170" rx="8"/><text x="885" y="85" class="uml-stereotype">«external service»</text><text x="885" y="115" class="uml-title">Claude Managed Agents</text><text x="885" y="150">Agent definitions + revisions</text><text x="885" y="180">Read · update · list · archive</text><text x="885" y="210">Live management only</text></g><path class="uml-edge" d="M290 120 H385"/><text class="uml-edge-label" x="337" y="105">HTTP action</text><path class="uml-edge" d="M385 180 H290"/><text class="uml-edge-label" x="337" y="205">JSON state</text><path class="uml-edge" d="M655 120 H750"/><text class="uml-edge-label" x="702" y="105">HTTPS API</text><path class="uml-edge" d="M750 180 H655"/><text class="uml-edge-label" x="702" y="205">Snapshots</text><text class="uml-caption" x="520" y="275">Manage configuration here. A session and user input run the assistant later.</text></svg>`;
function box(
  x: number,
  y: number,
  w: number,
  step: number,
  one: string,
  two: string,
) {
  return `<g class="uml-action" data-workflow-step="${step}"><rect x="${x}" y="${y}" width="${w}" height="65" rx="14"/><text x="${x + w / 2}" y="${y + 26}">${one}</text><text x="${x + w / 2}" y="${y + 49}">${two}</text></g>`;
}
const workflow = `<svg viewBox="0 0 1040 1150" role="img" aria-labelledby="flow-title flow-desc"><title id="flow-title">UML agent lifecycle workflow</title><desc id="flow-desc">Swimlanes show browser, host, and Managed Agents responsibilities. Create a definition, retrieve its baseline, and submit an expected-version update. A conflict returns to review. Accepted changes create a version; unchanged configuration keeps the version. List and compare history, then iterate or deliberately archive.</desc><defs><marker id="flow-arrow" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0 L9 4 L0 8 Z"/></marker></defs><rect class="uml-lane" x="15" y="15" width="1010" height="1120" rx="10"/><path class="uml-lane-line" d="M345 15 V1135 M690 15 V1135 M15 65 H1025"/><text class="uml-title" x="180" y="47">Student / browser</text><text class="uml-title" x="517" y="47">Node host</text><text class="uml-title" x="857" y="47">Managed Agents API</text><circle class="uml-start" cx="180" cy="92" r="10"/>
${box(50, 120, 260, 0, "1 · Edit support definition", "Choose demo or live")}${box(387, 215, 260, 1, "2 · Validate fields + ownership", "Keep credentials in Node")}${box(725, 310, 265, 2, "3 · Create agent", "Stable ID · version 1")}${box(387, 405, 260, 3, "4 · Retrieve current fields", "Record expected version")}${box(725, 500, 265, 4, "5 · Update with version guard", "Changed fields + expected version")}
<path class="uml-decision" data-workflow-step="4" d="M857 600 L950 640 L857 680 L764 640 Z"/><text class="uml-small" x="857" y="635">Version</text><text class="uml-small" x="857" y="657">matches?</text>
${box(387, 700, 260, 5, "6 · List agents + versions", "Auto-pagination; owned IDs only")}${box(50, 800, 260, 6, "7 · Compare field snapshots", "Compare changes and no-ops")}
<path class="uml-decision" d="M180 905 L270 950 L180 995 L90 950 Z"/><text class="uml-small" x="180" y="943">Next</text><text class="uml-small" x="180" y="965">action?</text>
${box(725, 1010, 265, 7, "8 · Archive selected agent", "Permanent · read-only")}
<circle class="uml-final-outer" cx="517" cy="1085" r="15"/><circle class="uml-start" cx="517" cy="1085" r="9"/>
<g class="uml-flow-edges"><path d="M180 102 V120"/><path d="M180 185 V195 H517 V215"/><path d="M517 280 V290 H857 V310"/><path d="M857 375 V390 H517 V405"/><path d="M647 438 H710 V470 H857 V500"/><path d="M857 565 V600"/><path d="M950 640 H1008 V438 H647"/><path d="M857 680 V690 H517 V700"/><path d="M517 765 V780 H180 V800"/><path d="M180 865 V905"/><path d="M90 950 H30 V438 H387"/><path d="M270 950 H857 V1010"/><path d="M180 995 V1085 H502"/><path d="M857 1075 V1105 H532 V1085"/></g><text class="uml-edge-label" x="958" y="599">409 → re-read</text><text class="uml-edge-label" x="857" y="715">Yes · apply or no-op</text><text class="uml-edge-label" x="90" y="894">Iterate → retrieve first</text><text class="uml-edge-label" x="553" y="935">Retire deliberately</text><text class="uml-edge-label" x="245" y="1052">Finish without archiving</text><text class="uml-caption" x="857" y="185">Demo mirrors this API locally.</text><text class="uml-caption" x="857" y="210">No cloud calls or inference.</text></svg>`;
export function createWorkflowGuide() {
  const section = document.createElement("section");
  section.className = "panel workflow-guide";
  section.innerHTML = `<p class="eyebrow">UML / ARCHITECTURE & WORKFLOW</p><h3>Follow the definition through its lifecycle.</h3><p>The component diagram separates the UI, host, and managed configuration service. Select a step to inspect its role and highlighted code.</p><div class="uml-scroll" tabindex="0" role="region" aria-label="Scrollable component architecture">${architecture}</div><details class="uml-activity"><summary>Explore the full UML agent lifecycle</summary><p class="note">Rounded boxes are actions; diamonds are decisions. Swimlanes show responsibility. Scroll horizontally on small screens.</p><div class="uml-scroll" tabindex="0" role="region" aria-label="Scrollable agent lifecycle workflow">${workflow}</div></details><div class="workflow-step-buttons" role="group" aria-label="Inspect a workflow step"></div><article class="workflow-step-detail" aria-live="polite" aria-atomic="true"></article>`;
  const group = section.querySelector(".workflow-step-buttons")!,
    detail = section.querySelector(".workflow-step-detail")!;
  function select(index: number) {
    const step = steps[index];
    group
      .querySelectorAll("button")
      .forEach((b, i) => b.setAttribute("aria-pressed", String(i === index)));
    section
      .querySelectorAll<SVGElement>("[data-workflow-step]")
      .forEach((node) =>
        node.classList.toggle(
          "selected",
          node.dataset.workflowStep === String(index),
        ),
      );
    const h = document.createElement("h4");
    h.textContent = `${index + 1}. ${step.title}`;
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = step.owner;
    const p = document.createElement("p");
    p.textContent = step.text;
    detail.replaceChildren(
      h,
      badge,
      p,
      createCodeBlock(step.code, "typescript"),
    );
  }
  steps.forEach((step, index) => {
    const b = document.createElement("button");
    b.textContent = `${index + 1} · ${step.title}`;
    b.onclick = () => select(index);
    group.append(b);
  });
  select(0);
  return section;
}
