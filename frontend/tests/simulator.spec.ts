import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?demo=1");
  await expect(
    page.getByRole("button", { name: "Simulate purchase", exact: true }),
  ).toBeEnabled();
});

test("reproducible fill highlights the exact asks", async ({ page }) => {
  await page
    .getByRole("button", { name: "Simulate purchase", exact: true })
    .click();
  await expect(page.locator(".quantity")).toContainText("0.13154505");
  await expect(page.locator("tr.consumed")).toHaveCount(4);
  await page.getByText("View execution breakdown").click();
  await expect(page.locator(".fills-scroll tbody tr")).toHaveCount(4);
  await page.getByRole("button", { name: "$1,000", exact: true }).click();
  await expect(page.locator(".quantity")).toHaveCount(0);
});

test("large budgets preserve the unfilled remainder", async ({ page }) => {
  await page.getByLabel("How much would you spend?").fill("1000000");
  await page
    .getByRole("button", { name: "Simulate purchase", exact: true })
    .click();
  await expect(page.locator(".partial-warning")).toBeVisible();
  await expect(page.locator(".quantity")).toContainText("2.52500000");
  await expect(page.locator(".receipt")).toContainText("$807,497.90");
});

test("fee stays within the budget and invalid inputs are explained", async ({
  page,
}) => {
  await page.getByLabel("Fee assumption").selectOption("40");
  await page
    .getByRole("button", { name: "Simulate purchase", exact: true })
    .click();
  await expect(page.locator(".receipt")).toContainText("$39.85");
  await expect(page.locator(".receipt-total")).toContainText("$10,000.00");
  await page.getByLabel("How much would you spend?").fill("NaN");
  await page
    .getByRole("button", { name: "Simulate purchase", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "at most two decimal places",
  );
});

test("mobile and explanation dialog remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "How it works", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Simulate purchase", exact: true })
    .click();
  await expect(page.locator(".quantity")).toContainText("0.13154505");
});

test("live failure never silently substitutes synthetic prices", async ({
  page,
}) => {
  await page.route("**/api/book?source=live", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "Live data is unavailable. Retry shortly or explore the demo.",
      }),
    }),
  );
  await page.getByRole("button", { name: "Live market", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Live data is unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Simulate purchase", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Explore demo" }).click();
  await expect(page.locator(".notice.demo")).toContainText("synthetic");
});
