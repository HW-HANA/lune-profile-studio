import type { CSSProperties } from "react";
import type { Project, Theme } from "./model";
import { normalizeCrop } from "./crop";
export interface Palette {
  surface: string;
  accent: string;
  text: string;
  cover: string;
  avatar: string;
  avatarIcon: string;
  tag: string;
  tagText: string;
  muted: string;
  line: string;
  buttonText: string;
  badge: string;
}
export const palettes: Record<"light" | "pink" | "night", Palette> = {
  light: {
    surface: "#ffffff",
    accent: "#111113",
    text: "#18181a",
    cover: "#f3f3f5",
    avatar: "#f3f3f5",
    avatarIcon: "#898a8d",
    tag: "#f3f3f5",
    tagText: "#898a8d",
    muted: "#898a8d",
    line: "#ececee",
    buttonText: "#ffffff",
    badge: "#93a38b",
  },
  pink: {
    surface: "#fffafb",
    accent: "#f5c7d5",
    text: "#2b2527",
    cover: "#fff0f4",
    avatar: "#fff0f4",
    avatarIcon: "#a08c94",
    tag: "#fff0f4",
    tagText: "#a08c94",
    muted: "#a08c94",
    line: "#f0e7eb",
    buttonText: "#2a2225",
    badge: "#a08c94",
  },
  night: {
    surface: "#111214",
    accent: "#f0f0f2",
    text: "#f5f5f7",
    cover: "#1c1d20",
    avatar: "#1c1d20",
    avatarIcon: "#96979e",
    tag: "#1c1d20",
    tagText: "#96979e",
    muted: "#96979e",
    line: "#2b2c30",
    buttonText: "#18181a",
    badge: "#93a38b",
  },
};
export function selectTheme(d: Project, theme: Theme) {
  if (theme === "custom" && d.theme !== "custom")
    d.colors = { ...palettes[d.theme] };
  d.theme = theme;
}
export function paletteVariables(p: Project): CSSProperties {
  const c = p.theme === "custom" ? p.colors : palettes[p.theme];
  return {
    "--surface": c.surface,
    "--surface-soft": c.cover,
    "--text": c.text,
    "--muted": c.muted,
    "--social-line": c.line,
    "--bubble-out": c.accent,
    "--out-text": c.buttonText,
    "--profile-accent": c.accent,
    "--cover-color": c.cover,
    "--avatar-color": c.avatar,
    "--avatar-icon": c.avatarIcon,
    "--tag-color": c.tag,
    "--tag-text": c.tagText,
    "--badge-color": c.badge,
  } as CSSProperties;
}
export function migrateProject(p: Project): Project {
  const posts = p.profile.posts.map((post) => ({
    ...post,
    imageAspect: post.imageAspect ?? ("auto" as const),
    imagePosition: post.imagePosition ?? "50% 50%",
    imageCrops: post.images.map((_, i) =>
      normalizeCrop(post.imageCrops?.[i], post.imagePosition),
    ),
  }));
  return {
    ...p,
    mode: p.mode === "chat" ? "profile" : (p.mode ?? "profile"),
    colors: { ...palettes.light, ...p.colors },
    font: p.font ?? { name: "", data: "" },
    profile: {
      ...p.profile,
      avatarPosition: p.profile.avatarPosition ?? "50% 50%",
      coverPosition: p.profile.coverPosition ?? "50% 50%",
      avatarCrop: normalizeCrop(p.profile.avatarCrop, p.profile.avatarPosition),
      coverCrop: normalizeCrop(p.profile.coverCrop, p.profile.coverPosition),
      avatar:
        p.profile.avatar === "./assets/avatar.jpg" ? "" : p.profile.avatar,
      cover: p.profile.cover === "./assets/cover.jpg" ? "" : p.profile.cover,
      posts,
    },
  };
}
