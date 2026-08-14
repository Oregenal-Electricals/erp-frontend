// erp-frontend/src/app/(app)/settings/ui-control/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { UI_CONTROL_MANIFEST } from '@/lib/uiControlManifest';
import SortableList from '@/components/SortableList';

const overrideKey = (elementId, scopeType, roleName, userId) =>
  `${elementId}:${scopeType}:${scopeType === 'ROLE' ? roleName : userId}`;

export default function UiControlCenterPage() {
  const [structure, setStructure] = useState([]);
  const [pageElements, setPageElements] = useState({});
  const [roles, setRoles] = useState([]);
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
    if (!confirm('Remove this element? (Only works if it has no items under it.)')) return;
    try {
      await api.delete(`/ui-control/elements/${id}`);
      await silentReload();
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not delete.');
    }
  };

  const queueOverride = (elementId, scopeType, roleName, userId, isVisible) => {
    const key = overrideKey(elementId, scopeType, roleName, userId);
    setPendingOverrides((prev) => ({
      ...prev,
      [key]: { elementId, scopeType, roleName, userId, isVisible },
    }));
    setSelectedElement((prev) => {
      if (!prev || prev.id !== elementId) return prev;
      const overrides = prev.overrides ? [...prev.overrides] : [];
      const idx = overrides.findIndex((o) =>
        scopeType === 'ROLE' ? o.scopeType === 'ROLE' && o.roleName === roleName : o.scopeType === 'USER' && o.userId === userId,
      );
      const newOv = { scopeType, roleName, userId, isVisible };
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
            <button onClick={handleSync} className="px-3 py-2 bg-blue-600 text-white rounded text-sm shrink-0">
              Sync New Elements from Manifest
            </button>
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
                        items={section.items || []}
                        dropZoneId={section.key}
                        onReorder={(newItems) => reorderItemsInSection(section.key, newItems)}
                        onExternalDrop={(draggedId) => moveItemToSection(draggedId, section.key)}
                        emptyLabel="Drag an item here, or use Move to below"
                        renderItem={(item, index, itemsArr) => (
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <button onClick={() => setSelectedElement(item)} className={`text-sm text-left ${selectedElement?.id === item.id ? 'text-blue-600 font-medium' : ''}`}>
                              {item.label} <span className="text-xs text-gray-400">({item.page})</span>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <button disabled={index === 0} onClick={() => moveItemWithinSection(section, index, index - 1)} className="text-xs px-1 text-gray-400 disabled:opacity-20" title="Move up">▲</button>
                              <button disabled={index === itemsArr.length - 1} onClick={() => moveItemWithinSection(section, index, index + 1)} className="text-xs px-1 text-gray-400 disabled:opacity-20" title="Move down">▼</button>
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

function VisibilityPanel({ element, roles, users, selectedUserId, setSelectedUserId, onQueueOverride }) {
  const findRoleOverride = (roleName) =>
    element.overrides?.find((o) => o.scopeType === 'ROLE' && o.roleName === roleName);
  const findUserOverride = (userId) =>
    element.overrides?.find((o) => o.scopeType === 'USER' && o.userId === userId);

  const toggleRole = (role) => {
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
            const ov = findRoleOverride(r.name);
            const visible = ov ? ov.isVisible : element.defaultVisible;
            return (
              <label key={r.id || r.name} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={visible} onChange={() => toggleRole(r)} />
                {r.label || r.name}
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
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
        {selectedUserId && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={(findUserOverride(selectedUserId)?.isVisible) ?? element.defaultVisible} onChange={toggleUser} />
            Visible to this person
          </label>
        )}
      </div>
    </div>
  );
}
