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
    // Never call this without a token — avoids a 401 -> redirect loop on
    // any page that isn't behind auth yet (e.g. this got wrapped around the
    // login page once and caused exactly that: infinite reload).
    if (typeof window === 'undefined' || !localStorage.getItem('erp_token')) {
      setReady(true);
      return;
    }
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
