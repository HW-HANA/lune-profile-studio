import { imageFix } from "./imageFix";
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
  return imageFix.exportNode(node, project, format, quality, includeBackground);
}
