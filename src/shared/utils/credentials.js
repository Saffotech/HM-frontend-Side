/** Normalize login payloads before API / mock auth */
export function trimCredentials(credentials = {}) {
  return {
    email: credentials.email?.trim() ?? '',
    password:
      typeof credentials.password === 'string'
        ? credentials.password.trim()
        : credentials.password ?? '',
  };
}

export function hasCredentials({ email, password }) {
  return Boolean(email && password);
}
