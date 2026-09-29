import type { Project } from "./model";
export const fontFamily = "LuneUploaded";
let current = "",
  pending: Promise<void> = Promise.resolve();
export function ensureFont(font: Project["font"]) {
  if (current === font.data) return pending;
  current = font.data;
  const style =
    document.getElementById("lune-uploaded-font") ??
    Object.assign(document.createElement("style"), {
      id: "lune-uploaded-font",
    });
  if (!style.parentNode) document.head.append(style);
  style.textContent = font.data
    ? `@font-face{font-family:"${fontFamily}";src:url("${font.data}");font-display:block;}`
    : "";
  pending = font.data
    ? document.fonts.load(`16px "${fontFamily}"`).then(() => {})
    : Promise.resolve();
  return pending;
}
export async function readFont(file: File) {
  if (!/\.(woff2?|ttf|otf)$/i.test(file.name))
    throw Error("支持 WOFF2、WOFF、TTF、OTF 字体");
  if (file.size > 20 * 1024 * 1024) throw Error("字体不能超过 20 MB");
  const buffer = await file.arrayBuffer();
  const probe = new FontFace("LuneFontCheck", buffer);
  await probe.load();
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () =>
      resolve(
        String(r.result).replace(
          /^data:[^;]*;/,
          `data:font/${file.name.split(".").pop()!.toLowerCase()};`,
        ),
      );
    r.onerror = () => reject(Error("读取失败"));
    r.readAsDataURL(file);
  });
  return { name: file.name, data };
}
