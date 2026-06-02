import { clearPermissionsCache } from './permissions';

export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('erp_token');
};

export const getUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('erp_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setAuth = (token, user) => {
  localStorage.setItem('erp_token', token);
  localStorage.setItem('erp_user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('erp_token');
  localStorage.removeItem('erp_user');
  clearPermissionsCache();
};

export const isAuthenticated = () => !!getToken();

export const hasRole = (user, ...roles) => {
  return user && roles.includes(user.role);
};

export const ADMIN_ROLES = ['SUPER_ADMIN', 'CORPORATE_ADMIN'];

export const isAdmin = (user) => hasRole(user, ...ADMIN_ROLES);
