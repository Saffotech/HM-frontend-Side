export const PHONE_COUNTRY_CODES = [
  { value: '+91', label: '+91 (IN)' },
  { value: '+92', label: '+92 (PK)' },
  { value: '+880', label: '+880 (BD)' },
  { value: '+977', label: '+977 (NP)' },
  { value: '+94', label: '+94 (LK)' },
  { value: '+971', label: '+971 (AE)' },
  { value: '+65', label: '+65 (SG)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+1', label: '+1 (US/CA)' },
  { value: '+61', label: '+61 (AU)' },
];

export const CUSTOM_PHONE_CODE = '__other__';
export const PHONE_CODE_PATTERN = /^\+\d{1,4}$/;

export function isPresetPhoneCode(code) {
  return PHONE_COUNTRY_CODES.some((o) => o.value === code);
}

export function formatPhoneCodeInput(value) {
  const digits = String(value ?? '').replace(/[^\d]/g, '').slice(0, 4);
  return digits ? `+${digits}` : '+';
}

export function normalizePhoneCode(code) {
  const formatted = formatPhoneCodeInput(code);
  return PHONE_CODE_PATTERN.test(formatted) ? formatted : '+91';
}

export function formatPhoneDisplay(code, phone) {
  const digits = String(phone ?? '').trim();
  if (!digits) return null;
  return `${normalizePhoneCode(code)} ${digits}`;
}
