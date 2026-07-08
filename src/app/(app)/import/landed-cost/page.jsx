'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  FINALIZED: 'bg-green-100 text-green-700',
};

const ALLOC_METHODS = ['BY_VALUE', 'BY_QTY'];

export default function LandedCostPage() {
  const [costs, setCosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ ipoId: '', invoiceValue: '', customsDuty: '', freightCharges: '', chaCharges: '', portCharges: '', bankCharges: '', insuranceCharges: '', otherCharges: '', allocationMethod: 'BY_VALUE', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [lcRes, statsRes, ipoRes] = await Promise.all([
      fetch(`${API}/landed-costs?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/landed-costs/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/import-orders?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (lcRes.ok) { const d = await lcRes.json(); setCosts(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (ipoRes.ok) { const d = await ipoRes.json(); setIpos(d.data.filter(i => ['CUSTOMS_CLEARED','SHIPPED','CLOSED'].includes(i.status))); }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleIpoSelect(ipoId) {
    setForm(f => ({ ...f, ipoId }));
    if (!ipoId) return;
    // Auto-fetch customs duty
    const res = await fetch(`${API}/customs-entries/ipo/${ipoId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const entries = await res.json();
      const duty = entries[0]?.totalDuty || 0;
      const ipo = ipos.find(i => i.id === ipoId);
      setForm(f => ({ ...f, ipoId, customsDuty: duty.toFixed(0), invoiceValue: (ipo?.totalAmount || '').toString() }));
    }
  }

  const totalPreview = ['invoiceValue','customsDuty','freightCharges','chaCharges','portCharges','bankCharges','insuranceCharges','otherCharges']
    .reduce((s, k) => s + (parseFloat(form[k]) || 0), 0);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = {};
    ['ipoId','allocationMethod','notes'].forEach(k => { if (form[k]) body[k] = form[k]; });
    ['invoiceValue','customsDuty','freightCharges','chaCharges','portCharges','bankCharges','insuranceCharges','otherCharges'].forEach(k => { body[k] = parseFloat(form[k]) || 0; });
    const res = await fetch(`${API}/landed-costs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action) {
    await fetch(`${API}/landed-costs/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  const COST_FIELDS = [
    { key: 'invoiceValue', label: 'Invoice Value (CIF)', color: 'text-blue-700' },
    { key: 'customsDuty', label: 'Customs Duty (BCD+SWS+IGST)', color: 'text-orange-600' },
    { key: 'freightCharges', label: 'Freight & Handling', color: 'text-gray-600' },
    { key: 'chaCharges', label: 'CHA / Clearing Charges', color: 'text-gray-600' },
    { key: 'portCharges', label: 'Port / Terminal Charges', color: 'text-gray-600' },
    { key: 'bankCharges', label: 'Bank / LC Charges', color: 'text-gray-600' },
    { key: 'insuranceCharges', label: 'Insurance', color: 'text-gray-600' },
    { key: 'otherCharges', label: 'Other Charges', color: 'text-gray-600' },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Landed Cost Calculation</h1>
            <p className="text-gray-500 text-sm mt-1">True cost of imported goods including all charges — used for inventory valuation</p>
          </div>
          <button onClick={() => { setForm({ ipoId: '', invoiceValue: '', customsDuty: '', freightCharges: '', chaCharges: '', portCharges: '', bankCharges: '', insuranceCharges: '', otherCharges: '', allocationMethod: 'BY_VALUE', notes: '' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Calculate Landed Cost</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Calculations', value: stats.total, color: 'bg-gray-50' },
              { label: 'Finalized', value: stats.finalized, color: 'bg-green-50' },
              { label: 'Total Landed Cost', value: fmt(stats.totalLandedCost), color: 'bg-blue-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-xs text-blue-800">
          <strong>Landed Cost =</strong> Invoice Value + Customs Duty + Freight + CHA + Port + Bank + Insurance + Other charges
          <span className="ml-2 text-blue-600">Allocated proportionally across items by value, weight, or quantity</span>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl border p-10 text-center text-gray-400">Loading...</div>
          ) : costs.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center text-gray-400">No landed cost calculations found</div>
          ) : costs.map(lc => (
            <div key={lc.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === lc.id ? null : lc.id)}>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-blue-600">{lc.lcNumber}</span>
                  <Link href={`/import/orders/${lc.ipoId}`} onClick={e => e.stopPropagation()} className="font-mono text-xs text-blue-400 hover:underline">{lc.ipo?.ipoNumber}</Link>
                  <span className="text-gray-600 text-sm">{lc.ipo?.vendor?.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lc.status]}`}>{lc.status}</span>
                  <span className="text-xs text-gray-400">{lc.allocationMethod?.replace(/_/g,' ')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Total Landed Cost</div>
                    <div className="font-bold text-lg text-gray-900">{fmt(lc.totalLandedCost)}</div>
                  </div>
                  {lc.status === 'DRAFT' && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleAction(lc.id, 'calculate')} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">↻ Recalc</button>
                      <button onClick={() => handleAction(lc.id, 'finalize')} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Finalize</button>
                    </div>
                  )}
                  <span className="text-gray-400">{expandedId === lc.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedId === lc.id && (
                <div className="border-t p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Invoice Value', value: fmt(lc.invoiceValue) },
                      { label: 'Customs Duty', value: fmt(lc.customsDuty) },
                      { label: 'Freight', value: fmt(lc.freightCharges) },
                      { label: 'CHA Charges', value: fmt(lc.chaCharges) },
                      { label: 'Port Charges', value: fmt(lc.portCharges) },
                      { label: 'Bank Charges', value: fmt(lc.bankCharges) },
                      { label: 'Insurance', value: fmt(lc.insuranceCharges) },
                      { label: 'Other', value: fmt(lc.otherCharges) },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500">{s.label}</div>
                        <div className="font-semibold text-gray-800">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {lc._count?.items > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-500 uppercase">
                          <tr>{['Item Code','Item Name','UOM','Qty','Value (INR)','Alloc Ratio','Allocated Cost','Landed Cost/Unit'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lc.items?.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono text-blue-600">{item.itemCode}</td>
                              <td className="px-3 py-2 text-gray-800">{item.itemName}</td>
                              <td className="px-3 py-2 text-gray-500">{item.uom}</td>
                              <td className="px-3 py-2">{item.qty?.toLocaleString()}</td>
                              <td className="px-3 py-2">{fmt(item.valueInr)}</td>
                              <td className="px-3 py-2 text-gray-500">{(item.allocationRatio * 100).toFixed(1)}%</td>
                              <td className="px-3 py-2 text-orange-600 font-medium">{fmt(item.allocatedCost)}</td>
                              <td className="px-3 py-2 font-bold text-green-700">{fmt(item.landedCostPerUnit)}</td>
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

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">Calculate Landed Cost</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Import PO *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.ipoId} onChange={e => handleIpoSelect(e.target.value)}>
                    <option value="">— Select Customs Cleared IPO —</option>
                    {ipos.map(i => <option key={i.id} value={i.id}>{i.ipoNumber} — {i.vendor?.name} ({i.status})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Allocation Method</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.allocationMethod} onChange={e => setForm(f => ({ ...f, allocationMethod: e.target.value }))}>
                    {ALLOC_METHODS.map(m => <option key={m}>{m.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  {COST_FIELDS.map(field => (
                    <div key={field.key} className="flex items-center gap-3">
                      <label className="text-sm text-gray-600 w-52 flex-shrink-0">{field.label}</label>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2 text-gray-400 text-sm">₹</span>
                        <input type="number" step="1" className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm" value={form[field.key]} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))} placeholder="0" />
                      </div>
                    </div>
                  ))}
                </div>
                {totalPreview > 0 && (
                  <div className="bg-green-50 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-green-700 font-semibold">Total Landed Cost</span>
                    <span className="text-2xl font-bold text-green-800">{fmt(totalPreview)}</span>
                  </div>
                )}
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Calculating...' : 'Calculate & Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
