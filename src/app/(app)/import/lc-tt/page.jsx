'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  OPENED: 'bg-blue-100 text-blue-700',
  AMENDED: 'bg-yellow-100 text-yellow-700',
  EXPIRED: 'bg-red-100 text-red-600',
  SETTLED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const TYPE_COLORS = {
  LC: 'bg-blue-100 text-blue-700',
  TT: 'bg-purple-100 text-purple-700',
  DP: 'bg-orange-100 text-orange-700',
  DA: 'bg-teal-100 text-teal-700',
};

const INSTRUMENT_TYPES = ['LC', 'TT', 'DP', 'DA'];

export default function LcTtPage() {
  const [instruments, setInstruments] = useState([]);
  const [stats, setStats] = useState(null);
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ipoId: '', instrumentType: 'LC', bankName: '', bankReference: '', vendorBankName: '', vendorSwiftCode: '', amount: '', amountInr: '', expiryDate: '', latestShipmentDate: '', presentationDays: 21, notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (typeFilter) params.set('instrumentType', typeFilter);
    const [instRes, statsRes, ipoRes] = await Promise.all([
      fetch(`${API}/payment-instruments?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/payment-instruments/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/import-orders?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (instRes.ok) { const d = await instRes.json(); setInstruments(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (ipoRes.ok) { const d = await ipoRes.json(); setIpos(d.data.filter(i => ['PROFORMA_RECEIVED','LC_OPENED','SHIPPED'].includes(i.status))); }
    setLoading(false);
  }, [page, search, status, typeFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function handleIpoSelect(ipoId) {
    const ipo = ipos.find(i => i.id === ipoId);
    if (ipo) setForm(f => ({ ...f, ipoId, amountInr: (parseFloat(f.amount) * ipo.exchangeRate || '').toString() }));
    else setForm(f => ({ ...f, ipoId }));
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, amount: parseFloat(form.amount), amountInr: parseFloat(form.amountInr), presentationDays: parseInt(form.presentationDays) || undefined };
    if (!body.bankReference) delete body.bankReference;
    if (!body.vendorBankName) delete body.vendorBankName;
    if (!body.vendorSwiftCode) delete body.vendorSwiftCode;
    if (!body.expiryDate) delete body.expiryDate;
    else body.expiryDate = new Date(body.expiryDate).toISOString();
    if (!body.latestShipmentDate) delete body.latestShipmentDate;
    else body.latestShipmentDate = new Date(body.latestShipmentDate).toISOString();
    if (!body.notes) delete body.notes;
    const res = await fetch(`${API}/payment-instruments`, {
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
    const res = await fetch(`${API}/payment-instruments/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
  }

  const selectedIpo = ipos.find(i => i.id === form.ipoId);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">LC / TT Management</h1>
            <p className="text-gray-500 text-sm mt-1">Letter of Credit and Telegraphic Transfer payment tracking</p>
          </div>
          <button onClick={() => { setForm({ ipoId: '', instrumentType: 'LC', bankName: '', bankReference: '', vendorBankName: '', vendorSwiftCode: '', amount: '', amountInr: '', expiryDate: '', latestShipmentDate: '', presentationDays: 21, notes: '' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New LC / TT</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'Open', value: stats.opened, color: 'bg-blue-50' },
              { label: 'Settled', value: stats.settled, color: 'bg-green-50' },
              { label: 'Value (INR)', value: `₹${(stats.totalValueInr||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`, color: 'bg-purple-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {stats?.byType?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-4 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 self-center">BY TYPE:</span>
            {stats.byType.map(t => (
              <div key={t.instrumentType} className={`px-3 py-2 rounded-lg text-xs font-medium ${TYPE_COLORS[t.instrumentType]}`}>
                {t.instrumentType}: {t._count} · ₹{(t._sum.amountInr||0).toLocaleString('en-IN',{maximumFractionDigits:0})}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search instrument number, bank..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              {INSTRUMENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} instruments</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Instrument No.', 'Type', 'Import PO', 'Vendor', 'Bank', 'Amount (Foreign)', 'Amount (INR)', 'Expiry', 'Latest Ship', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : instruments.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400">No payment instruments found</td></tr>
                ) : instruments.map(inst => (
                  <tr key={inst.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-mono font-medium text-blue-600 text-xs">{inst.instrumentNumber}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${TYPE_COLORS[inst.instrumentType]}`}>{inst.instrumentType}</span></td>
                    <td className="px-3 py-3">
                      <Link href={`/import/orders/${inst.ipoId}`} className="font-mono text-xs text-blue-500 hover:underline">{inst.ipo?.ipoNumber}</Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700">{inst.ipo?.vendor?.name}</td>
                    <td className="px-3 py-3 text-xs text-gray-600">{inst.bankName}</td>
                    <td className="px-3 py-3 font-medium">{inst.currency} {inst.amount?.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                    <td className="px-3 py-3 font-bold text-gray-900">₹{inst.amountInr?.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{inst.expiryDate ? new Date(inst.expiryDate).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{inst.latestShipmentDate ? new Date(inst.latestShipmentDate).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[inst.status]}`}>{inst.status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {inst.status === 'DRAFT' && <button onClick={() => handleAction(inst.id, 'open')} className="text-blue-600 hover:underline text-xs">Open</button>}
                        {['OPENED','AMENDED'].includes(inst.status) && <button onClick={() => handleAction(inst.id, 'settle')} className="text-green-600 hover:underline text-xs">Settle</button>}
                        {['DRAFT','OPENED'].includes(inst.status) && <button onClick={() => handleAction(inst.id, 'cancel')} className="text-red-500 hover:underline text-xs">Cancel</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">New Payment Instrument</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Import PO *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.ipoId} onChange={e => handleIpoSelect(e.target.value)}>
                      <option value="">— Select Import PO —</option>
                      {ipos.map(i => <option key={i.id} value={i.id}>{i.ipoNumber} — {i.vendor?.name} ({i.status})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Instrument Type *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.instrumentType} onChange={e => setForm(f => ({ ...f, instrumentType: e.target.value }))}>
                      {INSTRUMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Your Bank *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="HDFC Bank Ltd" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Bank Reference</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="HDFC/LC/2026/001" value={form.bankReference} onChange={e => setForm(f => ({ ...f, bankReference: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vendor Bank</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Bank of China" value={form.vendorBankName} onChange={e => setForm(f => ({ ...f, vendorBankName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Amount ({selectedIpo?.currency || 'USD'}) *</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.amount} onChange={e => {
                      const amt = e.target.value;
                      const inr = selectedIpo ? (parseFloat(amt) * selectedIpo.exchangeRate).toFixed(2) : '';
                      setForm(f => ({ ...f, amount: amt, amountInr: inr }));
                    }} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Amount (INR) *</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.amountInr} onChange={e => setForm(f => ({ ...f, amountInr: e.target.value }))} />
                  </div>
                  {form.instrumentType === 'LC' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">LC Expiry Date</label>
                        <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Latest Shipment Date</label>
                        <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.latestShipmentDate} onChange={e => setForm(f => ({ ...f, latestShipmentDate: e.target.value }))} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Presentation Days</label>
                        <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.presentationDays} onChange={e => setForm(f => ({ ...f, presentationDays: e.target.value }))} />
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
