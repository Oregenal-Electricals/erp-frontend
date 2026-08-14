// erp-frontend/src/components/SortableList.jsx
'use client';

import { useState } from 'react';

/**
 * Generic drag-to-reorder list. No external DnD library required (native HTML5
 * drag events), so it works regardless of what's already in package.json.
 *
 * props:
 *   items: array of { id, label, ... }
 *   onReorder(newOrderedItems): called after a drop with the full reordered array
 *   renderItem(item): custom row content (optional)
 *   onExternalDrop(draggedId): called when an item dragged FROM ANOTHER SortableList
 *                              (via window.__uiControlDragId) is dropped on this list —
 *                              used for moving items between sidebar sections.
 *   dropZoneId: identifies this list for cross-list drag (e.g. the section key)
 */
export default function SortableList({ items, onReorder, renderItem, onExternalDrop, dropZoneId, emptyLabel = 'Drop here' }) {
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggingLocalId, setDraggingLocalId] = useState(null);

  const handleDragStart = (item) => {
    setDraggingLocalId(item.id);
    window.__uiControlDragId = item.id;
    window.__uiControlDragOrigin = dropZoneId;
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    e.stopPropagation(); // don't let this also trigger the container's onDrop below
    const draggedId = window.__uiControlDragId;
    setDragOverIndex(null);

    if (window.__uiControlDragOrigin !== dropZoneId) {
      // Item came from a different list (different sidebar section) — let the
      // parent decide how to reparent it; this list doesn't own that item.
      onExternalDrop?.(draggedId, index);
      window.__uiControlDragId = null;
      return;
    }

    const fromIndex = items.findIndex((i) => i.id === draggedId);
    if (fromIndex === -1 || fromIndex === index) return;

    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(index, 0, moved);
    onReorder(reordered);
    window.__uiControlDragId = null;
  };

  const handleContainerDrop = (e) => {
    e.preventDefault();
    if (items.length > 0) return; // handled per-row above
    const draggedId = window.__uiControlDragId;
    if (window.__uiControlDragOrigin !== dropZoneId) {
      onExternalDrop?.(draggedId, 0);
    }
    window.__uiControlDragId = null;
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleContainerDrop}
      className="min-h-[36px]"
    >
      {items.length === 0 && (
        <div className="text-xs text-gray-300 italic px-2 py-2 border border-dashed rounded">{emptyLabel}</div>
      )}
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(item)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={() => setDragOverIndex(null)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-move border ${
            dragOverIndex === index ? 'border-blue-400 bg-blue-50' : 'border-transparent hover:bg-gray-50'
          } ${draggingLocalId === item.id ? 'opacity-40' : ''}`}
        >
          <span className="text-gray-300 text-xs select-none">⠿</span>
          {renderItem ? renderItem(item, index, items) : <span className="text-sm">{item.label}</span>}
        </div>
      ))}
    </div>
  );
}
