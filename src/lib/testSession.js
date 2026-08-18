// Manual Test Mode toggle - restored as an admin-tier convenience.
//
// Everything about auto-tagging by ACCOUNT identity (User.isTestUser,
// Preview-as-Role's previewMode JWT claim) works independently of this
// file and needs nothing here. This is purely the escape-hatch header
// path: the backend's TestSessionInterceptor only ever honors the
// X-Test-Session header for SUPER_ADMIN/ADMIN/CORPORATE_ADMIN, so this
// toggle is only rendered in the UI for those roles (see Header.jsx) -
// for every other real user this file installs a no-op interceptor that
// the backend would ignore anyway even if somehow triggered.
const STORAGE_KEY = 'erp_test_session_enabled';
const listeners = new Set();
let interceptorInstalled = false;

export function isTestSessionEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setTestSessionEnabled(enabled) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  listeners.forEach((fn) => fn(enabled));
}

export function onTestSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function installTestSessionFetchInterceptor() {
  if (interceptorInstalled || typeof window === 'undefined') return;
  interceptorInstalled = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    if (isTestSessionEnabled()) {
      init = { ...init, headers: { ...(init.headers || {}), 'X-Test-Session': 'true' } };
    }
    return originalFetch(input, init);
  };
}
