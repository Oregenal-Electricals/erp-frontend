// erp-frontend/src/lib/notificationRoutes.js
//
// Not every entity has a dedicated detail page yet - where one
// exists we deep-link straight to it; where only a list page exists
// we send the person there (still useful, just not scrolled to the
// exact record); where nothing matches, resolveNotificationRoute
// returns null and the caller just marks it read without navigating.

// Checked by notification `type` first, since the type is often more
// specific than the generic referenceType (e.g. a manpower exception
// should open the reconciliation dashboard, not an employee record).
const TYPE_ROUTES = {
  MANPOWER_UNALLOCATED: () => '/production/manpower',
  MANPOWER_INCREASE: () => '/production/manpower',
  MANPOWER_DECREASE: () => '/production/manpower',
  MANPOWER_TRANSFER: () => '/production/manpower',
  PRODUCTION_APPROVAL: () => '/production/work-orders',
  WO_START: () => '/production/work-orders',
  WO_RESTART: () => '/production/work-orders',
  WO_REASSIGN_QTY: () => '/production/work-orders',
};

// Falls back to referenceType when the specific `type` isn't mapped
// above - a detail route where one exists, otherwise the list page.
const REFERENCE_TYPE_ROUTES = {
  BOM: (id) => `/inventory/bom/${id}`,
  PO: (id) => `/purchase/orders/${id}`,
  PURCHASE_ORDER: (id) => `/purchase/orders/${id}`,
  RFQ: (id) => `/purchase/rfqs/${id}`,
  MR: (id) => `/purchase/requisitions/${id}`,
  SR: (id) => `/purchase/quotations/${id}`,
  GATE_INWARD_ENTRY: (id) => `/gate/inward/${id}`,
  GATE_OUTWARD_ENTRY: (id) => `/gate/outward/${id}`,
  GATE_PASS: (id) => `/gate/passes/${id}`,
  VISITOR: (id) => `/gate/visitors/${id}`,
  VISITOR_LOG: () => '/gate/visitors',
  WORK_ORDER: () => '/production/work-orders',
  SALES_ORDER: () => '/sales/sales-orders',
  DISPATCH: () => '/sales/dispatch',
  IQC: () => '/inventory/iqc',
  IQC_ITEM: (id) => `/inventory/iqc/${id}`,
  OQC: () => '/quality/oqc',
  EMPLOYEE: () => '/hr/employees',
  AR_INVOICE: () => '/finance/ar',
  AP_BILL: () => '/finance/ap',
  AR_PAYMENT: () => '/finance/ar',
  AP_PAYMENT: () => '/finance/ap',
  STOCK_ADJUSTMENT: () => '/inventory/adjustments',
  STOCK_ISSUE: () => '/inventory/issues',
  STOCK_TRANSFER: () => '/inventory/transfers',
  REJECTED_STOCK: () => '/inventory/rejected',
  DELETE_REQUEST: () => '/settings/delete-approvals',
};

export function resolveNotificationRoute(notification) {
  const { type, referenceType, referenceId } = notification;
  if (type && TYPE_ROUTES[type]) return TYPE_ROUTES[type](referenceId);
  if (referenceType && REFERENCE_TYPE_ROUTES[referenceType]) return REFERENCE_TYPE_ROUTES[referenceType](referenceId);
  return null;
}
