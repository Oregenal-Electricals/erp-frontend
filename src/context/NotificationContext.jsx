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

// Dismissed-but-still-unread popup ids survive a full page reload (not
// just client-side navigation, which NotificationProvider living in the
// persistent route layout already survives on its own) by riding along
// in sessionStorage - cleared automatically when the browser tab/session
// ends, so it never masks a genuinely new notification in a later visit.
const DISMISSED_KEY = 'erp_dismissed_notification_ids';

function loadDismissedIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Silent - sessionStorage can be unavailable (private browsing, quota); dismissal just won't persist across a reload.
  }
}

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [popups, setPopups] = useState([]); // notifications currently shown as popups, not yet dismissed
  const seenIdsRef = useRef(new Set()); // notification ids already surfaced as a popup this session
  const dismissedIdsRef = useRef(loadDismissedIds()); // notification ids the user explicitly X'd, kept hidden even though still unread

  const fetchAndSurfaceNew = useCallback(async () => {
    if (typeof window === 'undefined' || !localStorage.getItem('erp_token')) return;
    try {
      const { data } = await api.get('/notifications', { params: { unreadOnly: 'true', limit: 20 } });
      setUnreadCount(data.unreadCount ?? 0);

      const fresh = (data.data || []).filter(n => !seenIdsRef.current.has(n.id) && !dismissedIdsRef.current.has(n.id));
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
    dismissedIdsRef.current.add(id);
    saveDismissedIds(dismissedIdsRef.current);
    setPopups(prev => prev.filter(p => p.id !== id));
  }, []);

  const dismissAllPopups = useCallback(() => {
    setPopups(prev => {
      prev.forEach(p => dismissedIdsRef.current.add(p.id));
      saveDismissedIds(dismissedIdsRef.current);
      return [];
    });
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
