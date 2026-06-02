'use client';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { getUser, clearAuth } from '@/lib/auth';

export default function Header() {
  const router = useRouter();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const roleLabel = user?.role?.replace(/_/g, ' ') ?? '';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div />

      <div className="flex items-center gap-4">
        {/* User info */}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
            <User size={14} className="text-blue-600" />
          </div>
          <span className="font-medium">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">
            {roleLabel}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </header>
  );
}
