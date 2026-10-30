/**
 * Production error classification for the hospital and platform frontends.
 * Categories drive copy and retries. They do not change auth or permission behavior.
 */

export const ERROR_CATEGORY = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  SERVER: 'server',
  VALIDATION: 'validation',
  UNEXPECTED: 'unexpected',
  CHUNK: 'chunk',
};

export const NETWORK_MESSAGE = 'We couldn\'t connect just now. Check your connection and try again.';
export const NETWORK_MUTATION_MESSAGE = 'We couldn\'t connect just now. Confirm the request was not already saved before trying again.';
export const TIMEOUT_MESSAGE = 'This request timed out. Check your connection and try again.';
export const TIMEOUT_MUTATION_MESSAGE = 'This request timed out. Confirm it was not already saved before trying again.';
export const SERVER_MESSAGE = 'We couldn\'t load this information. Please try again in a moment.';
export const SERVER_MUTATION_MESSAGE = 'We couldn\'t complete this request. Confirm it was not already saved before trying again.';
export const RATE_LIMIT_MESSAGE = 'Too many requests. Please wait a moment and try again.';
export const NOT_FOUND_MESSAGE = 'We couldn\'t find that information.';
export const FORBIDDEN_MESSAGE = 'You do not have permission to view this.';
export const UNAUTHORIZED_MESSAGE = 'Your session has expired. Please sign in again.';
export const VALIDATION_MESSAGE = 'Check the highlighted fields and try again.';
export const UNEXPECTED_MESSAGE = 'Something went wrong. Please try again.';
export const CHUNK_MESSAGE = 'This page needs a refresh to load the latest version.';
export const WIDGET_MESSAGE = 'Unable to load this information.';

const CHUNK_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /failed to load module script/i,
  /importing a module script failed/i,
  /loading chunk [\w-]+ failed/i,
  /loading css chunk [\w-]+ failed/i,
  /chunkloaderror/i,
  /dynamically imported module/i,
  /expected a javascript(?:-or-wasm)? module script/i,
  /mime type of ["']?text\/html/i,
];

const UNSAFE_TEXT = /https?:\/\/|localhost|127\.0\.0\.1|\bport\s+\d+|traceback|stack trace|\/api\/|node_modules|syntaxerror|chunkload|dynamically imported|failed to fetch|failed to load module|backend is running|start the backend/i;

const TRANSIENT = new Set([
  ERROR_CATEGORY.NETWORK,
  ERROR_CATEGORY.TIMEOUT,
  ERROR_CATEGORY.SERVER,
  ERROR_CATEGORY.RATE_LIMIT,
]);

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isChunkLoadError(error) {
  if (!error) return false;
  const name = String(error.name || '');
  if (name === 'SyntaxError') return false;
  const message = `${name} ${error.message || ''}`;
  if (
    /unexpected token|is not a function|is not defined|cannot read propert/i.test(message)
    && !CHUNK_PATTERNS.some((pattern) => pattern.test(message))
  ) {
    return false;
  }
  if (name === 'ChunkLoadError') return true;
  return CHUNK_PATTERNS.some((pattern) => pattern.test(message));
}

export function isUnsafeMethod(method) {
  const normalized = String(method || 'GET').toUpperCase();
  return !SAFE_METHODS.has(normalized);
}

function statusOf(error) {
  const status = Number(error?.status);
  return Number.isFinite(status) ? status : null;
}

export function classifyApiError(error) {
  if (isChunkLoadError(error)) {
    return { category: ERROR_CATEGORY.CHUNK, status: null, retryable: false };
  }
  if (!error || typeof error !== 'object') {
    return { category: ERROR_CATEGORY.UNEXPECTED, status: null, retryable: false };
  }
  if (error.code === 'session_superseded') {
    return { category: ERROR_CATEGORY.UNAUTHORIZED, status: 401, retryable: false, silent: true };
  }

  const status = statusOf(error);
  const code = String(error.code || error.category || '');

  if (status === 401 || code === 'unauthorized') {
    return { category: ERROR_CATEGORY.UNAUTHORIZED, status: 401, retryable: false };
  }
  if (status === 403 || code === 'permission_denied' || code === 'forbidden') {
    return { category: ERROR_CATEGORY.FORBIDDEN, status: 403, retryable: false };
  }
  if (status === 404 || code === 'not_found') {
    return { category: ERROR_CATEGORY.NOT_FOUND, status: 404, retryable: false };
  }
  if (status === 429 || code === 'rate_limit') {
    return {
      category: ERROR_CATEGORY.RATE_LIMIT,
      status: 429,
      retryable: true,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  if (status === 408 || code === 'timeout') {
    return { category: ERROR_CATEGORY.TIMEOUT, status: status === 408 ? 408 : 0, retryable: true };
  }
  if (status != null && status >= 500) {
    return { category: ERROR_CATEGORY.SERVER, status, retryable: true };
  }
  if (status === 400 || status === 409 || status === 422 || error.fieldErrors) {
    return { category: ERROR_CATEGORY.VALIDATION, status: status || 422, retryable: false };
  }
  if (code === 'network' || status === 0) {
    return { category: ERROR_CATEGORY.NETWORK, status: 0, retryable: true };
  }
  return { category: ERROR_CATEGORY.UNEXPECTED, status, retryable: false };
}

export function isTransientFailure(error) {
  return TRANSIENT.has(classifyApiError(error).category);
}

export function textLooksUnsafe(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  return UNSAFE_TEXT.test(text);
}

export function safeDisplayText(value, fallback) {
  const text = String(value || '').trim();
  if (!text || textLooksUnsafe(text) || text.length > 220) return fallback;
  return text;
}

export function userFacingMessage(error, options = {}) {
  const classified = classifyApiError(error);
  if (classified.silent) return '';
  const mutation = Boolean(options.mutation) || isUnsafeMethod(error?.method);

  switch (classified.category) {
    case ERROR_CATEGORY.CHUNK:
      return CHUNK_MESSAGE;
    case ERROR_CATEGORY.UNAUTHORIZED:
      return safeDisplayText(error?.message, UNAUTHORIZED_MESSAGE);
    case ERROR_CATEGORY.FORBIDDEN:
      return safeDisplayText(error?.message, FORBIDDEN_MESSAGE);
    case ERROR_CATEGORY.VALIDATION:
      return safeDisplayText(error?.message || error?.detail, VALIDATION_MESSAGE);
    case ERROR_CATEGORY.NOT_FOUND:
      return safeDisplayText(error?.detail || error?.message, NOT_FOUND_MESSAGE);
    case ERROR_CATEGORY.RATE_LIMIT: {
      const seconds = Number(error?.retryAfterSeconds);
      if (Number.isFinite(seconds) && seconds > 0 && seconds <= 300) {
        return `Too many requests. Please wait ${Math.ceil(seconds)} seconds and try again.`;
      }
      return RATE_LIMIT_MESSAGE;
    }
    case ERROR_CATEGORY.SERVER:
      return mutation ? SERVER_MUTATION_MESSAGE : SERVER_MESSAGE;
    case ERROR_CATEGORY.TIMEOUT:
      return mutation ? TIMEOUT_MUTATION_MESSAGE : TIMEOUT_MESSAGE;
    case ERROR_CATEGORY.NETWORK:
      return mutation ? NETWORK_MUTATION_MESSAGE : NETWORK_MESSAGE;
    default:
      return safeDisplayText(error?.message, UNEXPECTED_MESSAGE);
  }
}

/** Loading replaces the view, an error stays in that view, success returns the content. */
export function feedbackPhase({ isLoading, isError } = {}) {
  if (isLoading) return 'loading';
  if (isError) return 'error';
  return 'content';
}

/** Widget failures stay in the widget. They must not become an application takeover. */
export function errorSurfaceForScope(scope) {
  if (scope === 'widget' || scope === 'inline') return 'inline';
  if (scope === 'page') return 'page';
  return 'application';
}

/**
 * React Query calls this with failureCount 0 on the first failure.
 * One retry matches the previous `retry: 1`, and only for transient failures.
 */
export function shouldRetryQuery(failureCount, error) {
  if (failureCount >= 1) return false;
  return isTransientFailure(error);
}

export function queryRetryDelay(failureCount, error) {
  const retryAfter = Number(error?.retryAfterSeconds);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 30_000);
  }
  const attempt = Number.isFinite(failureCount) ? failureCount : 0;
  return Math.min(1000 * (2 ** attempt), 8000);
}

/** Non-idempotent mutations are never replayed automatically. */
export function shouldRetryMutation() {
  return false;
}
