import html2canvas from "html2canvas";
import "./image-export-fix.js";
import type { Project } from "./model";

interface ImageFix {
  version: string;
  normalizeUpload(file: File): Promise<string>;
  exportNode(
    node: HTMLElement,
    project: Project,
    format: "png" | "jpg",
    multiplier: number,
    includeBackground: boolean,
  ): Promise<{ image: string; width: number; height: number }>;
}

declare global {
  interface Window {
    html2canvas: typeof html2canvas;
    LuneImageFix: ImageFix;
  }
}

window.html2canvas = html2canvas;
export const imageFix = window.LuneImageFix;
