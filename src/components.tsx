import { useEffect, useRef, useState, type ReactNode } from "react";
import { Upload, X, UserRound, Check } from "lucide-react";
import { cropStyle, type ImageCrop } from "./crop";
import { imageFix } from "./imageFix";
export function Field({
  label,
  value,
  onChange,
  multiline,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          aria-label={label}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          aria-label={label}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" />
    </label>
  );
}
export function IconButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="icon-button"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Avatar({
  src,
  name,
  className = "",
  crop,
}: {
  src?: string;
  name: string;
  className?: string;
  crop?: ImageCrop;
}) {
  return (
    <span className={`avatar ${className}`}>
      {src ? (
        <img src={src} style={cropStyle(crop)} alt={name + "的头像"} />
      ) : (
        <UserRound size={22} />
      )}
    </span>
  );
}
export async function imageData(file: File): Promise<string> {
  return imageFix.normalizeUpload(file);
}
export function UploadField({
  label,
  value,
  onChange,
  compact = false,
  onEdit,
  crop,
  round = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
  onEdit?: () => void;
  crop?: ImageCrop;
  round?: boolean;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className={`upload-field ${compact ? "compact" : ""}`}>
      <span className="field-label">{label}</span>
      <div className="upload-row">
        {value &&
          (onEdit ? (
            <button
              type="button"
              className={"upload-crop-thumbnail" + (round ? " is-round" : "")}
              aria-label={"调整" + label + "裁切"}
              title="点击裁切"
              onClick={onEdit}
            >
              <img src={value} alt={label} style={cropStyle(crop)} />
            </button>
          ) : (
            <img className="upload-thumbnail" src={value} alt={label} />
          ))}
        <label className="upload-target">
          <Upload size={15} />
          <span>{busy ? "正在处理…" : value ? "更换图片" : "上传图片"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label={`上传${label}`}
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                onChange(await imageData(file));
                setError("");
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
        </label>
        {value && (
          <IconButton label={`移除${label}`} onClick={() => onChange("")}>
            <X size={15} />
          </IconButton>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="editor-section">
      <div className="section-heading">
        <h3>{title}</h3>
        {note && <span>{note}</span>}
      </div>
      {children}
    </section>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dlg = ref.current!;
    dlg.showModal();
    return () => dlg.close();
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      className={"modal " + (wide ? "wide " : "") + className}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <IconButton label="关闭窗口" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
export function ThemeChoices({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "light" | "pink" | "night" | "custom") => void;
}) {
  return (
    <div className="theme-choices">
      {(
        [
          { id: "light", label: "纯净白", color: "#fff" },
          { id: "pink", label: "柔雾粉", color: "#f5d6df" },
          { id: "night", label: "静谧黑", color: "#242426" },
          { id: "custom", label: "自定义", color: "#8ba793" },
        ] as const
      ).map((t) => (
        <button
          aria-label={t.label}
          key={t.id}
          className={value === t.id ? "selected" : ""}
          onClick={() => onChange(t.id)}
        >
          <span
            style={{
              background: t.color,
              color: t.id === "night" ? "white" : "#544c49",
            }}
          >
            {value === t.id && <Check size={13} />}
          </span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
