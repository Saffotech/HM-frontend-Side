export const DEFAULT_PHONE_CODE = "+91";

export const PHONE_COUNTRY_CODES = [
  ["+91", "IN", "India"],
  ["+1", "US", "United States"],
  ["+1", "CA", "Canada"],
  ["+44", "UK", "United Kingdom"],
  ["+971", "AE", "UAE"],
  ["+65", "SG", "Singapore"],
  ["+61", "AU", "Australia"],
  ["+7", "RU", "Russia"],
  ["+20", "EG", "Egypt"],
  ["+30", "GR", "Greece"],
  ["+34", "ES", "Spain"],
  ["+39", "IT", "Italy"],
  ["+40", "RO", "Romania"],
  ["+41", "CH", "Switzerland"],
  ["+43", "AT", "Austria"],
  ["+45", "DK", "Denmark"],
  ["+46", "SE", "Sweden"],
  ["+47", "NO", "Norway"],
  ["+48", "PL", "Poland"],
  ["+49", "DE", "Germany"],
  ["+52", "MX", "Mexico"],
  ["+55", "BR", "Brazil"],
  ["+60", "MY", "Malaysia"],
  ["+62", "ID", "Indonesia"],
  ["+63", "PH", "Philippines"],
  ["+66", "TH", "Thailand"],
  ["+82", "KR", "South Korea"],
  ["+84", "VN", "Vietnam"],
  ["+90", "TR", "Turkey"],
  ["+64", "NZ", "New Zealand"],
  ["+27", "ZA", "South Africa"],
  ["+33", "FR", "France"],
  ["+81", "JP", "Japan"],
  ["+86", "CN", "China"],
  ["+92", "PK", "Pakistan"],
  ["+880", "BD", "Bangladesh"],
  ["+977", "NP", "Nepal"],
  ["+94", "LK", "Sri Lanka"],
  ["+212", "MA", "Morocco"],
  ["+234", "NG", "Nigeria"],
  ["+254", "KE", "Kenya"],
];

const KNOWN_CODES = [...new Set(PHONE_COUNTRY_CODES.map(([code]) => code))].sort((a, b) => b.length - a.length);

export function normalizePhoneCode(value) {
  const raw = String(value || DEFAULT_PHONE_CODE).trim();
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits ? `+${digits}` : DEFAULT_PHONE_CODE;
}

export function phoneDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function phoneInputIssue(value, maxDigits) {
  const text = String(value ?? "");
  if (!/^\d*$/.test(text)) return "Use digits only.";
  if (text.length > maxDigits) return `Use no more than ${maxDigits} digits.`;
  return "";
}

export function parsePhoneNumber(value, codeHint = DEFAULT_PHONE_CODE) {
  const raw = String(value ?? "").trim();
  const originalDigits = phoneDigits(raw);
  const explicitInternational = raw.startsWith("+") || raw.startsWith("00");
  const digits = raw.startsWith("00") ? originalDigits.slice(2) : originalDigits;
  const code = KNOWN_CODES.find((item) => digits.startsWith(item.slice(1))
    && (explicitInternational || digits.length > (item === "+1" ? 10 : item.slice(1).length + 9)));
  if (code && digits.length > code.slice(1).length) {
    return { phoneCode: code, phone: digits.slice(code.slice(1).length) };
  }
  return { phoneCode: normalizePhoneCode(codeHint), phone: digits };
}

export function parseProfilePhone(value, savedCode) {
  const raw = String(value ?? "").trim();
  if (savedCode && !raw.startsWith("+") && !raw.startsWith("00")) {
    return { phoneCode: normalizePhoneCode(savedCode), phone: phoneDigits(raw) };
  }
  return parsePhoneNumber(raw, savedCode || DEFAULT_PHONE_CODE);
}

export function validPhoneForCode(value, code = DEFAULT_PHONE_CODE, { optional = false } = {}) {
  const normalizedCode = normalizePhoneCode(code);
  const digits = String(value ?? "");
  if (!digits && optional) return true;
  if (!/^\d+$/.test(digits)) return false;
  if (normalizedCode === DEFAULT_PHONE_CODE) return digits.length === 10;
  const totalDigits = phoneDigits(normalizedCode).length + digits.length;
  return digits.length >= 4 && totalDigits >= 10 && totalDigits <= 15;
}

export function serializePhoneNumber(value, code = DEFAULT_PHONE_CODE) {
  const digits = phoneDigits(value);
  const normalizedCode = normalizePhoneCode(code);
  return normalizedCode === DEFAULT_PHONE_CODE ? digits : `${normalizedCode} ${digits}`.trim();
}

export function formatPhoneDisplay(value, codeHint = DEFAULT_PHONE_CODE) {
  if (!String(value ?? "").trim()) return "";
  const parsed = parsePhoneNumber(value, codeHint);
  return `${parsed.phoneCode} ${parsed.phone}`.trim();
}
