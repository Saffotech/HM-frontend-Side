/** Normalize login payloads before API / mock auth */
export function trimCredentials(credentials = {}) {
  return {
    email: (credentials.email?.trim() ?? '').toLowerCase(),
    password:
      typeof credentials.password === 'string'
        ? credentials.password.trim()
        : credentials.password ?? '',
  };
}

export function hasCredentials({ email, password }) {
  return Boolean(email && password);
}

/** Force email field display/storage to lowercase as the user types. */
export function normalizeEmailInput(value) {
  return String(value ?? '').toLowerCase();
}
