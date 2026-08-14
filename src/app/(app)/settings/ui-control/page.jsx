// erp-frontend/src/app/(app)/settings/ui-control/page.jsx
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { UI_CONTROL_MANIFEST } from '@/lib/uiControlManifest';
import SortableList from '@/components/SortableList';

export default function UiControlCenterPage() {
  const [structure, setStructure] = useState([]);
  const [pageElements, setPageElements] = useState({});
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [tab, setTab] = useState('sidebar');
  const [loading, setLoading] = useState(true);
  const [newSectionLabel, setNewSectionLabel] = useState('');
  const [newItemLabel, setNewItemLabel] = useState({});
  const [newItemPage, setNewItemPage] = useState({});

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

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    await api.post('/ui-control/sync', { elements: UI_CONTROL_MANIFEST });
    await load();
  };

  const reorderSections = async (newOrder) => {
    if (!newOrder.every((s) => s && s.id)) return; // guard against a stray drag event with a missing id
    setStructure(newOrder);
    await api.put('/ui-control/elements/reorder', {
      items: newOrder.map((s, idx) => ({ id: s.id, sortOrder: idx })),
    });
    await load();
  };

  const reorderItemsInSection = async (sectionKey, newItems) => {
    if (!newItems.every((it) => it && it.id)) return; // guard against a stray drag event with a missing id
    setStructure((prev) => prev.map((s) => (s.key === sectionKey ? { ...s, items: newItems } : s)));
    await api.put('/ui-control/elements/reorder', {
      items: newItems.map((it, idx) => ({ id: it.id, sortOrder: idx })),
    });
    await load();
  };

  const moveItemWithinSection = async (section, fromIndex, toIndex) => {
    const items = [...section.items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    await reorderItemsInSection(section.key, items);
  };

  const moveItemToSection = async (draggedItemId, targetSectionKey) => {
    if (!draggedItemId || !targetSectionKey) return; // guard against a stray drag event
    const targetSection = structure.find((s) => s.key === targetSectionKey);
    const newSortOrder = targetSection ? targetSection.items.length : 0;
    await api.put('/ui-control/elements/reorder', {
      items: [{ id: draggedItemId, parentKey: targetSectionKey, sortOrder: newSortOrder }],
    });
    await load();
  };

  const addSection = async () => {
    if (!newSectionLabel.trim()) return;
    const key = `sidebar.custom.${newSectionLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await api.post('/ui-control/elements', {
      key, elementType: 'SIDEBAR_SECTION', module: newSectionLabel.trim(), label: newSectionLabel.trim(),
      sortOrder: structure.length,
    });
    setNewSectionLabel('');
    await load();
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
    await load();
  };

  const deleteElement = async (id) => {
    if (!confirm('Remove this element? (Only works if it has no items under it.)')) return;
    try {
      await api.delete(`/ui-control/elements/${id}`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not delete.');
    }
  };

  if (loading) return <div className="p-6">Loading UI Control Center…</div>;

  return (
    <div className="p-6 grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">UI Control Center</h1>
            <p className="text-sm text-gray-500">
              Drag to reorder sections, drag items between sections. Click any element to control
              exactly who can see it, on the right.
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
                            <button
                              disabled={index === 0}
                              onClick={() => moveItemWithinSection(section, index, index - 1)}
                              className="text-xs px-1 text-gray-400 disabled:opacity-20"
                              title="Move up"
                            >▲</button>
                            <button
                              disabled={index === itemsArr.length - 1}
                              onClick={() => moveItemWithinSection(section, index, index + 1)}
                              className="text-xs px-1 text-gray-400 disabled:opacity-20"
                              title="Move down"
                            >▼</button>
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
                  onReorder={async (newOrder) => {
                    setPageElements((p) => ({ ...p, [group]: newOrder }));
                    await api.put('/ui-control/elements/reorder', {
                      items: newOrder.map((el, idx) => ({ id: el.id, sortOrder: idx })),
                    });
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
            onChanged={load}
          />
        )}
      </div>
    </div>
  );
}

function VisibilityPanel({ element, roles, users, selectedUserId, setSelectedUserId, onChanged }) {
  const findRoleOverride = (roleName) =>
    element.overrides?.find((o) => o.scopeType === 'ROLE' && o.roleName === roleName);
  const findUserOverride = (userId) =>
    element.overrides?.find((o) => o.scopeType === 'USER' && o.userId === userId);

  const toggleRole = async (role) => {
    const existing = findRoleOverride(role.name);
    const currentlyVisible = existing ? existing.isVisible : element.defaultVisible;
    await api.put('/ui-control/overrides', {
      overrides: [{ elementId: element.id, scopeType: 'ROLE', roleName: role.name, isVisible: !currentlyVisible }],
    });
    onChanged();
  };

  const toggleUser = async () => {
    if (!selectedUserId) return;
    const existing = findUserOverride(selectedUserId);
    const currentlyVisible = existing ? existing.isVisible : element.defaultVisible;
    await api.put('/ui-control/overrides', {
      overrides: [{ elementId: element.id, scopeType: 'USER', userId: selectedUserId, isVisible: !currentlyVisible }],
    });
    onChanged();
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
