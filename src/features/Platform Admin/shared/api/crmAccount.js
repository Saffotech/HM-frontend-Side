import { API_BASE_URL } from "@/shared/constants";
import { platformApi } from "./platformClient.js";
import { platformPasswordBody } from "./platformProfileModel.js";

export function resolveCrmImageUrl(url) {
  if (!url) return "";
  if (/^(https?:|blob:)/i.test(url)) return url;
  const base = API_BASE_URL || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");
  return `${base}${String(url).startsWith("/") ? url : `/${url}`}`;
}

/** Paid invoices for hospitals registered from this CRM user's leads. */
export function getCrmRevenue() {
  return platformApi("/crm/revenue");
}

export function getCrmProfile() {
  return platformApi("/crm/account/profile");
}

export function updateCrmProfile(body) {
  return platformApi("/crm/account/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function changeCrmPassword(currentPassword, newPassword) {
  return platformApi("/crm/account/password", {
    method: "POST",
    invalidPasswordKeepsSession: true,
    body: JSON.stringify(platformPasswordBody(currentPassword, newPassword)),
  });
}

export function uploadCrmPhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  return platformApi("/crm/account/profile/photo", {
    method: "POST",
    body: formData,
  });
}

export function removeCrmPhoto() {
  return platformApi("/crm/account/profile/photo", { method: "DELETE" });
}
