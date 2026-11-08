import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL, V1, V2 } from "../shared/lesson.js";
try {
  process.loadEnvFile();
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
if (!process.env.ANTHROPIC_API_KEY)
  throw new Error(
    "Set ANTHROPIC_API_KEY first. This example creates and updates a real Managed Agents definition.",
  );
const client = new Anthropic({ timeout: 45_000, maxRetries: 0 });
const agent = await client.beta.agents.create({
  name: V1.name,
  description: V1.description,
  system: V1.system,
  model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
  tools: [],
  metadata: { course: "lesson-02-standalone", team: V1.team },
});
console.log("Created:", agent.id, "version", agent.version);
const current = await client.beta.agents.retrieve(agent.id);
const revised = await client.beta.agents.update(agent.id, {
  version: current.version,
  system: V2.system,
  description: V2.description,
});
console.log("Revised:", revised.id, "version", revised.version);
for await (const item of client.beta.agents.list())
  if (item.id === agent.id) console.log("Found in collection:", item.id);
for await (const revision of client.beta.agents.versions.list(agent.id))
  console.log("History:", revision.version, revision.system);
// No automatic archival. That terminal operation must be a deliberate decision.
// This example manages configuration; it never creates a session or runs inference.
