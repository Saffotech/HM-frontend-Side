const MAX_PHOTO_UPLOAD_BYTES = 5 * 1024 * 1024;
const PHOTO_SIZE = 256;

/** Center-crops an image file to a square JPEG data URL small enough to keep with the profile. */
export function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("decode"));
      image.onload = () => {
        const side = Math.min(image.width, image.height);
        const canvas = document.createElement("canvas");
        canvas.width = PHOTO_SIZE;
        canvas.height = PHOTO_SIZE;
        canvas.getContext("2d").drawImage(
          image,
          (image.width - side) / 2,
          (image.height - side) / 2,
          side,
          side,
          0,
          0,
          PHOTO_SIZE,
          PHOTO_SIZE,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Returns a message when the file can't be used as a profile photo, or "" when it can. */
export function photoIssue(file) {
  if (!file.type.startsWith("image/")) return "Choose an image file (JPG, PNG, or WebP).";
  if (file.size > MAX_PHOTO_UPLOAD_BYTES) return "Image must be smaller than 5 MB.";
  return "";
}
