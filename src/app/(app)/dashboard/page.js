'use client';
import AppLayout from '@/components/layout/AppLayout';
import { getUser } from '@/lib/auth';
import {
  Building2,
  Factory,
  Layers,
  Users2,
  GitBranch,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

const CARDS = [
  {
    label: 'Company',
    description: 'Manage company profile',
    href: '/masters/company',
    icon: Building2,
    color: 'bg-blue-500',
    light: 'bg-blue-50',
  },
  {
    label: 'Plants',
    description: 'Manufacturing facilities',
    href: '/masters/plant',
    icon: Factory,
    color: 'bg-green-500',
    light: 'bg-green-50',
  },
  {
    label: 'Units',
    description: 'Production units & lines',
    href: '/masters/unit',
    icon: Layers,
    color: 'bg-purple-500',
    light: 'bg-purple-50',
  },
  {
    label: 'Departments',
    description: 'Functional departments',
    href: '/masters/department',
    icon: Users2,
    color: 'bg-orange-500',
    light: 'bg-orange-50',
  },
  {
    label: 'Branches',
    description: 'Sales & office branches',
    href: '/masters/branch',
    icon: GitBranch,
    color: 'bg-pink-500',
    light: 'bg-pink-50',
  },
  {
    label: 'Financial Years',
    description: 'Accounting periods',
    href: '/masters/financial-year',
    icon: Calendar,
    color: 'bg-teal-500',
    light: 'bg-teal-50',
  },
];

export default function DashboardPage() {
  const user = getUser();

  return (
    <AppLayout>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Smart Manufacturing ERP — Phase 1 · Master Setup
        </p>
      </div>

      {/* Section label */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Master Setup
        </h2>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map(({ label, description, href, icon: Icon, color, light }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div
              className={`${light} p-3 rounded-xl group-hover:scale-110 transition-transform`}
            >
              <Icon size={22} className={color.replace('bg-', 'text-')} />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
