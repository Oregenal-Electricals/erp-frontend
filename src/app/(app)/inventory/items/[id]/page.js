'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import CustomFields from '@/components/custom-fields/CustomFields';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const TYPE_COLORS = {
  RAW_MATERIAL: 'bg-blue-100 text-blue-700', SEMI_FINISHED: 'bg-purple-100 text-purple-700',
  FINISHED_GOOD: 'bg-green-100 text-green-700', CONSUMABLE: 'bg-yellow-100 text-yellow-700',
  PACKAGING: 'bg-orange-100 text-orange-700', SPARE_PART: 'bg-red-100 text-red-700',
};

export default function ItemDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [item, setItem]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/items/${id}`).then(({ data }) => { setItem(data); setLoading(false); });
  }, [id]);

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title={item?.itemCode}
        subtitle={item?.itemName}
        action={
          <div className="flex gap-2">
            <button onClick={() => router.push('/inventory/items')}
              className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">← Back</button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {/* Basic */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Item Details</h3>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: 'Item Code',    value: item?.itemCode },
                { label: 'Item Name',    value: item?.itemName },
                { label: 'Short Name',   value: item?.shortName || '—' },
                { label: 'Type',         value: item?.itemType?.replace(/_/g, ' ') },
                { label: 'Category',     value: item?.category?.name || '—' },
                { label: 'Primary UOM',  value: `${item?.uom?.code} — ${item?.uom?.name}` },
                { label: 'HSN Code',     value: item?.hsnCode || '—' },
                { label: 'GST Rate',     value: `${item?.gstRate}%` },
                { label: 'Purchase Rate',value: item?.purchaseRate ? `₹${item.purchaseRate}` : '—' },
                { label: 'Sales Rate',   value: item?.salesRate ? `₹${item.salesRate}` : '—' },
                { label: 'Reorder Level',value: item?.reorderLevel ? `${item.reorderLevel} ${item?.uom?.code}` : '—' },
                { label: 'Lead Time',    value: item?.leadTimeDays ? `${item.leadTimeDays} days` : '—' },
                { label: 'ABC Class',    value: item?.abcClass || '—' },
                { label: 'Criticality',  value: item?.criticalityLevel || '—' },
                { label: 'Batch Tracked', value: item?.isBatchTracked ? 'Yes' : 'No' },
                { label: 'Serial Tracked',value: item?.isSerialTracked ? 'Yes' : 'No' },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="text-xs text-gray-400 font-medium">{row.label}</dt>
                  <dd className="text-sm text-gray-800 font-medium mt-0.5">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Status</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400">Status</dt>
                <dd className="mt-0.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${item?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item?.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Type</dt>
                <dd className="mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[item?.itemType] || 'bg-gray-100 text-gray-600'}`}>
                    {item?.itemType?.replace(/_/g, ' ')}
                  </span>
                </dd>
              </div>
              {item?.barcode && <div><dt className="text-xs text-gray-400">Barcode</dt><dd className="text-sm font-mono text-gray-800 mt-0.5">{item.barcode}</dd></div>}
              {item?.drawingNo && <div><dt className="text-xs text-gray-400">Drawing No</dt><dd className="text-sm text-gray-800 mt-0.5">{item.drawingNo}</dd></div>}
              <div><dt className="text-xs text-gray-400">Created</dt><dd className="text-xs text-gray-600 mt-0.5">{new Date(item?.createdAt).toLocaleDateString('en-IN')}</dd></div>
            </dl>
          </div>
        </div>
      </div>
      {item && (
        <div className="mt-6 max-w-5xl mx-auto px-6 pb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <CustomFields module="ITEM" recordId={item.id} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
