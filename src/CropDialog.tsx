import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { IconButton, Modal } from "./components";
import {
  clamp,
  cropStyle,
  defaultCrop,
  dragCrop,
  normalizeCrop,
  type ImageCrop,
} from "./crop";

export function CropDialog({
  title,
  src,
  value,
  aspect,
  round = false,
  onConfirm,
  onClose,
}: {
  title: string;
  src: string;
  value: ImageCrop;
  aspect: number;
  round?: boolean;
  onConfirm: (crop: ImageCrop) => void;
  onClose: () => void;
}) {
  const [crop, setCrop] = useState(() => normalizeCrop(value));
  const [image, setImage] = useState({ width: 0, height: 0 });
  const [error, setError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState({ width: 300, height: 300 });
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    crop: ImageCrop;
    pointer: number;
  } | null>(null);
  const cropRef = useRef(crop);
  cropRef.current = crop;
  useEffect(() => {
    const el = stage.current!;
    const observer = new ResizeObserver(() => {
      const width = Math.min(
        el.clientWidth - 48,
        (el.clientHeight - 48) * aspect,
      );
      setSize({ width, height: width / aspect });
    });
    observer.observe(el);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!drag.current)
        setCrop((c) => ({
          ...c,
          zoom: clamp(c.zoom * Math.exp(-event.deltaY * 0.0015), 1, 5),
        }));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", wheel);
    };
  }, [aspect]);
  const zoom = (amount: number) =>
    setCrop((c) => ({ ...c, zoom: clamp(c.zoom + amount, 1, 5) }));
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };
  return (
    <Modal title={title} onClose={onClose} className="crop-modal">
      <div className="crop-dialog">
        <div
          className={"crop-stage" + (dragging ? " is-dragging" : "")}
          ref={stage}
          tabIndex={0}
          role="group"
          aria-label="图片裁切预览"
          aria-describedby="crop-help"
          onPointerDown={(event) => {
            if (
              !image.width ||
              error ||
              !event.isPrimary ||
              (event.pointerType === "mouse" && event.button !== 0)
            )
              return;
            event.preventDefault();
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              crop: cropRef.current,
              pointer: event.pointerId,
            };
            setDragging(true);
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (!start || start.pointer !== event.pointerId) return;
            setCrop(
              dragCrop(
                start.crop,
                event.clientX - start.x,
                event.clientY - start.y,
                frame.current!.getBoundingClientRect(),
                image,
              ),
            );
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onKeyDown={(event) => {
            const deltas: Record<string, number[]> = {
              ArrowLeft: [-8, 0],
              ArrowRight: [8, 0],
              ArrowUp: [0, -8],
              ArrowDown: [0, 8],
            };
            const delta = deltas[event.key];
            if (delta && image.width) {
              event.preventDefault();
              const bounds = frame.current!.getBoundingClientRect();
              setCrop((c) => dragCrop(c, delta[0], delta[1], bounds, image));
            }
          }}
        >
          <div className="crop-frame" ref={frame} style={size}>
            <img
              src={src}
              alt="待裁切图片"
              draggable={false}
              style={cropStyle(crop)}
              onLoad={(event) =>
                setImage({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              onError={() => setError(true)}
            />
            <div className={"crop-mask" + (round ? " is-round" : "")}>
              <div className="crop-grid" />
            </div>
          </div>
          {!image.width && !error && (
            <span className="crop-loading">正在加载图片…</span>
          )}
        </div>
        <p id="crop-help" className="crop-help">
          拖动图片选择区域，滚轮或下方按钮缩放
        </p>
        {error && (
          <p className="error" role="alert">
            图片加载失败，请重新选择图片。
          </p>
        )}
        <div className="crop-controls">
          <button
            type="button"
            className="text-button"
            onClick={() => setCrop(defaultCrop())}
          >
            <RotateCcw size={14} />
            重置
          </button>
          <div className="crop-zoom">
            <IconButton
              label="缩小图片"
              disabled={crop.zoom <= 1}
              onClick={() => zoom(-0.15)}
            >
              <Minus size={17} />
            </IconButton>
            <output aria-label="图片缩放">
              {Math.round(crop.zoom * 100)}%
            </output>
            <IconButton
              label="放大图片"
              disabled={crop.zoom >= 5}
              onClick={() => zoom(0.15)}
            >
              <Plus size={17} />
            </IconButton>
          </div>
        </div>
        <div className="crop-actions">
          <button type="button" className="button" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!image.width || error}
            onClick={() => onConfirm(crop)}
          >
            确定裁切
          </button>
        </div>
      </div>
    </Modal>
  );
}
