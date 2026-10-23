import { API_BASE_URL } from "@/shared/constants";
import { platformApi } from "./platformClient.js";
import {
  mapPlatformAdminProfile as mapProfile,
  platformPasswordBody,
} from "./platformProfileModel.js";

export {
  platformPasswordBody,
  platformPasswordIssue,
  platformPhotoIssue,
  profileDraft,
  profileUpdateBody,
} from "./platformProfileModel.js";

export function resolvePlatformImageUrl(url) {
  if (!url) return "";
  if (/^(https?:|blob:)/i.test(url)) return url;
  const base = API_BASE_URL || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");
  return `${base}${String(url).startsWith("/") ? url : `/${url}`}`;
}

export function getPlatformAdminProfile() {
  return platformApi("/platform/admin/profile");
}

export function updatePlatformAdminProfile(body) {
  return platformApi("/platform/admin/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function changePlatformAdminPassword(currentPassword, newPassword) {
  return platformApi("/platform/admin/password", {
    method: "POST",
    invalidPasswordKeepsSession: true,
    body: JSON.stringify(platformPasswordBody(currentPassword, newPassword)),
  });
}

export function uploadPlatformAdminPhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  return platformApi("/platform/admin/profile/photo", {
    method: "POST",
    body: formData,
  });
}

export function removePlatformAdminPhoto() {
  return platformApi("/platform/admin/profile/photo", { method: "DELETE" });
}

export function mapPlatformAdminProfile(body) {
  return mapProfile(body, resolvePlatformImageUrl);
}
