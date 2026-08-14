'use client';
import { useState, useEffect, useCallback, Fragment } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import CustomFields from '@/components/custom-fields/CustomFields';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('erp_token');
}

const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  OBSOLETE: 'bg-gray-100 text-gray-500',
};

export default function BomDetailPage() {
  const { id } = useParams();
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    sequence: 1, itemType: 'RAW_MATERIAL', section: '', itemCode: '', itemName: '',
    uom: 'PCS', quantity: '', wastagePercent: 0, unitCost: '', isCritical: false, notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stages, setStages] = useState([]);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [routings, setRoutings] = useState([]);
  const [stageNames, setStageNames] = useState({});
  const [generatingStages, setGeneratingStages] = useState(false);
  const [approvingStages, setApprovingStages] = useState(false);
  const [creatingRouting, setCreatingRouting] = useState(false);
  const [setupError, setSetupError] = useState('');

  const fetchChain = useCallback(async () => {
    const [sRes, vRes, rRes] = await Promise.all([
      fetch(`${API}/boms/${id}/stages`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/boms/${id}/history`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/routing`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (sRes.ok) setStages(await sRes.json());
    if (vRes.ok) setVersions(await vRes.json());
    if (rRes.ok) setRoutings(await rRes.json());
  }, [id]);

  // Best-effort guess at a stage name from a section name (e.g. "LED DRIVER
  // -SMT" -> "SMT") - just a starting point, always editable before
  // generating stages.
  function guessStageName(section) {
    const s = section.toUpperCase();
    if (s.includes('SMT')) return 'SMT';
    if (/\bMI\b/.test(s)) return 'MI';
    if (s.includes('ASSEMBL')) return 'Assembly';
    if (s.includes('PACK')) return 'Packaging';
    return section;
  }

  const fetchBom = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/boms/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setBom(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchBom(); fetchChain(); }, [fetchBom, fetchChain]);

  useEffect(() => {
    if (!bom?.items || Object.keys(stageNames).length > 0) return;
    const sections = [...new Set(bom.items.map(i => i.section).filter(Boolean))];
    if (sections.length === 0) return;
    const guesses = {};
    for (const s of sections) guesses[s] = guessStageName(s);
    setStageNames(guesses);
  }, [bom, stageNames]);

  function openAdd(presetSection) {
    setEditItem(null);
    const nextSeq = bom?.items?.length ? Math.max(...bom.items.map(i => i.sequence)) + 1 : 1;
    setForm({ sequence: nextSeq, itemType: 'RAW_MATERIAL', section: presetSection || '', itemCode: '', itemName: '', uom: 'PCS', quantity: '', wastagePercent: 0, unitCost: '', isCritical: false, notes: '' });
    setError(''); setShowModal(true);
  }

  function openEdit(item) {
    setEditItem(item);
    setForm({
      sequence: item.sequence, itemType: item.itemType, section: item.section || '', itemCode: item.itemCode,
      itemName: item.itemName, uom: item.uom, quantity: item.quantity,
      wastagePercent: item.wastagePercent || 0, unitCost: item.unitCost || '',
      isCritical: item.isCritical, notes: item.notes || ''
    });
    setError(''); setShowModal(true);
  }

  async function handleSave() {
    setSaving(true); setError('');
    const body = { ...form, quantity: parseFloat(form.quantity), wastagePercent: parseFloat(form.wastagePercent) || 0 };
    if (body.unitCost !== '') body.unitCost = parseFloat(body.unitCost); else delete body.unitCost;
    const url = editItem ? `${API}/boms/${id}/items/${editItem.id}` : `${API}/boms/${id}/items`;
    const method = editItem ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchBom(); }
    else setError(data.message || 'Save failed');
    setSaving(false);
  }

  async function handleRemoveItem(itemId) {
    if (!confirm('Remove this item?')) return;
    await fetch(`${API}/boms/${id}/items/${itemId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchBom();
  }

  async function handleApprove() {
    if (!confirm('Approve this BOM? Items cannot be modified after approval.')) return;
    await fetch(`${API}/boms/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchBom();
  }

  async function handleObsolete() {
    if (!confirm('Mark this BOM as obsolete?')) return;
    await fetch(`${API}/boms/${id}/obsolete`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchBom();
  }

  async function handleGenerateStages() {
    setGeneratingStages(true); setSetupError('');
    const sections = Object.keys(stageNames);
    const body = { stages: sections.map(section => ({ stageName: stageNames[section], sections: [section] })) };
    const res = await fetch(`${API}/boms/${id}/generate-stages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { fetchChain(); }
    else setSetupError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to generate stages');
    setGeneratingStages(false);
  }

  async function handleApproveAllStages() {
    setApprovingStages(true); setSetupError('');
    const toApprove = stages.filter(s => s.status === 'DRAFT');
    for (const s of toApprove) {
      const res = await fetch(`${API}/boms/${s.id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) {
        const data = await res.json();
        setSetupError(`Failed approving ${s.bomNumber}: ${data.message || 'unknown error'}`);
        setApprovingStages(false);
        return;
      }
    }
    fetchChain();
    setApprovingStages(false);
  }

  async function handleCreateRouting() {
    setCreatingRouting(true); setSetupError('');
    const approvedStages = stages.filter(s => s.status === 'APPROVED');
    const body = {
      finalProductId: bom.productId,
      routingName: `${bom.product?.name || bom.product?.code} Standard Routing`,
      stages: approvedStages.map(s => ({ stageName: s.bomNumber.split('-').pop(), bomId: s.id })),
    };
    const res = await fetch(`${API}/routing`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { fetchChain(); }
    else setSetupError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to create routing');
    setCreatingRouting(false);
  }

  if (loading) return <AppLayout><div className="p-6 text-gray-400">Loading...</div></AppLayout>;
  if (!bom) return <AppLayout><div className="p-6 text-red-500">BOM not found</div></AppLayout>;

  const totalCost = bom.items?.reduce((s, i) => s + (i.totalCost || 0), 0) || 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/inventory/bom" className="text-gray-400 hover:text-gray-600 text-sm">← BOMs</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">{bom.bomNumber}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[bom.status]}`}>{bom.status}</span>
        </div>
        <div className="text-gray-500 text-sm mb-6">{bom.product?.code} — {bom.product?.name} · Version {bom.version}</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Items', value: bom.items?.length || 0 },
            { label: 'Total BOM Cost', value: totalCost ? `₹${totalCost.toFixed(2)}` : '—' },
            { label: 'Effective From', value: bom.effectiveFrom ? new Date(bom.effectiveFrom).toLocaleDateString() : '—' },
            { label: 'Approved At', value: bom.approvedAt ? new Date(bom.approvedAt).toLocaleDateString() : '—' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-500">{s.label}</div>
              <div className="text-xl font-bold text-gray-800 mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {bom.status === 'APPROVED' && bom.bomType === 'MASTER' && (
          <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-5 mb-6">
            <h2 className="font-semibold text-gray-800 mb-1">Set Up Production</h2>
            <p className="text-xs text-gray-500 mb-4">Turn this approved BOM into a working production routing, step by step — no need to know where the Production module lives.</p>

            {setupError && <div className="mb-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{setupError}</div>}

            {stages.length === 0 ? (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Step 1: Name each production stage</div>
                <div className="space-y-2 mb-3">
                  {Object.keys(stageNames).map(section => (
                    <div key={section} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-56 truncate" title={section}>{section}</span>
                      <span className="text-gray-300">→</span>
                      <input className="border rounded px-2 py-1 text-sm w-40" value={stageNames[section]} onChange={e => setStageNames(prev => ({ ...prev, [section]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <button onClick={handleGenerateStages} disabled={generatingStages || Object.keys(stageNames).length === 0} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {generatingStages ? 'Generating...' : 'Generate Production Stages'}
                </button>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-green-700 mb-2">✓ Step 1 done — {stages.length} stage{stages.length > 1 ? 's' : ''} generated</div>
                <div className="space-y-1 mb-4">
                  {stages.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 border text-sm">
                      <span className="font-mono text-blue-600">{s.bomNumber}</span>
                      <span className="text-gray-500">{s._count?.items || 0} items</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100'}`}>{s.status}</span>
                    </div>
                  ))}
                </div>

                {stages.some(s => s.status === 'DRAFT') ? (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Step 2: Approve the stages</div>
                    <button onClick={handleApproveAllStages} disabled={approvingStages} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                      {approvingStages ? 'Approving...' : 'Approve All Stages'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium text-green-700 mb-2">✓ Step 2 done — all stages approved</div>
                    {(() => {
                      const existingRouting = routings.find(r => r.finalProductId === bom.productId || r.finalProduct?.id === bom.productId);
                      if (existingRouting) {
                        return (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                            ✅ Production Routing: <strong>{existingRouting.routingName}</strong> — {existingRouting.stages?.length || stages.length} stage{(existingRouting.stages?.length || stages.length) > 1 ? 's' : ''} ({stages.map(s => s.bomNumber.split('-').pop()).join(' → ')}). Work Orders for this chain are created automatically once a Customer PO's Sales Order is confirmed and allocated - there is no manual start.
                          </div>
                        );
                      }
                      return (
                        <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Step 3: Create the production routing</div>
                        <button onClick={handleCreateRouting} disabled={creatingRouting} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                            {creatingRouting ? 'Creating...' : 'Create Production Routing'}
                        </button>
                      </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {versions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <button onClick={() => setShowVersions(v => !v)} className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
              <span>Previous Versions ({versions.length})</span>
              <span className="text-gray-400">{showVersions ? '▾' : '▸'}</span>
            </button>
            {showVersions && (
              <div className="space-y-1 mt-3">
                {versions.map(v => (
                  <Link key={v.id} href={`/inventory/bom/${v.id}`} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 border text-sm hover:border-blue-300">
                    <span className="font-mono">{v.version}</span>
                    <span className="text-gray-500">{v._count?.items || 0} items</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[v.status] || 'bg-gray-100'}`}>{v.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">BOM Items</h2>
            <div className="flex gap-2">
              {bom.status === 'DRAFT' && (
                <>
                  <button onClick={openAdd} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm">+ Add Item</button>
                  <button onClick={handleApprove} className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm">Approve BOM</button>
                </>
              )}
              {bom.status === 'APPROVED' && (
                <button onClick={handleObsolete} className="bg-gray-500 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 text-sm">Mark Obsolete</button>
              )}
            </div>
          </div>

          {bom.status === 'DRAFT' && (
            <div className="px-4 py-2 bg-yellow-50 border-b text-xs text-yellow-700">
              ⚠️ DRAFT — Add all components before approving. Items cannot be modified after approval.
            </div>
          )}
          {bom.status === 'APPROVED' && (
            <div className="px-4 py-2 bg-green-50 border-b text-xs text-green-700">
              ✓ APPROVED — This BOM is locked. Clone to create a new version.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Seq', 'Type', 'Code', 'Name', 'UOM', 'Qty', 'Eff. Qty', 'Unit Cost', 'Total Cost', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!bom.items || bom.items.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">No items yet. Click "+ Add Item" to start.</td></tr>
                ) : (() => {
                  // Group items by section, preserving the order each section first appears in (matches the order sections appeared in the uploaded BOM sheet, if any)
                  const order = [];
                  const groups = {};
                  for (const item of bom.items) {
                    const key = item.section || 'Ungrouped';
                    if (!groups[key]) { groups[key] = []; order.push(key); }
                    groups[key].push(item);
                  }
                  return order.map(section => (
                    <Fragment key={section}>
                      <tr className="bg-blue-50">
                        <td colSpan={9} className="px-3 py-2 font-semibold text-blue-800 text-xs uppercase tracking-wide">{section} <span className="text-blue-400 font-normal normal-case">({groups[section].length} items)</span></td>
                        <td className="px-3 py-2">
                          {bom.status === 'DRAFT' && (
                            <button onClick={() => openAdd(section === 'Ungrouped' ? '' : section)} className="text-blue-600 hover:underline text-xs">+ Add</button>
                          )}
                        </td>
                      </tr>
                      {groups[section].map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-gray-500">{item.sequence}</td>
                          <td className="px-3 py-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{item.itemType}</span></td>
                          <td className="px-3 py-3 font-mono text-blue-600">{item.itemCode}</td>
                          <td className="px-3 py-3 font-medium text-gray-900">{item.itemName}</td>
                          <td className="px-3 py-3 text-gray-600">{item.uom}</td>
                          <td className="px-3 py-3 text-gray-800">{item.quantity}</td>
                          <td className="px-3 py-3 text-gray-800 font-medium">{item.effectiveQty?.toFixed(3)}</td>
                          <td className="px-3 py-3 text-gray-600">{item.unitCost ? `₹${Number(item.unitCost).toFixed(2)}` : '—'}</td>
                          <td className="px-3 py-3 font-medium text-gray-800">{item.totalCost ? `₹${item.totalCost.toFixed(2)}` : '—'}</td>
                          <td className="px-3 py-3">
                            {bom.status === 'DRAFT' && (
                              <div className="flex gap-2">
                                <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-xs">Edit</button>
                                <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:underline text-xs">Remove</button>
                              </div>
                            )}
                            {bom.status !== 'DRAFT' && <span className="text-xs text-gray-400">Locked</span>}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ));
                })()}
              </tbody>
              {bom.items && bom.items.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={9} className="px-3 py-3 text-right font-semibold text-gray-700">Total BOM Cost:</td>
                    <td className="px-3 py-3 font-bold text-gray-900">₹{totalCost.toFixed(2)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {bom && (
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <CustomFields module="BOM" recordId={bom.id} />
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">{editItem ? 'Edit BOM Item' : 'Add BOM Item'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Sequence</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.sequence} onChange={e => setForm(f => ({ ...f, sequence: parseInt(e.target.value) }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Section / Stage</label>
                    <input list="bom-sections" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. SMT Components (leave blank for Ungrouped)" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
                    <datalist id="bom-sections">
                      {[...new Set((bom.items || []).map(i => i.section).filter(Boolean))].map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.itemType} onChange={e => setForm(f => ({ ...f, itemType: e.target.value }))}>
                      <option value="RAW_MATERIAL">Raw Material</option>
                      <option value="COMPONENT">Component</option>
                      <option value="SUB_ASSEMBLY">Sub Assembly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">UOM *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Item Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Quantity *</label>
                    <input type="number" step="0.001" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Wastage %</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.wastagePercent} onChange={e => setForm(f => ({ ...f, wastagePercent: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Unit Cost (₹)</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="isCritical" checked={form.isCritical} onChange={e => setForm(f => ({ ...f, isCritical: e.target.checked }))} />
                    <label htmlFor="isCritical" className="text-sm text-gray-600">Critical Component</label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  {form.quantity && (
                    <div className="col-span-2 bg-blue-50 rounded p-3 text-xs text-blue-700">
                      Effective Qty = {(parseFloat(form.quantity) * (1 + (parseFloat(form.wastagePercent) || 0) / 100)).toFixed(3)} {form.uom}
                      {form.unitCost && ` · Total = ₹${(parseFloat(form.quantity) * (1 + (parseFloat(form.wastagePercent) || 0) / 100) * parseFloat(form.unitCost)).toFixed(2)}`}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
