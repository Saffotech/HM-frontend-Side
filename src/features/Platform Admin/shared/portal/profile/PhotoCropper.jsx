import { useRef, useState } from "react";
import { Check, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import Button from "../../components/Button";

const VIEW = 240;
const OUTPUT = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const STEP = 12;

const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

/** Square crop of an image, shown through a circular guide. `onApply` receives the cropped File. */
export default function PhotoCropper({ source, onApply, onCancel, onError }) {
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [natural, setNatural] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const base = natural ? Math.max(VIEW / natural.width, VIEW / natural.height) : 1;
  const scale = base * zoom;
  const shownWidth = natural ? natural.width * scale : VIEW;
  const shownHeight = natural ? natural.height * scale : VIEW;

  const place = (next, nextZoom = zoom) => {
    if (!natural) return;
    const s = base * nextZoom;
    setOffset({
      x: clamp(next.x, (natural.width * s - VIEW) / 2),
      y: clamp(next.y, (natural.height * s - VIEW) / 2),
    });
  };

  const changeZoom = (value) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value)));
    setZoom(next);
    place(offset, next);
  };

  const onPointerDown = (event) => {
    if (!natural) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, start: offset };
  };
  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    place({ x: drag.start.x + event.clientX - drag.x, y: drag.start.y + event.clientY - drag.y });
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const onKeyDown = (event) => {
    const moves = { ArrowLeft: [STEP, 0], ArrowRight: [-STEP, 0], ArrowUp: [0, STEP], ArrowDown: [0, -STEP] };
    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      place({ x: offset.x + dx, y: offset.y + dy });
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      changeZoom(zoom + 0.1);
    } else if (event.key === "-") {
      event.preventDefault();
      changeZoom(zoom - 0.1);
    }
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const apply = () => {
    const image = imageRef.current;
    if (!image || !natural) return;
    setBusy(true);
    const size = VIEW / scale;
    const left = (shownWidth / 2 - VIEW / 2 - offset.x) / scale;
    const top = (shownHeight / 2 - VIEW / 2 - offset.y) / scale;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const context = canvas.getContext("2d");
    context.imageSmoothingQuality = "high";
    context.drawImage(image, left, top, size, size, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob((blob) => {
      setBusy(false);
      if (!blob) {
        onError();
        return;
      }
      onApply(new File([blob], source.name, { type: blob.type }));
    }, source.type, 0.92);
  };

  return (
    <div className="pp-cropper">
      <div
        className={`pp-crop-view${natural ? "" : " is-loading"}`}
        style={{ width: VIEW, height: VIEW }}
        role="group"
        tabIndex={0}
        aria-label="Adjust photo. Drag or use arrow keys to move, plus and minus to zoom."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <img
          ref={imageRef}
          src={source.url}
          alt=""
          draggable={false}
          onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          onError={onError}
          style={{
            width: shownWidth,
            height: shownHeight,
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
          }}
        />
        <span className="pp-crop-ring" aria-hidden="true" />
      </div>

      <div className="pp-crop-zoom">
        <button type="button" className="pp-crop-icon" onClick={() => changeZoom(zoom - 0.2)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
          <ZoomOut size={16} />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(event) => changeZoom(event.target.value)}
          aria-label="Zoom"
          aria-valuetext={`${Math.round(zoom * 100)}%`}
        />
        <button type="button" className="pp-crop-icon" onClick={() => changeZoom(zoom + 0.2)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
          <ZoomIn size={16} />
        </button>
      </div>

      <div className="pp-crop-actions">
        <Button size="sm" variant="secondary" onClick={reset} disabled={busy}>
          <RotateCcw size={14} aria-hidden="true" />Reset
        </Button>
        <span className="pp-crop-gap" />
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button size="sm" onClick={apply} disabled={busy || !natural}>
          <Check size={14} aria-hidden="true" />Apply
        </Button>
      </div>
    </div>
  );
}
