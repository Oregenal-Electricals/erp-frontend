'use client';
import { X, Bell } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

const PRIORITY_STYLES = {
  URGENT: 'border-l-red-500',
  HIGH: 'border-l-orange-500',
  MEDIUM: 'border-l-blue-500',
  LOW: 'border-l-gray-400',
};

export default function NotificationPopupStack() {
  const { popups, extraPendingCount, dismissPopup, markRead, dismissAllPopups } = useNotifications();

  if (popups.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {popups.map(n => (
        <div
          key={n.id}
          className={`bg-white rounded-lg shadow-lg border border-gray-200 border-l-4 ${PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.MEDIUM} p-3.5 flex gap-2.5`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 truncate">{n.title}</p>
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-3">{n.message}</p>
            <button
              onClick={() => markRead(n.id)}
              className="text-[11px] text-blue-600 hover:underline mt-1.5 font-medium"
            >
              Mark as seen
            </button>
          </div>
          <button
            onClick={() => dismissPopup(n.id)}
            className="text-gray-300 hover:text-gray-500 shrink-0"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      ))}

      {extraPendingCount > 0 && (
        <div className="bg-gray-800 text-white rounded-lg shadow-lg p-2.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <Bell size={12} /> +{extraPendingCount} more notification{extraPendingCount > 1 ? 's' : ''} pending
          </span>
          <button onClick={dismissAllPopups} className="underline hover:no-underline">Dismiss all</button>
        </div>
      )}
    </div>
  );
}
