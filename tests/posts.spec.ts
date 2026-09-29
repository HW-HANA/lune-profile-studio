import { test, expect } from "@playwright/test";

test("纯动态模式只保留动态流并可持久化导出", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "导出图片", exact: true }),
  ).toBeEnabled();

  await page.getByRole("button", { name: "纯动态", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "纯动态", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("tab", { name: "个人资料", exact: true })).toHaveCount(0);
  await expect(page.locator("#export-canvas .posts-only-card")).toHaveCount(1);
  await expect(page.locator("#export-canvas .profile-card")).toHaveCount(0);
  await expect(page.locator("#export-canvas .profile-cover")).toHaveCount(0);
  await expect(page.locator("#export-canvas .post")).toHaveCount(1);

  await page.getByRole("tab", { name: "动态内容", exact: true }).click();
  await expect(page.getByRole("button", { name: "添加一条动态", exact: true })).toBeVisible();
  await expect(page.getByText("已自动保存", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "纯动态", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("tab", { name: "个人资料", exact: true })).toHaveCount(0);
  await expect(page.locator("#export-canvas .posts-only-card")).toHaveCount(1);

  await page.getByRole("button", { name: "导出图片", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PNG 图片", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/^Lune_\d{8}_\d{6}\.png$/);
});

test("默认主页内容与动态图", async ({ page }) => {
  await page.goto("/");
  const card = page.locator("#export-canvas .profile-card");
  await expect(card.locator("h2")).toContainText("天使用户");
  await expect(card.locator(".username")).toHaveText("@AngelUser");
  await expect(card.locator(".post-image img")).toHaveAttribute(
    "src",
    "./assets/hands.jpg",
  );
  await expect(card.locator(".post-image img")).toHaveJSProperty(
    "complete",
    true,
  );
});
