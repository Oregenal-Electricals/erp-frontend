// erp-frontend/src/context/UiControlContext.jsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

const UiControlContext = createContext({
  ready: false,
  isVisible: () => true,
  getSortOrder: () => 0,
  refresh: () => {},
});

export function UiControlProvider({ children }) {
  const [map, setMap] = useState({});
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/ui-control/my-visibility');
      setMap(res.data || {});
    } catch (e) {
      // Fail OPEN: on error, show everything real permissions already allow
      // rather than silently hiding the app. This layer only narrows on success.
      setMap({});
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isVisible = (key) => {
    if (!key) return true;
    const entry = map[key];
    if (!entry) return true; // unregistered element = not yet controlled = visible
    return entry.visible;
  };

  const getSortOrder = (key, fallback = 0) => map[key]?.sortOrder ?? fallback;

  return (
    <UiControlContext.Provider value={{ ready, isVisible, getSortOrder, refresh }}>
      {children}
    </UiControlContext.Provider>
  );
}

export function useUiControl() {
  return useContext(UiControlContext);
}
