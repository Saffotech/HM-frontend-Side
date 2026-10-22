import { platformApi } from "./platformClient.js";
import { platformStaffBody } from "./platformStaff.js";

/** POST /platform/staff. Uses the platform bearer token. Does not log or store the password. */
export function createPlatformStaff(values) {
  return platformApi("/platform/staff", {
    method: "POST",
    body: JSON.stringify(platformStaffBody(values)),
  });
}
