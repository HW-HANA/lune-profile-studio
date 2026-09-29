import type { CSSProperties } from "react";

export interface ImageCrop {
  x: number;
  y: number;
  zoom: number;
}
export type CropTarget =
  | { kind: "avatar"; src?: string }
  | { kind: "cover"; src?: string }
  | {
      kind: "post";
      postId: string;
      image: number;
      src?: string;
      aspect?: number;
    };
export const defaultCrop = (): ImageCrop => ({ x: 50, y: 50, zoom: 1 });
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function normalizeCrop(
  value?: Partial<ImageCrop>,
  legacy?: string,
): ImageCrop {
  const position = legacy?.match(/([\d.]+)%\s+([\d.]+)%/);
  const finite = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return {
    x: clamp(finite(value?.x, Number(position?.[1] ?? 50)), 0, 100),
    y: clamp(finite(value?.y, Number(position?.[2] ?? 50)), 0, 100),
    zoom: clamp(finite(value?.zoom, 1), 1, 5),
  };
}
// Matching object-position and transform-origin keeps every edge covered.
// Editor, preview and export all use the same transform.
export function cropStyle(value?: ImageCrop): CSSProperties {
  const crop = normalizeCrop(value);
  const position = crop.x + "% " + crop.y + "%";
  return {
    objectPosition: position,
    transformOrigin: position,
    transform: "scale(" + crop.zoom + ")",
  };
}
export function dragCrop(
  crop: ImageCrop,
  dx: number,
  dy: number,
  frame: { width: number; height: number },
  image: { width: number; height: number },
): ImageCrop {
  const scale =
    Math.max(frame.width / image.width, frame.height / image.height) *
    crop.zoom;
  const overflowX = image.width * scale - frame.width;
  const overflowY = image.height * scale - frame.height;
  return {
    ...crop,
    x:
      overflowX > 0.01
        ? clamp(crop.x - (dx / overflowX) * 100, 0, 100)
        : crop.x,
    y:
      overflowY > 0.01
        ? clamp(crop.y - (dy / overflowY) * 100, 0, 100)
        : crop.y,
  };
}
// Existing 468 px profile card, 377 px media area, 5 px grid gutters.
export function postImageAspect(count: number, index: number, aspect = "auto") {
  const width = 377;
  const ratios: Record<string, number> = {
    square: 1,
    portrait: 4 / 5,
    landscape: 16 / 9,
  };
  const height = ratios[aspect]
    ? width / ratios[aspect]
    : count === 2
      ? 159
      : count === 4
        ? 240
        : 215;
  if (count === 1) return width / height;
  if (count === 2) return (width - 5) / 2 / height;
  if (count === 3)
    return index === 0
      ? ((width - 5) * 2) / 3 / height
      : (width - 5) / 3 / ((height - 5) / 2);
  return (width - 5) / 2 / ((height - 5) / 2);
}
