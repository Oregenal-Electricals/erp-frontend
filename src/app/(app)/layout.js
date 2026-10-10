// This route-group layout wraps every page under (app) and - unlike the
// per-page <AppLayout> component in components/layout/AppLayout.jsx - is
// NOT remounted by Next.js on client-side navigation between pages in
// this group. NotificationProvider's "already shown this session" state
// (which notification popups have already been surfaced/dismissed) must
// live here, not inside the per-page component, or it resets on every
// single page navigation and previously-dismissed popups reappear.
import { NotificationProvider } from '@/context/NotificationContext';

export default function AppRouteLayout({ children }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}
