'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';

function PreviewContent() {
  const searchParams = useSearchParams();
  const roleName = searchParams.get('roleName') || '';
  const [structure, setStructure] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roleName) { setError('No role specified.'); return; }
    api.get(`/ui-control/preview-sidebar?roleName=${encodeURIComponent(roleName)}`)
      .then((res) => setStructure(res.data || []))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load preview'));
  }, [roleName]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white px-6 py-3 flex items-center justify-between">
        <div>
          <div className="font-semibold">Preview Mode</div>
          <div className="text-xs text-indigo-100">Showing exactly what <strong>{roleName}</strong> sees — hidden items removed, custom labels applied. Read-only.</div>
        </div>
      </div>

      <div className="flex">
        <nav className="w-64 bg-white border-r min-h-screen p-2">
          {error && <div className="p-3 text-sm text-red-600">{error}</div>}
          {!error && !structure && <div className="p-3 text-sm text-gray-400">Loading…</div>}
          {structure && structure.map((section) => (
            <div key={section.key} className="mb-1">
              {(!section.items || section.items.length === 0) ? (
                <div className="px-3 py-2 text-sm font-medium text-gray-700">{section.label}</div>
              ) : (
                <div>
                  <div className="px-3 py-2 text-sm font-semibold text-gray-800">{section.label}</div>
                  <div className="ml-3 border-l pl-2 space-y-0.5">
                    {section.items.map((item) => (
                      <div key={item.key} className="px-3 py-1.5 text-sm text-gray-600">{item.label}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex-1 p-8 text-center text-gray-400">
          <div className="text-lg font-medium">This is a preview of the sidebar only.</div>
          <div className="text-sm mt-2">Close this tab to return to the UI Control Center and continue editing.</div>
        </div>
      </div>
    </div>
  );
}

export default function UiControlPreviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading preview…</div>}>
      <PreviewContent />
    </Suspense>
  );
}
