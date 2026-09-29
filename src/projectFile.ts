import { initialProject, newMessage, newPost, type Project } from "./model";
import { palettes, migrateProject } from "./theme";
import { defaultCrop } from "./crop";

// Copy only known fields from the backup; never trust imported object prototypes.
function readShape<T>(sample: T, input: unknown): T {
  if (Array.isArray(sample)) {
    if (!Array.isArray(input) || input.length > 500)
      throw new Error("项目列表格式不正确");
    return input.map((value) => readShape(sample[0], value)) as T;
  }
  if (sample !== null && typeof sample === "object") {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error("项目字段缺失");
    const value: Record<string, unknown> = {};
    for (const [key, template] of Object.entries(sample))
      value[key] = readShape(template, (input as Record<string, unknown>)[key]);
    return value as T;
  }
  if (
    typeof sample !== typeof input ||
    (typeof input === "number" && !Number.isFinite(input))
  )
    throw new Error("项目字段类型不正确");
  return input as T;
}
export function parseProject(text: string): Project {
  const sample = initialProject();
  sample.profile.posts = [
    { ...newPost(), images: [""], imageCrops: [defaultCrop()] },
  ];
  sample.chat.messages = [newMessage()];
  const input = JSON.parse(text);
  if (
    !input?.profile ||
    !Array.isArray(input.profile.posts) ||
    input.profile.posts.some(
      (post: { images?: unknown }) => !post || !Array.isArray(post.images),
    )
  )
    throw new Error("项目字段缺失");
  const project = readShape(
    sample,
    migrateProject({
      ...input,
      colors: { ...palettes.light, ...input.colors },
      font: input.font ?? sample.font,
    }),
  );
  if (
    project.font.data &&
    (!/^data:font\/(woff2?|ttf|otf);base64,[A-Za-z0-9+/=]+$/.test(
      project.font.data,
    ) ||
      project.font.data.length > 28 * 1024 * 1024)
  )
    throw new Error("字体数据格式不正确");
  if (
    !["profile", "posts"].includes(project.mode) ||
    !["light", "pink", "night", "custom"].includes(project.theme) ||
    !["posts", "media", "about"].includes(project.profile.tab)
  )
    throw new Error("不支持的项目模式");
  if (
    [project.canvas.width, project.canvas.height].some(
      (n) => !Number.isInteger(n) || n < 320 || n > 3000,
    ) ||
    project.canvas.padding < 12 ||
    project.canvas.padding > 72 ||
    !/^#[0-9a-f]{6}$/i.test(project.canvas.background)
  )
    throw new Error("画布参数超出支持范围");
  const images = [
    project.profile.avatar,
    project.profile.cover,
    project.chat.avatar,
    project.chat.myAvatar,
    project.canvas.image,
    ...project.profile.posts.flatMap((p) => p.images),
    ...project.chat.messages.map((m) => m.image),
  ];
  if (
    images.some(
      (src) =>
        src &&
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src) &&
        !/^\.\/assets\/(avatar|cover|coffee|flowers|hands)\.jpg$/.test(src),
    )
  )
    throw new Error("备份中含有不支持的图片来源");
  if (
    project.profile.posts.some((post) => post.images.length > 4) ||
    project.chat.messages.some(
      (m) =>
        !["me", "them"].includes(m.role) ||
        ![
          "text",
          "image",
          "text-image",
          "date",
          "system",
          "typing",
          "voice",
          "withdrawn",
        ].includes(m.type),
    )
  )
    throw new Error("内容格式不正确");
  if (Object.values(project.colors).some((v) => !/^#[0-9a-f]{6}$/i.test(v)))
    throw new Error("自定义颜色格式不正确");
  return project;
}
