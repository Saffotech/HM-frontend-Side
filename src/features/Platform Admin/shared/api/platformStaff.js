import { interpretPlatformError, shouldEndPlatformSession } from "./platformErrors.js";

/** Roles the platform staff endpoint accepts. Hospital and platform admin are excluded. */
export const PLATFORM_STAFF_ROLES = [
  { value: "crm", label: "CRM" },
  { value: "accountant", label: "Accountant" },
];

const ROLE_VALUES = new Set(PLATFORM_STAFF_ROLES.map((role) => role.value));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const API_TO_FORM = {
  first_name: "firstName",
  last_name: "lastName",
  email: "email",
  password: "password",
  role: "role",
};

export function platformStaffRoleLabel(role) {
  return PLATFORM_STAFF_ROLES.find((item) => item.value === role)?.label || "";
}

export function validatePlatformStaff(values) {
  const errors = {};
  const firstName = String(values?.firstName ?? "").trim();
  const lastName = String(values?.lastName ?? "").trim();
  const email = String(values?.email ?? "").trim();
  const password = String(values?.password ?? "");
  const role = values?.role;

  if (!firstName) errors.firstName = "First name is required.";
  else if (firstName.length > 100) errors.firstName = "First name must be 100 characters or fewer.";

  if (lastName.length > 100) errors.lastName = "Last name must be 100 characters or fewer.";

  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  if (!password) errors.password = "Password is required.";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters.";
  else if (password.length > 128) errors.password = "Password must be 128 characters or fewer.";

  if (!ROLE_VALUES.has(role)) errors.role = "Choose CRM or Accountant.";

  return errors;
}

/** JSON body for POST /platform/staff. Tenant, role id, and hospital fields are never included. */
export function platformStaffBody(values) {
  const lastName = String(values?.lastName ?? "").trim();
  return {
    first_name: String(values?.firstName ?? "").trim(),
    last_name: lastName || null,
    email: String(values?.email ?? "").trim().toLowerCase(),
    password: String(values?.password ?? ""),
    role: values?.role,
  };
}

export function createSubmitGuard() {
  let pending = false;
  return {
    tryStart() {
      if (pending) return false;
      pending = true;
      return true;
    },
    finish() {
      pending = false;
    },
  };
}

/** Display fields from a 201 body. The password is never copied. */
export function staffCreatedNotice(body) {
  if (body?.user_id == null || !body?.email || !body?.role) return null;
  return {
    id: body.user_id,
    userId: body.user_id,
    firstName: body.first_name || "",
    lastName: body.last_name || "",
    email: body.email,
    role: body.role,
    isActive: Boolean(body.is_active),
    message: body.message || "Staff created successfully",
  };
}

export function interpretStaffError(error) {
  const result = interpretPlatformError(error, API_TO_FORM);
  if (error?.status === 409) {
    result.fieldErrors.email = "This email is already registered.";
    result.toast = "This email is already registered.";
  } else if (error?.status === 403) {
    result.toast = result.toast && result.toast !== "Request failed"
      ? result.toast
      : "Only a platform admin can register platform staff.";
  }
  return {
    ...result,
    retryable: error?.status === 0 || Number(error?.status) >= 500,
    unauthenticated: shouldEndPlatformSession(error),
  };
}
