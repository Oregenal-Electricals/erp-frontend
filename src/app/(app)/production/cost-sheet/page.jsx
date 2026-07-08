'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const STATUS_COLORS = { DRAFT: 'bg-yellow-100 text-yellow-700', FINALIZED: 'bg-green-100 text-green-700' };

export default function CostSheetPage() {
  const [sheets, setSheets] = useState([]);
  const [stats, setStats] = useState(null);
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editForm, setEditForm] = useState({ laborHours:'', laborRatePerHour:'', overheadCost:'', overheadRemarks:'', otherCost:'', otherRemarks:'' });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedWoId, setSelectedWoId] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (status) params.set('status', status);
    const [shRes, statsRes, woRes] = await Promise.all([
      fetch(`${API}/production-cost-sheets?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/production-cost-sheets/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (shRes.ok) { const d = await shRes.json(); setSheets(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (woRes.ok) { const d = await woRes.json(); setWos((d.data||[]).filter(w => ['IN_PROGRESS','COMPLETED'].includes(w.status))); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, status]);

  async function handleGenerate() {
    if (!selectedWoId) return;
    setGenerating(true);
    const res = await fetch(`${API}/production-cost-sheets/generate/${selectedWoId}`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) { fetchAll(); setSelectedWoId(''); }
    else { const d = await res.json(); alert(d.message); }
    setGenerating(false);
  }

  async function handleViewDetail(id) {
    if (selected === id) { setSelected(null); setDetail(null); return; }
    setSelected(id);
    const res = await fetch(`${API}/production-cost-sheets/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      setDetail(d);
      setEditForm({
        laborHours: d.laborHours, laborRatePerHour: d.laborRatePerHour,
        overheadCost: d.overheadCost, overheadRemarks: d.overheadRemarks||'',
        otherCost: d.otherCost, otherRemarks: d.otherRemarks||'',
      });
    }
  }

  async function handleUpdate() {
    setSaving(true);
    const body = {
      laborHours: parseFloat(editForm.laborHours)||0,
      laborRatePerHour: parseFloat(editForm.laborRatePerHour)||0,
      overheadCost: parseFloat(editForm.overheadCost)||0,
      overheadRemarks: editForm.overheadRemarks,
      otherCost: parseFloat(editForm.otherCost)||0,
      otherRemarks: editForm.otherRemarks,
    };
    const res = await fetch(`${API}/production-cost-sheets/${selected}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) { const d = await res.json(); setDetail(d); fetchAll(); }
    setSaving(false);
  }

  async function handleFinalize(id) {
    if (!confirm('Finalize this cost sheet? This cannot be undone.')) return;
    const res = await fetch(`${API}/production-cost-sheets/${id}/finalize`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) { fetchAll(); handleViewDetail(id); }
    else { const d = await res.json(); alert(d.message); }
  }

  const costPct = (val, total) => total > 0 ? (val/total*100).toFixed(1) : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Production Cost Sheet</h1>
          <p className="text-gray-500 text-sm mt-1">Auto-calculate material + labor + overhead cost per work order</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Sheets', value: stats.total, color: 'bg-gray-50' },
              { label: 'Total Cost', value: fmt(stats.totalCost), color: 'bg-blue-50' },
              { label: 'Avg Unit Cost', value: fmt(stats.avgUnitCost), color: 'bg-purple-50' },
              { label: 'Finalized', value: stats.finalized, color: 'bg-green-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border p-4 mb-6 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Generate Cost Sheet for Work Order</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={selectedWoId} onChange={e=>setSelectedWoId(e.target.value)}>
              <option value="">— Select IN_PROGRESS or COMPLETED WO —</option>
              {wos.map(wo=><option key={wo.id} value={wo.id}>{wo.woNumber} — {wo.productName} ({wo.status}) qty:{wo.completedQty}</option>)}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={!selectedWoId||generating} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {generating?'Generating...':'Generate'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border mb-4">
          <div className="p-4 border-b flex gap-3">
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="FINALIZED">Finalized</option>
            </select>
            <span className="text-sm text-gray-500 self-center">{total} cost sheets</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : sheets.length===0 ? <div className="text-center py-10 text-gray-400">No cost sheets yet — generate one above</div>
            : sheets.map(sheet => (
              <div key={sheet.id}>
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={()=>handleViewDetail(sheet.id)}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono font-bold text-blue-600">{sheet.costSheetNumber}</span>
                    <span className="font-mono text-xs text-gray-500">{sheet.workOrder?.woNumber}</span>
                    <span className="text-sm text-gray-700">{sheet.workOrder?.productName}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[sheet.status]}`}>{sheet.status}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <div className="font-bold">{fmt(sheet.totalCost)}</div>
                      <div className="text-xs text-gray-400">Total Cost</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-purple-600">{fmt(sheet.unitCost)}</div>
                      <div className="text-xs text-gray-400">Unit Cost</div>
                    </div>
                    <span className="text-gray-400 text-xs">{selected===sheet.id?'▲':'▼'}</span>
                  </div>
                </div>

                {selected===sheet.id && detail && (
                  <div className="px-6 pb-6 bg-gray-50 border-t">
                    <div className="grid grid-cols-2 gap-6 mt-4">
                      {/* Cost Breakdown */}
                      <div className="bg-white rounded-xl border p-4">
                        <h3 className="font-semibold text-gray-700 mb-3">Cost Breakdown</h3>
                        {[
                          { label: 'Material Cost', value: detail.materialCost, color: 'text-blue-600' },
                          { label: 'Labor Cost', value: detail.laborCost, color: 'text-green-600' },
                          { label: 'Overhead Cost', value: detail.overheadCost, color: 'text-orange-600' },
                          { label: 'Other Cost', value: detail.otherCost, color: 'text-gray-600' },
                        ].map(c => (
                          <div key={c.label} className="flex justify-between items-center py-2 border-b last:border-0">
                            <div>
                              <span className="text-sm text-gray-700">{c.label}</span>
                              <span className="ml-2 text-xs text-gray-400">{costPct(c.value, detail.totalCost)}%</span>
                            </div>
                            <span className={`font-bold text-sm ${c.color}`}>{fmt(c.value)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-gray-300">
                          <span className="font-bold text-gray-800">Total Cost</span>
                          <span className="font-bold text-lg">{fmt(detail.totalCost)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-sm text-gray-600">Completed Qty</span>
                          <span className="font-medium">{detail.completedQty} units</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 pb-2">
                          <span className="font-semibold text-purple-700">Unit Cost</span>
                          <span className="font-bold text-purple-600 text-lg">{fmt(detail.unitCost)}</span>
                        </div>
                        {detail.plannedMaterialCost > 0 && (
                          <div className={`mt-2 p-2 rounded text-xs ${detail.varianceCost > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            Variance: {detail.varianceCost > 0 ? '+' : ''}{fmt(detail.varianceCost)} vs planned {fmt(detail.plannedMaterialCost)}
                          </div>
                        )}
                      </div>

                      {/* Edit Panel */}
                      <div className="bg-white rounded-xl border p-4">
                        <h3 className="font-semibold text-gray-700 mb-3">
                          {detail.status === 'FINALIZED' ? 'Details (Finalized)' : 'Edit & Adjust'}
                        </h3>
                        <div className="space-y-3">
                          <div className="bg-blue-50 rounded p-3 text-xs text-blue-700">
                            <div className="font-semibold mb-1">Material: {fmt(detail.materialCost)} (auto)</div>
                            <div>{detail.materialBreakdown?.length || 0} items from production issues</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Labor Hours</label>
                              <input type="number" disabled={detail.status==='FINALIZED'} className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-50" value={editForm.laborHours} onChange={e=>setEditForm(f=>({...f,laborHours:e.target.value}))} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Rate/Hour (₹)</label>
                              <input type="number" disabled={detail.status==='FINALIZED'} className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-50" value={editForm.laborRatePerHour} onChange={e=>setEditForm(f=>({...f,laborRatePerHour:e.target.value}))} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Overhead Cost (₹)</label>
                            <input type="number" disabled={detail.status==='FINALIZED'} className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-50" value={editForm.overheadCost} onChange={e=>setEditForm(f=>({...f,overheadCost:e.target.value}))} placeholder="Electricity + rent + staff share" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Overhead Notes</label>
                            <input disabled={detail.status==='FINALIZED'} className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-50" value={editForm.overheadRemarks} onChange={e=>setEditForm(f=>({...f,overheadRemarks:e.target.value}))} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Other Cost (₹)</label>
                            <input type="number" disabled={detail.status==='FINALIZED'} className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-50" value={editForm.otherCost} onChange={e=>setEditForm(f=>({...f,otherCost:e.target.value}))} placeholder="Packaging, testing etc." />
                          </div>
                        </div>
                        {detail.status !== 'FINALIZED' && (
                          <div className="flex gap-2 mt-4">
                            <button onClick={handleUpdate} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving?'Saving...':'Update'}</button>
                            <button onClick={()=>handleFinalize(detail.id)} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Finalize</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Material Breakdown */}
                    {detail.materialBreakdown?.length > 0 && (
                      <div className="mt-4 bg-white rounded-xl border p-4">
                        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Material Breakdown (from Production Issues)</h3>
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 text-gray-500 uppercase">
                            <tr>{['Item Code','Item Name','Issued Qty','Unit Cost','Total'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                          </thead>
                          <tbody className="divide-y">
                            {detail.materialBreakdown.map((item,i)=>(
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-mono text-blue-600">{item.itemCode}</td>
                                <td className="px-3 py-2">{item.itemName}</td>
                                <td className="px-3 py-2 font-bold">{item.issuedQty}</td>
                                <td className="px-3 py-2">{fmt(item.unitCost)}</td>
                                <td className="px-3 py-2 font-bold">{fmt(item.issuedQty * item.unitCost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
