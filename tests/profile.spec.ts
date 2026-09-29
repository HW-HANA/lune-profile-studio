import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("profile only, custom colors persist and export correctly", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "导出图片", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText("聊天记录", { exact: true })).toHaveCount(0);
  await expect(page.getByText("灵感模板", { exact: true })).toHaveCount(0);
  await expect(page.getByText("存为模板", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "自定义", exact: true }).click();
  await page.getByLabel("主页底色", { exact: true }).fill("#edf5ff");
  await page.getByLabel("按钮与强调色", { exact: true }).fill("#2463aa");
  await page.getByLabel("文字颜色", { exact: true }).fill("#16283b");
  await expect(page.locator("#export-canvas .profile-card")).toHaveCSS(
    "background-color",
    "rgb(237, 245, 255)",
  );
  await expect(page.locator("#export-canvas .follow")).toHaveCSS(
    "background-color",
    "rgb(36, 99, 170)",
  );
  await expect(page.getByText("已自动保存", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("#export-canvas")).toHaveAttribute(
    "data-theme",
    "custom",
  );
  await page.getByRole("button", { name: "导出图片", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出 PNG 图片", exact: true })
    .click();
  const dl = await pending;
  const bytes = await readFile((await dl.path())!);
  const src = "data:image/png;base64," + bytes.toString("base64");
  const pixel = await page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    return [...ctx.getImageData(2, Math.floor(image.height / 2), 1, 1).data];
  }, src);
  expect(pixel).toEqual([237, 245, 255, 255]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.getByRole("button", { name: "样式", exact: true }).click();
  await expect(page.getByLabel("主页底色", { exact: true })).toBeVisible();
});
