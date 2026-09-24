'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
      { label: 'BOM', perm: 'BOM_VIEW' }, { label: 'BOM Revisions', perm: 'BOM_REVISION_VIEW' }, { label: 'BOM Verify', perm: 'BOM_VERIFY' }, { label: 'BOM Approve', perm: 'BOM_APPROVE' },
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
    label: 'Manpower',
    tabs: [
      { label: 'Manpower', perm: 'MANPOWER_VIEW' },
    ],
    actions: ['MANPOWER_ALLOCATE','MANPOWER_ACCEPT','MANPOWER_DISTRIBUTE','MANPOWER_QUERY'],
  },
  {
    label: 'Stage Transfers',
    tabs: [
      { label: 'Stage Transfers', perm: 'STAGE_TRANSFER_VIEW' },
    ],
    actions: ['STAGE_TRANSFER_GIVE','STAGE_TRANSFER_RECEIVE'],
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

export default function AccessControlPage() {
  const [roles, setRoles] = useState([]);
  const [structure, setStructure] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [section, setSection] = useState('members');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [editPerms, setEditPerms] = useState(new Set());
  const [permsDirty, setPermsDirty] = useState(false);

  const [pendingVisibility, setPendingVisibility] = useState({});
  const [overrideUserId, setOverrideUserId] = useState('');
  const [pendingUserOverrides, setPendingUserOverrides] = useState({});

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', label: '' });
  const [error, setError] = useState('');

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, sRes] = await Promise.all([
      fetch(`${API}/roles`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/ui-control/structure`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    const rolesData = rRes.ok ? await rRes.json() : [];
    setRoles(rolesData);
    setStructure(sRes.ok ? await sRes.json() : []);
    setLoading(false);
    return rolesData;
  }, []);

  useEffect(() => {
    load().then((rolesData) => {
      if (rolesData?.length > 0) setSelectedRoleId((prev) => prev || rolesData[0].id);
    });
  }, [load]);

  const fetchMembers = useCallback(async (roleName) => {
    setMembersLoading(true);
    const res = await fetch(`${API}/users?role=${roleName}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setMembers(d.data || d.items || d || []); }
    setMembersLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedRole) return;
    setEditPerms(new Set(selectedRole.permissions || []));
    setPermsDirty(false);
    setPendingVisibility({});
    setOverrideUserId('');
    setPendingUserOverrides({});
    fetchMembers(selectedRole.name);
  }, [selectedRoleId]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const toggleStatus = async (id, name, isActive) => {
    if (!confirm(`${isActive ? 'Deactivate' : 'Activate'} \"${name}\"?`)) return;
    await fetch(`${API}/users/${id}/toggle-status`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchMembers(selectedRole.name);
  };
  const unlockUser = async (id, name) => {
    if (!confirm(`Unlock account for \"${name}\"?`)) return;
    await fetch(`${API}/users/${id}/unlock`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchMembers(selectedRole.name);
  };

  function togglePerm(perm) {
    setEditPerms((prev) => { const next = new Set(prev); if (next.has(perm)) next.delete(perm); else next.add(perm); return next; });
    setPermsDirty(true);
  }
  function toggleAllInGroup(perms, allChecked) {
    setEditPerms((prev) => { const next = new Set(prev); perms.forEach((p) => (allChecked ? next.delete(p) : next.add(p))); return next; });
    setPermsDirty(true);
  }
  async function savePermissions() {
    setSaving(true);
    const res = await fetch(`${API}/roles/${selectedRole.id}/permissions`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ permissions: Array.from(editPerms) }),
    });
    if (res.ok) { setPermsDirty(false); await load(); showToast('Permissions saved'); }
    else { const d = await res.json(); alert(d.message || 'Failed to save'); }
    setSaving(false);
  }

  function roleVisible(el) {
    if (pendingVisibility[el.id] !== undefined) return pendingVisibility[el.id];
    const saved = el.overrides?.find((o) => o.scopeType === 'ROLE' && o.roleName === selectedRole?.name);
    return saved ? saved.isVisible : el.defaultVisible;
  }
  function toggleRoleVisibility(el) {
    setPendingVisibility((prev) => ({ ...prev, [el.id]: !roleVisible(el) }));
  }
  function userVisible(el) {
    if (!overrideUserId) return null;
    if (pendingUserOverrides[el.id] !== undefined) return pendingUserOverrides[el.id];
    const saved = el.overrides?.find((o) => o.scopeType === 'USER' && o.userId === overrideUserId);
    return saved ? saved.isVisible : roleVisible(el);
  }
  function toggleUserVisibility(el) {
    setPendingUserOverrides((prev) => ({ ...prev, [el.id]: !userVisible(el) }));
  }
  async function saveVisibility() {
    setSaving(true);
    const overrides = [];
    for (const [elementId, isVisible] of Object.entries(pendingVisibility)) {
      overrides.push({ elementId, scopeType: 'ROLE', roleName: selectedRole.name, isVisible });
    }
    if (overrideUserId) {
      for (const [elementId, isVisible] of Object.entries(pendingUserOverrides)) {
        overrides.push({ elementId, scopeType: 'USER', userId: overrideUserId, isVisible });
      }
    }
    if (overrides.length > 0) {
      await fetch(`${API}/ui-control/overrides`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ overrides }),
      });
    }
    setPendingVisibility({}); setPendingUserOverrides({});
    await load();
    showToast('Visibility saved');
    setSaving(false);
  }

  async function handleCreateRole() {
    setSaving(true); setError('');
    const name = createForm.name.trim().toUpperCase().replace(/\s+/g, '_');
    const res = await fetch(`${API}/roles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ name, label: createForm.label, permissions: [] }),
    });
    const data = await res.json();
    if (res.ok) { setShowCreate(false); setCreateForm({ name: '', label: '' }); await load(); setSelectedRoleId(data.id); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to create role');
    setSaving(false);
  }

  async function handleDeleteRole() {
    if (!confirm(`Delete role \"${selectedRole.label}\"? This cannot be undone.`)) return;
    const res = await fetch(`${API}/roles/${selectedRole.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (res.ok) { setSelectedRoleId(''); load(); }
    else alert(data.message || 'Failed to delete role');
  }

  const pendingCount = Object.keys(pendingVisibility).length + Object.keys(pendingUserOverrides).length;

  if (loading) return <AppLayout><div className="p-6 text-gray-400">Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex h-full">
        <div className="w-64 border-r bg-white p-4 flex-shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 text-sm">Roles</h2>
            <button onClick={() => { setCreateForm({ name: '', label: '' }); setError(''); setShowCreate(true); }} className="text-xs text-blue-600 hover:underline">+ New</button>
          </div>
          <div className="space-y-1">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedRoleId === r.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {r.label || r.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
          {!selectedRole ? (
            <p className="text-gray-400 text-sm">Select a role to manage.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{selectedRole.label || selectedRole.name}</h1>
                  <p className="text-sm text-gray-500">Who has this role, what it can do, and what it can see - all in one place.</p>
                </div>
                {selectedRole.name !== 'SUPER_ADMIN' && (
                  <button onClick={handleDeleteRole} className="text-xs text-red-500 hover:underline">Delete Role</button>
                )}
              </div>

              <div className="flex gap-2 border-b mb-5">
                {[
                  { key: 'members', label: `Members (${members.length})` },
                  { key: 'permissions', label: 'What They Can Do' },
                  { key: 'visibility', label: 'What They Can See' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setSection(t.key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${section === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {section === 'members' && (
                <div className="bg-white rounded-xl border shadow-sm">
                  <div className="p-4 border-b flex items-center justify-between">
                    <span className="text-sm text-gray-500">{members.length} {members.length === 1 ? 'person has' : 'people have'} this role</span>
                    <Link href="/users/create" className="text-sm text-blue-600 hover:underline">+ Add User</Link>
                  </div>
                  {membersLoading ? (
                    <p className="p-4 text-sm text-gray-400">Loading...</p>
                  ) : members.length === 0 ? (
                    <p className="p-4 text-sm text-gray-400">No one has this role yet.</p>
                  ) : (
                    <div className="divide-y">
                      {members.map((m) => (
                        <div key={m.id} className="p-4 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-gray-900">{m.firstName} {m.lastName}</div>
                            <div className="text-xs text-gray-400">{m.email}{m.isLocked && <span className="ml-2 text-red-600 font-medium">Locked</span>}</div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <Link href={`/users/${m.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                            <Link href={`/users/${m.id}/reset-password`} className="text-purple-600 hover:underline">Reset Password</Link>
                            {m.isLocked && <button onClick={() => unlockUser(m.id, `${m.firstName} ${m.lastName}`)} className="text-green-600 hover:underline">Unlock</button>}
                            <button onClick={() => toggleStatus(m.id, `${m.firstName} ${m.lastName}`, m.isActive)} className={m.isActive ? 'text-orange-600 hover:underline' : 'text-green-600 hover:underline'}>
                              {m.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {section === 'permissions' && (
                <div>
                  <div className="flex justify-end mb-3">
                    <button onClick={savePermissions} disabled={!permsDirty || saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-40">
                      {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {PERMISSION_SECTIONS.map((sec) => {
                      const allPerms = [...sec.tabs.map((t) => t.perm), ...sec.actions];
                      const allChecked = allPerms.length > 0 && allPerms.every((p) => editPerms.has(p));
                      return (
                        <div key={sec.label} className="bg-white rounded-xl border shadow-sm p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-700 text-sm">{sec.label}</h3>
                            <button onClick={() => toggleAllInGroup(allPerms, allChecked)} className="text-xs text-blue-600 hover:underline">
                              {allChecked ? 'Clear all' : 'Select all'}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                            {sec.tabs.map((t) => (
                              <label key={t.perm} className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={editPerms.has(t.perm)} onChange={() => togglePerm(t.perm)} />
                                {t.label}
                              </label>
                            ))}
                            {sec.actions.map((a) => (
                              <label key={a} className="flex items-center gap-2 text-sm text-gray-500">
                                <input type="checkbox" checked={editPerms.has(a)} onChange={() => togglePerm(a)} />
                                {a.replace(/_/g, ' ')}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {section === 'visibility' && (
                <div>
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <select value={overrideUserId} onChange={(e) => { setOverrideUserId(e.target.value); setPendingUserOverrides({}); }} className="border rounded-lg px-3 py-2 text-sm">
                      <option value="">Applies to everyone with this role</option>
                      {members.map((m) => <option key={m.id} value={m.id}>Override just for: {m.firstName} {m.lastName}</option>)}
                    </select>
                    <button onClick={saveVisibility} disabled={pendingCount === 0 || saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-40">
                      {saving ? 'Saving...' : `Save${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
                    </button>
                  </div>
                  <div className="bg-white rounded-xl border shadow-sm divide-y">
                    {structure.map((sec) => (
                      <div key={sec.id}>
                        <div className="p-3 flex items-center justify-between bg-gray-50">
                          <span className="font-medium text-sm text-gray-800">{sec.label}</span>
                          <input
                            type="checkbox"
                            checked={overrideUserId ? (userVisible(sec) ?? roleVisible(sec)) : roleVisible(sec)}
                            onChange={() => (overrideUserId ? toggleUserVisibility(sec) : toggleRoleVisibility(sec))}
                          />
                        </div>
                        {(sec.items || []).map((item) => (
                          <div key={item.id} className="pl-8 pr-3 py-2 flex items-center justify-between border-t">
                            <span className="text-sm text-gray-600">{item.label}</span>
                            <input
                              type="checkbox"
                              checked={overrideUserId ? (userVisible(item) ?? roleVisible(item)) : roleVisible(item)}
                              onChange={() => (overrideUserId ? toggleUserVisibility(item) : toggleRoleVisibility(item))}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">New Role</h2>
            {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-3">{error}</div>}
            <input className="w-full border rounded-lg px-3 py-2 text-sm mb-2" placeholder="Internal name (e.g. QUALITY_LEAD)" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm mb-4" placeholder="Display label (e.g. Quality Lead)" value={createForm.label} onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreateRole} disabled={saving || !createForm.name || !createForm.label} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50">{toast}</div>}
    </AppLayout>
  );
}
