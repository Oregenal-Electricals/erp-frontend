// erp-frontend/src/components/UiGate.jsx
'use client';

import { useUiControl } from '@/context/UiControlContext';

/**
 * Wrap any controllable piece — field, column, button, tab — with this.
 * Presentation-only: pairs with your existing hasPermission() check for
 * actions, never replaces it. Can only hide something further.
 * Usage: <UiGate uiKey="purchase.po.field.unitPrice"><td>{item.unitPrice}</td></UiGate>
 */
export default function UiGate({ uiKey, children, fallback = null }) {
  const { isVisible } = useUiControl();
  if (!isVisible(uiKey)) return fallback;
  return children;
}
