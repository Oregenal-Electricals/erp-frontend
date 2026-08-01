// Test Mode: when enabled, every request the frontend makes to our own API
// carries header X-Test-Session: true, which the backend uses to
// automatically stamp isTestData: true on every record created during
// that request (see PrismaService.installTestDataAutoTagging on the
// backend) - across all 150+ modules, no matter how deeply nested the
// service call, without touching any individual page's fetch calls here.
//
// This is the frontend half of the same mechanism the X-Test-Session curl
// header exercises directly - flip this toggle instead of remembering to
// add the header by hand while clicking through the UI.

const STORAGE_KEY = 'erp_test_session';
const EVENT_NAME = 'erp-test-session-changed';

export function isTestSessionEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setTestSessionEnabled(enabled) {
  if (typeof window === 'undefined') return;
  if (enabled) localStorage.setItem(STORAGE_KEY, 'true');
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { enabled } }));
}

export function onTestSessionChange(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e.detail.enabled);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

let patched = false;

// Wraps window.fetch exactly once per page load. Only attaches the header
// to requests targeting our own API (never third-party URLs), and only
// while Test Mode is actually enabled - a normal browsing session with
// Test Mode off sends requests completely unmodified.
export function installTestSessionFetchInterceptor() {
  if (typeof window === 'undefined' || patched) return;
  patched = true;

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const isOurApi = apiBase && url.startsWith(apiBase);

    if (isOurApi && isTestSessionEnabled()) {
      const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
      headers.set('X-Test-Session', 'true');
      init = { ...init, headers };
    }

    return originalFetch(input, init);
  };
}
