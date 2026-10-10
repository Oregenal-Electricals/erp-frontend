'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical } from 'lucide-react';
import Sidebar from './Sidebar';
import { UiControlProvider } from '@/context/UiControlContext';
import Header from './Header';
import { isAuthenticated, getUser } from '@/lib/auth';
import PreviewBanner from '@/components/PreviewBanner';
import { NotificationProvider } from '@/context/NotificationContext';
import NotificationPopupStack from '@/components/layout/NotificationPopupStack';

export default function AppLayout({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPreviewFrame, setIsPreviewFrame] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else {
      // Access Control's live preview embeds pages in a frame with ?previewRole=X.
      // Show only the page content there (no sidebar/header/banners) so the preview
      // is the page itself, not the previewing admin's own session chrome.
      try {
        const inFrame = window.self !== window.top;
        const hasPreview = new URLSearchParams(window.location.search).has('previewRole');
        setIsPreviewFrame(inFrame && hasPreview);
      } catch { setIsPreviewFrame(false); }
      setReady(true);
    }
  }, [router]);


  const isTestUser = ready && getUser()?.isTestUser === true;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (isPreviewFrame) {
    return (
      <UiControlProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-50">
            <main>{children}</main>
          </div>
        </NotificationProvider>
      </UiControlProvider>
    );
  }

  // NotificationProvider now lives in the persistent src/app/(app)/layout.js
  // route layout, not here - this component is imported fresh by every
  // individual page.jsx and gets unmounted/remounted on every client-side
  // navigation, which used to reset the provider's "already shown this
  // session" state and made dismissed notification popups reappear on
  // every page. NotificationPopupStack below still works the same way,
  // it just now reads from that higher, non-remounting provider instance.
  return (
    <UiControlProvider>
    <>
    <PreviewBanner />
    <NotificationPopupStack />
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:flex lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {isTestUser && (
          <div className="bg-orange-500 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-center gap-1.5 shrink-0">
            <FlaskConical size={13} />
            TEST ACCOUNT — everything you create here is always tagged as test data and won&apos;t affect real numbers
          </div>
        )}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
    </>
    </UiControlProvider>
  );
}
