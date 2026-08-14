// erp-frontend/src/lib/uiControlManifest.js
//
// Registry for FIELD/COLUMN/BUTTON-level elements (the sidebar structure
// itself no longer needs this — it's fully DB-driven and editable from the
// admin screen directly). Add entries here as you retrofit specific pages'
// fields/columns/buttons to be controllable, then click "Sync New Elements
// from Manifest" in the UI Control Center.

export const UI_CONTROL_MANIFEST = [
  // Example — the exact case flagged in a past session: hiding PO price per role.
  { key: 'purchase.po.field.unitPrice', elementType: 'FIELD', module: 'Purchase', page: '/purchase-orders', label: 'PO Line Unit Price' },
  { key: 'purchase.po.field.totalValue', elementType: 'FIELD', module: 'Purchase', page: '/purchase-orders', label: 'PO Total Value' },
  { key: 'purchase.po.column.unitPrice', elementType: 'COLUMN', module: 'Purchase', page: '/purchase-orders', label: 'PO List — Unit Price Column' },
];
