import api from './api';

// Cache permissions in memory for the session
let cachedPermissions = null;
let cachedRole = null;

// All permission constants (mirrors backend enum)
export const Permission = {
  // Master Setup
  COMPANY_VIEW:   'COMPANY_VIEW',
  COMPANY_CREATE: 'COMPANY_CREATE',
  COMPANY_EDIT:   'COMPANY_EDIT',

  PLANT_VIEW:   'PLANT_VIEW',
  PLANT_CREATE: 'PLANT_CREATE',
  PLANT_EDIT:   'PLANT_EDIT',

  UNIT_VIEW:   'UNIT_VIEW',
  UNIT_CREATE: 'UNIT_CREATE',
  UNIT_EDIT:   'UNIT_EDIT',

  DEPARTMENT_VIEW:   'DEPARTMENT_VIEW',
  DEPARTMENT_CREATE: 'DEPARTMENT_CREATE',
  DEPARTMENT_EDIT:   'DEPARTMENT_EDIT',

  BRANCH_VIEW:   'BRANCH_VIEW',
  BRANCH_CREATE: 'BRANCH_CREATE',
  BRANCH_EDIT:   'BRANCH_EDIT',

  FINANCIAL_YEAR_VIEW:   'FINANCIAL_YEAR_VIEW',
  FINANCIAL_YEAR_CREATE: 'FINANCIAL_YEAR_CREATE',
  FINANCIAL_YEAR_MANAGE: 'FINANCIAL_YEAR_MANAGE',

  // Users
  USER_VIEW:           'USER_VIEW',
  USER_CREATE:         'USER_CREATE',
  USER_EDIT:           'USER_EDIT',
  USER_TOGGLE_STATUS:  'USER_TOGGLE_STATUS',
  USER_RESET_PASSWORD: 'USER_RESET_PASSWORD',
  USER_UNLOCK:         'USER_UNLOCK',

  // Operations
  PURCHASE_VIEW:    'PURCHASE_VIEW',
  PURCHASE_CREATE:  'PURCHASE_CREATE',
  PURCHASE_APPROVE: 'PURCHASE_APPROVE',

  INVENTORY_VIEW:   'INVENTORY_VIEW',
  PRODUCTION_VIEW:  'PRODUCTION_VIEW',
  QUALITY_VIEW:     'QUALITY_VIEW',

  FINANCE_VIEW:    'FINANCE_VIEW',
  FINANCE_APPROVE: 'FINANCE_APPROVE',

  REPORTS_VIEW:   'REPORTS_VIEW',
  REPORTS_EXPORT: 'REPORTS_EXPORT',

  SETTINGS_VIEW:   'SETTINGS_VIEW',
  SETTINGS_MANAGE: 'SETTINGS_MANAGE',

  AUDIT_VIEW: 'AUDIT_VIEW',
};

// Fetch and cache permissions from API
export async function loadPermissions() {
  if (cachedPermissions) return cachedPermissions;
  try {
    const { data } = await api.get('/permissions/my-permissions');
    cachedPermissions = data.permissions || [];
    cachedRole = data.role;
    return cachedPermissions;
  } catch {
    cachedPermissions = [];
    return [];
  }
}

// Check if current user has a permission
export function hasPermission(permission) {
  if (!cachedPermissions) return false;
  return cachedPermissions.includes(permission);
}

// Check if current user has ALL listed permissions
export function hasAllPermissions(...permissions) {
  return permissions.every((p) => hasPermission(p));
}

// Check if current user has ANY of listed permissions
export function hasAnyPermission(...permissions) {
  return permissions.some((p) => hasPermission(p));
}

// Get cached role
export function getCachedRole() {
  return cachedRole;
}

// Clear cache on logout
export function clearPermissionsCache() {
  cachedPermissions = null;
  cachedRole = null;
}
