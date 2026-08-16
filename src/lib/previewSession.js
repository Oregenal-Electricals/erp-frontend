// Preview-as-Role session swap. Browsers can't hold two independent
// logins in two tabs of the same site at once, so this works by swapping
// the CURRENT tab's session: back up the real Super Admin token, log in as
// the target role's real seeded user, force Test Mode on (so everything
// created during preview is tagged and purgeable in one click), then hard
// -navigate to the dashboard so every cached bit of user state anywhere in
// the app gets freshly re-fetched under the new identity rather than risk
// stale data from before the swap.
import { setTestSessionEnabled, isTestSessionEnabled } from './testSession';

const API = process.env.NEXT_PUBLIC_API_URL;
const REAL_TOKEN_BACKUP_KEY = 'erp_preview_real_token_backup';
const REAL_USER_BACKUP_KEY = 'erp_preview_real_user_backup';
const PREVIEW_ROLE_KEY = 'erp_preview_role_name';
const PRIOR_TEST_MODE_KEY = 'erp_preview_prior_test_mode';

export function isInPreview() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(REAL_TOKEN_BACKUP_KEY);
}

export function getPreviewRoleName() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(PREVIEW_ROLE_KEY) || '';
}

export async function startPreview(roleName) {
  const realToken = localStorage.getItem('erp_token');
  if (!realToken) throw new Error('No active session to preview from');

  const res = await fetch(`${API}/auth/preview-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${realToken}` },
    body: JSON.stringify({ roleName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to start preview');

  // Back up the real session BEFORE overwriting it.
  localStorage.setItem(REAL_TOKEN_BACKUP_KEY, realToken);
  localStorage.setItem(REAL_USER_BACKUP_KEY, localStorage.getItem('erp_user') || '');
  localStorage.setItem(PREVIEW_ROLE_KEY, roleName);
  localStorage.setItem(PRIOR_TEST_MODE_KEY, isTestSessionEnabled() ? 'true' : 'false');

  // Swap to the preview identity.
  localStorage.setItem('erp_token', data.accessToken);
  localStorage.setItem('erp_user', JSON.stringify(data.user));
  setTestSessionEnabled(true);

  window.location.href = '/dashboard';
}

export async function startPreviewUser(userId, displayLabel) {
  const realToken = localStorage.getItem('erp_token');
  if (!realToken) throw new Error('No active session to preview from');
  const res = await fetch(`${API}/auth/preview-login-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${realToken}` },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to start preview');
  localStorage.setItem(REAL_TOKEN_BACKUP_KEY, realToken);
  localStorage.setItem(REAL_USER_BACKUP_KEY, localStorage.getItem('erp_user') || '');
  localStorage.setItem(PREVIEW_ROLE_KEY, displayLabel || data.user.email);
  localStorage.setItem(PRIOR_TEST_MODE_KEY, isTestSessionEnabled() ? 'true' : 'false');
  localStorage.setItem('erp_token', data.accessToken);
  localStorage.setItem('erp_user', JSON.stringify(data.user));
  setTestSessionEnabled(true);
  window.location.href = '/dashboard';
}

export function exitPreview() {
  const realToken = localStorage.getItem(REAL_TOKEN_BACKUP_KEY);
  if (!realToken) return; // not actually in a preview - nothing to do

  const realUser = localStorage.getItem(REAL_USER_BACKUP_KEY);
  const priorTestMode = localStorage.getItem(PRIOR_TEST_MODE_KEY) === 'true';

  localStorage.setItem('erp_token', realToken);
  if (realUser) localStorage.setItem('erp_user', realUser);
  setTestSessionEnabled(priorTestMode);

  localStorage.removeItem(REAL_TOKEN_BACKUP_KEY);
  localStorage.removeItem(REAL_USER_BACKUP_KEY);
  localStorage.removeItem(PREVIEW_ROLE_KEY);
  localStorage.removeItem(PRIOR_TEST_MODE_KEY);

  window.location.href = '/settings/ui-control';
}
