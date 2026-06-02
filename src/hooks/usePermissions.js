'use client';
import { useState, useEffect } from 'react';
import { loadPermissions, hasPermission, hasAnyPermission } from '@/lib/permissions';

export function usePermissions() {
  const [loaded, setLoaded] = useState(false);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    loadPermissions().then((perms) => {
      setPermissions(perms);
      setLoaded(true);
    });
  }, []);

  return {
    loaded,
    permissions,
    can: (permission) => hasPermission(permission),
    canAny: (...perms) => hasAnyPermission(...perms),
  };
}
