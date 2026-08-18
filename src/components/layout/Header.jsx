'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Menu, FlaskConical } from 'lucide-react';
import { getUser, clearAuth } from '@/lib/auth';
import { isTestSessionEnabled, setTestSessionEnabled, onTestSessionChange } from '@/lib/testSession';

const HEADER_TOGGLE_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN']);

export default function Header({ onMenuClick }) {
  const router = useRouter();
  const user = getUser();
  const [manualTestMode, setManualTestMode] = useState(false);

  useEffect(() => {
    setManualTestMode(isTestSessionEnabled());
    return onTestSessionChange(setManualTestMode);
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const roleLabel = user?.role?.replace(/_/g, ' ') ?? '';
  const canToggle = !!user?.role && HEADER_TOGGLE_ROLES.has(user.role);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Desktop left spacer */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {user?.isTestUser && (
          <span
            title="This account is a dedicated test account — everything you create is always tagged as test data"
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-500 text-white"
          >
            <FlaskConical size={13} />
            <span className="hidden sm:block">Test User</span>
          </span>
        )}
        {!user?.isTestUser && canToggle && (
          <button
            onClick={() => setTestSessionEnabled(!manualTestMode)}
            title="Admin-only: when on, everything you create is tagged as test data and won't affect real numbers"
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              manualTestMode ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <FlaskConical size={13} />
            <span className="hidden sm:block">Test Mode</span>
          </button>
        )}
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
            <User size={14} className="text-blue-600" />
          </div>
          <span className="font-medium hidden sm:block">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize hidden sm:block">
            {roleLabel}
          </span>
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </header>
  );
}
