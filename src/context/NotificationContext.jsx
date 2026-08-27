// erp-frontend/src/context/NotificationContext.jsx
'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';

const POLL_INTERVAL_MS = 30000;

const NotificationContext = createContext({
  unreadCount: 0,
  popups: [],
  extraPendingCount: 0,
  dismissPopup: () => {},
  dismissAllPopups: () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  refresh: async () => {},
});

const MAX_VISIBLE_POPUPS = 3;

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [popups, setPopups] = useState([]); // notifications currently shown as popups, not yet dismissed
  const seenIdsRef = useRef(new Set()); // notification ids already surfaced as a popup this session

  const fetchAndSurfaceNew = useCallback(async () => {
    if (typeof window === 'undefined' || !localStorage.getItem('erp_token')) return;
    try {
      const { data } = await api.get('/notifications', { params: { unreadOnly: 'true', limit: 20 } });
      setUnreadCount(data.unreadCount ?? 0);

      const fresh = (data.data || []).filter(n => !seenIdsRef.current.has(n.id));
      if (fresh.length > 0) {
        fresh.forEach(n => seenIdsRef.current.add(n.id));
        // Newest first, cap how many actually render as cards - a
        // burst of many at once becomes one stack rather than
        // flooding the screen.
        setPopups(prev => [...fresh, ...prev]);
      }
    } catch {
      // Silent - polling shouldn't surface errors to the user.
    }
  }, []);

  useEffect(() => {
    fetchAndSurfaceNew();
    const interval = setInterval(fetchAndSurfaceNew, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAndSurfaceNew]);

  const dismissPopup = useCallback((id) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  }, []);

  const dismissAllPopups = useCallback(() => {
    setPopups([]);
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await api.post('/notifications/mark-read', { ids: [id] });
      setUnreadCount(c => Math.max(0, c - 1));
      setPopups(prev => prev.filter(p => p.id !== id));
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const { data } = await api.post('/notifications/mark-read', {});
      setUnreadCount(data.unreadCount ?? 0);
      setPopups([]);
    } catch { /* ignore */ }
  }, []);

  const visiblePopups = popups.slice(0, MAX_VISIBLE_POPUPS);
  const extraPendingCount = Math.max(0, popups.length - MAX_VISIBLE_POPUPS);

  return (
    <NotificationContext.Provider value={{
      unreadCount, popups: visiblePopups, extraPendingCount,
      dismissPopup, dismissAllPopups, markRead, markAllRead, refresh: fetchAndSurfaceNew,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
