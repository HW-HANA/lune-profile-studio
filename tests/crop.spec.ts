import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { initialProject, newPost } from "../src/model";
import { defaultCrop } from "../src/crop";
import { parseProject } from "../src/projectFile";

async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "导出图片", exact: true }),
  ).toBeEnabled();
}
async function fixture(page: Page) {
  const src = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 800;
    const ctx = c.getContext("2d")!;
    const colors = [
      "#ec5555",
      "#5fcb86",
      "#4d89ee",
      "#ffd04e",
      "#b66fdb",
      "#40c4ce",
    ];
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 3; x++) {
        ctx.fillStyle = colors[y * 3 + x];
        ctx.fillRect(x * 400, y * 400, 400, 400);
      }
    return c.toDataURL("image/png");
  });
  return {
    src,
    file: {
      name: "crop-test.png",
      mimeType: "image/png",
      buffer: Buffer.from(src.split(",")[1], "base64"),
    },
  };
}
async function drag(page: Page, dx = 43, dy = 27) {
  const rect = (await page.locator(".crop-frame").boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width / 2 + dx,
    rect.y + rect.height / 2 + dy,
    { steps: 8 },
  );
  await page.mouse.up();
}
async function zoom(page: Page) {
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "放大图片", exact: true }).click();
}
async function confirm(page: Page) {
  await page.getByRole("button", { name: "确定裁切", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function imageStyle(page: Page, selector: string) {
  return page.locator(selector).evaluate((image: HTMLImageElement) => ({
    position: image.style.objectPosition,
    transform: image.style.transform,
  }));
}

test("avatar upload opens a single crop preview; confirm, cancel, undo and reload are transactional", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator("#export-canvas")).toHaveAttribute(
    "data-theme",
    "pink",
  );
  const { file } = await fixture(page);
  await page.getByLabel("上传头像", { exact: true }).setInputFiles(file);
  await expect(
    page.getByRole("dialog", { name: "裁切头像", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".crop-frame img")).toHaveCount(1);
  await expect(page.locator(".crop-mask.is-round")).toBeVisible();
  await expect(page.locator("#export-canvas .profile-avatar img")).toHaveCount(
    0,
  );
  await expect(page.getByRole("dialog").getByRole("slider")).toHaveCount(0);
  await zoom(page);
  await drag(page);
  const selected = await imageStyle(page, ".crop-frame img");
  expect(selected.position).not.toBe("50% 50%");
  await page.screenshot({ path: "../../outputs/lune-avatar-crop.png" });
  await confirm(page);
  expect(await imageStyle(page, "#export-canvas .profile-avatar img")).toEqual(
    selected,
  );
  expect(await imageStyle(page, "#export-canvas .post > .avatar img")).toEqual(
    selected,
  );
  await page.getByRole("button", { name: "裁切头像", exact: true }).click();
  expect(await imageStyle(page, ".crop-frame img")).toEqual(selected);
  await drag(page, -60, -30);
  await page.getByRole("button", { name: "取消", exact: true }).click();
  expect(await imageStyle(page, "#export-canvas .profile-avatar img")).toEqual(
    selected,
  );
  await page.getByLabel("上传头像", { exact: true }).setInputFiles(file);
  await expect(
    page.getByRole("dialog", { name: "裁切头像", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await imageStyle(page, "#export-canvas .profile-avatar img")).toEqual(
    selected,
  );
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator("#export-canvas .profile-avatar img")).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(page.getByText("已自动保存", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.locator("#export-canvas .profile-avatar img"),
  ).toBeVisible();
  expect(await imageStyle(page, "#export-canvas .profile-avatar img")).toEqual(
    selected,
  );
});

test("cover import opens the matching wide frame and clicking the cover reopens it", async ({
  page,
}) => {
  await ready(page);
  const { file } = await fixture(page);
  await page.getByLabel("上传封面", { exact: true }).setInputFiles(file);
  await expect(
    page.getByRole("dialog", { name: "裁切封面", exact: true }),
  ).toBeVisible();
  const frame = (await page.locator(".crop-frame").boundingBox())!;
  expect(frame.width / frame.height).toBeCloseTo(468 / 147, 2);
  await zoom(page);
  await drag(page);
  const selected = await imageStyle(page, ".crop-frame img");
  await page.screenshot({ path: "../../outputs/lune-cover-crop.png" });
  await confirm(page);
  expect(await imageStyle(page, "#export-canvas .profile-cover img")).toEqual(
    selected,
  );
  await page.getByRole("button", { name: "裁切封面", exact: true }).click();
  expect(await imageStyle(page, ".crop-frame img")).toEqual(selected);
  await page.keyboard.press("Escape");
});

test("each post image has its own crop; adding, removing and changing grids retain the correct image", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("tab", { name: "动态内容", exact: true }).click();
  await expect(page.getByLabel("动态图片比例", { exact: true })).toHaveCount(0);
  const thumbs = page.locator(".post-upload-grid .crop-thumb");
  // 默认动态只有一张图，先补一张以覆盖多图场景。
  await page
    .getByLabel("上传动态图片（1/4）", { exact: true })
    .setInputFiles((await fixture(page)).file);
  await confirm(page);
  await expect(thumbs).toHaveCount(2);
  const originalSecond = await imageStyle(
    page,
    "#export-canvas .post-image:nth-child(2) img",
  );
  await thumbs.nth(0).click();
  const rendered = (await page
    .locator("#export-canvas .post-image")
    .nth(0)
    .boundingBox())!;
  const frame = (await page.locator(".crop-frame").boundingBox())!;
  expect(frame.width / frame.height).toBeCloseTo(
    rendered.width / rendered.height,
    2,
  );
  await zoom(page);
  await drag(page);
  const first = await imageStyle(page, ".crop-frame img");
  await confirm(page);
  expect(
    await imageStyle(page, "#export-canvas .post-image:nth-child(1) img"),
  ).toEqual(first);
  expect(
    await imageStyle(page, "#export-canvas .post-image:nth-child(2) img"),
  ).toEqual(originalSecond);
  await thumbs.nth(1).click();
  await zoom(page);
  await drag(page, -30, -20);
  const second = await imageStyle(page, ".crop-frame img");
  await confirm(page);
  expect(
    await imageStyle(page, "#export-canvas .post-image:nth-child(1) img"),
  ).toEqual(first);
  const { file } = await fixture(page);
  await page
    .getByLabel("上传动态图片（2/4）", { exact: true })
    .setInputFiles(file);
  await expect(
    page.getByRole("dialog", { name: "裁切动态图片 3", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(thumbs).toHaveCount(2);
  await page
    .getByLabel("上传动态图片（2/4）", { exact: true })
    .setInputFiles(file);
  const thirdFrame = (await page.locator(".crop-frame").boundingBox())!;
  await confirm(page);
  const thirdTile = (await page
    .locator("#export-canvas .post-image")
    .nth(2)
    .boundingBox())!;
  expect(thirdFrame.width / thirdFrame.height).toBeCloseTo(
    thirdTile.width / thirdTile.height,
    2,
  );
  await page
    .getByLabel("上传动态图片（3/4）", { exact: true })
    .setInputFiles(file);
  const fourthFrame = (await page.locator(".crop-frame").boundingBox())!;
  await confirm(page);
  const fourthTile = (await page
    .locator("#export-canvas .post-image")
    .nth(3)
    .boundingBox())!;
  expect(fourthFrame.width / fourthFrame.height).toBeCloseTo(
    fourthTile.width / fourthTile.height,
    2,
  );
  await expect(thumbs).toHaveCount(4);
  await page.getByRole("button", { name: "删除图片 1", exact: true }).click();
  expect(
    await imageStyle(page, "#export-canvas .post-image:nth-child(1) img"),
  ).toEqual(second);
  await page.locator("#export-canvas .post-image").nth(0).click();
  expect(await imageStyle(page, ".crop-frame img")).toEqual(second);
  await page.keyboard.press("Escape");
});

test("selected crop appears identically in PNG and survives project backup restore", async ({
  page,
}) => {
  await ready(page);
  const { src } = await fixture(page);
  const project = initialProject();
  project.profile.posts = [
    { ...newPost(), images: [src], imageCrops: [defaultCrop()] },
  ];
  await page.getByLabel("恢复项目备份").setInputFiles({
    name: "fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.locator("#export-canvas .post-image").click();
  await zoom(page);
  await drag(page, 31, 19);
  const selected = await imageStyle(page, ".crop-frame img");
  const previewBox = (await page.locator(".crop-frame").boundingBox())!;
  await page
    .locator(".crop-mask")
    .evaluate((el: HTMLElement) => (el.style.visibility = "hidden"));
  const cropShot = await page.locator(".crop-frame").screenshot();
  await confirm(page);
  const sampleBox = await page
    .locator("#export-canvas .post-image")
    .evaluate((el) => {
      const card = el.closest(".profile-card")!.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return {
        x: (r.x - card.x) / card.width,
        y: (r.y - card.y) / card.width,
        width: r.width / card.width,
        height: r.height / card.width,
      };
    });
  await page.getByRole("button", { name: "导出图片", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出 PNG 图片", exact: true })
    .click();
  const download = await pending;
  const bytes = await readFile((await download.path())!);
  const diffs = await page.evaluate(
    async ({ preview, exported, box }) => {
      async function canvas(src: string) {
        const image = new Image();
        image.src = src;
        await image.decode();
        const c = document.createElement("canvas");
        c.width = image.width;
        c.height = image.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(image, 0, 0);
        return { c, ctx };
      }
      const a = await canvas(preview),
        b = await canvas(exported);
      const result: number[] = [];
      for (const x of [0.17, 0.51, 0.83])
        for (const y of [0.17, 0.51, 0.83]) {
          const p = a.ctx.getImageData(
            Math.floor(a.c.width * x),
            Math.floor(a.c.height * y),
            1,
            1,
          ).data;
          const q = b.ctx.getImageData(
            Math.floor((box.x + box.width * x) * b.c.width),
            Math.floor((box.y + box.height * y) * b.c.width),
            1,
            1,
          ).data;
          result.push(...p.map((channel, i) => Math.abs(channel - q[i])));
        }
      return result;
    },
    {
      preview: "data:image/png;base64," + cropShot.toString("base64"),
      exported: "data:image/png;base64," + bytes.toString("base64"),
      box: sampleBox,
    },
  );
  expect(Math.max(...diffs)).toBeLessThan(8);
  expect(previewBox.width / previewBox.height).toBeCloseTo(
    sampleBox.width / sampleBox.height,
    2,
  );
  const backupPending = page.waitForEvent("download");
  await page.getByRole("button", { name: "备份项目", exact: true }).click();
  const backup = await backupPending;
  const data = await readFile((await backup.path())!);
  const parsed = parseProject(data.toString());
  expect(parsed.profile.posts[0].imageCrops[0].zoom).toBeGreaterThan(1);
  await page.getByLabel("恢复项目备份").setInputFiles({
    name: "restore.json",
    mimeType: "application/json",
    buffer: data,
  });
  expect(await imageStyle(page, "#export-canvas .post-image img")).toEqual(
    selected,
  );
});

test("legacy project positions migrate to separate image crops", () => {
  const p = JSON.parse(JSON.stringify(initialProject()));
  delete p.profile.avatarCrop;
  delete p.profile.coverCrop;
  p.profile.avatarPosition = "25% 70%";
  p.profile.posts[0].images = ["./assets/coffee.jpg", "./assets/flowers.jpg"];
  p.profile.posts[0].imagePosition = "10% 80%";
  delete p.profile.posts[0].imageCrops;
  const result = parseProject(JSON.stringify(p));
  expect(result.profile.avatarCrop).toEqual({ x: 25, y: 70, zoom: 1 });
  expect(result.profile.posts[0].imageCrops).toEqual([
    { x: 10, y: 80, zoom: 1 },
    { x: 10, y: 80, zoom: 1 },
  ]);
  expect(result.profile.posts[0].imageCrops[0]).not.toBe(
    result.profile.posts[0].imageCrops[1],
  );
});

test("mobile crop dialog fits the screen and supports native touch dragging", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5175/");
  await expect(
    page.getByRole("button", { name: "导出图片", exact: true }),
  ).toBeEnabled();
  await page.locator("#export-canvas .post-image").nth(0).tap();
  await zoom(page);
  const before = await imageStyle(page, ".crop-frame img");
  const rect = (await page.locator(".crop-frame").boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const x = rect.x + rect.width / 2,
    y = rect.y + rect.height / 2;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 5; step++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + step * 7, y: y + step * 4 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect((await imageStyle(page, ".crop-frame img")).position).not.toBe(
    before.position,
  );
  const box = (await page.getByRole("dialog").boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: "../../outputs/lune-mobile-crop.png" });
  await confirm(page);
  await context.close();
});
