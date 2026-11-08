export const SDK_VERSION = "1.6.0";
export const BETA = "managed-agents-2026-04-01";
export const DEFAULT_MODEL = "claude-opus-5-5";
export const V1 = {
  name: "Course Support Agent",
  description: "Answers questions about a programming course.",
  system:
    "You are a course support assistant. Answer student questions clearly and concisely. Do not invent course policies.",
  team: "student-success",
};
export const V2 = {
  ...V1,
  description: "Gives beginner-friendly course support with a clear next step.",
  system:
    "You are a course support assistant. If a question is ambiguous, ask one clarifying question. Explain the solution in three short numbered steps, then suggest one practical exercise. Do not invent course policies.",
};
export type Mode = "demo" | "live";
export interface Draft {
  name: string;
  description: string;
  system: string;
  team: string;
}
export interface AgentSnapshot {
  id: string;
  name: string;
  version: number;
  description: string | null;
  model: { id: string };
  system: string | null;
  tools: unknown[];
  mcp_servers: unknown[];
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}
export type Action =
  | "create"
  | "retrieve"
  | "update"
  | "list"
  | "versions"
  | "archive";
export interface Trace {
  number: number;
  operation: Action;
  explanation: string;
  request: Record<string, unknown>;
  response: unknown;
  status: "success" | "error";
  time: string;
}
export interface LabState {
  mode: Mode;
  agents: AgentSnapshot[];
  selectedId: string;
  histories: Record<string, AgentSnapshot[]>;
  traces: Trace[];
  knownCount: number;
}
export const METHODS = [
  {
    name: "Create",
    path: "client.beta.agents.create",
    description:
      "Create one reusable definition. The returned agent ID stays stable as its versions change.",
    snippet:
      'const agent = await client.beta.agents.create({\n  name: "Course Support Agent",\n  model,\n  system: "Answer student questions clearly.",\n  tools: [],\n  metadata: { team: "student-success" },\n});\nconsole.log(agent.id, agent.version);',
  },
  {
    name: "Retrieve",
    path: "client.beta.agents.retrieve",
    description:
      "Read the current configuration before editing. Keep its version for the update request.",
    snippet:
      "const current = await client.beta.agents.retrieve(agentId);\nconsole.log(current.system, current.version);",
  },
  {
    name: "Update",
    path: "client.beta.agents.update",
    description:
      "Send changed fields with the version you read. A stale version returns 409; a no-op keeps the current version.",
    snippet:
      'const revised = await client.beta.agents.update(agentId, {\n  version: current.version,\n  system: "Ask a clarifying question, then give three steps.",\n});\nconsole.log(revised.id, revised.version);',
  },
  {
    name: "List",
    path: "client.beta.agents.list",
    description:
      "Browse a paginated collection. This host filters the results to IDs created by this lab.",
    snippet:
      "for await (const agent of client.beta.agents.list({\n  include_archived: true,\n})) {\n  console.log(agent.id, agent.name, agent.archived_at);\n}",
  },
  {
    name: "Version history",
    path: "client.beta.agents.versions.list",
    description:
      "Read immutable configuration history for a particular agent. It is separate from listing different agents.",
    snippet:
      "for await (const snapshot of client.beta.agents.versions.list(agentId)) {\n  console.log(snapshot.version, snapshot.system);\n}",
  },
  {
    name: "Archive",
    path: "client.beta.agents.archive",
    description:
      "Retire the agent permanently. It becomes read-only and cannot be used for new sessions. Existing sessions continue.",
    snippet:
      "// Deliberate terminal action, outside the guided walkthrough.\nconst archived = await client.beta.agents.archive(agentId);\nconsole.log(archived.archived_at);",
  },
] as const;
export const FIELDS = [
  {
    name: "name",
    role: "Identity",
    description:
      "A human-readable label. Changing it does not create another agent ID.",
    snippet: 'name: "Course Support Agent"',
  },
  {
    name: "model",
    role: "Intelligence",
    description:
      "The model configuration. This app reads the configured model from the server environment.",
    snippet: 'model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5"',
  },
  {
    name: "system",
    role: "Behavior",
    description:
      "Reusable role and response instructions. A user message belongs to a session, not this field.",
    snippet: 'system: "Ask one clarifying question, then give three steps."',
  },
  {
    name: "tools",
    role: "Capabilities",
    description:
      "Tool arrays are replaced when supplied. This lab deliberately creates agents with no tools.",
    snippet:
      "// Clear configured tools explicitly:\nawait client.beta.agents.update(agentId, {\n  version: current.version, tools: [],\n});",
  },
  {
    name: "mcp_servers",
    role: "Connections",
    description:
      "MCP definitions require matching MCP toolsets. They extend the agent rather than replacing its system instructions.",
    snippet:
      "// Both arrays must remain consistent when clearing MCP capabilities:\nawait client.beta.agents.update(agentId, {\n  version: current.version, mcp_servers: [], tools: [],\n});",
  },
  {
    name: "metadata",
    role: "Organization",
    description:
      "Key-value tracking data. Updates merge keys; use null to delete a key. Metadata is not the system prompt.",
    snippet:
      'await client.beta.agents.update(agentId, {\n  version: current.version,\n  metadata: { team: "student-success", obsolete: null },\n});',
  },
  {
    name: "version",
    role: "Concurrency",
    description:
      "The current revision number, starting at 1. Supplying it prevents silently overwriting a newer revision.",
    snippet:
      '// 409 if another editor changed the agent after this read:\nawait client.beta.agents.update(agentId, {\n  version: current.version, description: "Revised support policy",\n});',
  },
  {
    name: "archived_at",
    role: "Lifecycle",
    description:
      "Null for an active agent; a timestamp after irreversible archival. Archive is not a reversible pause.",
    snippet:
      'const canEdit = current.archived_at === null;\nconsole.log(canEdit ? "Active" : "Archived: read-only");',
  },
  {
    name: "Policies and limits",
    role: "Correct boundary",
    description:
      "Tool permission policies belong to tool configuration. Networking belongs to an environment, and a session can have a budget. There is no generic execution_policy field in this lab’s agent payload.",
    snippet:
      "// Field placement matters:\n// agent.tools → capability / permission configuration\n// environment.config → sandbox / network configuration\n// session.budget → per-session spend limit",
  },
] as const;
export const QUESTIONS = [
  {
    question:
      "After updating the system instructions, what should stay the same?",
    answers: [
      "The agent ID",
      "The version number",
      "Every configuration field",
    ],
    correct: 0,
    explanation:
      "The same reusable agent gets a new version when its configuration changes.",
  },
  {
    question: "You submit the exact current configuration again. What happens?",
    answers: [
      "A second agent is created",
      "A no-op returns the existing version",
      "The agent is archived",
    ],
    correct: 1,
    explanation:
      "Version creation follows an actual configuration change, not merely the presence of an update request.",
  },
  {
    question: "Why send the version from your last retrieve when updating?",
    answers: [
      "To select a historical answer",
      "To disable tools",
      "To reject stale edits rather than overwrite another change",
    ],
    correct: 2,
    explanation:
      "Optimistic concurrency returns 409 when your expected version does not match the current version.",
  },
  {
    question: "How do agent listing and version listing differ?",
    answers: [
      "They are identical",
      "One lists different agents; the other lists revisions of one agent",
      "Version listing creates a session",
    ],
    correct: 1,
    explanation:
      "Agent ID identifies a reusable definition. Version distinguishes its historical configurations.",
  },
  {
    question: "What does archival do?",
    answers: [
      "Temporarily pauses a session",
      "Deletes all existing sessions",
      "Permanently makes the agent read-only and blocks new sessions using it",
    ],
    correct: 2,
    explanation:
      "Archival cannot be undone. Existing sessions continue; it is not a delete-session operation.",
  },
  {
    question:
      "Does creating or updating this definition run the support assistant?",
    answers: [
      "No; inference requires a session and input",
      "Yes; every update answers a student",
      "Yes; metadata is a user message",
    ],
    correct: 0,
    explanation:
      "This lesson manages the agent configuration. Lesson 1 introduced sessions and messages that run work.",
  },
] as const;
