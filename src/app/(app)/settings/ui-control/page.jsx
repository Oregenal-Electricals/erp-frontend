// erp-frontend/src/app/(app)/settings/ui-control/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { UI_CONTROL_MANIFEST } from '@/lib/uiControlManifest';
import { startPreview } from '@/lib/previewSession';
import SortableList from '@/components/SortableList';

const overrideKey = (elementId, scopeType, roleName, userId) =>
  `${elementId}:${scopeType}:${scopeType === 'ROLE' ? roleName : userId}`;

export default function UiControlCenterPage() {
  const [structure, setStructure] = useState([]);
  const [pageElements, setPageElements] = useState({});
  const [roles, setRoles] = useState([]);
  const [previewRole, setPreviewRole] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [tab, setTab] = useState('sidebar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [newSectionLabel, setNewSectionLabel] = useState('');
  const [newItemLabel, setNewItemLabel] = useState({});
  const [newItemPage, setNewItemPage] = useState({});

  // Nothing in here touches the server. Everything the user does gets queued
  // here first; only "Save Changes" actually calls the API.
  const [pendingOverrides, setPendingOverrides] = useState({});
  const [pendingReorders, setPendingReorders] = useState({});

  const pendingCount = Object.keys(pendingOverrides).length + Object.keys(pendingReorders).length;

  const load = async () => {
    setLoading(true);
    const [structRes, pageElRes, roleRes, userRes] = await Promise.all([
      api.get('/ui-control/structure'),
      api.get('/ui-control/page-elements'),
      api.get('/roles'),
      api.get('/users'),
    ]);
    setStructure(structRes.data || []);
    setPageElements(pageElRes.data || {});
    setRoles(roleRes.data || []);
    setUsers(userRes.data?.items || userRes.data || []);
    setLoading(false);
  };

  // Same fetch, but doesn't swap the whole page to the "Loading…" screen —
  // used after Save/Discard so it doesn't feel like a page reload.
  const silentReload = async () => {
    const [structRes, pageElRes, roleRes, userRes] = await Promise.all([
      api.get('/ui-control/structure'),
      api.get('/ui-control/page-elements'),
      api.get('/roles'),
      api.get('/users'),
    ]);
    setStructure(structRes.data || []);
    setPageElements(pageElRes.data || {});
    setRoles(roleRes.data || []);
    setUsers(userRes.data?.items || userRes.data || []);
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedElement) return;
    let found = null;
    for (const s of structure) {
      if (s.id === selectedElement.id) { found = s; break; }
      const item = (s.items || []).find((i) => i.id === selectedElement.id);
      if (item) { found = item; break; }
    }
    if (!found) {
      for (const group of Object.values(pageElements)) {
        const el = group.find((e) => e.id === selectedElement.id);
        if (el) { found = el; break; }
      }
    }
    if (found) setSelectedElement(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure, pageElements]);

  const handleSync = async () => {
    await api.post('/ui-control/sync', { elements: UI_CONTROL_MANIFEST });
    await silentReload();
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const overrides = Object.values(pendingOverrides);
      const reorders = Object.values(pendingReorders);
      if (overrides.length > 0) {
        await api.put('/ui-control/overrides', { overrides });
      }
      if (reorders.length > 0) {
        await api.put('/ui-control/elements/reorder', { items: reorders });
      }
      setPendingOverrides({});
      setPendingReorders({});
      await silentReload();
      showToast('✓ Changes saved');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardAll = async () => {
    setPendingOverrides({});
    setPendingReorders({});
    await silentReload();
    showToast('Changes discarded');
  };

  const queueReorder = (id, parentKey, sortOrder) => {
    setPendingReorders((prev) => ({
      ...prev,
      [id]: parentKey !== undefined ? { id, parentKey, sortOrder } : { id, sortOrder },
    }));
  };

  const reorderSections = (newOrder) => {
    if (!newOrder.every((s) => s && s.id)) return;
    setStructure(newOrder);
    newOrder.forEach((s, idx) => queueReorder(s.id, undefined, idx));
  };

  const reorderItemsInSection = (sectionKey, newItems) => {
    if (!newItems.every((it) => it && it.id)) return;
    setStructure((prev) => prev.map((s) => (s.key === sectionKey ? { ...s, items: newItems } : s)));
    newItems.forEach((it, idx) => queueReorder(it.id, undefined, idx));
  };

  const moveItemWithinSection = (section, fromIndex, toIndex) => {
    const items = [...section.items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    reorderItemsInSection(section.key, items);
  };
  const getRoleEffectiveOrder = (el, roleName) => {
    const key = overrideKey(el.id, 'ROLE', roleName, undefined);
    const pending = pendingOverrides[key];
    if (pending?.sortOrderOverride !== undefined && pending.sortOrderOverride !== null) return pending.sortOrderOverride;
    const saved = el.overrides?.find((o) => o.scopeType === 'ROLE' && o.roleName === roleName);
    if (saved?.sortOrderOverride !== undefined && saved?.sortOrderOverride !== null) return saved.sortOrderOverride;
    return el.sortOrder ?? 0;
  };
  const sortItemsForRole = (items, roleName) => {
    if (!roleName) return items;
    return [...items].sort((a, b) => getRoleEffectiveOrder(a, roleName) - getRoleEffectiveOrder(b, roleName));
  };
  const moveItemWithinSectionForRole = (section, fromIndex, toIndex, roleName) => {
    const sorted = sortItemsForRole(section.items, roleName);
    const items = [...sorted];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    items.forEach((it, idx) => {
      const saved = it.overrides?.find((o) => o.scopeType === 'ROLE' && o.roleName === roleName);
      const currentlyVisible = saved ? saved.isVisible : it.defaultVisible;
      queueOverride(it.id, 'ROLE', roleName, undefined, currentlyVisible, undefined, idx);
    });
  };

  const moveItemToSection = (draggedItemId, targetSectionKey) => {
    if (!draggedItemId || !targetSectionKey) return;
    setStructure((prev) => {
      let moved = null;
      const removed = prev.map((s) => {
        const idx = (s.items || []).findIndex((i) => i.id === draggedItemId);
        if (idx === -1) return s;
        moved = s.items[idx];
        return { ...s, items: s.items.filter((i) => i.id !== draggedItemId) };
      });
      if (!moved) return prev;
      const next = removed.map((s) =>
        s.key === targetSectionKey ? { ...s, items: [...s.items, moved] } : s,
      );
      const target = next.find((s) => s.key === targetSectionKey);
      queueReorder(draggedItemId, targetSectionKey, Math.max((target?.items.length || 1) - 1, 0));
      return next;
    });
  };

  const addSection = async () => {
    if (!newSectionLabel.trim()) return;
    const key = `sidebar.custom.${newSectionLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await api.post('/ui-control/elements', {
      key, elementType: 'SIDEBAR_SECTION', module: newSectionLabel.trim(), label: newSectionLabel.trim(),
      sortOrder: structure.length,
    });
    setNewSectionLabel('');
    await silentReload();
  };

  const addItem = async (section) => {
    const label = newItemLabel[section.key];
    const page = newItemPage[section.key];
    if (!label?.trim() || !page?.trim()) return;
    const key = `${section.key}.${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await api.post('/ui-control/elements', {
      key, elementType: 'SIDEBAR_ITEM', module: section.module || section.label, page: page.trim(),
      label: label.trim(), parentKey: section.key, sortOrder: section.items.length,
    });
    setNewItemLabel((p) => ({ ...p, [section.key]: '' }));
    setNewItemPage((p) => ({ ...p, [section.key]: '' }));
    await silentReload();
  };

  const deleteElement = async (id) => {
    if (!confirm('This deletes it completely — for every role and every person, everywhere. To hide it from just one role or person instead, use the checkboxes on the right. Continue with full deletion?')) return;
    try {
      await api.delete(`/ui-control/elements/${id}`);
      await silentReload();
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not delete.');
    }
  };

  const queueOverride = (elementId, scopeType, roleName, userId, isVisible, customLabel, sortOrderOverride, parentKeyOverride) => {
    const key = overrideKey(elementId, scopeType, roleName, userId);
    setPendingOverrides((prev) => {
      const existing = prev[key] || {};
      return {
        ...prev,
        [key]: {
          elementId, scopeType, roleName, userId,
          isVisible: isVisible !== undefined ? isVisible : existing.isVisible,
          customLabel: customLabel !== undefined ? customLabel : existing.customLabel,
          sortOrderOverride: sortOrderOverride !== undefined ? sortOrderOverride : existing.sortOrderOverride,
          parentKeyOverride: parentKeyOverride !== undefined ? parentKeyOverride : existing.parentKeyOverride,
        },
      };
    });
    setSelectedElement((prev) => {
      if (!prev || prev.id !== elementId) return prev;
      const overrides = prev.overrides ? [...prev.overrides] : [];
      const idx = overrides.findIndex((o) =>
        scopeType === 'ROLE' ? o.scopeType === 'ROLE' && o.roleName === roleName : o.scopeType === 'USER' && o.userId === userId,
      );
      const newOv = {
        scopeType, roleName, userId,
        isVisible: isVisible !== undefined ? isVisible : overrides[idx]?.isVisible,
        customLabel: customLabel !== undefined ? customLabel : overrides[idx]?.customLabel,
        sortOrderOverride: sortOrderOverride !== undefined ? sortOrderOverride : overrides[idx]?.sortOrderOverride,
        parentKeyOverride: parentKeyOverride !== undefined ? parentKeyOverride : overrides[idx]?.parentKeyOverride,
      };
      if (idx >= 0) overrides[idx] = { ...overrides[idx], ...newOv };
      else overrides.push(newOv);
      return { ...prev, overrides };
    });
  };

  if (loading) return <div className="p-6">Loading UI Control Center…</div>;

  return (
    <div className="p-6 space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeft size={14} /> Back to ERP
        </Link>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <>
              <span className="text-xs text-orange-600 font-medium">{pendingCount} unsaved change{pendingCount > 1 ? 's' : ''}</span>
              <button onClick={handleDiscardAll} disabled={saving} className="px-3 py-1.5 text-sm border rounded text-gray-600">
                Discard
              </button>
              <button onClick={handleSaveAll} disabled={saving} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded font-medium">
                {saving ? 'Saving…' : `Save Changes (${pendingCount})`}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">UI Control Center</h1>
              <p className="text-sm text-gray-500">
                Drag, reorder, move items, or toggle visibility freely — nothing saves until you
                click "Save Changes" above.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <select
                value={previewRole}
                onChange={(e) => setPreviewRole(e.target.value)}
                className="border rounded px-2 py-2 text-sm"
              >
                <option value="">Preview as role…</option>
                {roles.filter((r) => r.name !== 'SUPER_ADMIN').map((r) => (
                  <option key={r.id || r.name} value={r.name}>{r.label || r.name}</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!previewRole) return;
                  if (!confirm(`Switch this tab to a live preview as ${previewRole}? You'll be logged in as that role with Test Mode forced on. Click "Exit Preview" in the banner to return.`)) return;
                  try {
                    await startPreview(previewRole);
                  } catch (err) {
                    alert(err.message || 'Failed to start preview');
                  }
                }}
                disabled={!previewRole}
                className="px-3 py-2 bg-indigo-600 text-white rounded text-sm disabled:opacity-50"
              >
                Preview Live
              </button>
              <button onClick={handleSync} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">
                Sync New Elements from Manifest
              </button>
            </div>
          </div>

          <div className="flex gap-2 border-b">
            <button onClick={() => setTab('sidebar')} className={`px-3 py-2 text-sm ${tab === 'sidebar' ? 'border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}>
              Sidebar Structure (Sections &amp; Items)
            </button>
            <button onClick={() => setTab('pageElements')} className={`px-3 py-2 text-sm ${tab === 'pageElements' ? 'border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}>
              Page Elements (Fields / Columns / Buttons)
            </button>
          </div>

          {tab === 'sidebar' && (
            <div className="space-y-3">
              <SortableList
                items={structure}
                dropZoneId="__sections__"
                onReorder={reorderSections}
                renderItem={(section) => (
                  <div className="flex-1 border rounded p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <button onClick={() => setSelectedElement(section)} className={`text-sm font-semibold text-left ${selectedElement?.id === section.id ? 'text-blue-600' : ''}`}>
                        {section.label}
                      </button>
                        {previewRole && <InlineDesignControls el={section} roleName={previewRole} pendingOverrides={pendingOverrides} queueOverride={queueOverride} />}
                      <button onClick={() => deleteElement(section.id)} className="text-xs text-red-500">Remove</button>
                    </div>

                    <div
                      className="mt-2"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (window.__uiControlDragOrigin !== section.key) {
                          moveItemToSection(window.__uiControlDragId, section.key);
                          window.__uiControlDragId = null;
                        }
                      }}
                    >
                      <SortableList
                        items={sortItemsForRole(section.items || [], previewRole)}
                        dropZoneId={section.key}
                        onReorder={(newItems) => reorderItemsInSection(section.key, newItems)}
                        onExternalDrop={(draggedId) => moveItemToSection(draggedId, section.key)}
                        emptyLabel="Drag an item here, or use Move to below"
                        renderItem={(item, index, itemsArr) => (
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <button onClick={() => setSelectedElement(item)} className={`text-sm text-left ${selectedElement?.id === item.id ? 'text-blue-600 font-medium' : ''}`}>
                              {item.label} <span className="text-xs text-gray-400">({item.page})</span>
                            </button>
                            {previewRole && <InlineDesignControls el={item} roleName={previewRole} pendingOverrides={pendingOverrides} queueOverride={queueOverride} sections={structure} />}
                            <div className="flex items-center gap-1 shrink-0">
                              <button disabled={index === 0} onClick={() => previewRole ? moveItemWithinSectionForRole(section, index, index - 1, previewRole) : moveItemWithinSection(section, index, index - 1)} className="text-xs px-1 text-gray-400 disabled:opacity-20" title="Move up">▲</button>
                              <button disabled={index === itemsArr.length - 1} onClick={() => previewRole ? moveItemWithinSectionForRole(section, index, index + 1, previewRole) : moveItemWithinSection(section, index, index + 1)} className="text-xs px-1 text-gray-400 disabled:opacity-20" title="Move down">▼</button>
                              <select
                                value=""
                                onChange={(e) => { if (e.target.value) moveItemToSection(item.id, e.target.value); }}
                                className="text-xs border rounded px-1 py-0.5"
                              >
                                <option value="">Move to…</option>
                                {structure.filter((s) => s.key !== section.key).map((s) => (
                                  <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                              </select>
                              <button onClick={() => deleteElement(item.id)} className="text-xs text-red-500">Remove</button>
                            </div>
                          </div>
                        )}
                      />
                      <div className="flex gap-2 mt-2">
                        <input placeholder="New item label" value={newItemLabel[section.key] || ''} onChange={(e) => setNewItemLabel((p) => ({ ...p, [section.key]: e.target.value }))} className="border rounded px-2 py-1 text-xs flex-1" />
                        <input placeholder="/route/path" value={newItemPage[section.key] || ''} onChange={(e) => setNewItemPage((p) => ({ ...p, [section.key]: e.target.value }))} className="border rounded px-2 py-1 text-xs flex-1" />
                        <button onClick={() => addItem(section)} className="text-xs px-2 py-1 bg-gray-100 rounded">+ Add</button>
                      </div>
                    </div>
                  </div>
                )}
              />
              <div className="flex gap-2">
                <input placeholder="New section name" value={newSectionLabel} onChange={(e) => setNewSectionLabel(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" />
                <button onClick={addSection} className="px-3 py-1 bg-gray-800 text-white rounded text-sm">+ Add Section</button>
              </div>
            </div>
          )}

          {tab === 'pageElements' && (
            <div className="space-y-4">
              {Object.entries(pageElements).map(([group, elements]) => (
                <div key={group} className="border rounded p-3 bg-white">
                  <div className="text-sm font-semibold mb-2">{group}</div>
                  <SortableList
                    items={elements}
                    dropZoneId={group}
                    onReorder={(newOrder) => {
                      if (!newOrder.every((el) => el && el.id)) return;
                      setPageElements((p) => ({ ...p, [group]: newOrder }));
                      newOrder.forEach((el, idx) => queueReorder(el.id, undefined, idx));
                    }}
                    renderItem={(el) => (
                      <div className="flex-1 flex items-center justify-between">
                        <button onClick={() => setSelectedElement(el)} className={`text-sm text-left ${selectedElement?.id === el.id ? 'text-blue-600 font-medium' : ''}`}>
                          {el.label} <span className="text-xs text-gray-400">[{el.elementType}]</span>
                        </button>
                        <button onClick={() => deleteElement(el.id)} className="text-xs text-red-500">Remove</button>
                      </div>
                    )}
                  />
                </div>
              ))}
              {Object.keys(pageElements).length === 0 && (
                <p className="text-sm text-gray-400">
                  No page elements registered yet. Add FIELD/COLUMN/BUTTON entries to
                  uiControlManifest.js and click "Sync New Elements from Manifest" above.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="col-span-1">
          {!selectedElement && (
            <div className="text-sm text-gray-400 border rounded p-4">
              Click any section, item, or page element on the left to control who can see it.
            </div>
          )}
          {selectedElement && (
            <VisibilityPanel
              element={selectedElement}
              roles={roles}
              users={users}
              selectedUserId={selectedUserId}
              setSelectedUserId={setSelectedUserId}
              onQueueOverride={queueOverride}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function InlineDesignControls({ el, roleName, pendingOverrides, queueOverride, sections }) {
  const key = overrideKey(el.id, 'ROLE', roleName);
  const pending = pendingOverrides[key];
  const savedOverride = el.overrides?.find((o) => o.scopeType === 'ROLE' && o.roleName === roleName);
  const effectiveVisible = pending?.isVisible !== undefined ? pending.isVisible : (savedOverride ? savedOverride.isVisible : el.defaultVisible);
  const effectiveLabel = pending?.customLabel !== undefined ? pending.customLabel : (savedOverride?.customLabel || '');
  const effectiveParent = pending?.parentKeyOverride !== undefined ? pending.parentKeyOverride : (savedOverride?.parentKeyOverride || '');
  const [labelInput, setLabelInput] = useState(effectiveLabel || '');
  useEffect(() => { setLabelInput(effectiveLabel || ''); }, [effectiveLabel]);
  return (
    <div className="flex items-center gap-2 ml-2 shrink-0 bg-purple-50 border border-purple-200 rounded px-2 py-1">
      <label className="flex items-center gap-1 text-xs" title="Visible to this role">
        <input
          type="checkbox"
          checked={effectiveVisible}
          onChange={() => queueOverride(el.id, 'ROLE', roleName, undefined, !effectiveVisible)}
        />
        Visible
      </label>
      <input
        className="border rounded px-1 py-0.5 text-xs w-28"
        placeholder={el.label}
        value={labelInput}
        onChange={(e) => setLabelInput(e.target.value)}
        onBlur={() => {
          if (labelInput !== (effectiveLabel || '')) {
            queueOverride(el.id, 'ROLE', roleName, undefined, effectiveVisible, labelInput.trim() || null);
          }
        }}
      />
      {sections && (
        <select
          value={effectiveParent}
          onChange={(e) => queueOverride(el.id, 'ROLE', roleName, undefined, effectiveVisible, undefined, undefined, e.target.value || null)}
          className="text-xs border rounded px-1 py-0.5"
          title="Where this item appears for this role"
        >
          <option value="">(default section)</option>
          <option value="__ROOT__">— Top-level tab (no section) —</option>
          {sections.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function VisibilityPanel({ element, roles, users, selectedUserId, setSelectedUserId, onQueueOverride }) {
  const [labelRoleName, setLabelRoleName] = useState('');
  const [labelText, setLabelText] = useState('');
  const applyLabel = () => {
    if (!labelRoleName) return;
    const existing = element.overrides?.find((o) => o.scopeType === 'ROLE' && o.roleName === labelRoleName);
    const currentlyVisible = existing ? existing.isVisible : element.defaultVisible;
    onQueueOverride(element.id, 'ROLE', labelRoleName, undefined, currentlyVisible, labelText.trim() || null);
  };
  const findRoleOverride = (roleName) =>
    element.overrides?.find((o) => o.scopeType === 'ROLE' && o.roleName === roleName);
  const findUserOverride = (userId) =>
    element.overrides?.find((o) => o.scopeType === 'USER' && o.userId === userId);

  const toggleRole = (role) => {
    if (role.name === 'SUPER_ADMIN') return; // never hideable — backend bypasses this anyway
    const existing = findRoleOverride(role.name);
    const currentlyVisible = existing ? existing.isVisible : element.defaultVisible;
    onQueueOverride(element.id, 'ROLE', role.name, undefined, !currentlyVisible);
  };

  const toggleUser = () => {
    if (!selectedUserId) return;
    const existing = findUserOverride(selectedUserId);
    const currentlyVisible = existing ? existing.isVisible : element.defaultVisible;
    onQueueOverride(element.id, 'USER', undefined, selectedUserId, !currentlyVisible);
  };

  return (
    <div className="border rounded p-4 space-y-3 sticky top-4">
      <div>
        <div className="text-sm font-semibold">{element.label}</div>
        <div className="text-xs text-gray-400">{element.key}</div>
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 mb-1">By Role</div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {roles.map((r) => {
            const isSuperAdmin = r.name === 'SUPER_ADMIN';
            const ov = findRoleOverride(r.name);
            const visible = isSuperAdmin ? true : (ov ? ov.isVisible : element.defaultVisible);
            return (
              <label
                key={r.id || r.name}
                className={`flex items-center gap-2 text-sm ${isSuperAdmin ? 'text-gray-400' : ''}`}
                title={isSuperAdmin ? 'Super Admin can always see everything — this cannot be hidden.' : undefined}
              >
                <input
                  type="checkbox"
                  checked={visible}
                  disabled={isSuperAdmin}
                  onChange={() => !isSuperAdmin && toggleRole(r)}
                />
                {r.label || r.name}
                {isSuperAdmin && <span className="text-xs">(always visible)</span>}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 mb-1">Override for one specific person</div>
        <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="border rounded px-2 py-1 text-xs w-full mb-2">
          <option value="">— Select a user —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email} ({u.email})</option>
          ))}
        </select>
        {selectedUserId && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={(findUserOverride(selectedUserId)?.isVisible) ?? element.defaultVisible} onChange={toggleUser} />
            Visible to this person
          </label>
        )}
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 mb-1">Rename for a specific role</div>
        <select
          value={labelRoleName}
          onChange={(e) => {
            setLabelRoleName(e.target.value);
            setLabelText(findRoleOverride(e.target.value)?.customLabel || '');
          }}
          className="border rounded px-2 py-1 text-xs w-full mb-2"
        >
          <option value="">— Select a role —</option>
          {roles.filter((r) => r.name !== 'SUPER_ADMIN').map((r) => (
            <option key={r.id || r.name} value={r.name}>{r.label || r.name}</option>
          ))}
        </select>
        {labelRoleName && (
          <div className="flex gap-2">
            <input
              className="border rounded px-2 py-1 text-xs flex-1"
              placeholder="Custom label (blank = use real name)"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
            />
            <button onClick={applyLabel} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded">Apply</button>
          </div>
        )}
      </div>
    </div>
  );
}
