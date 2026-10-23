import { platformApi } from "./platformClient.js";
import { platformStaffBody } from "./platformStaff.js";

/** GET /platform/staff. CRM and accountant accounts only. */
export function listPlatformStaff() {
  return platformApi("/platform/staff");
}

/** POST /platform/staff. Uses the platform bearer token. Does not log or store the password. */
export function createPlatformStaff(values) {
  return platformApi("/platform/staff", {
    method: "POST",
    body: JSON.stringify(platformStaffBody(values)),
  });
}
