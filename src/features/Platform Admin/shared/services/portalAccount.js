/**
 * Account operations for the CRM and Accountant portals.
 *
 * The portals sign in against a fixed demo user list, so there is no account service yet.
 * Expected contracts once the backend exists (identity comes from the session token, never the body):
 *   GET    /api/v1/users/me                  200 PortalProfileResponse
 *   PATCH  /api/v1/users/me                  { phone, jobTitle, department } → 200 PortalProfileResponse · 400 { field, message }
 *   POST   /api/v1/users/me/photo            multipart/form-data "photo" (JPEG/PNG/WebP, ≤ 2 MB) → 200 { photoUrl } · 413 · 415
 *   DELETE /api/v1/users/me/photo            204
 *   POST   /api/v1/auth/change-password      { currentPassword, newPassword }
 *     204 on success · 400 { field, message } on validation · 401 when the current password is wrong or the session expired
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
