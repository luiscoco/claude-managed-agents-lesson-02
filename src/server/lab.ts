import Anthropic from "@anthropic-ai/sdk";
import type { BetaManagedAgentsAgent } from "@anthropic-ai/sdk/resources/beta/agents/agents";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  DEFAULT_MODEL,
  type Action,
  type AgentSnapshot,
  type Draft,
  type LabState,
  type Mode,
} from "../shared/lesson.js";

export class LabError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export interface Provider {
  create(draft: Draft): Promise<AgentSnapshot>;
  retrieve(id: string): Promise<AgentSnapshot>;
  update(id: string, draft: Draft, version: number): Promise<AgentSnapshot>;
  list(owned: Set<string>): Promise<AgentSnapshot[]>;
  versions(id: string): Promise<AgentSnapshot[]>;
  archive(id: string): Promise<AgentSnapshot>;
}
function snapshot(a: BetaManagedAgentsAgent): AgentSnapshot {
  return {
    id: a.id,
    name: a.name,
    version: a.version,
    model: { ...a.model },
    description: a.description,
    system: a.system,
    tools: a.tools,
    mcp_servers: a.mcp_servers,
    metadata: a.metadata,
    created_at: a.created_at,
    updated_at: a.updated_at,
    archived_at: a.archived_at,
  };
}
export function config(d: Draft) {
  return {
    name: d.name,
    description: d.description,
    system: d.system,
    metadata: { course: "managed-agents-lesson-02", team: d.team },
  };
}
export class LiveProvider implements Provider {
  constructor(
    private client: Anthropic,
    private model = DEFAULT_MODEL,
  ) {}
  async create(d: Draft) {
    return snapshot(
      await this.client.beta.agents.create({
        ...config(d),
        model: this.model,
        tools: [],
      }),
    );
  }
  async retrieve(id: string) {
    return snapshot(await this.client.beta.agents.retrieve(id));
  }
  async update(id: string, d: Draft, version: number) {
    return snapshot(
      await this.client.beta.agents.update(id, { ...config(d), version }),
    );
  }
  async list(owned: Set<string>) {
    const result: AgentSnapshot[] = [];
    for await (const a of this.client.beta.agents.list({
      include_archived: true,
    }))
      if (owned.has(a.id)) result.push(snapshot(a));
    return result;
  }
  async versions(id: string) {
    const result: AgentSnapshot[] = [];
    for await (const a of this.client.beta.agents.versions.list(id))
      result.push(snapshot(a));
    return result;
  }
  async archive(id: string) {
    return snapshot(await this.client.beta.agents.archive(id));
  }
}
export class DemoProvider implements Provider {
  private agents = new Map<string, AgentSnapshot>();
  private history = new Map<string, AgentSnapshot[]>();
  private count = 0;
  async create(d: Draft) {
    const time = new Date().toISOString();
    const a: AgentSnapshot = {
      ...config(d),
      id: `demo_agent_${++this.count}`,
      version: 1,
      model: { id: DEFAULT_MODEL },
      tools: [],
      mcp_servers: [],
      created_at: time,
      updated_at: time,
      archived_at: null,
    };
    this.agents.set(a.id, structuredClone(a));
    this.history.set(a.id, [structuredClone(a)]);
    return a;
  }
  async retrieve(id: string) {
    const a = this.agents.get(id);
    if (!a) throw new LabError("Agent not found.", 404);
    return structuredClone(a);
  }
  async update(id: string, d: Draft, version: number) {
    const a = await this.retrieve(id);
    if (a.archived_at)
      throw new LabError("Archived agents are read-only.", 409);
    if (a.version !== version)
      throw new LabError(
        "Version conflict. Retrieve the latest configuration and review your edits before retrying.",
        409,
      );
    const next = { ...a, ...config(d) };
    if (JSON.stringify(next) === JSON.stringify(a)) return a;
    next.version++;
    next.updated_at = new Date().toISOString();
    this.agents.set(id, structuredClone(next));
    this.history.get(id)!.push(structuredClone(next));
    return next;
  }
  async list(owned: Set<string>) {
    return [...this.agents.values()]
      .filter((a) => owned.has(a.id))
      .map((a) => structuredClone(a));
  }
  async versions(id: string) {
    await this.retrieve(id);
    return structuredClone(this.history.get(id)!);
  }
  async archive(id: string) {
    const a = await this.retrieve(id);
    if (!a.archived_at) {
      a.archived_at = new Date().toISOString();
      this.agents.set(id, structuredClone(a));
    }
    return a;
  }
}
export function validateDraft(value: unknown): Draft {
  if (!value || typeof value !== "object")
    throw new LabError("Provide the agent fields.");
  const source = value as Record<string, unknown>,
    result = {} as Draft;
  for (const [key, max] of [
    ["name", 120],
    ["description", 500],
    ["system", 4000],
    ["team", 64],
  ] as const) {
    const text = source[key];
    if (typeof text !== "string" || !text.trim() || text.length > max)
      throw new LabError(`${key} must contain 1–${max} characters.`);
    result[key] = text.trim();
  }
  return result;
}
const explanations: Record<Action, string> = {
  create:
    "A new reusable definition starts with an agent ID and its first version.",
  retrieve: "Read the latest fields and version before preparing an edit.",
  update:
    "A changed configuration creates a version. A no-op preserves it; a stale version is rejected.",
  list: "Auto-pagination reads the collection. Only IDs registered by this lab are shown.",
  versions:
    "History belongs to one agent ID. Compare its snapshots instead of inventing a new agent for each revision.",
  archive:
    "The agent is now read-only. Archival cannot be undone and does not delete existing sessions.",
};
export class Lab {
  readonly states: Record<Mode, LabState> = {
    demo: {
      mode: "demo",
      agents: [],
      selectedId: "",
      histories: {},
      traces: [],
      knownCount: 0,
    },
    live: {
      mode: "live",
      agents: [],
      selectedId: "",
      histories: {},
      traces: [],
      knownCount: 0,
    },
  };
  private owned: Record<Mode, Set<string>> = {
    demo: new Set(),
    live: new Set(),
  };
  private busy = new Set<Mode>();
  private traceNumber = 0;
  constructor(
    private providers: Partial<Record<Mode, Provider>>,
    private dataDir?: string,
  ) {}
  async load() {
    if (!this.dataDir) return;
    try {
      const data = JSON.parse(
        await readFile(`${this.dataDir}/agents.json`, "utf8"),
      );
      if (
        !Array.isArray(data.ids) ||
        !data.ids.every((id: unknown) => typeof id === "string")
      )
        throw new Error("Invalid saved agent registry.");
      this.owned.live = new Set(data.ids);
      this.states.live.knownCount = this.owned.live.size;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  private async save() {
    if (this.dataDir) {
      await mkdir(this.dataDir, { recursive: true });
      await writeFile(
        `${this.dataDir}/agents.json`,
        JSON.stringify({ ids: [...this.owned.live] }, null, 2),
      );
    }
  }
  async perform(mode: Mode, action: Action, data: Record<string, unknown>) {
    const p = this.providers[mode];
    if (!p)
      throw new LabError(
        "Set ANTHROPIC_API_KEY on the server and restart to enable live management.",
      );
    if (this.busy.has(mode))
      throw new LabError(
        "Another operation is in progress. Wait and retry.",
        409,
      );
    const state = this.states[mode];
    this.busy.add(mode);
    let request: Record<string, unknown> = {},
      response: unknown;
    try {
      const id = typeof data.agentId === "string" ? data.agentId : "";
      if (action !== "create" && action !== "list" && !this.owned[mode].has(id))
        throw new LabError(
          "Select an agent created by this lab and mode.",
          404,
        );
      const remember = (agent: AgentSnapshot) => {
        state.agents = [
          agent,
          ...state.agents.filter((a) => a.id !== agent.id),
        ];
        state.selectedId = agent.id;
        return agent;
      };
      if (action === "create") {
        const draft = validateDraft(data.draft);
        request = { ...config(draft), tools: [] };
        const agent = await p.create(draft);
        request.model = agent.model.id;
        this.owned[mode].add(agent.id);
        state.knownCount = this.owned[mode].size;
        if (mode === "live") await this.save();
        response = remember(agent);
        state.histories[agent.id] = [agent];
      } else if (action === "list") {
        request = {
          include_archived: true,
          scope: "Only this lab’s registered IDs",
        };
        state.agents = await p.list(this.owned[mode]);
        response = state.agents;
        if (!state.agents.some((a) => a.id === state.selectedId))
          state.selectedId = state.agents[0]?.id ?? "";
      } else if (action === "retrieve") {
        request = { agentId: id };
        response = remember(await p.retrieve(id));
      } else if (action === "versions") {
        request = { agentId: id };
        state.histories[id] = (await p.versions(id)).sort(
          (a, b) => a.version - b.version,
        );
        state.selectedId = id;
        response = state.histories[id];
      } else if (action === "update") {
        const draft = validateDraft(data.draft);
        if (!Number.isInteger(data.version) || Number(data.version) < 1)
          throw new LabError(
            "Supply the version you retrieved before editing.",
          );
        request = { agentId: id, ...config(draft), version: data.version };
        response = remember(await p.update(id, draft, Number(data.version)));
      } else if (action === "archive") {
        const current = await p.retrieve(id);
        if (data.confirmName !== current.name)
          throw new LabError(
            "Type the exact agent name to confirm permanent archival.",
          );
        request = { agentId: id };
        response = remember(await p.archive(id));
      }
      state.traces.unshift({
        number: ++this.traceNumber,
        operation: action,
        explanation: explanations[action],
        request,
        response,
        status: "success",
        time: new Date().toISOString(),
      });
      state.traces = state.traces.slice(0, 40);
      return state;
    } catch (error) {
      state.traces.unshift({
        number: ++this.traceNumber,
        operation: action,
        explanation: safeError(error),
        request,
        response: { error: safeError(error) },
        status: "error",
        time: new Date().toISOString(),
      });
      state.traces = state.traces.slice(0, 40);
      throw error;
    } finally {
      this.busy.delete(mode);
    }
  }
}
export function safeError(error: unknown) {
  if (error instanceof Anthropic.APIError)
    return error.status === 409
      ? "Version conflict. Retrieve the latest agent and review changes before retrying."
      : `Anthropic management request failed (${error.status ?? "network error"}). Check access, model availability, and account limits.`;
  return error instanceof Error ? error.message : "The operation failed.";
}
