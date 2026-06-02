'use client';
import AppLayout from '@/components/layout/AppLayout';
import { getUser } from '@/lib/auth';
import { Building2, Factory, Layers, Users2, GitBranch, Calendar } from 'lucide-react';
import Link from 'next/link';

const CARDS = [
  { label: 'Company',         description: 'Company profile & settings', href: '/masters/company',        icon: Building2, bg: 'bg-blue-600',   text: 'text-white' },
  { label: 'Plants',          description: 'Manufacturing facilities',   href: '/masters/plant',          icon: Factory,   bg: 'bg-emerald-600', text: 'text-white' },
  { label: 'Units',           description: 'Production units & lines',   href: '/masters/unit',           icon: Layers,    bg: 'bg-violet-600',  text: 'text-white' },
  { label: 'Departments',     description: 'Functional departments',     href: '/masters/department',     icon: Users2,    bg: 'bg-orange-500',  text: 'text-white' },
  { label: 'Branches',        description: 'Sales & office branches',    href: '/masters/branch',         icon: GitBranch, bg: 'bg-pink-600',    text: 'text-white' },
  { label: 'Financial Years', description: 'Accounting periods',         href: '/masters/financial-year', icon: Calendar,  bg: 'bg-teal-600',    text: 'text-white' },
];

export default function DashboardPage() {
  const user = getUser();

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Smart Manufacturing ERP — Phase 1 · Master Setup
        </p>
      </div>

      <div className="mb-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Master Setup
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map(({ label, description, href, icon: Icon, bg, text }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div className={`${bg} p-3.5 rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>
              <Icon size={22} className={text} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
