import { toJpeg, toPng } from "html-to-image";
import type { Project } from "./model";
import { ensureFont } from "./font";
export function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
// 截图工具惯例：名称_年月日_时分秒，按时间排序且不会重名。
export function exportFilename(title: string, ext: string, date = new Date()) {
  const base = title.trim().replace(/[<>:"/\\|?*\s]+/g, "-") || "Lune";
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${base}_${stamp}.${ext}`;
}
export async function exportCanvas(
  project: Project,
  format: "png" | "jpg",
  quality: number,
  includeBackground = false,
) {
  const canvas = document.getElementById("export-canvas");
  const node = includeBackground
    ? canvas
    : canvas?.querySelector<HTMLElement>(
        ".profile-card, .posts-only-card, .chat-card",
      );
  if (!node) throw new Error("请先返回编辑器再导出");
  await ensureFont(project.font);
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map((img) => img.decode()),
  );
  const width = includeBackground ? 540 : node.offsetWidth;
  const height = includeBackground
    ? (540 * project.canvas.height) / project.canvas.width
    : node.offsetHeight;
  const outputWidth = project.canvas.width * quality;
  const outputHeight = includeBackground
    ? project.canvas.height * quality
    : Math.round((height / width) * outputWidth);
  const backgroundColor = includeBackground
    ? project.canvas.background
    : format === "jpg"
      ? getComputedStyle(node).backgroundColor
      : undefined;
  const options = {
    width,
    height,
    canvasWidth: outputWidth,
    canvasHeight: outputHeight,
    skipAutoScale: true,
    backgroundColor,
    quality: 0.96,
    preferredFontFormat: "woff2",
    style: {
      ...(includeBackground || format === "jpg" ? { borderRadius: "0" } : {}),
      boxShadow: "none",
      transform: "none",
      margin: "0",
    },
    filter: (el: HTMLElement) =>
      !el.classList?.contains("message-time") || project.chat.showTimestamp,
  };
  // Explicit output dimensions are in pixels; do not multiply these by pixelRatio again.
  const image = await (format === "png" ? toPng : toJpeg)(node, {
    ...options,
    pixelRatio: 1,
  });
  return { image, width: outputWidth, height: outputHeight };
}
