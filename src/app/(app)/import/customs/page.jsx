'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  FILED: 'bg-blue-100 text-blue-700',
  ASSESSED: 'bg-yellow-100 text-yellow-700',
  DUTY_PAID: 'bg-orange-100 text-orange-700',
  OUT_OF_CHARGE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const STATUS_NEXT = {
  DRAFT: 'file',
  FILED: null,
  ASSESSED: 'pay-duty',
  DUTY_PAID: 'out-of-charge',
};

const STATUS_NEXT_LABEL = {
  DRAFT: 'File BOE',
  ASSESSED: 'Pay Duty',
  DUTY_PAID: 'Out of Charge',
};

export default function CustomsPage() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [ipos, setIpos] = useState([]);
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showAssessModal, setShowAssessModal] = useState(null);
  const [form, setForm] = useState({ ipoId: '', shipmentId: '', chaName: '', portOfEntry: 'Chennai', cifValue: '', bcdRate: 10, igstRate: 18, aidcAmount: 0, notes: '' });
  const [assessForm, setAssessForm] = useState({ cifValue: '', bcdRate: 10, igstRate: 18, aidcAmount: 0, customsBoeNumber: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [ceRes, statsRes, ipoRes, shpRes] = await Promise.all([
      fetch(`${API}/customs-entries?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/customs-entries/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/import-orders?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/shipments?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (ceRes.ok) { const d = await ceRes.json(); setEntries(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (ipoRes.ok) { const d = await ipoRes.json(); setIpos(d.data.filter(i => ['SHIPPED','LC_OPENED','CUSTOMS_CLEARED'].includes(i.status))); }
    if (shpRes.ok) { const d = await shpRes.json(); setShips(d.data); }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const calcDuty = (cif, bcd, igst, aidc=0) => {
    const bcdAmt = cif * bcd / 100;
    const swsAmt = bcdAmt * 0.10;
    const igstAmt = (cif + bcdAmt + swsAmt + aidc) * igst / 100;
    return { bcdAmt, swsAmt, igstAmt, total: bcdAmt + swsAmt + igstAmt + aidc };
  };

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, cifValue: parseFloat(form.cifValue), bcdRate: parseFloat(form.bcdRate), igstRate: parseFloat(form.igstRate), aidcAmount: parseFloat(form.aidcAmount)||0 };
    if (!body.chaName) delete body.chaName;
    if (!body.notes) delete body.notes;
    const res = await fetch(`${API}/customs-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAssess() {
    setSaving(true); setError('');
    const body = { cifValue: parseFloat(assessForm.cifValue), bcdRate: parseFloat(assessForm.bcdRate), igstRate: parseFloat(assessForm.igstRate), aidcAmount: parseFloat(assessForm.aidcAmount)||0, customsBoeNumber: assessForm.customsBoeNumber };
    const res = await fetch(`${API}/customs-entries/${showAssessModal}/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowAssessModal(null); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action) {
    await fetch(`${API}/customs-entries/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  const preview = form.cifValue ? calcDuty(parseFloat(form.cifValue)||0, parseFloat(form.bcdRate)||0, parseFloat(form.igstRate)||0, parseFloat(form.aidcAmount)||0) : null;
  const assessPreview = assessForm.cifValue ? calcDuty(parseFloat(assessForm.cifValue)||0, parseFloat(assessForm.bcdRate)||0, parseFloat(assessForm.igstRate)||0, parseFloat(assessForm.aidcAmount)||0) : null;
  const ipoShips = ships.filter(s => s.ipoId === form.ipoId);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customs & Duty (BOE)</h1>
            <p className="text-gray-500 text-sm mt-1">Bill of Entry — Indian customs clearance with duty calculation</p>
          </div>
          <button onClick={() => { setForm({ ipoId: '', shipmentId: '', chaName: '', portOfEntry: 'Chennai', cifValue: '', bcdRate: 10, igstRate: 18, aidcAmount: 0, notes: '' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New BOE</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total BOEs', value: stats.total, color: 'bg-gray-50' },
              { label: 'Pending', value: stats.filed + stats.assessed + stats.dutyPaid, color: 'bg-yellow-50' },
              { label: 'Cleared', value: stats.cleared, color: 'bg-green-50' },
              { label: 'Total Duty Paid', value: fmt(stats.totalDutyPaid), color: 'bg-orange-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-xs text-blue-800">
          <strong>Duty Formula:</strong> BCD = CIF × BCD% → SWS = BCD × 10% → IGST = (CIF + BCD + SWS + AIDC) × IGST% → Total Duty = BCD + SWS + IGST + AIDC
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search BOE number, CHA name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['BOE No.', 'Customs BOE', 'IPO', 'Vendor', 'CHA', 'Port', 'CIF Value', 'BCD', 'SWS', 'IGST', 'Total Duty', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan={13} className="text-center py-10 text-gray-400">No customs entries found</td></tr>
                ) : entries.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-mono font-medium text-blue-600 text-xs">{e.boeNumber}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-600">{e.customsBoeNumber || '—'}</td>
                    <td className="px-3 py-3"><Link href={`/import/orders/${e.ipoId}`} className="font-mono text-xs text-blue-500 hover:underline">{e.ipo?.ipoNumber}</Link></td>
                    <td className="px-3 py-3 text-xs text-gray-700">{e.ipo?.vendor?.name}</td>
                    <td className="px-3 py-3 text-xs text-gray-600">{e.chaName || '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{e.portOfEntry || '—'}</td>
                    <td className="px-3 py-3 font-medium">{fmt(e.cifValue)}</td>
                    <td className="px-3 py-3 text-xs">{fmt(e.bcdAmount)}</td>
                    <td className="px-3 py-3 text-xs">{fmt(e.swsAmount)}</td>
                    <td className="px-3 py-3 text-xs">{fmt(e.igstAmount)}</td>
                    <td className="px-3 py-3 font-bold text-orange-700">{fmt(e.totalDuty)}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[e.status]}`}>{e.status?.replace(/_/g,' ')}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {e.status === 'DRAFT' && <button onClick={() => handleAction(e.id,'file')} className="text-blue-600 hover:underline text-xs">File</button>}
                        {e.status === 'FILED' && <button onClick={() => { setShowAssessModal(e.id); setAssessForm({ cifValue: e.cifValue, bcdRate: e.bcdRate, igstRate: e.igstRate, aidcAmount: e.aidcAmount||0, customsBoeNumber: e.customsBoeNumber||'' }); setError(''); }} className="text-yellow-600 hover:underline text-xs">Assess</button>}
                        {e.status === 'ASSESSED' && <button onClick={() => handleAction(e.id,'pay-duty')} className="text-orange-600 hover:underline text-xs">Pay Duty</button>}
                        {e.status === 'DUTY_PAID' && <button onClick={() => handleAction(e.id,'out-of-charge')} className="text-green-600 hover:underline text-xs">Out of Charge</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">New Bill of Entry</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Import PO *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.ipoId} onChange={e => setForm(f => ({ ...f, ipoId: e.target.value, shipmentId: '' }))}>
                      <option value="">— Select Import PO —</option>
                      {ipos.map(i => <option key={i.id} value={i.id}>{i.ipoNumber} — {i.vendor?.name} ({i.status})</option>)}
                    </select>
                  </div>
                  {form.ipoId && (
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Shipment *</label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.shipmentId} onChange={e => setForm(f => ({ ...f, shipmentId: e.target.value }))}>
                        <option value="">— Select Shipment —</option>
                        {ipoShips.map(s => <option key={s.id} value={s.id}>{s.shipmentNumber} — {s.carrierName} ({s.status})</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">CHA Name</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.chaName} onChange={e => setForm(f => ({ ...f, chaName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Port of Entry</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.portOfEntry} onChange={e => setForm(f => ({ ...f, portOfEntry: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">CIF Value (₹) *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.cifValue} onChange={e => setForm(f => ({ ...f, cifValue: e.target.value }))} />
                    <p className="text-xs text-gray-400 mt-1">Cost + Insurance + Freight in INR</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">BCD Rate %</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bcdRate} onChange={e => setForm(f => ({ ...f, bcdRate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">IGST Rate %</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.igstRate} onChange={e => setForm(f => ({ ...f, igstRate: e.target.value }))}>
                      {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">AIDC Amount (₹)</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.aidcAmount} onChange={e => setForm(f => ({ ...f, aidcAmount: e.target.value }))} />
                  </div>
                  {preview && (
                    <div className="col-span-2 bg-orange-50 rounded-lg p-3 text-xs">
                      <div className="font-semibold text-orange-800 mb-2">Duty Calculation Preview</div>
                      <div className="grid grid-cols-4 gap-2 text-orange-700">
                        <div><div className="opacity-60">BCD</div><div className="font-bold">{fmt(preview.bcdAmt)}</div></div>
                        <div><div className="opacity-60">SWS (10%)</div><div className="font-bold">{fmt(preview.swsAmt)}</div></div>
                        <div><div className="opacity-60">IGST</div><div className="font-bold">{fmt(preview.igstAmt)}</div></div>
                        <div><div className="opacity-60">Total Duty</div><div className="font-bold text-base">{fmt(preview.total)}</div></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create BOE'}</button>
              </div>
            </div>
          </div>
        )}

        {showAssessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-yellow-700">Customs Assessment</h2>
                <button onClick={() => setShowAssessModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Customs BOE Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="BOE/CHN/2026/12345" value={assessForm.customsBoeNumber} onChange={e => setAssessForm(f => ({ ...f, customsBoeNumber: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Assessed CIF Value (₹)</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={assessForm.cifValue} onChange={e => setAssessForm(f => ({ ...f, cifValue: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">BCD Rate %</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={assessForm.bcdRate} onChange={e => setAssessForm(f => ({ ...f, bcdRate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">IGST Rate %</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={assessForm.igstRate} onChange={e => setAssessForm(f => ({ ...f, igstRate: e.target.value }))}>
                      {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  {assessPreview && (
                    <div className="col-span-2 bg-orange-50 rounded-lg p-3 text-xs text-orange-800">
                      <div className="grid grid-cols-2 gap-2">
                        <div>BCD: <strong>{fmt(assessPreview.bcdAmt)}</strong></div>
                        <div>SWS: <strong>{fmt(assessPreview.swsAmt)}</strong></div>
                        <div>IGST: <strong>{fmt(assessPreview.igstAmt)}</strong></div>
                        <div className="text-base">Total: <strong>{fmt(assessPreview.total)}</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowAssessModal(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleAssess} disabled={saving} className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Assessment'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
