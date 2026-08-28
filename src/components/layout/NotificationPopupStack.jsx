'use client';
import { useRouter } from 'next/navigation';
import { X, Bell } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { resolveNotificationRoute } from '@/lib/notificationRoutes';

const PRIORITY_STYLES = {
  URGENT: 'border-l-red-500',
  HIGH: 'border-l-orange-500',
  MEDIUM: 'border-l-blue-500',
  LOW: 'border-l-gray-400',
};

export default function NotificationPopupStack() {
  const router = useRouter();
  const { popups, extraPendingCount, dismissPopup, markRead, dismissAllPopups } = useNotifications();

  if (popups.length === 0) return null;

  async function handleView(n) {
    await markRead(n.id);
    const route = resolveNotificationRoute(n);
    if (route) router.push(route);
  }

  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {popups.map(n => {
        const hasRoute = !!resolveNotificationRoute(n);
        return (
          <div
            key={n.id}
            className={`bg-white rounded-lg shadow-lg border border-gray-200 border-l-4 ${PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.MEDIUM} p-3.5 flex gap-2.5`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate">{n.title}</p>
              <p className="text-xs text-gray-600 mt-0.5 line-clamp-3">{n.message}</p>
              <div className="flex items-center gap-3 mt-1.5">
                {hasRoute ? (
                  <button onClick={() => handleView(n)} className="text-[11px] text-blue-600 hover:underline font-semibold">
                    View
                  </button>
                ) : null}
                <button onClick={() => markRead(n.id)} className="text-[11px] text-gray-500 hover:underline font-medium">
                  Mark as seen
                </button>
              </div>
            </div>
            <button
              onClick={() => dismissPopup(n.id)}
              className="text-gray-300 hover:text-gray-500 shrink-0"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}

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
