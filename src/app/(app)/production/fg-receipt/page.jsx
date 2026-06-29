'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const STATUS_COLORS = { DRAFT: 'bg-gray-100 text-gray-600', RECEIVED: 'bg-green-100 text-green-700' };

export default function FgReceiptPage() {
  const [receipts, setReceipts] = useState([]);
  const [stats, setStats] = useState(null);
  const [pendingWos, setPendingWos] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ workOrderId:'', warehouseId:'', receivedQty:'', rejectedQty:'0', batchNumber:'', unitCost:'0', remarks:'' });
  const [selectedWo, setSelectedWo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [recRes, statsRes, pendRes, whRes] = await Promise.all([
      fetch(`${API}/fg-receipts?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/fg-receipts/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/fg-receipts/pending-wos`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r=>r.ok?r.json():{}).then(d=>d.data||d),
    ]);
    if (recRes.ok) { const d = await recRes.json(); setReceipts(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (pendRes.ok) { const d = await pendRes.json(); setPendingWos(d.data || []); }
    setWarehouses(Array.isArray(whRes) ? whRes : []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status]);

  function handleSelectWo(woId) {
    const wo = pendingWos.find(w => w.id === woId);
    setSelectedWo(wo);
    if (wo) {
      setForm(f => ({
        ...f, workOrderId: woId,
        receivedQty: wo.completedQty,
        batchNumber: `FG-${wo.woNumber}-${new Date().getFullYear()}`,
      }));
    }
  }

  async function handleAutoCreate(woId) {
    setSaving(true);
    const res = await fetch(`${API}/fg-receipts/from-wo/${woId}`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (res.ok) {
      // Auto-confirm
      await fetch(`${API}/fg-receipts/${data.id}/confirm`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchAll();
    } else alert(data.message);
    setSaving(false);
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, receivedQty: parseFloat(form.receivedQty)||0, rejectedQty: parseFloat(form.rejectedQty)||0, unitCost: parseFloat(form.unitCost)||0 };
    if (!body.batchNumber) delete body.batchNumber;
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/fg-receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleConfirm(id) {
    const res = await fetch(`${API}/fg-receipts/${id}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finished Goods Receipt</h1>
            <p className="text-gray-500 text-sm mt-1">Receive completed production output into FG warehouse stock</p>
          </div>
          <button onClick={() => { setForm({ workOrderId:'', warehouseId:'', receivedQty:'', rejectedQty:'0', batchNumber:'', unitCost:'0', remarks:'' }); setSelectedWo(null); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New FG Receipt</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Receipts', value: stats.total, color: 'bg-gray-50' },
              { label: 'Received', value: stats.received, color: 'bg-green-50' },
              { label: 'Total FG Qty', value: stats.totalReceivedQty?.toLocaleString(), color: 'bg-blue-50' },
              { label: 'Total FG Value', value: fmt(stats.totalValue), color: 'bg-purple-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {pendingWos.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="text-sm font-semibold text-yellow-800 mb-3">⚡ {pendingWos.length} Completed Work Order(s) Pending FG Receipt</div>
            <div className="space-y-2">
              {pendingWos.map(wo => (
                <div key={wo.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-100">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-blue-600">{wo.woNumber}</span>
                    <span className="text-sm text-gray-600">{wo.productCode}</span>
                    <span className="text-sm text-gray-500">{wo.productName}</span>
                    <span className="text-sm font-bold text-green-600">{wo.completedQty} {wo.uom}</span>
                  </div>
                  <button onClick={() => handleAutoCreate(wo.id)} disabled={saving}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 disabled:opacity-50">
                    ✓ Receive Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search FGR number, item code..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="RECEIVED">Received</option>
            </select>
            <span className="text-sm text-gray-500 self-center">{total} receipts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['FGR No.','Work Order','Item Code','Item Name','Warehouse','Planned','Received','Rejected','Batch','Value','Date','Status','Action'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {loading ? <tr><td colSpan={13} className="text-center py-10 text-gray-400">Loading...</td></tr>
                : receipts.length===0 ? <tr><td colSpan={13} className="text-center py-10 text-gray-400">No FG receipts found</td></tr>
                : receipts.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{r.receiptNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{r.workOrder?.woNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs text-blue-500">{r.itemCode}</td>
                    <td className="px-3 py-2 text-xs">{r.itemName}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{r.warehouse?.name}</td>
                    <td className="px-3 py-2 text-xs">{r.plannedQty}</td>
                    <td className="px-3 py-2 text-xs font-bold text-green-600">{r.receivedQty}</td>
                    <td className="px-3 py-2 text-xs text-red-500">{r.rejectedQty||0}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-400">{r.batchNumber||'—'}</td>
                    <td className="px-3 py-2 text-xs">{fmt(r.totalCost)}</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{fmtDate(r.createdAt)}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                    <td className="px-3 py-2">
                      {r.status==='DRAFT' && <button onClick={()=>handleConfirm(r.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Confirm</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">New FG Receipt</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                {selectedWo && (
                  <div className="bg-green-50 rounded-lg p-3 text-sm">
                    <div className="font-bold text-green-700">{selectedWo.productCode} — {selectedWo.productName}</div>
                    <div className="text-xs text-gray-500 mt-1">Completed Qty: {selectedWo.completedQty} {selectedWo.uom}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Completed Work Order *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.workOrderId} onChange={e=>handleSelectWo(e.target.value)}>
                      <option value="">— Select WO —</option>
                      {pendingWos.map(wo=><option key={wo.id} value={wo.id}>{wo.woNumber} — {wo.productName} (qty:{wo.completedQty})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">FG Warehouse *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.warehouseId} onChange={e=>setForm(f=>({...f,warehouseId:e.target.value}))}>
                      <option value="">— Select —</option>
                      {warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Received Qty *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.receivedQty} onChange={e=>setForm(f=>({...f,receivedQty:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Rejected Qty</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rejectedQty} onChange={e=>setForm(f=>({...f,rejectedQty:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Batch Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.batchNumber} onChange={e=>setForm(f=>({...f,batchNumber:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Unit Cost</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.unitCost} onChange={e=>setForm(f=>({...f,unitCost:e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Create FG Receipt'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
