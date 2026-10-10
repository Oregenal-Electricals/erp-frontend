// erp-frontend/src/context/ApprovalsContext.jsx
'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

const POLL_INTERVAL_MS = 30000;

const ApprovalsContext = createContext({
  pendingApprovalsCount: 0,
  refresh: async () => {},
});

export function ApprovalsProvider({ children }) {
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (typeof window === 'undefined' || !localStorage.getItem('erp_token')) return;
    try {
      const { data } = await api.get('/workflows/my-approvals');
      setPendingApprovalsCount(Array.isArray(data) ? data.length : 0);
    } catch {
      // Silent, same as notifications polling - a role without
      // WORKFLOW_ACT gets a 403 here, which should just mean "no
      // badge", not a visible error.
      setPendingApprovalsCount(0);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return (
    <ApprovalsContext.Provider value={{ pendingApprovalsCount, refresh: fetchCount }}>
      {children}
    </ApprovalsContext.Provider>
  );
}

export function useApprovals() {
  return useContext(ApprovalsContext);
}
