/**
 * Accountant account calls. Identity also comes from GET /auth/me.
 * These routes are accountant-only. Other panels keep their own profile services.
 */
import { API_BASE_URL } from "@/shared/constants";
import { platformApi } from "../api/platformClient.js";
import {
  mapPlatformAdminProfile,
  platformPasswordBody,
  platformPhotoIssue,
} from "../api/platformProfileModel.js";

/**
 * @typedef {object} PortalProfileResponse
 * @property {string} userId
 * @property {string} name
 * @property {string} email
 * @property {string} role
 * @property {string} phone
 * @property {string} jobTitle
 * @property {string} photoUrl
 * @property {string} [createdAt]
 * @property {boolean|null} [isActive]
 */

/** @typedef {"INVALID_FILE"|"UNAUTHORIZED"} PortalAccountErrorCode */

export class PortalAccountError extends Error {
  /** @param {PortalAccountErrorCode} code */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** @returns {string} Why the file can't be a profile photo, or "" when it can. */
export function profilePhotoIssue(file) {
  return platformPhotoIssue(file);
}

export function resolveAccountantImageUrl(url) {
  if (!url) return "";
  if (/^(https?:|blob:)/i.test(url)) return url;
  const base = API_BASE_URL || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");
  return `${base}${String(url).startsWith("/") ? url : `/${url}`}`;
}

export function mapAccountantProfile(body) {
  return mapPlatformAdminProfile(body, resolveAccountantImageUrl);
}

export function getAccountantProfile() {
  return platformApi("/platform/account/profile");
}

export function updateAccountantProfile(body) {
  return platformApi("/platform/account/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function changePortalPassword(currentPassword, newPassword) {
  return platformApi("/platform/account/password", {
    method: "POST",
    invalidPasswordKeepsSession: true,
    body: JSON.stringify(platformPasswordBody(currentPassword, newPassword)),
  });
}

/**
 * @param {File} file
 * @returns {Promise<object>}
 */
export function uploadProfilePhoto(file) {
  const issue = profilePhotoIssue(file);
  if (issue) return Promise.reject(new PortalAccountError("INVALID_FILE", issue));
  const formData = new FormData();
  formData.append("file", file);
  return platformApi("/platform/account/profile/photo", {
    method: "POST",
    body: formData,
  });
}

export function removeProfilePhoto() {
  return platformApi("/platform/account/profile/photo", { method: "DELETE" });
}
