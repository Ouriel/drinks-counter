import { test, expect } from "@playwright/test";

// The happy path on a real deployment: start an evening, count a drink, see the summary.
// Each run adds one session at "smoke test bar" to the preview database.
test("start an evening, count a drink, see it in the summary", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Start counting" }).click();
  await page.getByPlaceholder("Bar name…").fill("smoke test bar");
  await page.getByRole("button", { name: "Skip — I'll add manually" }).click();
  await expect(page).toHaveURL(/\/en\/s\/[a-z0-9-]+$/);

  await page.getByRole("button", { name: "+ Add a drink" }).click();
  await page.getByPlaceholder("Search or type a new drink…").fill("water");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel(/^water, 1\./)).toBeVisible();

  await page.getByRole("button", { name: "My Summary" }).click();
  await expect(page.getByText("drink total")).toBeVisible();
});

test("the stats page and the health check answer", async ({ page, request }) => {
  expect((await request.get("/api/health")).status()).toBe(200);
  await page.goto("/en/stats");
  await expect(page.getByText("TipsyTap Stats")).toBeVisible();
});
