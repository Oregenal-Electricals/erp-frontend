'use client';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

const MASTERS = [
  {href:'/masters/company',icon:'🏢',label:'Company Master',desc:'Company profile and settings'},
  {href:'/masters/plant',icon:'🏭',label:'Plant Master',desc:'Manufacturing plants (Multi-Plant)'},
  {href:'/masters/branch',icon:'🏬',label:'Branch Master',desc:'Office branches'},
  {href:'/masters/department',icon:'👥',label:'Department Master',desc:'Organizational departments'},
  {href:'/masters/financial-year',icon:'📅',label:'Financial Year',desc:'April to March fiscal year'},
  {href:'/masters/unit',icon:'📏',label:'Unit of Measure',desc:'UOM master'},
  {href:'/masters/hsn-sac',icon:'🏷️',label:'HSN/SAC Codes',desc:'GST commodity codes'},
  {href:'/masters/products',icon:'📦',label:'Product Master',desc:'Finished goods'},
  {href:'/masters/raw-materials',icon:'🔩',label:'Raw Materials',desc:'RM master'},
  {href:'/masters/vendors',icon:'🤝',label:'Vendor Master',desc:'Supplier management'},
  {href:'/masters/price-lists',icon:'💰',label:'Price Lists',desc:'Customer price lists'},
  {href:'/masters/price-history',icon:'📈',label:'Price History',desc:'Price revision history'},
  {href:'/masters/product-revisions',icon:'🔄',label:'Product Revisions',desc:'BOM revision control'},
];

export default function MastersPage() {
  const router = useRouter();
  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Master Data</h1><p className="text-gray-500 text-sm mt-1">Core reference data — Multi-Plant, Multi-Company, Multi-Country</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MASTERS.map(m=>(
            <div key={m.href} onClick={()=>router.push(m.href)} className="bg-white rounded-xl border shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-indigo-300">
              <div className="text-3xl mb-3">{m.icon}</div>
              <div className="font-bold text-gray-800">{m.label}</div>
              <div className="text-sm text-gray-500 mt-1">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
