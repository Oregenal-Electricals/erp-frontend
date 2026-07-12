'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const PERMISSION_GROUPS = [
  { label: 'Master Setup', perms: ['COMPANY_VIEW','COMPANY_CREATE','COMPANY_EDIT','PLANT_VIEW','PLANT_CREATE','PLANT_EDIT','UNIT_VIEW','UNIT_CREATE','UNIT_EDIT','DEPARTMENT_VIEW','DEPARTMENT_CREATE','DEPARTMENT_EDIT','BRANCH_VIEW','BRANCH_CREATE','BRANCH_EDIT','FINANCIAL_YEAR_VIEW','FINANCIAL_YEAR_CREATE','FINANCIAL_YEAR_MANAGE'] },
  { label: 'User Management', perms: ['USER_VIEW','USER_CREATE','USER_EDIT','USER_TOGGLE_STATUS','USER_RESET_PASSWORD','USER_UNLOCK'] },
  { label: 'Purchase', perms: ['PURCHASE_VIEW','PURCHASE_CREATE','PURCHASE_EDIT','PURCHASE_APPROVE'] },
  { label: 'Inventory', perms: ['INVENTORY_VIEW','INVENTORY_CREATE','INVENTORY_EDIT'] },
  { label: 'Production', perms: ['PRODUCTION_VIEW','PRODUCTION_CREATE','PRODUCTION_EDIT'] },
  { label: 'Quality', perms: ['QUALITY_VIEW','QUALITY_CREATE','QUALITY_EDIT'] },
  { label: 'Finance', perms: ['FINANCE_VIEW','FINANCE_CREATE','FINANCE_EDIT','FINANCE_APPROVE'] },
  { label: 'Vendors', perms: ['VENDORS_VIEW','VENDORS_CREATE','VENDORS_EDIT','VENDORS_DELETE'] },
  { label: 'Reports', perms: ['REPORTS_VIEW','REPORTS_EXPORT'] },
  { label: 'Settings', perms: ['SETTINGS_VIEW','SETTINGS_MANAGE'] },
  { label: 'HR', perms: ['HR_VIEW','HR_CREATE','HR_EDIT','HR_APPROVE'] },
  { label: 'Sales', perms: ['SALES_VIEW','SALES_CREATE','SALES_EDIT','SALES_APPROVE'] },
  { label: 'System (tasks, notifications, documents, roles)', perms: ['SYSTEM_VIEW','SYSTEM_CREATE','SYSTEM_EDIT','SYSTEM_MANAGE_ROLES'] },
  { label: 'Audit', perms: ['AUDIT_VIEW'] },
];

const PERM_LABELS = {
  VIEW: 'View', CREATE: 'Create', EDIT: 'Edit', APPROVE: 'Approve', DELETE: 'Delete',
  MANAGE: 'Manage', TOGGLE_STATUS: 'Toggle Status', RESET_PASSWORD: 'Reset Password',
  UNLOCK: 'Unlock', EXPORT: 'Export', MANAGE_ROLES: 'Manage Roles',
};
function permAction(perm, groupPrefixLen) {
  const suffix = perm.slice(groupPrefixLen);
  return PERM_LABELS[suffix] || suffix;
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

  function toggleGroup(set, setter, perms, allChecked) {
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

  function PermissionGrid({ selected, onToggle, onToggleGroup }) {
    return (
      <div className="space-y-4">
        {PERMISSION_GROUPS.map(group => {
          const prefixLen = group.perms[0].split('_').slice(0, -1).join('_').length + 1;
          const allChecked = group.perms.every(p => selected.has(p));
          const someChecked = group.perms.some(p => selected.has(p));
          return (
            <div key={group.label} className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }} onChange={() => onToggleGroup(group.perms, allChecked)} />
                <span className="font-semibold text-sm text-gray-700">{group.label}</span>
              </div>
              <div className="flex flex-wrap gap-3 pl-6">
                {group.perms.map(perm => (
                  <label key={perm} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={selected.has(perm)} onChange={() => onToggle(perm)} />
                    {permAction(perm, prefixLen)}
                  </label>
                ))}
              </div>
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
            <p className="text-gray-500 text-sm mt-1">Control what each role can see and do. Super Admin is always protected and cannot be changed.</p>
          </div>
          <button onClick={() => { setCreateForm({ name: '', label: '', description: '' }); setCreatePerms(new Set()); setError(''); setShowCreate(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Create Role</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border divide-y">
          {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
          : roles.map(role => (
            <div key={role.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{role.label}</span>
                    <span className="font-mono text-xs text-gray-400">{role.name}</span>
                    {role.isProtected && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Protected</span>}
                    {role.isSystemRole && !role.isProtected && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">System</span>}
                  </div>
                  {role.description && <div className="text-xs text-gray-400 mt-0.5">{role.description}</div>}
                </div>
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

        {/* EDIT PERMISSIONS MODAL */}
        {editRole && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
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
                  onToggleGroup={(perms, allChecked) => toggleGroup(editPerms, setEditPerms, perms, allChecked)}
                />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setEditRole(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={saveEditPerms} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Permissions'}</button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE ROLE MODAL */}
        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
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
                    onToggleGroup={(perms, allChecked) => toggleGroup(createPerms, setCreatePerms, perms, allChecked)}
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

        {/* DELETE CONFIRM MODAL */}
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
