'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const PERMISSION_SECTIONS = [
  {
    label: 'Master Setup',
    tabs: [
      { label: 'Companies', perm: 'COMPANY_VIEW' }, { label: 'Plants', perm: 'PLANT_VIEW' },
      { label: 'Units', perm: 'UNIT_VIEW' }, { label: 'Departments', perm: 'DEPARTMENT_VIEW' },
      { label: 'Branches', perm: 'BRANCH_VIEW' }, { label: 'Financial Year', perm: 'FINANCIAL_YEAR_VIEW' },
    ],
    actions: ['COMPANY_CREATE','COMPANY_EDIT','PLANT_CREATE','PLANT_EDIT','UNIT_CREATE','UNIT_EDIT',
      'DEPARTMENT_CREATE','DEPARTMENT_EDIT','BRANCH_CREATE','BRANCH_EDIT','FINANCIAL_YEAR_CREATE','FINANCIAL_YEAR_MANAGE'],
  },
  { label: 'User Management', tabs: [{ label: 'Users', perm: 'USER_VIEW' }],
    actions: ['USER_CREATE','USER_EDIT','USER_TOGGLE_STATUS','USER_RESET_PASSWORD','USER_UNLOCK'] },
  { label: 'Change Requests', tabs: [{ label: 'Change Requests', perm: 'CHANGE_REQUEST_VIEW' }], actions: [] },
  {
    label: 'Gate Management',
    tabs: [
      { label: 'Gate Dashboard', perm: 'GATE_DASHBOARD_VIEW' }, { label: 'Gate Inward', perm: 'GATE_INWARD_VIEW' },
      { label: 'Gate Outward', perm: 'GATE_OUTWARD_VIEW' }, { label: 'Gate Passes', perm: 'GATE_PASS_VIEW' },
      { label: 'Visitors', perm: 'VISITOR_VIEW' }, { label: 'Vehicle Logs', perm: 'VEHICLE_LOG_VIEW' },
    ],
    actions: ['SYSTEM_CREATE', 'SYSTEM_EDIT'],
  },
  {
    label: 'Purchase',
    tabs: [
      { label: 'Purchase Requisitions', perm: 'PURCHASE_REQUISITION_VIEW' }, { label: 'Purchase Orders', perm: 'PURCHASE_ORDER_VIEW' },
      { label: 'RFQs', perm: 'RFQ_VIEW' }, { label: 'Vendor Quotations', perm: 'VENDOR_QUOTATION_VIEW' },
      { label: 'Quotation Comparison', perm: 'QUOTATION_COMPARISON_VIEW' }, { label: 'PO Amendments', perm: 'PO_AMENDMENT_VIEW' },
      { label: 'PO Approvals', perm: 'PO_APPROVAL_VIEW' }, { label: 'Purchase Analytics', perm: 'PURCHASE_ANALYTICS_VIEW' },
      { label: 'Price Lists', perm: 'PRICE_LIST_VIEW' }, { label: 'Price History', perm: 'PRICE_HISTORY_VIEW' },
      { label: 'Vendors', perm: 'VENDORS_VIEW' }, { label: 'Purchase (General Access)', perm: 'PURCHASE_VIEW' },
    ],
    actions: ['PURCHASE_CREATE','PURCHASE_EDIT','PURCHASE_APPROVE','VENDORS_CREATE','VENDORS_EDIT','VENDORS_DELETE'],
  },
  {
    label: 'Import',
    tabs: [
      { label: 'Import Orders', perm: 'IMPORT_ORDER_VIEW' }, { label: 'Customs Entries', perm: 'CUSTOMS_ENTRY_VIEW' },
      { label: 'Landed Costs', perm: 'LANDED_COST_VIEW' }, { label: 'Shipments', perm: 'SHIPMENT_VIEW' },
      { label: 'Shipping Documents', perm: 'SHIPPING_DOCUMENT_VIEW' },
    ],
    actions: ['PURCHASE_CREATE','PURCHASE_EDIT'],
  },
  {
    label: 'Sales',
    tabs: [
      { label: 'Leads', perm: 'LEAD_VIEW' }, { label: 'Quotations', perm: 'QUOTATION_VIEW' },
      { label: 'Customer PO', perm: 'CUSTOMER_PO_VIEW' }, { label: 'Sales Orders', perm: 'SALES_ORDER_VIEW' },
      { label: 'Dispatch Plans', perm: 'DISPATCH_PLAN_VIEW' }, { label: 'Dispatch', perm: 'DISPATCH_VIEW' },
      { label: 'Delivery Confirmations', perm: 'DELIVERY_CONFIRMATION_VIEW' }, { label: 'Proforma Invoices', perm: 'PROFORMA_INVOICE_VIEW' },
      { label: 'Credit Control', perm: 'CREDIT_CONTROL_VIEW' }, { label: 'Customer Complaints', perm: 'CUSTOMER_COMPLAINT_VIEW' },
      { label: 'Customer Portal', perm: 'CUSTOMER_PORTAL_VIEW' }, { label: 'Sales (General Access)', perm: 'SALES_VIEW' },
    ],
    actions: ['SALES_CREATE','SALES_EDIT','SALES_APPROVE'],
  },
  {
    label: 'Inventory',
    tabs: [
      { label: 'Inv. Dashboard', perm: 'INVENTORY_DASHBOARD_VIEW' }, { label: 'Warehouses', perm: 'WAREHOUSE_VIEW' },
      { label: 'BOM', perm: 'BOM_VIEW' }, { label: 'BOM Revisions', perm: 'BOM_REVISION_VIEW' },
      { label: 'GRN', perm: 'GRN_VIEW' }, { label: 'IQC', perm: 'IQC_VIEW' },
      { label: 'Stock Ledger', perm: 'STOCK_LEDGER_VIEW' }, { label: 'Rejected Stock', perm: 'REJECTED_STOCK_VIEW' },
      { label: 'Rack & Bin', perm: 'RACK_BIN_VIEW' }, { label: 'Stock Putaway', perm: 'STOCK_PUTAWAY_VIEW' },
      { label: 'Batches & Lots', perm: 'STOCK_BATCH_VIEW' }, { label: 'Stock Issues', perm: 'STOCK_ISSUE_VIEW' },
      { label: 'Stock Transfer', perm: 'STOCK_TRANSFER_VIEW' }, { label: 'Stock Adjustment', perm: 'STOCK_ADJUSTMENT_VIEW' },
      { label: 'Stock Reports', perm: 'STOCK_REPORT_VIEW' }, { label: 'Inv. Valuation', perm: 'INVENTORY_VALUATION_VIEW' },
      { label: 'Inv. Reports', perm: 'INVENTORY_REPORT_VIEW' }, { label: 'Inventory (General Access)', perm: 'INVENTORY_VIEW' },
    ],
    actions: ['INVENTORY_CREATE','INVENTORY_EDIT'],
  },
  {
    label: 'Production',
    tabs: [
      { label: 'Production Dashboard', perm: 'PRODUCTION_DASHBOARD_VIEW' }, { label: 'Work Orders', perm: 'WORK_ORDER_VIEW' },
      { label: 'MRP', perm: 'MRP_VIEW' }, { label: 'Production Entries', perm: 'PRODUCTION_ENTRY_VIEW' },
      { label: 'FG Receipts', perm: 'FG_RECEIPT_VIEW' }, { label: 'Production Issues', perm: 'PRODUCTION_ISSUE_VIEW' },
      { label: 'Cost Sheets', perm: 'PRODUCTION_COST_SHEET_VIEW' }, { label: 'Production Reports', perm: 'PRODUCTION_REPORT_VIEW' },
      { label: 'Production (General Access)', perm: 'PRODUCTION_VIEW' },
    ],
    actions: ['PRODUCTION_CREATE','PRODUCTION_EDIT'],
  },
  {
    label: 'Quality',
    tabs: [
      { label: 'Quality Dashboard', perm: 'QUALITY_DASHBOARD_VIEW' }, { label: 'IQC', perm: 'IQC_VIEW' },
      { label: 'Production QC', perm: 'PRODUCTION_QC_VIEW' }, { label: 'OQC', perm: 'OQC_VIEW' },
      { label: 'NCR', perm: 'NCR_VIEW' }, { label: 'CAPA', perm: 'CAPA_VIEW' },
      { label: 'RCA', perm: 'RCA_VIEW' }, { label: 'Supplier Quality', perm: 'SUPPLIER_QUALITY_VIEW' },
      { label: 'Quality Reports', perm: 'QUALITY_REPORT_VIEW' }, { label: 'Quality (General Access)', perm: 'QUALITY_VIEW' },
    ],
    actions: ['QUALITY_CREATE','QUALITY_EDIT'],
  },
  {
    label: 'HR',
    tabs: [
      { label: 'Employees', perm: 'EMPLOYEE_VIEW' }, { label: 'Attendance', perm: 'ATTENDANCE_VIEW' },
      { label: 'Leave', perm: 'LEAVE_VIEW' }, { label: 'Payroll', perm: 'PAYROLL_VIEW' },
      { label: 'Salary Slip', perm: 'SALARY_SLIP_VIEW' }, { label: 'PF/ESI', perm: 'PF_ESI_VIEW' },
      { label: 'Training', perm: 'TRAINING_VIEW' }, { label: 'HR Reports', perm: 'HR_REPORT_VIEW' }, { label: 'HR (General Access)', perm: 'HR_VIEW' },
    ],
    actions: ['HR_CREATE','HR_EDIT','HR_APPROVE'],
  },
  {
    label: 'Finance',
    tabs: [
      { label: 'Accounting', perm: 'ACCOUNTING_VIEW' }, { label: 'Chart of Accounts', perm: 'CHART_OF_ACCOUNTS_VIEW' },
      { label: 'Vouchers', perm: 'VOUCHER_VIEW' }, { label: 'Accounts Receivable', perm: 'AR_VIEW' },
      { label: 'Accounts Payable', perm: 'AP_VIEW' }, { label: 'GST', perm: 'GST_VIEW' },
      { label: 'Bank Reconciliation', perm: 'BANK_RECONCILIATION_VIEW' }, { label: 'Payment Instruments', perm: 'PAYMENT_INSTRUMENT_VIEW' },
      { label: 'TDS', perm: 'TDS_VIEW' }, { label: 'Financial Reports', perm: 'FINANCIAL_REPORT_VIEW' }, { label: 'Finance (General Access)', perm: 'FINANCE_VIEW' },
    ],
    actions: ['FINANCE_CREATE','FINANCE_EDIT','FINANCE_APPROVE'],
  },
  {
    label: 'Industry 4.0 / System',
    tabs: [
      { label: 'IoT Dashboard', perm: 'IOT_VIEW' }, { label: 'Tasks', perm: 'TASK_VIEW' },
      { label: 'Notifications', perm: 'NOTIFICATION_VIEW' }, { label: 'Documents', perm: 'DOCUMENT_VIEW' },
      { label: 'Workflows', perm: 'WORKFLOW_VIEW' }, { label: 'Alerts', perm: 'ALERT_VIEW' },
      { label: 'Vendor Portal', perm: 'VENDOR_PORTAL_VIEW' }, { label: 'System (General Access)', perm: 'SYSTEM_VIEW' },
    ],
    actions: ['SYSTEM_CREATE','SYSTEM_EDIT','SYSTEM_MANAGE_ROLES'],
  },
  {
    label: 'Analytics',
    tabs: [{ label: 'MIS Reports', perm: 'MIS_REPORT_VIEW' }, { label: 'Analytics', perm: 'ANALYTICS_TAB_VIEW' }, { label: 'Reports (General Access)', perm: 'REPORTS_VIEW' }],
    actions: ['REPORTS_EXPORT'],
  },
  {
    label: 'Settings',
    tabs: [{ label: 'Settings Pages', perm: 'SETTINGS_VIEW' }],
    actions: ['SETTINGS_MANAGE'],
  },
  {
    label: 'Audit',
    tabs: [{ label: 'Audit Log', perm: 'AUDIT_VIEW' }],
    actions: [],
  },
];

const ACTION_LABELS = {
  CREATE: 'Create', EDIT: 'Edit', APPROVE: 'Approve', DELETE: 'Delete', MANAGE: 'Manage',
  TOGGLE_STATUS: 'Toggle Status', RESET_PASSWORD: 'Reset Password', UNLOCK: 'Unlock',
  EXPORT: 'Export', MANAGE_ROLES: 'Manage Roles',
};
function actionLabel(perm) {
  const parts = perm.split('_');
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  const key = `${secondLast}_${last}` in ACTION_LABELS ? `${secondLast}_${last}` : last;
  return ACTION_LABELS[key] || last;
}

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRole, setEditRole] = useState(null);
  const [editPerms, setEditPerms] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', label: '', description: '' });
  const [createPerms, setCreatePerms] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  async function fetchRoles() {
    setLoading(true);
    const res = await fetch(`${API}/roles`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setRoles(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchRoles(); }, []);

  function openEdit(role) {
    setEditRole(role);
    setEditPerms(new Set(role.permissions));
    setError('');
  }

  function togglePerm(set, setter, perm) {
    const next = new Set(set);
    if (next.has(perm)) next.delete(perm); else next.add(perm);
    setter(next);
  }

  function toggleAll(set, setter, perms, allChecked) {
    const next = new Set(set);
    if (allChecked) perms.forEach(p => next.delete(p));
    else perms.forEach(p => next.add(p));
    setter(next);
  }

  async function saveEditPerms() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/roles/${editRole.id}/permissions`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ permissions: Array.from(editPerms) }),
    });
    if (res.ok) { setEditRole(null); fetchRoles(); }
    else { const d = await res.json(); setError(d.message || 'Failed to save'); }
    setSaving(false);
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const name = createForm.name.trim().toUpperCase().replace(/\s+/g, '_');
    const res = await fetch(`${API}/roles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ name, label: createForm.label, description: createForm.description, permissions: Array.from(createPerms) }),
    });
    const data = await res.json();
    if (res.ok) { setShowCreate(false); setCreateForm({ name: '', label: '', description: '' }); setCreatePerms(new Set()); fetchRoles(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to create role');
    setSaving(false);
  }

  async function handleDelete(role) {
    const res = await fetch(`${API}/roles/${role.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (res.ok) { setDeleteConfirm(null); fetchRoles(); }
    else alert(data.message || 'Failed to delete role');
  }

  function PermissionGrid({ selected, onToggle, onToggleAll }) {
    return (
      <div className="space-y-3">
        {PERMISSION_SECTIONS.map(section => {
          const allPerms = [...section.tabs.map(t => t.perm), ...section.actions];
          const allChecked = allPerms.length > 0 && allPerms.every(p => selected.has(p));
          const someChecked = allPerms.some(p => selected.has(p));
          return (
            <div key={section.label} className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                <input type="checkbox" checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                  onChange={() => onToggleAll(allPerms, allChecked)} />
                <span className="font-semibold text-sm text-gray-800">{section.label}</span>
              </div>

              {section.tabs.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-gray-400 font-medium mb-1 pl-6">Tabs (view access)</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6">
                    {section.tabs.map(tab => (
                      <label key={tab.perm} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={selected.has(tab.perm)} onChange={() => onToggle(tab.perm)} />
                        {tab.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {section.actions.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 font-medium mb-1 pl-6">Actions (whole section)</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6">
                    {section.actions.map(perm => (
                      <label key={perm} className="flex items-center gap-1.5 text-xs text-indigo-700 cursor-pointer">
                        <input type="checkbox" checked={selected.has(perm)} onChange={() => onToggle(perm)} />
                        {actionLabel(perm)}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-gray-500 text-sm mt-1">Control exactly which tabs each role sees, and what actions they can take. Super Admin is always protected.</p>
          </div>
          <button onClick={() => { setCreateForm({ name: '', label: '', description: '' }); setCreatePerms(new Set()); setError(''); setShowCreate(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Create Role</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border divide-y">
          {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
          : roles.map(role => (
            <div key={role.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{role.label}</span>
                  <span className="font-mono text-xs text-gray-400">{role.name}</span>
                  {role.isProtected && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Protected</span>}
                  {role.isSystemRole && !role.isProtected && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">System</span>}
                </div>
                {role.description && <div className="text-xs text-gray-400 mt-0.5">{role.description}</div>}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">{role.permissionCount} permissions</span>
                <span className="text-xs text-gray-500">{role.userCount} user{role.userCount !== 1 ? 's' : ''}</span>
                {role.isProtected ? (
                  <span className="text-xs text-gray-400 italic px-3 py-1.5">Locked</span>
                ) : (
                  <>
                    <button onClick={() => openEdit(role)} className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 bg-white rounded hover:bg-gray-100">Edit Permissions</button>
                    <button onClick={() => setDeleteConfirm(role)} className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 bg-white rounded hover:bg-red-50">Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {editRole && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div>
                  <h2 className="text-lg font-bold">{editRole.label}</h2>
                  <p className="text-xs text-gray-400 font-mono">{editRole.name}</p>
                </div>
                <button onClick={() => setEditRole(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
                <PermissionGrid
                  selected={editPerms}
                  onToggle={(p) => togglePerm(editPerms, setEditPerms, p)}
                  onToggleAll={(perms, allChecked) => toggleAll(editPerms, setEditPerms, perms, allChecked)}
                />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setEditRole(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={saveEditPerms} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Permissions'}</button>
              </div>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-blue-700">Create New Role</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Role Name (internal, uppercase) *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. DISPATCH_COORDINATOR" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Display Label *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={createForm.label} onChange={e => setCreateForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Dispatch Coordinator" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this role do?" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 text-sm">Permissions</h3>
                  <PermissionGrid
                    selected={createPerms}
                    onToggle={(p) => togglePerm(createPerms, setCreatePerms, p)}
                    onToggleAll={(perms, allChecked) => toggleAll(createPerms, setCreatePerms, perms, allChecked)}
                  />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !createForm.name || !createForm.label} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Creating...' : 'Create Role'}</button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold text-red-700">Delete "{deleteConfirm.label}"?</h2>
              </div>
              <div className="p-6 text-sm text-gray-600">
                {deleteConfirm.userCount > 0 ? (
                  <div className="bg-red-50 text-red-600 p-3 rounded">
                    Cannot delete — {deleteConfirm.userCount} user{deleteConfirm.userCount !== 1 ? 's are' : ' is'} still assigned to this role. Reassign them to a different role first.
                  </div>
                ) : (
                  <p>This will permanently remove this role and its permission assignments. This cannot be undone.</p>
                )}
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                {deleteConfirm.userCount === 0 && (
                  <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Confirm Delete</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
