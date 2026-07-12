import { expect, test, type Page } from "@playwright/test";

async function configureFakeProvider(page: Page, options: { collapse?: boolean } = {}) {
  await page.goto("/taskpane.html?mockOffice=1");
  await page.getByRole("button", { name: "Model settings" }).click();
  await page.getByLabel("Provider").selectOption("openai-compatible");
  await page.getByLabel("API base URL").fill("http://127.0.0.1:3002/v1");
  await page.getByLabel("API key").fill("fake-key");
  await page.getByRole("textbox", { name: "Model" }).fill("fake-model");

  if (options.collapse) {
    await page.getByRole("button", { name: "Model settings" }).click();
  }
}

test("tests the fake provider connection", async ({ page }) => {
  await configureFakeProvider(page);

  await page.getByRole("button", { name: "Test connection" }).click();

  await expect(page.getByRole("status")).toContainText(
    "Model connection works through direct provider access.",
  );
});

test("generates an answer in mock Word and copies it", async ({ page }) => {
  await configureFakeProvider(page, { collapse: true });

  await page.getByLabel("Question").fill("What does the selection say?");
  await page.getByRole("button", { name: "Generate from Word" }).click();

  await expect(page.getByLabel("Review result")).toContainText("Fake answer");
  await expect(page.getByRole("button", { name: "Copy answer" })).toBeVisible();
});

test("reviews an edit and inserts it below the mock selection", async ({ page }) => {
  await configureFakeProvider(page, { collapse: true });

  await page.getByRole("tab", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Rewrite" }).click();
  await page.getByLabel("Additional instruction").fill("Make it concise.");
  await page.getByRole("button", { name: "Generate from Word" }).click();

  await expect(page.getByTestId("diff-preview")).toContainText("Fake transformed text");
  await page.getByRole("button", { name: "Insert below" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Result inserted in the browser preview.",
  );
});

test("keeps the task pane usable at narrow Word widths", async ({ page }) => {
  for (const width of [280, 320, 400]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto("/taskpane.html?mockOffice=1");

    await expect(page.getByRole("tab", { name: "Ask" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Edit" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate from Word" }),
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  }

  await page.getByRole("button", { name: "Model settings" }).click();
  await expect(page.getByRole("button", { name: "Back to workspace" })).toBeVisible();

  const settingsOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(settingsOverflow).toBe(false);
});
