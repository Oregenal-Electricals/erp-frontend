'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

export default function BomUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [useExisting, setUseExisting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  async function handleUpload() {
    if (!file) return;
    setParsing(true); setError(''); setPreview(null); setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/bom-import/parse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to parse file'); setParsing(false); return; }
      setPreview(data);
      setUseExisting(!!data.productExists);
    } catch (e) {
      setError('Upload failed - please try again.');
    }
    setParsing(false);
  }

  function updateProductField(field, value) {
    setPreview(p => ({ ...p, product: { ...p.product, [field]: value } }));
  }

  function updateItem(sectionIdx, itemIdx, field, value) {
    setPreview(p => {
      const sections = [...p.sections];
      const items = [...sections[sectionIdx].items];
      items[itemIdx] = { ...items[itemIdx], [field]: value };
      sections[sectionIdx] = { ...sections[sectionIdx], items };
      return { ...p, sections };
    });
  }

  function removeItem(sectionIdx, itemIdx) {
    setPreview(p => {
      const sections = [...p.sections];
      sections[sectionIdx] = { ...sections[sectionIdx], items: sections[sectionIdx].items.filter((_, i) => i !== itemIdx) };
      return { ...p, sections };
    });
  }

  async function handleConfirm() {
    setConfirming(true); setError('');
    const payload = {
      useExistingProductId: useExisting ? preview.existingProduct?.id : undefined,
      product: preview.product,
      bomVersion: 'v1',
      sections: preview.sections.map(s => ({
        name: s.name,
        items: s.items.map(item => ({
          partCode: item.partCode,
          itemCode: item.partCode,
          itemName: item.description,
          package: item.package,
          quantity: parseFloat(item.quantity) || 0,
          uom: item.uom,
          location: item.location,
          preferredMake: item.preferredMake,
          alternateMakes: item.alternateMakes,
          rawMaterialId: item.rawMaterialId,
        })),
      })),
    };
    try {
      const res = await fetch(`${API}/bom-import/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Import failed'); setConfirming(false); return; }
      setResult(data);
    } catch (e) {
      setError('Import failed - please try again.');
    }
    setConfirming(false);
  }

  const totalItems = preview ? preview.sections.reduce((s, sec) => s + sec.items.length, 0) : 0;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload BOM</h1>
        <p className="text-gray-500 text-sm mt-1">Import a Bill of Materials from Excel or CSV. Review and correct everything before it's saved.</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}

      {result ? (
        <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-bold text-gray-900">Import Complete</h2>
          <p className="text-sm text-gray-500 mt-2">
            Created <span className="font-semibold text-gray-800">{result.bomNumber}</span> with{' '}
            <span className="font-semibold text-gray-800">{result.itemsImported}</span> items.
          </p>
          <button
            onClick={() => router.push(`/inventory/bom/${result.bomId}`)}
            className="mt-5 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            View BOM
          </button>
        </div>
      ) : !preview ? (
        <div className="bg-white rounded-xl border shadow-sm p-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select a BOM file (.xlsx, .csv)</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <button
            onClick={handleUpload}
            disabled={!file || parsing}
            className="mt-5 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {parsing ? 'Parsing...' : 'Upload & Preview'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Product info */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Product</h3>
            {preview.productExists && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <p className="text-amber-800 font-medium mb-2">
                  A product with code "{preview.existingProduct.code}" already exists: {preview.existingProduct.name}
                </p>
                <label className="flex items-center gap-2 text-amber-700">
                  <input type="checkbox" checked={useExisting} onChange={(e) => setUseExisting(e.target.checked)} />
                  Attach this BOM to the existing product (uncheck to create a new product instead)
                </label>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Product Code</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={preview.product.code || ''} onChange={(e) => updateProductField('code', e.target.value)} disabled={useExisting} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Product Name</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={preview.product.name || preview.product.description || ''} onChange={(e) => updateProductField('name', e.target.value)} disabled={useExisting} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Brand</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={preview.product.brand || ''} onChange={(e) => updateProductField('brand', e.target.value)} disabled={useExisting} />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border shadow-sm p-5 flex gap-8">
            <div><div className="text-2xl font-bold text-gray-900">{totalItems}</div><div className="text-xs text-gray-400">Total Items</div></div>
            <div><div className="text-2xl font-bold text-emerald-600">{preview.newRawMaterialsCount}</div><div className="text-xs text-gray-400">New Raw Materials</div></div>
            <div><div className="text-2xl font-bold text-gray-500">{preview.existingRawMaterialsCount}</div><div className="text-xs text-gray-400">Already Exist (Reused)</div></div>
          </div>

          {/* Sections */}
          {preview.sections.map((section, sIdx) => (
            <div key={sIdx} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-800 text-sm">{section.name} <span className="text-gray-400 font-normal">({section.items.length} items)</span></h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      {['Sr. No.', 'Part Code', 'Item Name', 'Qty', 'UOM', 'Preferred Make', 'Alternate Makes', ''].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, iIdx) => (
                      <tr key={iIdx} className={`border-b ${item.existsAsRawMaterial ? 'bg-gray-50' : ''}`}>
                        <td className="px-2 py-1.5 text-gray-400">{iIdx + 1}</td>
                        <td className="px-2 py-1.5">
                          <span className="font-mono text-gray-700">{item.partCode}</span>
                          {item.existsAsRawMaterial && <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 px-1 rounded">existing</span>}
                        </td>
                        <td className="px-2 py-1.5"><input className="border rounded px-2 py-1 w-40" value={item.description} onChange={(e) => updateItem(sIdx, iIdx, 'description', e.target.value)} /></td>
                        <td className="px-2 py-1.5"><input type="number" className="border rounded px-2 py-1 w-16" value={item.quantity ?? ''} onChange={(e) => updateItem(sIdx, iIdx, 'quantity', e.target.value)} /></td>
                        <td className="px-2 py-1.5"><input className="border rounded px-2 py-1 w-16" value={item.uom || ''} onChange={(e) => updateItem(sIdx, iIdx, 'uom', e.target.value)} /></td>
                        <td className="px-2 py-1.5"><input className="border rounded px-2 py-1 w-28" value={item.preferredMake || ''} onChange={(e) => updateItem(sIdx, iIdx, 'preferredMake', e.target.value)} /></td>
                        <td className="px-2 py-1.5"><input className="border rounded px-2 py-1 w-48" value={item.alternateMakes || ''} onChange={(e) => updateItem(sIdx, iIdx, 'alternateMakes', e.target.value)} placeholder="Brand1/Brand2/Brand3" /></td>
                        <td className="px-2 py-1.5"><button onClick={() => removeItem(sIdx, iIdx)} className="text-red-400 hover:text-red-600 text-sm">✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-3 pb-8">
            <button onClick={() => { setPreview(null); setFile(null); }} className="px-5 py-2.5 border rounded-lg text-sm">Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={confirming || totalItems === 0}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {confirming ? 'Importing...' : `Confirm Import (${totalItems} items)`}
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
