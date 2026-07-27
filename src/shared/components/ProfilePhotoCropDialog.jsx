import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { modalOverlay, modalPanel } from '@/shared/motion';
import {
  PROFILE_PHOTO_VIEW_SIZE,
  clampPhotoOffset,
  cropImageFileToSquare,
  getCoverScale,
} from '@/shared/utils/cropImageFile';
import './ProfilePhotoCropDialog.css';

export default function ProfilePhotoCropDialog({
  isOpen,
  file,
  confirming = false,
  onCancel,
  onConfirm,
}) {
  const reducedMotion = useReducedMotion();
  const imgRef = useRef(null);
  const dragRef = useRef(null);

  const [objectUrl, setObjectUrl] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isOpen || !file) {
      setObjectUrl(null);
      setNaturalSize({ width: 0, height: 0 });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setImageError('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImageError('');
    return () => URL.revokeObjectURL(url);
  }, [isOpen, file]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirming && !exporting) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, confirming, exporting, onCancel]);

  const applyOffset = useCallback(
    (x, y, nextZoom = zoom) => {
      if (!naturalSize.width) {
        setOffset({ x, y });
        return;
      }
      setOffset(
        clampPhotoOffset(x, y, naturalSize.width, naturalSize.height, nextZoom)
      );
    },
    [naturalSize.height, naturalSize.width, zoom]
  );

  const handleImageLoad = (e) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setOffset(
      clampPhotoOffset(0, 0, img.naturalWidth, img.naturalHeight, 1)
    );
  };

  const onPointerDown = (e) => {
    if (confirming || exporting) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    applyOffset(dragRef.current.originX + dx, dragRef.current.originY + dy);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleZoomChange = (e) => {
    const nextZoom = Number(e.target.value);
    setZoom(nextZoom);
    applyOffset(offset.x, offset.y, nextZoom);
  };

  const handleConfirm = async () => {
    const image = imgRef.current;
    if (!image || !file || !naturalSize.width) return;
    setExporting(true);
    setImageError('');
    try {
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const cropped = await cropImageFileToSquare(
        image,
        {
          zoom,
          offsetX: offset.x,
          offsetY: offset.y,
          fileName: file.name,
          mimeType,
        }
      );
      await onConfirm?.(cropped);
    } catch (err) {
      setImageError(err?.message || 'Could not adjust photo. Try another image.');
    } finally {
      setExporting(false);
    }
  };

  const busy = confirming || exporting;
  const cover = getCoverScale(naturalSize.width, naturalSize.height);
  const scale = cover * zoom;
  const imageStyle =
    naturalSize.width > 0
      ? {
          width: naturalSize.width * scale,
          height: naturalSize.height * scale,
          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
        }
      : undefined;

  return (
    <AnimatePresence>
      {isOpen && file ? (
        <motion.div
          className="profile-photo-crop-overlay"
          role="presentation"
          onClick={() => !busy && onCancel?.()}
          initial={reducedMotion ? false : modalOverlay.initial}
          animate={reducedMotion ? false : modalOverlay.animate}
          exit={reducedMotion ? false : modalOverlay.exit}
          transition={modalOverlay.transition}
        >
          <motion.div
            className="profile-photo-crop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-photo-crop-title"
            onClick={(e) => e.stopPropagation()}
            initial={reducedMotion ? false : modalPanel.initial}
            animate={reducedMotion ? false : modalPanel.animate}
            exit={reducedMotion ? false : modalPanel.exit}
            transition={modalPanel.transition}
          >
            <h2 id="profile-photo-crop-title" className="profile-photo-crop__title">
              Adjust photo
            </h2>
            <p className="profile-photo-crop__hint">
              Drag to reposition. Use zoom to frame your photo.
            </p>

            <div
              className="profile-photo-crop__stage"
              style={{ width: PROFILE_PHOTO_VIEW_SIZE, height: PROFILE_PHOTO_VIEW_SIZE }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {objectUrl ? (
                <img
                  ref={imgRef}
                  src={objectUrl}
                  alt=""
                  className="profile-photo-crop__image"
                  style={imageStyle}
                  draggable={false}
                  onLoad={handleImageLoad}
                  onError={() => setImageError('Could not load this image.')}
                />
              ) : null}
              <div className="profile-photo-crop__mask" aria-hidden />
            </div>

            <label className="profile-photo-crop__zoom">
              <span>Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={handleZoomChange}
                disabled={busy || !naturalSize.width}
              />
            </label>

            {imageError ? (
              <p className="profile-photo-crop__error" role="alert">
                {imageError}
              </p>
            ) : null}

            <div className="profile-photo-crop__actions">
              <button
                type="button"
                className="profile-photo-crop__cancel"
                onClick={onCancel}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="profile-photo-crop__confirm"
                onClick={handleConfirm}
                disabled={busy || !naturalSize.width || Boolean(imageError)}
              >
                {busy ? 'Saving…' : 'Use photo'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
