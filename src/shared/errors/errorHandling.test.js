import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import {
  ERROR_CATEGORY,
  classifyApiError,
  errorSurfaceForScope,
  feedbackPhase,
  isChunkLoadError,
  queryRetryDelay,
  shouldRetryMutation,
  shouldRetryQuery,
  userFacingMessage,
} from './errorClassification.js';
import {
  claimAutomaticChunkReload,
  chunkRecoveryDecision,
  resetChunkRecoveryStateForTests,
  scheduleChunkRecoveryReset,
} from './chunkRecovery.js';
import { decideBfcacheAction, restoredProtectedView } from './bfcacheRecovery.js';
import {
  recordClientDiagnostic,
  resetClientDiagnosticsForTests,
  sanitizeRequestId,
  scrubRoute,
} from './errorDiagnostics.js';
import {
  resetErrorToastDedupeForTests,
  shouldShowErrorToast,
} from './notificationDedupe.js';
import { runRetry } from './retryAction.js';

const root = new URL('../../../', import.meta.url);

function readSrc(relativePath) {
  return readFileSync(new URL(relativePath, root), 'utf8');
}

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

describe('lazy chunk recovery', () => {
  beforeEach(() => resetChunkRecoveryStateForTests());

  it('treats stale dynamic imports as chunk failures and ignores syntax errors', () => {
    assert.equal(isChunkLoadError(new TypeError(
      'Failed to fetch dynamically imported module: /assets/AdminStaffRegisterPage-abc.js'
    )), true);
    assert.equal(isChunkLoadError(new TypeError('Failed to load module script')), true);
    assert.equal(isChunkLoadError(new TypeError('Importing a module script failed')), true);
    assert.equal(isChunkLoadError({ name: 'ChunkLoadError', message: 'Loading chunk 12 failed' }), true);
    assert.equal(isChunkLoadError(new SyntaxError('Unexpected token <')), false);
    assert.equal(isChunkLoadError(new TypeError('appointments.map is not a function')), false);
  });

  it('reloads once, then requires a manual retry', () => {
    const storage = memoryStorage();
    assert.equal(chunkRecoveryDecision(storage), 'reload');
    assert.equal(claimAutomaticChunkReload(storage), true);
    assert.equal(claimAutomaticChunkReload(storage), false);
    resetChunkRecoveryStateForTests();
    assert.equal(chunkRecoveryDecision(storage), 'manual');
    assert.equal(claimAutomaticChunkReload(storage), false);
  });

  it('does not clear the reload guard before the page has stayed up', () => {
    const storage = memoryStorage();
    claimAutomaticChunkReload(storage);
    resetChunkRecoveryStateForTests();
    let cleared = false;
    scheduleChunkRecoveryReset(storage, 20, (fn, ms) => setTimeout(() => {
      fn();
      cleared = true;
    }, ms), clearTimeout);
    assert.equal(chunkRecoveryDecision(storage), 'manual');
    assert.equal(cleared, false);
  });
});

describe('api error classification', () => {
  it('uses a connection message for network failures and never a developer backend hint', () => {
    const error = { status: 0, code: 'network', message: 'Could not reach the server. Check that the backend is running and try again.' };
    assert.equal(classifyApiError(error).category, ERROR_CATEGORY.NETWORK);
    const message = userFacingMessage(error);
    assert.match(message, /connect/i);
    assert.doesNotMatch(message, /backend is running|port 8000|https?:\/\//i);
  });

  it('keeps 401 on the session path and 403 as permission denial', () => {
    const unauthorized = { status: 401, message: 'Session expired. Please sign in again.' };
    const forbidden = { status: 403, code: 'permission_denied', message: 'You do not have permission to access this.' };
    assert.equal(classifyApiError(unauthorized).category, ERROR_CATEGORY.UNAUTHORIZED);
    assert.equal(classifyApiError(forbidden).category, ERROR_CATEGORY.FORBIDDEN);
    assert.notEqual(classifyApiError(forbidden).category, ERROR_CATEGORY.NETWORK);
    assert.match(userFacingMessage(forbidden), /permission/i);
    assert.equal(shouldRetryQuery(0, unauthorized), false);
    assert.equal(shouldRetryQuery(0, forbidden), false);
  });

  it('classifies 404, 429, 5xx, timeouts, and validation separately', () => {
    assert.equal(classifyApiError({ status: 404, detail: 'Ward not found' }).category, ERROR_CATEGORY.NOT_FOUND);
    assert.equal(classifyApiError({ status: 429, retryAfterSeconds: 12 }).category, ERROR_CATEGORY.RATE_LIMIT);
    assert.equal(classifyApiError({ status: 503 }).category, ERROR_CATEGORY.SERVER);
    assert.equal(classifyApiError({ status: 0, code: 'timeout' }).category, ERROR_CATEGORY.TIMEOUT);
    assert.equal(classifyApiError({ status: 422, message: 'Phone must be a 10-digit number' }).category, ERROR_CATEGORY.VALIDATION);
    assert.match(userFacingMessage({ status: 429, retryAfterSeconds: 12 }), /12 seconds/);
    assert.match(userFacingMessage({ status: 503 }), /try again/i);
    assert.match(userFacingMessage({ status: 0, code: 'timeout' }), /timed out/i);
    assert.equal(
      userFacingMessage({ status: 422, message: 'Phone must be a 10-digit number' }),
      'Phone must be a 10-digit number',
    );
    assert.equal(userFacingMessage({ status: 404, detail: 'https://internal/patients/12' }), 'We couldn\'t find that information.');
  });

  it('retries a transient query once and never replays a mutation', () => {
    const network = { status: 0, code: 'network' };
    assert.equal(shouldRetryQuery(0, network), true);
    assert.equal(shouldRetryQuery(1, network), false);
    assert.equal(shouldRetryQuery(0, { status: 404 }), false);
    assert.equal(shouldRetryMutation(), false);
    assert.equal(queryRetryDelay(0, { retryAfterSeconds: 4 }), 4000);
  });

  it('keeps a failed widget inside the widget and clears the error after a successful retry', async () => {
    assert.equal(errorSurfaceForScope('widget'), 'inline');
    assert.notEqual(errorSurfaceForScope('widget'), 'application');
    assert.equal(feedbackPhase({ isLoading: false, isError: true }), 'error');
    let calls = 0;
    const first = await runRetry(false, async () => {
      calls += 1;
      return { ok: true };
    });
    assert.equal(calls, 1);
    assert.equal(first.ok, true);
    assert.equal(feedbackPhase({ isLoading: false, isError: false }), 'content');
    const blocked = await runRetry(true, async () => {
      calls += 1;
    });
    assert.equal(blocked.started, false);
    assert.equal(calls, 1);
  });
});

describe('duplicate notifications and diagnostics', () => {
  beforeEach(() => {
    resetErrorToastDedupeForTests();
    resetClientDiagnosticsForTests();
  });

  it('announces one shared failure once during the same page load', () => {
    const message = userFacingMessage({ status: 0, code: 'network' });
    assert.equal(shouldShowErrorToast(message, 1000), true);
    assert.equal(shouldShowErrorToast(message, 2000), false);
    assert.equal(shouldShowErrorToast(message, 9001), true);
  });

  it('records category, route, and request id without tokens or patient identifiers', () => {
    const entry = recordClientDiagnostic({
      category: 'network',
      route: '/doctor/patients/4821/vitals?token=secret',
      network: true,
      chunk: false,
      status: 0,
      requestId: 'req-100',
      accessToken: 'should-not-stick',
      password: 'nope',
    });
    assert.equal(entry.category, 'network');
    assert.equal(entry.route, '/doctor/patients/:id/vitals');
    assert.equal(entry.requestId, 'req-100');
    assert.equal(entry.network, true);
    assert.equal('accessToken' in entry, false);
    assert.equal('password' in entry, false);
    assert.equal(sanitizeRequestId('aaa.bbb.ccc'), null);
    assert.equal(scrubRoute('/ipd/admissions/15'), '/ipd/admissions/:id');
  });
});

describe('back-forward cache and role restoration', () => {
  it('ignores a normal load and reloads a restored online page once', () => {
    assert.equal(decideBfcacheAction({ persisted: false, online: true, now: 10, lastReloadAt: 0 }), 'keep');
    assert.equal(decideBfcacheAction({ persisted: true, online: true, now: 10, lastReloadAt: 0 }), 'reload');
    assert.equal(decideBfcacheAction({ persisted: true, online: true, now: 1000, lastReloadAt: 500 }), 'safe');
  });

  it('hides the previous role after Doctor, IPD, and signed-out history restores', () => {
    for (const previousRole of ['doctor', 'ipd']) {
      const online = restoredProtectedView({
        persisted: true,
        online: true,
        now: 50,
        lastReloadAt: 0,
        previousRole,
      });
      assert.equal(online.showRestoredProtectedUi, false);
      assert.equal(online.action, 'reload');
    }
    const signedOut = restoredProtectedView({
      persisted: true,
      online: true,
      now: 50,
      lastReloadAt: 0,
    });
    assert.equal(signedOut.showRestoredProtectedUi, false);
  });

  it('shows a safe offline screen instead of a restored protected page', () => {
    const offline = restoredProtectedView({
      persisted: true,
      online: false,
      now: 50,
      lastReloadAt: 0,
    });
    assert.equal(offline.action, 'offline');
    assert.equal(offline.showRestoredProtectedUi, false);
  });
});

describe('frontend wiring stays inside the existing auth and route contracts', () => {
  it('shows the recovery screen for a failed lazy route and does not print the raw module url', () => {
    const boundary = readSrc('src/shared/components/ErrorBoundary.jsx');
    const fallback = readSrc('src/shared/components/errors/RouteErrorFallback.jsx');
    const lazyRoute = readSrc('src/routes/LazyRoute.jsx');
    assert.match(boundary, /claimAutomaticChunkReload/);
    assert.match(boundary, /variant === 'route'/);
    assert.match(lazyRoute, /variant="route"/);
    assert.match(fallback, /This page needs a refresh/);
    assert.doesNotMatch(fallback, /error\.message/);
    assert.doesNotMatch(boundary, /error\?\.message/);
  });

  it('preserves 401 refresh and 403 permission handling in the hospital client', () => {
    const client = readSrc('src/shared/api/client.js');
    assert.match(client, /response\.status === 401/);
    assert.match(client, /refreshOrEndTerminalSession/);
    assert.match(client, /response\.status === 403/);
    assert.match(client, /classifyForbidden/);
    assert.doesNotMatch(client, /backend is running|port 8000/);
    assert.match(client, /sessionActionForHttpStatus\(403/);
  });

  it('does not let one dashboard query replace the doctor shell', () => {
    const page = readSrc('src/features/doctor/pages/DoctorDashboardPage.jsx');
    const section = readSrc('src/features/doctor/components/DashboardSection.jsx');
    const main = readSrc('src/main.jsx');
    assert.match(page, /<DoctorShell/);
    assert.match(page, /<ErrorBoundary variant="route">/);
    assert.match(section, /InlineApiError/);
    assert.match(main, /throwOnError: false/);
    assert.doesNotMatch(section, /toast\.error\(\s*todayError/);
  });

  it('revalidates bfcache restores and sends both unauthorized actions home', () => {
    const app = readSrc('src/App.jsx');
    const guard = readSrc('src/shared/components/errors/HospitalSessionRestoration.jsx');
    const unauthorized = readSrc('src/pages/UnauthorizedPage.jsx');
    const htaccess = readSrc('public/.htaccess');
    assert.match(app, /HospitalSessionRestoration/);
    assert.match(guard, /pageshow/);
    assert.match(guard, /event\.persisted/);
    assert.match(guard, /removeEventListener\('pageshow'/);
    assert.match(unauthorized, /navigate\(home, \{ replace: true \}\)/);
    assert.doesNotMatch(unauthorized, /navigate\(\s*-1\s*\)/);
    assert.match(htaccess, /Cache-Control "no-store"/);
    assert.match(htaccess, /R=404/);
    assert.doesNotMatch(htaccess, /Header set Cache-Control "no-store"\s*\n\s*<\/IfModule>\s*<Files "\*\.\(js\|css\)/);
  });
});
