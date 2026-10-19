import { PlatformApiError } from "./platformErrors.js";

/** Backend role names from seed. Demo portal passwords are not a session. */
export const PORTAL_BACKEND_ROLE = {
  platform: "platform_admin",
  accountant: "accountant",
  crm: "crm",
};

const PORTAL_ACCESS = {
  platform: {
    permission: "hospitals:create",
    denial: "This account cannot register hospitals in this portal.",
  },
  accountant: {
    permission: "hospitals:create",
    denial: "This account cannot register hospitals in this portal.",
  },
  crm: {
    permission: "leads:manage",
    denial: "This account cannot work CRM leads in this portal.",
  },
};

export function sessionFromLogin(portal, email, body) {
  if (!body?.access_token || body.user_id == null) {
    throw new PlatformApiError("Sign-in did not return a session.", { status: 401, detail: "Could not validate credentials" });
  }
  const permissions = Array.isArray(body.permissions) ? body.permissions : [];
  const expectedRole = PORTAL_BACKEND_ROLE[portal];
  const access = PORTAL_ACCESS[portal];
  if (!expectedRole || !access || body.role !== expectedRole || !permissions.includes(access.permission)) {
    throw new PlatformApiError(access?.denial || "This account cannot sign in to this portal.", {
      status: 403,
      detail: "Permission denied",
    });
  }
  const trimmedEmail = String(email || "").trim();
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token || "",
    profile: {
      userId: body.user_id,
      name: body.first_name || trimmedEmail,
      email: trimmedEmail,
      role: body.role,
    },
  };
}
