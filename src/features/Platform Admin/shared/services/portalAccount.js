/**
 * Portal account mutations. Identity is GET /auth/me.
 * There is no platform profile PATCH, photo, or change-password route.
 */

/**
 * @typedef {object} PortalProfileResponse
 * @property {string} userId
 * @property {string} name
 * @property {string} email
 * @property {string} role
 * @property {string} phone
 * @property {string} jobTitle
 * @property {string} department
 * @property {string} photoUrl      Served by the photo service; empty when none is set.
 * @property {string} [createdAt]   ISO date.
 * @property {"Active"|"Suspended"} [status]
 * @property {string} [lastSignInAt] ISO date.
 */

/** @typedef {{ photoUrl: string }} PhotoUploadResponse */

/** @typedef {"NOT_CONNECTED"|"INVALID_FILE"|"UNAUTHORIZED"} PortalAccountErrorCode */

export class PortalAccountError extends Error {
  /** @param {PortalAccountErrorCode} code */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;

/** @returns {string} Why the file can't be a profile photo, or "" when it can. */
export function profilePhotoIssue(file) {
  if (!PROFILE_PHOTO_TYPES.includes(file.type)) return "Choose a JPEG, PNG or WebP image.";
  if (file.size > MAX_PROFILE_PHOTO_BYTES) return "Choose an image smaller than 2 MB.";
  return "";
}

// eslint-disable-next-line no-unused-vars
export async function changePortalPassword({ currentPassword, newPassword }) {
  throw new PortalAccountError(
    "NOT_CONNECTED",
    "Your password has not been changed. Password changes need the account service, which isn't connected to this portal yet.",
  );
}

/**
 * @param {File} file
 * @returns {Promise<PhotoUploadResponse>}
 */
// eslint-disable-next-line no-unused-vars
export async function uploadProfilePhoto(file) {
  throw new PortalAccountError(
    "NOT_CONNECTED",
    "Photo uploads need the profile photo service, which isn't connected to this portal yet.",
  );
}

/** @returns {Promise<void>} */
export async function removeProfilePhoto() {
  throw new PortalAccountError(
    "NOT_CONNECTED",
    "Removing a photo needs the profile photo service, which isn't connected to this portal yet.",
  );
}
