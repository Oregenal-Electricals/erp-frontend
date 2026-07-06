'use client';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

const SETTINGS = [
  {href:'/settings/system',icon:'⚙️',label:'System Settings',desc:'Global system configuration'},
  {href:'/settings/numbering',icon:'🔢',label:'Numbering Series',desc:'Document number formats'},
  {href:'/settings/custom-fields',icon:'🏷️',label:'Custom Fields',desc:'Add custom fields to modules'},
  {href:'/settings/dummy-data',icon:'🧪',label:'Dummy Data',desc:'Load or purge test data'},
];

export default function SettingsPage() {
  const router = useRouter();
  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Settings</h1><p className="text-gray-500 text-sm mt-1">System configuration and preferences</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SETTINGS.map(s=>(
            <div key={s.href} onClick={()=>router.push(s.href)} className="bg-white rounded-xl border shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-indigo-300">
              <div className="text-3xl mb-3">{s.icon}</div>
              <div className="font-bold text-gray-800">{s.label}</div>
              <div className="text-sm text-gray-500 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
