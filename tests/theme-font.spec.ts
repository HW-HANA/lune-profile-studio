import { test, expect } from "@playwright/test";
test("preset parity, default artwork, individual colors and font persistence/export", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "导出图片", exact: true }),
  ).toBeEnabled();
  await expect(
    page.locator(".profile-avatar img,.profile-cover img"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "柔雾粉", exact: true }).click();
  const colors = () =>
    page
      .locator("#export-canvas")
      .evaluate((el) =>
        [
          ".profile-card",
          ".empty-cover",
          ".avatar",
          ".tags > span",
          ".follow",
        ].map((s) => getComputedStyle(el.querySelector(s)!).backgroundColor),
      );
  const before = await colors();
  await page.getByRole("button", { name: "自定义", exact: true }).click();
  expect(await colors()).toEqual(before);
  await page.getByLabel("默认头像底色", { exact: true }).fill("#cceedd");
  await page.getByLabel("默认封面", { exact: true }).fill("#ddeeff");
  await page.getByLabel("标签底色", { exact: true }).fill("#ffeedd");
  await expect(page.locator("#export-canvas .profile-avatar")).toHaveCSS(
    "background-color",
    "rgb(204, 238, 221)",
  );
  await expect(page.locator("#export-canvas .empty-cover")).toHaveCSS(
    "background-color",
    "rgb(221, 238, 255)",
  );
  await page
    .getByLabel("上传字体", { exact: true })
    .setInputFiles(
      "node_modules/@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2",
    );
  await expect(
    page.getByRole("button", { name: "恢复默认字体", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("已自动保存", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("#export-canvas")).toHaveCSS(
    "font-family",
    /LuneUploaded/,
  );
  await expect
    .poll(() =>
      page.evaluate(() => document.fonts.check('16px "LuneUploaded"')),
    )
    .toBe(true);
  await page.getByRole("button", { name: "导出图片", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出 PNG 图片", exact: true })
    .click();
  const result = await pending;
  await result.saveAs("../lune-custom-font.png");
  await page.getByRole("tab", { name: "外观样式" }).click();
  await page.getByRole("button", { name: "恢复默认字体", exact: true }).click();
  await expect(page.locator("#export-canvas")).not.toHaveCSS(
    "font-family",
    /LuneUploaded/,
  );
});
