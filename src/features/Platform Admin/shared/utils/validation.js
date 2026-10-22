export function required(value) {
  return String(value ?? "").trim().length > 0;
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

/** Keep only digits, and never more than 10. */
export function phoneDigits(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 10);
}

export function isPhone(value) {
  return /^\d{10}$/.test(String(value ?? "").trim());
}

export function isTenantCode(value) {
  return /^[A-Z0-9-]{3,12}$/.test(String(value).trim().toUpperCase());
}

export const PASSWORD_HINT = "At least 8 characters, with a letter and a number.";

/** Returns a message describing what is wrong with the password, or "" when it is acceptable. */
export function passwordIssue(value) {
  const text = String(value ?? "");
  if (!text) return "Enter a password.";
  if (text.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(text) || !/\d/.test(text)) return "Include at least one letter and one number.";
  return "";
}

export function isPostalCode(value) {
  return /^[A-Z0-9 -]{4,10}$/i.test(String(value).trim());
}

export function initials(name) {
  return String(name || "SA")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
