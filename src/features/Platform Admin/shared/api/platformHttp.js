import { PlatformApiError, parseErrorBody } from "./platformErrors.js";

const DEFAULT_TIMEOUT_MS = 15000;

async function readBody(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new PlatformApiError("The server did not respond. Nothing was saved in this browser.", { status: 0 });
    }
    throw new PlatformApiError("Could not reach the server. Nothing was saved in this browser.", { status: 0 });
  } finally {
    clearTimeout(timer);
  }
}

async function refreshAccessToken(deps) {
  const refreshToken = deps.auth.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await fetchWithTimeout(deps.fetchImpl, `${deps.origin}/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }, deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const body = await readBody(response);
    if (!response.ok || !body?.access_token) return null;
    deps.auth.saveTokens(body.access_token, body.refresh_token);
    return body.access_token;
  } catch {
    return null;
  }
}

/**
 * Platform Admin HTTP. Uses only the platform auth store.
 * A 401 or 403 here must not log out or redirect the hospital session.
 */
export async function executePlatformRequest(endpoint, options = {}, deps) {
  const {
    method = "GET",
    body,
    anonymous = false,
    token,
    skipRefresh = false,
    _retried = false,
  } = options;
  const access = token || (anonymous ? null : deps.auth.getAccessToken());
  if (!anonymous && !access) {
    throw new PlatformApiError(
      "Sign in with your platform account. Demo portal sign-in is not a backend session.",
      { status: 401, detail: "Could not validate credentials", code: "missing_token" },
    );
  }

  const headers = { Accept: "application/json" };
  if (body != null) headers["Content-Type"] = "application/json";
  if (access) headers.Authorization = `Bearer ${access}`;

  const response = await fetchWithTimeout(
    deps.fetchImpl,
    `${deps.origin}${endpoint}`,
    { method, headers, body },
    deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const parsed = await readBody(response);

  if (response.status === 401 && !anonymous && !skipRefresh && !_retried) {
    const refreshed = await refreshAccessToken(deps);
    if (refreshed) {
      return executePlatformRequest(endpoint, { ...options, token: refreshed, _retried: true }, deps);
    }
    deps.auth.clear();
    const message = typeof parsed.detail === "string" && parsed.detail.trim()
      ? parsed.detail.trim()
      : "Could not validate credentials";
    throw new PlatformApiError(message, { status: 401, detail: parsed.detail ?? message });
  }

  if (!response.ok) {
    const interpreted = parseErrorBody(response.status, parsed);
    throw new PlatformApiError(interpreted.message, {
      status: response.status,
      detail: interpreted.detail,
      fieldErrors: interpreted.fieldErrors,
    });
  }

  return parsed;
}
