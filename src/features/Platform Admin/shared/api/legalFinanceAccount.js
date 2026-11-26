import { API_BASE_URL } from "@/shared/constants";
import { platformApi } from "./platformClient.js";
import { mapPlatformAdminProfile, platformPasswordBody } from "./platformProfileModel.js";

export function resolveLegalFinanceImageUrl(url) {
  if (!url) return "";
  if (/^(https?:|blob:)/i.test(url)) return url;
  const base = API_BASE_URL || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");
  return `${base}${String(url).startsWith("/") ? url : `/${url}`}`;
}

export function mapLegalFinanceProfile(body) {
  return mapPlatformAdminProfile(body, resolveLegalFinanceImageUrl);
}

export function getLegalFinanceProfile() {
  return platformApi("/legal-finance/account/profile");
}

export function updateLegalFinanceProfile(body) {
  return platformApi("/legal-finance/account/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function changeLegalFinancePassword(currentPassword, newPassword) {
  return platformApi("/legal-finance/account/password", {
    method: "POST",
    invalidPasswordKeepsSession: true,
    body: JSON.stringify(platformPasswordBody(currentPassword, newPassword)),
  });
}

export function uploadLegalFinancePhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  return platformApi("/legal-finance/account/profile/photo", {
    method: "POST",
    body: formData,
  });
}

export function removeLegalFinancePhoto() {
  return platformApi("/legal-finance/account/profile/photo", { method: "DELETE" });
}
