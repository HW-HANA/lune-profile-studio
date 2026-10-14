import { useEffect, useState } from "react";
import {
  Moon,
  Undo2,
  Redo2,
  Eye,
  X,
  ArrowDownToLine,
  FileDown,
  FolderOpen,
  SlidersHorizontal,
  UserRound,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { Field, IconButton, Modal, ThemeChoices, Toggle } from "./components";
import { ProfileEditor, PostsEditor, StyleEditor } from "./Editors";
import { ResponsiveCanvas } from "./Previews";
import {
  hydrate,
  readData,
  writeData,
  useStudio,
  type SavedItem,
} from "./storage";
import { initialProject, uid } from "./model";
import { selectTheme } from "./theme";
import { parseProject } from "./projectFile";
import { download, exportCanvas, exportFilename } from "./export";
import { CropController } from "./CropController";
import type { CropTarget } from "./crop";
export default function App() {
  const {
    project: p,
    change,
    replace,
    undo,
    redo,
    past,
    future,
    ready,
    saveStatus,
  } = useStudio();
  const [page, setPage] = useState<"create" | "exports">("create");
  const [tab, setTab] = useState("info");
  const [sheet, setSheet] = useState(false);
  const [preview, setPreview] = useState(false);
  const [crop, setCrop] = useState<CropTarget | null>(null);
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [quality, setQuality] = useState(1);
  const [background, setBackground] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<SavedItem[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  useEffect(() => {
    void hydrate();
    void readData<SavedItem[]>("exports")
      .then((v) => setHistory(v || []))
      .catch(() => setNotice("无法读取本地作品"));
  }, []);
  useEffect(() => {
    if (p.mode === "posts" && tab === "info") setTab("posts");
  }, [p.mode, tab]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "Escape") {
        setSheet(false);
        setPreview(false);
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        !(e.target as HTMLElement).matches("input,textarea,select") &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);
  const selectTab = (t: string) => {
    setTab(t);
    setSheet(true);
  };
  async function runExport() {
    setBusy(true);
    setError("");
    try {
      const { image } = await exportCanvas(p, format, quality, background);
      const filename = exportFilename(p.title, format);
      download(image, filename);
      const list = [
        {
          id: uid(),
          title: p.title.trim() || filename.replace(/\.\w+$/, ""),
          created: Date.now(),
          project: structuredClone(p),
          image,
          format,
        },
        ...history,
      ].slice(0, 12);
      try {
        await writeData("exports", list);
        setHistory(list);
      } catch {
        setNotice("图片已下载，历史保存失败");
      }
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function backup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
    );
    download(url, exportFilename(p.title, "json"));
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function restoreDefaults() {
    // replace() saves the current draft in undo history before replacing it.
    replace(initialProject());
    setResetting(false);
    setPage("create");
    setTab("info");
    setSheet(false);
    setPreview(false);
    setCrop(null);
    setFormat("png");
    setQuality(1);
    setBackground(false);
    setError("");
    setNotice("已恢复默认，可点击撤销找回刚才的编辑");
  }
  return (
    <div className={`app ${preview ? "preview-mode" : ""}`}>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setPage("create")}
          aria-label="Lune Profile Studio 首页"
        >
          <span className="brand-mark">
            <Moon size={22} />
          </span>
          <span className="brand-name">lune</span>
        </button>
        <nav className="main-nav" aria-label="主导航">
          <button
            className={page === "create" ? "active" : ""}
            onClick={() => setPage("create")}
          >
            社交主页
          </button>
          <button
            className={page === "exports" ? "active" : ""}
            onClick={() => setPage("exports")}
          >
            我的作品
          </button>
        </nav>
        <div className="top-actions">
          <span className="saved-status" role="status">
            {saveStatus}
          </span>
          <div className="history-tools">
            <IconButton label="撤销" onClick={undo} disabled={!past.length}>
              <Undo2 size={17} />
            </IconButton>
            <IconButton label="重做" onClick={redo} disabled={!future.length}>
              <Redo2 size={17} />
            </IconButton>
          </div>
          <button
            className="button preview-button"
            onClick={() => {
              setPage("create");
              setPreview(true);
            }}
          >
            <Eye size={16} />
            预览
          </button>
          <button
            className="button primary export-button"
            disabled={!ready}
            onClick={() => {
              setPage("create");
              setOpen(true);
            }}
          >
            <ArrowDownToLine size={16} />
            导出图片
          </button>
        </div>
      </header>
      {page === "create" ? (
        <>
          <main className="workspace">
            <aside
              className={`editor ${sheet ? "sheet-open" : ""}`}
              aria-label="内容编辑器"
            >
              <div className="mobile-sheet-heading">
                <span>编辑主页</span>
                <IconButton
                  label="收起编辑面板"
                  onClick={() => setSheet(false)}
                >
                  <X size={18} />
                </IconButton>
              </div>
              <div className="mode-switch" role="group" aria-label="成品模式">
                <button
                  type="button"
                  className={p.mode === "profile" ? "active" : ""}
                  aria-pressed={p.mode === "profile"}
                  onClick={() =>
                    change((d) => {
                      d.mode = "profile";
                    }, "mode")
                  }
                >
                  <UserRound size={15} />
                  社交主页
                </button>
                <button
                  type="button"
                  className={p.mode === "posts" ? "active" : ""}
                  aria-pressed={p.mode === "posts"}
                  onClick={() => {
                    change((d) => {
                      d.mode = "posts";
                    }, "mode");
                    setTab("posts");
                  }}
                >
                  <MessageCircle size={15} />
                  纯动态
                </button>
              </div>
              <div className="editor-tabs" role="tablist">
                {[
                  ...(p.mode === "profile" ? [["info", "个人资料"]] : []),
                  ["posts", "动态内容"],
                  ["style", "外观样式"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    className={tab === key ? "active" : ""}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="editor-scroll">
                {tab === "info" ? (
                  <ProfileEditor onCrop={setCrop} />
                ) : tab === "posts" ? (
                  <PostsEditor onCrop={setCrop} />
                ) : (
                  <StyleEditor />
                )}
              </div>
              <div className="editor-footer">
                <button className="text-button" onClick={backup}>
                  <FileDown size={14} />
                  备份项目
                </button>
                <label className="text-button import-project">
                  <FolderOpen size={14} />
                  恢复备份
                  <input
                    type="file"
                    accept=".json"
                    aria-label="恢复项目备份"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        if (file.size > 50 * 1024 * 1024)
                          throw Error("文件不能超过 50 MB");
                        replace(parseProject(await file.text()));
                        setNotice("项目已恢复");
                      } catch (err) {
                        setNotice((err as Error).message);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="text-button reset-defaults"
                  disabled={!ready || busy}
                  onClick={() => setResetting(true)}
                >
                  <RotateCcw size={14} />
                  恢复默认
                </button>
              </div>
            </aside>
            {sheet && (
              <button
                className="sheet-scrim"
                aria-label="关闭编辑面板"
                onClick={() => setSheet(false)}
              />
            )}
            <section className="preview-panel" aria-label="成品预览">
              <div className="preview-stage">
                <div className="canvas-topline">
                  <span>预览</span>
                  <button onClick={() => selectTab("style")}>
                    {p.canvas.width} × {p.canvas.height}
                    <SlidersHorizontal size={12} />
                  </button>
                </div>
                <ResponsiveCanvas
                  project={p}
                  id="export-canvas"
                  onCrop={preview ? undefined : setCrop}
                />
              </div>
              <div className="preview-toolbar">
                <ThemeChoices
                  value={p.theme}
                  onChange={(theme) => {
                    change((d) => {
                      selectTheme(d, theme);
                    });
                    if (theme === "custom") selectTab("style");
                  }}
                />
                <IconButton
                  label="编辑画布样式"
                  onClick={() => selectTab("style")}
                >
                  <SlidersHorizontal size={17} />
                </IconButton>
              </div>
            </section>
          </main>
          <div className="mobile-toolbar">
            {p.mode === "profile" && (
              <button onClick={() => selectTab("info")}>
                <UserRound size={19} />
                资料
              </button>
            )}
            <button onClick={() => selectTab("posts")}>
              <MessageCircle size={19} />
              动态
            </button>
            <button onClick={() => selectTab("style")}>
              <SlidersHorizontal size={19} />
              样式
            </button>
            <button onClick={() => setOpen(true)}>
              <ArrowDownToLine size={19} />
              导出
            </button>
          </div>
        </>
      ) : (
        <main className="library">
          <div className="library-heading">
            <h1>我的作品</h1>
            <span>最近 12 次导出 · 本地保存</span>
          </div>
          {history.length ? (
            <div className="template-grid">
              {history.map((item) => (
                <div key={item.id}>
                  <img
                    className="export-thumbnail"
                    src={item.image}
                    alt={item.title}
                  />
                  <div className="template-caption">
                    <h3>{item.title}</h3>
                  </div>
                  <div className="export-item-actions">
                    <button
                      className="text-button"
                      onClick={() => {
                        replace(item.project);
                        setPage("create");
                      }}
                    >
                      继续编辑
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        download(item.image!, `${item.title}.${item.format}`)
                      }
                    >
                      下载
                    </button>
                    <button
                      className="text-button danger"
                      onClick={() => setDeleting(item.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-note">暂无作品</p>
          )}
        </main>
      )}
      {crop && <CropController target={crop} onClose={() => setCrop(null)} />}
      {preview && (
        <button
          className="button exit-preview"
          onClick={() => setPreview(false)}
        >
          <X size={16} />
          退出预览
        </button>
      )}
      {open && (
        <Modal
          title="导出图片"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <Field
            label="文件名"
            placeholder="留空则为 Lune_日期_时间"
            value={p.title}
            onChange={(v) =>
              change((d) => {
                d.title = v;
              }, "title")
            }
          />
          <Toggle
            label="包含画布背景与留白"
            checked={background}
            onChange={setBackground}
          />
          <p className="hint export-crop-hint">
            {background
              ? "保留画布背景与尺寸"
              : "仅导出主页内容，高度自适应。PNG 圆角外透明。"}
          </p>
          <div className="option-pair">
            {(["png", "jpg"] as const).map((f) => (
              <button
                key={f}
                className={format === f ? "selected" : ""}
                onClick={() => setFormat(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <label className="field">
            <span>清晰度</span>
            <select
              aria-label="清晰度"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            >
              <option value={1}>标准 · {p.canvas.width} px 宽</option>
              <option value={2}>超清 · {p.canvas.width * 2} px 宽</option>
            </select>
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button primary full"
            disabled={busy}
            onClick={runExport}
          >
            {busy ? "正在生成…" : `导出 ${format.toUpperCase()} 图片`}
          </button>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="确认删除？"
          subtitle="删除后无法恢复，当前草稿不受影响。"
          onClose={() => setDeleting(null)}
        >
          <button
            className="button primary"
            onClick={async () => {
              try {
                const list = history.filter((i) => i.id !== deleting);
                await writeData("exports", list);
                setHistory(list);
                setDeleting(null);
              } catch {
                setNotice("删除失败");
              }
            }}
          >
            确认删除
          </button>
        </Modal>
      )}
      {resetting && (
        <Modal
          title="恢复为默认设置？"
          subtitle="头像、封面、文字、动态、配色、字体和画布将恢复为初始状态。"
          onClose={() => setResetting(false)}
          className="reset-defaults-modal"
        >
          <p className="reset-defaults-note">
            已导出的作品会保留。恢复后，也可以点击「撤销」找回当前编辑。
          </p>
          <div className="confirm-actions">
            <button
              type="button"
              className="button"
              autoFocus
              onClick={() => setResetting(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="button primary"
              onClick={restoreDefaults}
            >
              确认恢复默认
            </button>
          </div>
        </Modal>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {!ready && <div className="loading-screen">正在载入…</div>}
    </div>
  );
}
