import { useState } from "react";
import { selectTheme } from "./theme";
import { readFont } from "./font";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Image,
  Plus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  Field,
  IconButton,
  Section,
  ThemeChoices,
  Toggle,
  UploadField,
} from "./components";
import { useStudio } from "./storage";
import {
  newMessage,
  newPost,
  presets,
  uid,
  type Message,
  type MessageType,
  type Profile,
} from "./model";
import {
  cropStyle,
  defaultCrop,
  postImageAspect,
  type CropTarget,
} from "./crop";

export function ProfileEditor({
  onCrop,
}: {
  onCrop: (target: CropTarget) => void;
}) {
  const { project, change } = useStudio();
  const p = project.profile;

  const update = (key: keyof Profile, value: unknown) =>
    change((d) => {
      Object.assign(d.profile, { [key]: value });
    }, `profile.${key}`);
  return (
    <>
      <Section title="基本信息">
        <div className="row-fields">
          <UploadField
            label="头像"
            value={p.avatar}
            onChange={(v) => {
              if (v) onCrop({ kind: "avatar", src: v });
              else
                change((d) => {
                  d.profile.avatar = "";
                  d.profile.avatarCrop = defaultCrop();
                });
            }}
            onEdit={() => onCrop({ kind: "avatar" })}
            crop={p.avatarCrop}
            round
            compact
          />
          <UploadField
            label="封面"
            value={p.cover}
            onChange={(v) => {
              if (v) onCrop({ kind: "cover", src: v });
              else
                change((d) => {
                  d.profile.cover = "";
                  d.profile.coverCrop = defaultCrop();
                });
            }}
            onEdit={() => onCrop({ kind: "cover" })}
            crop={p.coverCrop}
            compact
          />
        </div>
        <Field
          label="昵称"
          value={p.name}
          onChange={(v) => update("name", v)}
        />
        <Field
          label="用户名"
          value={p.username}
          onChange={(v) => update("username", v.replace(/^@/, ""))}
        />
        <Field
          label="个人简介"
          value={p.bio}
          onChange={(v) => update("bio", v)}
          multiline
        />
        <Field
          label="兴趣标签 · 用逗号分隔"
          value={p.tags}
          onChange={(v) => update("tags", v)}
        />
        <Toggle
          label="显示认证标识"
          checked={p.verified}
          onChange={(v) => update("verified", v)}
        />
      </Section>
      <Section title="详细信息">
        <Field
          label="所在地"
          value={p.location}
          onChange={(v) => update("location", v)}
        />
        <Field
          label="加入时间"
          value={p.joined}
          onChange={(v) => update("joined", v)}
        />
        <Field
          label="网站"
          value={p.website}
          onChange={(v) => update("website", v)}
        />
        <div className="row-fields">
          <Field
            label="正在关注"
            value={p.following}
            onChange={(v) => update("following", v)}
          />
          <Field
            label="关注者"
            value={p.followers}
            onChange={(v) => update("followers", v)}
          />
        </div>
        <div className="row-fields">
          <Field
            label="关注按钮 · 留空隐藏"
            value={p.followLabel}
            onChange={(v) => update("followLabel", v)}
          />
          <Field
            label="私信按钮 · 留空隐藏"
            value={p.messageLabel}
            onChange={(v) => update("messageLabel", v)}
          />
        </div>
        <label className="field">
          <span>展示栏目</span>
          <select
            aria-label="展示栏目"
            value={p.tab}
            onChange={(e) => update("tab", e.target.value)}
          >
            <option value="posts">动态</option>
            <option value="media">相册</option>
            <option value="about">关于</option>
          </select>
        </label>
      </Section>
    </>
  );
}
export function PostsEditor({
  onCrop,
}: {
  onCrop: (target: CropTarget) => void;
}) {
  const { project, change } = useStudio();
  const posts = project.profile.posts;
  const [open, setOpen] = useState<string | undefined>(posts[0]?.id);

  return (
    <Section title="动态" note={`${posts.length} 条动态`}>
      {posts.map((post, index) => (
        <div className="item-editor" key={post.id}>
          <button
            className="item-summary"
            onClick={() => setOpen(open === post.id ? undefined : post.id)}
          >
            <span className="item-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{post.text || "空白动态"}</span>
            <ChevronDown size={15} />
          </button>
          {open === post.id && (
            <div className="item-details">
              <Field
                label="动态内容"
                value={post.text}
                onChange={(v) =>
                  change((d) => {
                    d.profile.posts[index].text = v;
                  }, `post.${post.id}.text`)
                }
                multiline
              />
              <Field
                label="发布时间"
                value={post.time}
                onChange={(v) =>
                  change((d) => {
                    d.profile.posts[index].time = v;
                  }, `post.${post.id}.time`)
                }
              />
              <div className="post-upload-grid">
                {post.images.map((src, i) => (
                  <div key={i}>
                    <button
                      type="button"
                      className="crop-thumb"
                      aria-label={"裁切动态图片 " + (i + 1)}
                      style={{
                        aspectRatio: postImageAspect(
                          post.images.length,
                          i,
                          post.imageAspect,
                        ),
                      }}
                      onClick={() =>
                        onCrop({ kind: "post", postId: post.id, image: i })
                      }
                    >
                      <img
                        src={src}
                        style={cropStyle(post.imageCrops[i])}
                        alt={"图片 " + (i + 1)}
                      />
                      <span>裁切</span>
                    </button>
                    <IconButton
                      label={`删除图片 ${i + 1}`}
                      onClick={() =>
                        change((d) => {
                          d.profile.posts[index].images.splice(i, 1);
                          d.profile.posts[index].imageCrops.splice(i, 1);
                        })
                      }
                    >
                      <XIcon />
                    </IconButton>
                  </div>
                ))}
              </div>
              {post.images.length < 4 && (
                <UploadField
                  label={`动态图片（${post.images.length}/4）`}
                  value=""
                  onChange={(src) =>
                    onCrop({
                      kind: "post",
                      postId: post.id,
                      image: post.images.length,
                      src,
                    })
                  }
                />
              )}
              <div className="row-fields three">
                {(["comments", "reposts", "likes"] as const).map((key, i) => (
                  <Field
                    key={key}
                    label={["评论", "转发", "喜欢"][i]}
                    value={post[key]}
                    onChange={(v) =>
                      change((d) => {
                        d.profile.posts[index][key] = v;
                      }, `post.${post.id}.${key}`)
                    }
                  />
                ))}
              </div>
              <div className="item-tools">
                <IconButton
                  label="上移动动态"
                  disabled={!index}
                  onClick={() =>
                    change((d) => {
                      [d.profile.posts[index - 1], d.profile.posts[index]] = [
                        d.profile.posts[index],
                        d.profile.posts[index - 1],
                      ];
                    })
                  }
                >
                  <ArrowUp size={15} />
                </IconButton>
                <IconButton
                  label="下移动动态"
                  disabled={index === posts.length - 1}
                  onClick={() =>
                    change((d) => {
                      [d.profile.posts[index + 1], d.profile.posts[index]] = [
                        d.profile.posts[index],
                        d.profile.posts[index + 1],
                      ];
                    })
                  }
                >
                  <ArrowDown size={15} />
                </IconButton>
                <IconButton
                  label="复制动态"
                  onClick={() =>
                    change((d) => {
                      d.profile.posts.splice(index + 1, 0, {
                        ...structuredClone(post),
                        id: uid(),
                      });
                    })
                  }
                >
                  <Copy size={15} />
                </IconButton>
                <button
                  className="text-button danger"
                  onClick={() =>
                    change((d) => {
                      d.profile.posts.splice(index, 1);
                    })
                  }
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button
        className="add-button"
        onClick={() => {
          const post = newPost();
          change((d) => {
            d.profile.posts.push(post);
          });
          setOpen(post.id);
        }}
      >
        <Plus size={17} />
        添加一条动态
      </button>
      <p className="hint">点击单张图片调整裁切</p>
    </Section>
  );
}
function XIcon() {
  return <Trash2 size={13} />;
}
export function StyleEditor() {
  const [fontError, setFontError] = useState("");
  const [fontBusy, setFontBusy] = useState(false);
  const { project: p, change } = useStudio();
  const [custom, setCustom] = useState(
    !presets.some(
      (x) => x.width === p.canvas.width && x.height === p.canvas.height,
    ),
  );
  return (
    <>
      <Section title="主题">
        <span className="field-label">成品主题</span>
        <ThemeChoices
          value={p.theme}
          onChange={(v) =>
            change((d) => {
              selectTheme(d, v);
            })
          }
        />
        {p.theme === "custom" && (
          <div className="custom-colors">
            {(
              [
                "surface",
                "accent",
                "text",
                "cover",
                "avatar",
                "avatarIcon",
                "tag",
                "tagText",
                "muted",
                "line",
                "buttonText",
                "badge",
              ] as const
            ).map((key, i) => (
              <label className="color-setting" key={key}>
                <span>
                  {
                    [
                      "主页底色",
                      "按钮与强调色",
                      "文字颜色",
                      "默认封面",
                      "默认头像底色",
                      "头像图标",
                      "标签底色",
                      "标签文字",
                      "辅助文字",
                      "分隔线",
                      "按钮文字",
                      "认证标识",
                    ][i]
                  }
                </span>
                <input
                  type="color"
                  aria-label={
                    [
                      "主页底色",
                      "按钮与强调色",
                      "文字颜色",
                      "默认封面",
                      "默认头像底色",
                      "头像图标",
                      "标签底色",
                      "标签文字",
                      "辅助文字",
                      "分隔线",
                      "按钮文字",
                      "认证标识",
                    ][i]
                  }
                  value={p.colors[key]}
                  onChange={(e) =>
                    change((d) => {
                      d.colors[key] = e.target.value;
                    }, "color." + key)
                  }
                />
                <code>{p.colors[key]}</code>
              </label>
            ))}
          </div>
        )}
      </Section>
      <Section title="字体">
        <label className="upload-target">
          {fontBusy ? "正在加载…" : p.font.name || "上传字体"}
          <input
            aria-label="上传字体"
            type="file"
            accept=".woff2,.woff,.ttf,.otf"
            disabled={fontBusy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFontBusy(true);
              try {
                const font = await readFont(file);
                change((d) => {
                  d.font = font;
                });
                setFontError("");
              } catch (err) {
                setFontError("字体加载失败：" + (err as Error).message);
              } finally {
                setFontBusy(false);
                e.target.value = "";
              }
            }}
          />
        </label>
        {p.font.data && (
          <button
            className="text-button"
            onClick={() =>
              change((d) => {
                d.font = { name: "", data: "" };
              })
            }
          >
            恢复默认字体
          </button>
        )}
        <p className="hint">
          支持 WOFF2 / WOFF / TTF / OTF，最大 20
          MB。仅应用于主页内容；缺失的字形使用系统字体。
        </p>
        {fontError && (
          <p className="error" role="alert">
            {fontError}
          </p>
        )}
      </Section>
      <Section title="画布">
        <label className="field">
          <span>画布尺寸</span>
          <select
            aria-label="画布尺寸"
            value={custom ? "custom" : `${p.canvas.width}x${p.canvas.height}`}
            onChange={(e) => {
              if (e.target.value === "custom") setCustom(true);
              else {
                setCustom(false);
                const [width, height] = e.target.value.split("x").map(Number);
                change((d) => {
                  d.canvas.width = width;
                  d.canvas.height = height;
                });
              }
            }}
          >
            {presets.map((x) => (
              <option key={x.name} value={`${x.width}x${x.height}`}>
                {x.name} · {x.width} × {x.height}
              </option>
            ))}
            <option value="custom">自定义尺寸</option>
          </select>
        </label>
        {custom && (
          <CustomSize
            width={p.canvas.width}
            height={p.canvas.height}
            onChange={(width, height) =>
              change((d) => {
                d.canvas.width = width;
                d.canvas.height = height;
              })
            }
          />
        )}
        <label className="field">
          <span>
            画布留白 <b>{p.canvas.padding}</b>
          </span>
          <input
            aria-label="画布留白"
            type="range"
            min="12"
            max="72"
            value={p.canvas.padding}
            onChange={(e) =>
              change((d) => {
                d.canvas.padding = Number(e.target.value);
              }, "padding")
            }
          />
        </label>
        <span className="field-label">背景颜色</span>
        <div className="background-swatches">
          {[
            "#eeeae5",
            "#f6e7eb",
            "#e8ece7",
            "#e6e9ee",
            "#232325",
            "#ffffff",
          ].map((color) => (
            <button
              key={color}
              aria-label={`背景色 ${color}`}
              className={p.canvas.background === color ? "selected" : ""}
              style={{ background: color }}
              onClick={() =>
                change((d) => {
                  d.canvas.background = color;
                })
              }
            />
          ))}
          <input
            type="color"
            aria-label="自定义背景颜色"
            value={p.canvas.background}
            onChange={(e) =>
              change((d) => {
                d.canvas.background = e.target.value;
              }, "background")
            }
          />
        </div>
        <UploadField
          label="背景图片"
          value={p.canvas.image}
          onChange={(v) =>
            change((d) => {
              d.canvas.image = v;
            })
          }
        />
        <p className="hint">
          上传背景即可制作海报。内容会自动居中缩放，导出完整画布。
        </p>
      </Section>
    </>
  );
}
function CustomSize({
  width,
  height,
  onChange,
}: {
  width: number;
  height: number;
  onChange: (w: number, h: number) => void;
}) {
  const [w, setW] = useState(String(width));
  const [h, setH] = useState(String(height));
  const valid = (v: string) =>
    /^\d+$/.test(v) && Number(v) >= 320 && Number(v) <= 3000;
  return (
    <>
      <div className="row-fields">
        <Field
          label="宽度（px）"
          type="number"
          value={w}
          onChange={(v) => {
            setW(v);
            if (valid(v) && valid(h)) onChange(Number(v), Number(h));
          }}
        />
        <Field
          label="高度（px）"
          type="number"
          value={h}
          onChange={(v) => {
            setH(v);
            if (valid(v) && valid(w)) onChange(Number(w), Number(v));
          }}
        />
      </div>
      {(!valid(w) || !valid(h)) && (
        <p className="error">宽高需为 320–3000 的整数。</p>
      )}
    </>
  );
}
