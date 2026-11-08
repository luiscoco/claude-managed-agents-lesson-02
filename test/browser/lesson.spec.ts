import { test, expect } from "@playwright/test";
import { V2 } from "../../src/shared/lesson.js";
test("student runs the version workflow, tests no-op updates, compares, and archives deliberately", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Run guided walkthrough" }).click();
  await expect(page.getByRole("status")).toContainText("Walkthrough complete");
  const id = await page.locator("#agent-id").innerText();
  await expect(page.locator("#agent-version")).toHaveText("2");
  await expect(page.locator("#history-count")).toHaveText("2 versions");
  await expect(page.locator("#changes")).toContainText("clarifying question");
  await expect(page.locator(".change-card")).toHaveCount(2);
  await expect(
    page.locator("#release-brief .formatted-response h3"),
  ).toHaveText("Configuration review");
  await page
    .getByText("Or manage the definition manually", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply changes with version check" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "No configuration change",
  );
  await expect(page.locator("#agent-version")).toHaveText("2");
  await page
    .locator("#agent-system")
    .fill("Ask for the lesson number, then give one example.");
  await page
    .getByRole("button", { name: "Apply changes with version check" })
    .click();
  await expect(page.locator("#agent-version")).toHaveText("3");
  await expect(page.locator("#agent-id")).toHaveText(id);
  await expect(page.locator("#history-count")).toHaveText("3 versions");
  await page.locator("#before-version").selectOption("1");
  await page.locator("#after-version").selectOption("3");
  await expect(page.locator("#changes")).toContainText("lesson number");
  await page
    .getByText("Retire an agent · permanent archival", { exact: true })
    .click();
  const archive = page.getByRole("button", {
    name: "Permanently archive selected agent",
  });
  await expect(archive).toBeDisabled();
  await page.locator("#archive-name").fill("Course Support Agent");
  await expect(archive).toBeEnabled();
  await archive.click();
  await expect(page.locator("#lifecycle")).toContainText("Archived");
  await expect(
    page.getByRole("button", { name: "Apply changes with version check" }),
  ).toBeDisabled();
  await expect(page.locator("#agent-system")).toBeDisabled();
  expect(errors).toEqual([]);
});

test("collection refresh preserves the editing baseline and a stale update is rejected", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByText("Or manage the definition manually", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Prepare a fresh definition", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create a new agent from these fields" })
    .click();
  await expect(page.getByRole("status")).toContainText("Agent created");
  const agentId = await page.locator("#agent-id").innerText();
  const changed = await request.post("/api/action", {
    data: { mode: "demo", action: "update", agentId, version: 1, draft: V2 },
  });
  expect(changed.ok()).toBe(true);
  await page
    .getByRole("button", { name: "Refresh agent collection", exact: true })
    .click();
  await expect(page.locator("#agent-version")).toHaveText("2");
  await expect(page.locator("#editor-baseline")).toContainText("version 1");
  await page
    .getByRole("button", { name: "Apply changes with version check" })
    .click();
  await expect(page.getByRole("status")).toContainText("Version conflict");
  await page
    .getByRole("button", { name: "Retrieve latest configuration" })
    .click();
  await expect(page.locator("#editor-baseline")).toContainText("version 2");
  await expect(page.locator("#agent-system")).toHaveValue(V2.system);
});
test("all method and field examples, UML steps, quiz, reading controls, and mobile layout work", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "02 · API & fields" }).click();
  await expect(page.locator(".namespace")).toHaveCount(15);
  for (const card of await page.locator(".namespace").all()) {
    await card.getByText("Inspect the code example", { exact: true }).click();
    await expect(card.locator("pre code.hljs")).toBeVisible();
    await expect(card.locator("pre code.hljs")).not.toBeEmpty();
  }
  await page.getByRole("tab", { name: "03 · How it works" }).click();
  await expect(
    page.getByRole("img", { name: "UML component architecture" }),
  ).toBeVisible();
  await page
    .getByText("Explore the full UML agent lifecycle", { exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "UML agent lifecycle workflow" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "5 · Apply a guarded update", exact: true })
    .click();
  await expect(page.locator(".workflow-step-detail")).toContainText("409");
  await expect(page.locator('.uml-action[data-workflow-step="4"]')).toHaveClass(
    /selected/,
  );
  await expect(page.locator("#example-code .hljs-keyword").first()).toHaveText(
    "import",
  );
  await page.getByRole("tab", { name: "04 · Check understanding" }).click();
  for (const [i, answer] of [0, 1, 2, 1, 2, 0].entries())
    await page.locator(`input[name="q-${i}"]`).nth(answer).check();
  await expect(page.locator("#score")).toHaveText("6 / 6 correct");
  await page.getByRole("button", { name: "Larger", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-text", "larger");
  await page.getByRole("tab", { name: "03 · How it works" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("browser renders user configuration literally and HTTP boundary rejects invalid actions", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByText("Or manage the definition manually", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Prepare a fresh definition", exact: true })
    .click();
  await page
    .locator("#agent-system")
    .fill('<img src="x" onerror="window.attacked=true">');
  await page
    .getByRole("button", { name: "Create a new agent from these fields" })
    .click();
  await expect(page.getByRole("status")).toContainText("Agent created");
  await page
    .getByText("Inspect current configuration", { exact: true })
    .click();
  await expect(page.locator("#current-json code")).toContainText("<img");
  await expect(page.locator("#current-json img")).toHaveCount(0);
  expect(await page.evaluate(() => "attacked" in window)).toBe(false);
  const other = await request.post("/api/action", {
    data: {
      mode: "demo",
      action: "archive",
      agentId: "foreign-agent",
      confirmName: "x",
    },
  });
  expect(other.status()).toBe(404);
  const cross = await request.post("/api/action", {
    headers: { origin: "https://example.org" },
    data: { mode: "demo", action: "list" },
  });
  expect(cross.status()).toBe(403);
  const invalid = await request.post("/api/action", {
    data: { mode: "demo", action: "create", draft: { name: "" } },
  });
  expect(invalid.status()).toBe(400);
});
