/**
 * Export a square crop from an HTMLImageElement based on viewport zoom/pan.
 */

const VIEW_SIZE = 280;
const OUTPUT_SIZE = 512;

export function getCoverScale(naturalWidth, naturalHeight, viewSize = VIEW_SIZE) {
  if (!naturalWidth || !naturalHeight) return 1;
  return Math.max(viewSize / naturalWidth, viewSize / naturalHeight);
}

export function clampPhotoOffset(offsetX, offsetY, naturalWidth, naturalHeight, zoom, viewSize = VIEW_SIZE) {
  const cover = getCoverScale(naturalWidth, naturalHeight, viewSize);
  const scale = cover * zoom;
  const dispW = naturalWidth * scale;
  const dispH = naturalHeight * scale;
  const maxX = Math.max(0, (dispW - viewSize) / 2);
  const maxY = Math.max(0, (dispH - viewSize) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offsetX)),
    y: Math.min(maxY, Math.max(-maxY, offsetY)),
  };
}

/**
 * @returns {Promise<File>}
 */
export async function cropImageFileToSquare(
  image,
  { zoom, offsetX, offsetY, fileName = 'profile.jpg', mimeType = 'image/jpeg' },
  { viewSize = VIEW_SIZE, outputSize = OUTPUT_SIZE } = {}
) {
  const cover = getCoverScale(image.naturalWidth, image.naturalHeight, viewSize);
  const scale = cover * zoom;
  const dispW = image.naturalWidth * scale;
  const dispH = image.naturalHeight * scale;
  const left = viewSize / 2 + offsetX - dispW / 2;
  const top = viewSize / 2 + offsetY - dispH / 2;

  const sx = (0 - left) / scale;
  const sy = (0 - top) / scale;
  const sw = viewSize / scale;
  const sh = viewSize / scale;

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare image crop');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputSize, outputSize);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not export cropped image'))),
      mimeType === 'image/png' ? 'image/png' : 'image/jpeg',
      0.92
    );
  });

  const safeName = String(fileName || 'profile.jpg').replace(/\.[^.]+$/, '') || 'profile';
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${safeName}.${ext}`, { type: blob.type });
}

export const PROFILE_PHOTO_VIEW_SIZE = VIEW_SIZE;
