import { paletteVariables } from "./theme";
import { cropStyle, type CropTarget } from "./crop";
import type { KeyboardEvent } from "react";
import { ensureFont, fontFamily } from "./font";
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Heart,
  Link,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Repeat2,
  Share2,
  Smile,
  Video,
  AudioLines,
  UserRound,
} from "lucide-react";
import { Avatar } from "./components";
import {
  groupPosition,
  type Project,
  type Message,
  type Profile,
} from "./model";
function editCrop(target: CropTarget, onCrop?: (target: CropTarget) => void) {
  if (!onCrop) return {};
  return {
    role: "button",
    tabIndex: 0,
    title: "点击裁切",
    "aria-label":
      target.kind === "avatar"
        ? "裁切头像"
        : target.kind === "cover"
          ? "裁切封面"
          : "裁切动态图片 " + (target.image + 1),
    onClick: () => onCrop(target),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onCrop(target);
      }
    },
  };
}
export function ProfilePreview({
  profile: p,
  onCrop,
}: {
  profile: Profile;
  onCrop?: (target: CropTarget) => void;
}) {
  return (
    <article className="profile-card">
      <div
        className={"profile-cover " + (p.cover ? "" : "empty-cover")}
        {...editCrop({ kind: "cover" }, p.cover ? onCrop : undefined)}
      >
        {p.cover && (
          <img src={p.cover} alt="主页封面" style={cropStyle(p.coverCrop)} />
        )}
      </div>
      <div className="profile-body">
        <div className="profile-actions">
          <span
            className="avatar profile-avatar"
            {...editCrop({ kind: "avatar" }, p.avatar ? onCrop : undefined)}
          >
            {p.avatar ? (
              <img
                src={p.avatar}
                alt={p.name + "的头像"}
                style={cropStyle(p.avatarCrop)}
              />
            ) : (
              <UserRound size={22} />
            )}
          </span>
          <div className="social-actions">
            <MoreHorizontal size={19} />
            {p.messageLabel && (
              <span className="social-button">{p.messageLabel}</span>
            )}
            {p.followLabel && (
              <span className="social-button follow">{p.followLabel}</span>
            )}
          </div>
        </div>
        <h2>
          {p.name}
          {p.verified && <BadgeCheck size={18} className="verified" />}
        </h2>
        <div className="username">@{p.username}</div>
        <p className="profile-bio">{p.bio}</p>
        {p.tags && (
          <div className="tags">
            {p.tags
              .split(/[,，]/)
              .filter(Boolean)
              .map((tag, i) => (
                <span key={i}>{tag.trim()}</span>
              ))}
          </div>
        )}
        <div className="profile-meta">
          {p.location && (
            <span>
              <MapPin />
              {p.location}
            </span>
          )}
          {p.joined && (
            <span>
              <CalendarDays />
              {p.joined}
            </span>
          )}
          {p.website && (
            <span>
              <Link />
              {p.website}
            </span>
          )}
        </div>
        <div className="profile-stats">
          <span>
            <b>{p.following}</b> 正在关注
          </span>
          <span>
            <b>{p.followers}</b> 关注者
          </span>
        </div>
      </div>
      <div className="profile-tabs">
        {[
          ["posts", "动态"],
          ["media", "相册"],
          ["about", "关于"],
        ].map(([key, label]) => (
          <span key={key} className={p.tab === key ? "active" : ""}>
            {label}
          </span>
        ))}
      </div>
      {p.tab === "about" ? (
        <div className="about-content">
          <p>{p.bio}</p>
          <p>{p.location}</p>
          <p>{p.website}</p>
        </div>
      ) : p.tab === "media" ? (
        <div className="media-gallery">
          {p.posts.flatMap((post) =>
            post.images.map((src, i) => (
              <div
                key={post.id + "." + i}
                className="gallery-image crop-image"
                {...editCrop(
                  { kind: "post", postId: post.id, image: i, aspect: 1 },
                  onCrop,
                )}
              >
                <img
                  src={src}
                  style={cropStyle(post.imageCrops[i])}
                  alt={"相册照片 " + (i + 1)}
                />
              </div>
            )),
          )}
          {!p.posts.some((post) => post.images.length) && (
            <p className="empty-note">暂无照片</p>
          )}
        </div>
      ) : (
        <div className="posts">
          {p.posts.map((post) => (
            <section className="post" key={post.id}>
              <Avatar src={p.avatar} name={p.name} crop={p.avatarCrop} />
              <div className="post-main">
                <div className="post-byline">
                  <b>{p.name}</b>
                  {p.verified && <BadgeCheck size={13} className="verified" />}
                  <span>@{p.username}</span>
                  <MoreHorizontal size={16} />
                </div>
                <div className="post-time">{post.time}</div>
                <p className="post-text">{post.text}</p>
                {!!post.images.length && (
                  <div
                    className={`post-images count-${post.images.length} aspect-${post.imageAspect || "auto"}`}
                  >
                    {post.images.map((src, i) => (
                      <div
                        key={i}
                        className="post-image crop-image"
                        {...editCrop(
                          { kind: "post", postId: post.id, image: i },
                          onCrop,
                        )}
                      >
                        <img
                          src={src}
                          style={cropStyle(post.imageCrops[i])}
                          alt={"动态图片 " + (i + 1)}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="post-interactions">
                  <span>
                    <MessageCircle />
                    {post.comments}
                  </span>
                  <span>
                    <Repeat2 />
                    {post.reposts}
                  </span>
                  <span>
                    <Heart />
                    {post.likes}
                  </span>
                  <Bookmark />
                  <Share2 />
                </div>
              </div>
            </section>
          ))}
          {!p.posts.length && <p className="empty-note">暂无动态</p>}
        </div>
      )}
    </article>
  );
}
export function PostsOnlyPreview({
  profile,
  onCrop,
}: {
  profile: Profile;
  onCrop?: (target: CropTarget) => void;
}) {
  return (
    <article className="posts-only-card">
      <PostsFeed profile={profile} onCrop={onCrop} />
    </article>
  );
}
function PostsFeed({
  profile: p,
  onCrop,
}: {
  profile: Profile;
  onCrop?: (target: CropTarget) => void;
}) {
  return (
    <div className="posts">
      {p.posts.map((post) => (
        <section className="post" key={post.id}>
          <Avatar src={p.avatar} name={p.name} crop={p.avatarCrop} />
          <div className="post-main">
            <div className="post-byline">
              <b>{p.name}</b>
              {p.verified && <BadgeCheck size={13} className="verified" />}
              <span>@{p.username}</span>
              <MoreHorizontal size={16} />
            </div>
            <div className="post-time">{post.time}</div>
            <p className="post-text">{post.text}</p>
            {!!post.images.length && (
              <div
                className={
                  "post-images count-" +
                  post.images.length +
                  " aspect-" +
                  (post.imageAspect || "auto")
                }
              >
                {post.images.map((src, i) => (
                  <div
                    key={i}
                    className="post-image crop-image"
                    {...editCrop(
                      { kind: "post", postId: post.id, image: i },
                      onCrop,
                    )}
                  >
                    <img
                      src={src}
                      style={cropStyle(post.imageCrops[i])}
                      alt={"动态图片 " + (i + 1)}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="post-interactions">
              <span>
                <MessageCircle />
                {post.comments}
              </span>
              <span>
                <Repeat2 />
                {post.reposts}
              </span>
              <span>
                <Heart />
                {post.likes}
              </span>
              <Bookmark />
              <Share2 />
            </div>
          </div>
        </section>
      ))}
      {!p.posts.length && <p className="empty-note">暂无动态</p>}
    </div>
  );
}
export function Canvas({
  project,
  id,
  className = "",
  onCrop,
}: {
  project: Project;
  id?: string;
  onCrop?: (target: CropTarget) => void;
  className?: string;
}) {
  useEffect(() => {
    void ensureFont(project.font).catch(() => {});
  }, [project.font.data]);
  const card = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(600);
  const canvasHeight = (540 * project.canvas.height) / project.canvas.width;
  // Extreme landscape ratios still need a positive content box.
  const padding = Math.min(project.canvas.padding, canvasHeight * 0.15);
  const availableWidth = 540 - padding * 2;
  const availableHeight = canvasHeight - padding * 2;
  const scale = Math.min(1, availableWidth / 468, availableHeight / height);
  useLayoutEffect(() => {
    const el = card.current!;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    setHeight(el.offsetHeight);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      id={id}
      className={`export-canvas ${className}`}
      data-theme={project.theme}
      style={{
        ...paletteVariables(project),
        fontFamily: project.font.data
          ? fontFamily + ", var(--font-ui)"
          : "var(--font-ui)",
        width: 540,
        height: canvasHeight,
        backgroundColor: project.canvas.background,
        backgroundImage: project.canvas.image
          ? `url("${project.canvas.image}")`
          : undefined,
      }}
    >
      <div
        className="canvas-card-wrap"
        style={{ width: 468 * scale, height: height * scale }}
      >
        <div
          ref={card}
          className="canvas-card"
          style={{ transform: `scale(${scale})` }}
        >
          {project.mode === "posts" ? (
            <PostsOnlyPreview profile={project.profile} onCrop={onCrop} />
          ) : (
            <ProfilePreview profile={project.profile} onCrop={onCrop} />
          )}
        </div>
      </div>
    </div>
  );
}
export function ResponsiveCanvas({
  project,
  id,
  onCrop,
}: {
  project: Project;
  id?: string;
  onCrop?: (target: CropTarget) => void;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(540);
  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.min(entries[0].contentRect.width, 540)),
    );
    observer.observe(outer.current!);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="responsive-canvas" ref={outer}>
      <div
        style={{
          width,
          height: (width * project.canvas.height) / project.canvas.width,
          position: "relative",
        }}
      >
        <div
          style={{
            transform: `scale(${width / 540})`,
            transformOrigin: "top left",
          }}
        >
          <Canvas project={project} id={id} onCrop={onCrop} />
        </div>
      </div>
    </div>
  );
}
