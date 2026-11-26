const KEY = "saffocare.passwordChangedNotice";

/** Remember a successful password change across the redirect to /login. */
export function markPasswordChangedNotice() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* sessionStorage unavailable */
  }
}

export function readPasswordChangedNotice() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function clearPasswordChangedNotice() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}
