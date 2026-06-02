'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useState } from 'react';
import {
  LayoutDashboard,
  Settings,
  Building2,
  Factory,
  Layers,
  Users2,
  GitBranch,
  Calendar,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const NAV = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Master Setup',
    icon: Settings,
    children: [
      { label: 'Company', href: '/masters/company', icon: Building2 },
      { label: 'Plants', href: '/masters/plant', icon: Factory },
      { label: 'Units', href: '/masters/unit', icon: Layers },
      { label: 'Departments', href: '/masters/department', icon: Users2 },
      { label: 'Branches', href: '/masters/branch', icon: GitBranch },
      {
        label: 'Financial Years',
        href: '/masters/financial-year',
        icon: Calendar,
      },
    ],
  },
];

function NavItem({ item }) {
  const pathname = usePathname();

  const isChildActive = item.children?.some((c) => pathname.startsWith(c.href));

  const [open, setOpen] = useState(isChildActive ?? false);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={clsx(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
            isChildActive
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          )}
        >
          <span className="flex items-center gap-2.5">
            <item.icon size={16} />
            {item.label}
          </span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {open && (
          <div className="ml-3 mt-1 pl-3 border-l border-gray-200 space-y-0.5">
            {item.children.map((child) => {
              const active =
                pathname === child.href ||
                pathname.startsWith(child.href + '/');
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )}
                >
                  <child.icon size={15} />
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const active = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
        active
          ? 'bg-blue-600 text-white font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      )}
    >
      <item.icon size={16} />
      {item.label}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Smart ERP
        </p>
        <p className="text-sm font-bold text-gray-800 mt-0.5">Manufacturing</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => (
          <NavItem key={item.href ?? item.label} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-400">Phase 1 — Module 1</p>
      </div>
    </aside>
  );
}
