# Lesson 2 instructor guide

## Objective

Students can manage a reusable agent definition, explain ID versus version, inspect history, use an expected-version update, and recognize archival as terminal.

## A 20-minute practical exercise

1. **Predict (3 min).** Ask which identifier should change when the support instructions change.
2. **Observe (4 min).** Run the walkthrough. Read the management trace and identify the create, retrieve, update, collection, and version-history operations.
3. **Compare (4 min).** Compare v1 and v2. Name the changed fields and explain the new instructions.
4. **Apply (4 min).** Submit unchanged fields, then edit one sentence. Explain why only the latter creates a version.
5. **Trace (3 min).** Explore the UML component and activity diagrams. Locate the browser, host, managed service, and version-conflict path.
6. **Retrieve (2 min).** Answer the quiz and explain why creating a definition does not run an AI conversation.

## Discussion prompts

- Why create a new version rather than another agent for every sentence edit?
- What would a 409 prevent when two editors update at once?
- How is listing the agent collection different from listing one agent’s versions?
- Does a history comparison prove that the model follows the revised instructions?
- What continues to work after an agent is archived, and what becomes unavailable?
- Which configuration belongs to an agent, an environment, or a session?

## Demo and live

The demo models API management in memory and allows edits. It is explicitly simulated; no AI responses are generated. Live mode performs real SDK management operations. Neither mode starts a session or runs inference. The walkthrough never archives; retirement requires the selected name and a separate action.

## Expected results

- The walkthrough creates one agent ID and versions 1 and 2.
- Description and system instructions differ; the stable ID is unchanged.
- A no-op update preserves version 2.
- Editing another sentence creates version 3; v1 remains inspectable.
- Archived agents are read-only and remain visible when listing with archived resources included.

## Troubleshooting

| Symptom                           | What to inspect                                                   |
| --------------------------------- | ----------------------------------------------------------------- |
| Live option disabled              | Set the key in this repository’s `.env`, then restart Node        |
| Model or permission error         | Confirm Managed Agents access and model availability              |
| Version conflict                  | Retrieve the latest fields, review the other revision, then retry |
| Empty live selector after restart | Refresh the collection to restore registered IDs                  |
| New version does not appear       | Check whether the update actually changed configuration           |
| Update disabled                   | The selected agent may already be archived                        |

The exact model and beta contract can evolve. Keep the dependency pinned and verify supported fields before changing the lesson examples.
