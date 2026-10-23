export class PlatformApiError extends Error {
  constructor(message, { status = 0, detail = null, fieldErrors = null, code = "" } = {}) {
    super(message);
    this.name = "PlatformApiError";
    this.status = status;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

function cleanMessage(message) {
  return String(message || "").replace(/^Value error,\s*/i, "").trim();
}

export function parseErrorBody(status, body) {
  const detail = body?.detail;
  if (status === 422 && Array.isArray(detail)) {
    const fieldErrors = {};
    detail.forEach((item) => {
      const loc = Array.isArray(item?.loc) ? item.loc : [];
      const field = loc.length ? loc[loc.length - 1] : "";
      if (field) fieldErrors[String(field)] = cleanMessage(item?.msg) || "Check this field.";
    });
    return {
      message: "Check the highlighted fields.",
      detail,
      fieldErrors,
    };
  }
  if (typeof detail === "string" && detail.trim()) {
    return { message: detail.trim(), detail, fieldErrors: null };
  }
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const message = typeof detail.message === "string" && detail.message.trim()
      ? detail.message.trim()
      : "Request failed";
    return { message, detail, fieldErrors: null };
  }
  if (status === 401) {
    return { message: "Could not validate credentials", detail: detail ?? null, fieldErrors: null };
  }
  if (status >= 500) {
    return {
      message: "Server error. Nothing was saved in this browser. Try again.",
      detail: detail ?? null,
      fieldErrors: null,
    };
  }
  return { message: "Request failed", detail: detail ?? null, fieldErrors: null };
}

export function fieldErrorsForForm(fieldErrors, apiToForm = {}) {
  const next = {};
  Object.entries(fieldErrors || {}).forEach(([apiField, message]) => {
    next[apiToForm[apiField] || apiField] = message;
  });
  return next;
}

/** A 401 ends the portal session only when this browser's token was rejected. */
export function shouldEndPlatformSession(error) {
  return error?.status === 401
    && error?.code !== "missing_token"
    && error?.code !== "session_replaced"
    && error?.code !== "invalid_password";
}

/** 401 asks for a new sign-in. A generic 403 means this role cannot call the API. */
export function platformCallMessage(error) {
  if (error?.status === 401) return "Sign in again.";
  if (error?.status === 403) {
    const message = String(error?.message || "").trim();
    if (!message || message === "Request failed" || message === "Permission denied") {
      return "This role cannot call that API.";
    }
    return message;
  }
  return interpretPlatformError(error).toast;
}

export function interpretPlatformError(error, apiToForm = {}) {
  const message = error?.message || "Request failed";
  const fieldErrors = fieldErrorsForForm(error?.fieldErrors, apiToForm);
  if (error?.status === 409) {
    if (/tenant code/i.test(message)) fieldErrors[apiToForm.code || "code"] = message;
    if (/hospital email/i.test(message)) fieldErrors[apiToForm.email || "email"] = message;
    if (/administrator email/i.test(message)) fieldErrors[apiToForm.admin_email || "adminEmail"] = message;
  }
  return {
    toast: message,
    fieldErrors,
    unauthenticated: shouldEndPlatformSession(error),
  };
}
