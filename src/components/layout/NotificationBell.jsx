'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { resolveNotificationRoute } from '@/lib/notificationRoutes';
import api from '@/lib/api';

const PRIORITY_DOT = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-gray-400',
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const { unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function togglePanel() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const { data } = await api.get('/notifications', { params: { limit: 15 } });
        setItems(data.data || []);
      } finally { setLoading(false); }
    }
  }

  async function handleItemClick(n) {
    if (!n.isRead) await markRead(n.id);
    setOpen(false);
    const route = resolveNotificationRoute(n);
    if (route) router.push(route);
  }

  async function handleMarkAllRead() {
    await markAllRead();
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={togglePanel}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No notifications yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map(n => {
                  const hasRoute = !!resolveNotificationRoute(n);
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-2.5 ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                    >
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[n.priority] || PRIORITY_DOT.MEDIUM}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-800 truncate">{n.title}</span>
                        <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</span>
                        <span className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-gray-400">{timeAgo(n.createdAt)}</span>
                          {hasRoute && <span className="text-[11px] text-blue-500">View →</span>}
                        </span>
                      </span>
                      {!n.isRead && <Check size={13} className="text-blue-400 shrink-0 mt-1.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
