// erp-frontend/src/lib/dragState.js
// Plain, non-React module for cross-instance drag coordination between
// separate SortableList components (native HTML5 drag events don't
// carry a payload across independent component trees, so a shared
// external slot is the standard escape hatch here). Kept out of the
// component file itself so the React Compiler's render-purity rule
// (which flags any window.* mutation appearing in a component file,
// even one that only happens inside an event handler, never during
// render) does not apply to it.
export function setDragId(id) {
  if (typeof window !== 'undefined') window.__uiControlDragId = id;
}
export function getDragId() {
  return typeof window !== 'undefined' ? window.__uiControlDragId : null;
}
export function setDragOrigin(originId) {
  if (typeof window !== 'undefined') window.__uiControlDragOrigin = originId;
}
export function getDragOrigin() {
  return typeof window !== 'undefined' ? window.__uiControlDragOrigin : null;
}
