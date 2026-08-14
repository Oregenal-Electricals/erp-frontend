'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import {
  ShoppingCart, LayoutDashboard, Settings, Building2, Factory,
  Layers, Users2, GitBranch, Calendar, ChevronDown, ChevronRight,
  Users, Hash, SlidersHorizontal, FileText, ClipboardList, Database,
  Shield, UserCheck, Activity, BarChart3, Truck, LogIn, PackageCheck,
  PackageOpen, BadgeCheck, Box, Tag, CreditCard, Globe, Calculator,
} from 'lucide-react';

// Maps icon key strings stored in the DB (ui_control_elements.icon) to the
// actual lucide-react components. Add here whenever a new section/item is
// created from the UI Control Center admin screen with a new icon name.
const ICON_MAP = {
  'layout-dashboard': LayoutDashboard, 'clipboard-list': ClipboardList, shield: Shield,
  'shopping-cart': ShoppingCart, globe: Globe, tag: Tag, database: Database,
  factory: Factory, 'badge-check': BadgeCheck, 'users-2': Users2, 'credit-card': CreditCard,
  activity: Activity, 'bar-chart-3': BarChart3, settings: Settings, 'package-check': PackageCheck,
  'package-open': PackageOpen, truck: Truck, 'user-check': UserCheck, 'log-in': LogIn,
  'file-text': FileText, layers: Layers, calendar: Calendar, calculator: Calculator,
  hash: Hash, 'sliders-horizontal': SlidersHorizontal, box: Box, 'building-2': Building2,
  'git-branch': GitBranch, users: Users,
};
const DEFAULT_ICON = ClipboardList;

const SIDEBAR_STORAGE_KEY = 'erp_sidebar_open_sections';

// Minimal built-in safety net: if the DB-driven structure ever fails to load
// (network blip, before the seed script has run, etc.), the sidebar doesn't
// go fully blank — Super Admin/anyone can still reach Settings to fix it.
const FALLBACK_STRUCTURE = [
  { key: 'fallback.dashboard', label: 'Dashboard', page: '/dashboard', icon: 'layout-dashboard', items: [] },
  {
    key: 'fallback.settings', label: 'Settings', icon: 'settings',
    items: [
      { key: 'fallback.settings.roles', label: 'Roles & Permissions', page: '/settings/roles-permissions' },
      { key: 'fallback.settings.uiControl', label: 'UI Control Center', page: '/settings/ui-control' },
    ],
  },
];

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [structure, setStructure] = useState(null); // null = loading
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const openKeys = Object.keys(parsed).filter((k) => parsed[k]);
        const sanitized = openKeys.length > 1 ? { [openKeys[0]]: true } : parsed;
        setOpenSections(sanitized);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => { setUser(getUser()); }, []);

  useEffect(() => {
    api
      .get('/ui-control/my-sidebar')
      .then((res) => setStructure(res.data && res.data.length > 0 ? res.data : FALLBACK_STRUCTURE))
      .catch(() => setStructure(FALLBACK_STRUCTURE));
  }, []);

  if (!user || structure === null) return null;

  function toggleSection(key) {
    setOpenSections((prev) => {
      const wasOpen = !!prev[key];
      const next = wasOpen ? {} : { [key]: true };
      try { localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <nav className="w-64 bg-white border-r h-screen overflow-y-auto flex-shrink-0">
      <div className="p-4">
        {structure.map((section) => {
          const SectionIcon = ICON_MAP[section.icon] || DEFAULT_ICON;

          // Standalone item (no children, e.g. Dashboard) — renders as a direct link
          if (!section.items || section.items.length === 0) {
            if (!section.page) return null;
            const active = pathname === section.page;
            return (
              <Link
                key={section.key}
                href={section.page}
                onClick={onClose}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 ${
                  active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SectionIcon size={16} /> {section.label}
              </Link>
            );
          }

          const containsActivePage = section.items.some((c) => c.page === pathname);
          const sectionIsOpen = section.key in openSections ? openSections[section.key] : (hydrated && containsActivePage);

          return (
            <div key={section.key} className="mb-1">
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium"
              >
                <span className="flex items-center gap-2"><SectionIcon size={16} /> {section.label}</span>
                {sectionIsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {sectionIsOpen && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const ItemIcon = ICON_MAP[item.icon] || DEFAULT_ICON;
                    const active = pathname === item.page;
                    return (
                      <Link
                        key={item.key}
                        href={item.page}
                        onClick={onClose}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                          active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <ItemIcon size={14} /> {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

// Your previous permission-based version (PATH_PERMISSION / ROLE_SECTIONS / NAV)
// is now fully superseded — the sidebar structure AND visibility both live in
// the database and are edited from /settings/ui-control. Keep a copy of the
// old file (e.g. rename to Sidebar.legacy.jsx) until this is verified on
// staging, per the project's own file-removal caution rule.
