'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const CONDITION_COLORS = { GOOD:'bg-green-100 text-green-700', DAMAGED:'bg-red-100 text-red-700', PARTIAL:'bg-yellow-100 text-yellow-700' };
const CONDITION_ICONS = { GOOD:'✅', DAMAGED:'❌', PARTIAL:'⚠️' };

export default function DeliveryPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [form, setForm] = useState({ dispatchId:'', deliveryDate:'', receiverName:'', receiverPhone:'', podNumber:'', condition:'GOOD', shortageQty:0, damageNotes:'', remarks:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (condition) params.set('condition', condition);
    const [rRes, sRes, dRes] = await Promise.all([
      fetch(`${API}/delivery-confirmations?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/delivery-confirmations/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/dispatches?status=DISPATCHED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (rRes.ok) { const d = await rRes.json(); setRecords(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (sRes.ok) setStats(await sRes.json());
    if (dRes.ok) { const d = await dRes.json(); setDispatches(d.data||[]); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, condition]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, shortageQty: parseFloat(form.shortageQty)||0 };
    if (body.deliveryDate) body.deliveryDate = new Date(body.deliveryDate).toISOString();
    else delete body.deliveryDate;
    ['receiverPhone','podNumber','damageNotes','remarks'].forEach(k => { if (!body[k]) delete body[k]; });
    const res = await fetch(`${API}/delivery-confirmations`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/delivery-confirmations/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setViewDetail(await res.json());
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delivery Confirmation</h1>
            <p className="text-gray-500 text-sm mt-1">Record customer delivery confirmations with POD — completes the sales cycle</p>
          </div>
          <button onClick={()=>{setForm({dispatchId:'',deliveryDate:'',receiverName:'',receiverPhone:'',podNumber:'',condition:'GOOD',shortageQty:0,damageNotes:'',remarks:''});setError('');setShowModal(true);}} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium">+ Confirm Delivery</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {label:'Total Deliveries',value:stats.total,color:'bg-gray-50',icon:'📦'},
              {label:'Good Condition',value:stats.good,color:'bg-green-50',icon:'✅'},
              {label:'Damaged',value:stats.damaged,color:'bg-red-50',icon:'❌'},
              {label:'Partial',value:stats.partial,color:'bg-yellow-50',icon:'⚠️'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search DC number, receiver, POD..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={condition} onChange={e=>{setCondition(e.target.value);setPage(1);}}>
              <option value="">All Conditions</option>
              {['GOOD','DAMAGED','PARTIAL'].map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} confirmations</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : records.length===0 ? <div className="text-center py-10 text-gray-400">No delivery confirmations found</div>
            : records.map(r=>(
              <div key={r.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={()=>openDetail(r.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold text-green-600">{r.dcNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${CONDITION_COLORS[r.condition]}`}>{CONDITION_ICONS[r.condition]} {r.condition}</span>
                    <span className="text-sm font-medium text-gray-800">{r.dispatch?.salesOrder?.customerName}</span>
                    {r.dispatch && <span className="font-mono text-xs text-purple-600">{r.dispatch.dispatchNumber}</span>}
                    {r.dispatch?.salesOrder && <span className="font-mono text-xs text-indigo-600">{r.dispatch.salesOrder.soNumber}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {r.podNumber && <span className="font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded">POD: {r.podNumber}</span>}
                    <span>{fmtDate(r.deliveryDate)}</span>
                    <span>{r.receiverName}</span>
                  </div>
                </div>
                {r.shortageQty > 0 && <div className="mt-1 text-xs text-orange-500">⚠ Shortage: {r.shortageQty} units</div>}
                {r.damageNotes && <div className="mt-1 text-xs text-red-500">Damage: {r.damageNotes}</div>}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">{viewDetail.dcNumber}</h2>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${CONDITION_COLORS[viewDetail.condition]}`}>{CONDITION_ICONS[viewDetail.condition]} {viewDetail.condition}</span>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-500">Dispatch:</span><span className="font-mono text-purple-600">{viewDetail.dispatch?.dispatchNumber}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">SO:</span><span className="font-mono text-indigo-600">{viewDetail.dispatch?.salesOrder?.soNumber}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span className="font-medium">{viewDetail.dispatch?.salesOrder?.customerName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">CPO:</span><span className="font-mono text-teal-600">{viewDetail.dispatch?.salesOrder?.cpo?.cpoNumber}</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-500">Delivery Date:</span><span className="font-medium">{fmtDate(viewDetail.deliveryDate)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Receiver:</span><span>{viewDetail.receiverName}</span></div>
                    {viewDetail.receiverPhone && <div className="flex justify-between"><span className="text-gray-500">Phone:</span><span>{viewDetail.receiverPhone}</span></div>}
                    {viewDetail.podNumber && <div className="flex justify-between"><span className="text-gray-500">POD Number:</span><span className="font-mono font-bold text-blue-600">{viewDetail.podNumber}</span></div>}
                  </div>
                </div>

                {viewDetail.shortageQty > 0 && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-xs font-semibold text-orange-700 mb-1">Shortage Reported</div>
                    <div className="text-sm text-orange-600">{viewDetail.shortageQty} units short</div>
                  </div>
                )}
                {viewDetail.damageNotes && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-xs font-semibold text-red-700 mb-1">Damage Notes</div>
                    <div className="text-sm text-red-600">{viewDetail.damageNotes}</div>
                  </div>
                )}
                {viewDetail.remarks && (
                  <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                    <span className="font-semibold">Remarks: </span>{viewDetail.remarks}
                  </div>
                )}
                <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700 font-medium text-center">
                  ✅ Delivery confirmed — Sales cycle complete
                </div>

              <DocumentAttachments referenceType="DELIVERY" referenceId={viewDetail?.id} referenceNumber={viewDetail?.deliveryNumber} title="Delivery Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end sticky bottom-0 bg-white">
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-green-700">Confirm Delivery — POD</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Dispatch *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dispatchId} onChange={e=>setForm(f=>({...f,dispatchId:e.target.value}))}>
                    <option value="">— Select Dispatched Delivery —</option>
                    {dispatches.map(d=><option key={d.id} value={d.id}>{d.dispatchNumber} | {d.customerName} | {fmtDate(d.dispatchDate)} | {d.vehicleNumber||'No vehicle'}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Delivery Date</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryDate} onChange={e=>setForm(f=>({...f,deliveryDate:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Condition *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}>
                      <option value="GOOD">✅ GOOD</option>
                      <option value="PARTIAL">⚠️ PARTIAL</option>
                      <option value="DAMAGED">❌ DAMAGED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Receiver Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Name of person who received" value={form.receiverName} onChange={e=>setForm(f=>({...f,receiverName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Receiver Phone</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.receiverPhone} onChange={e=>setForm(f=>({...f,receiverPhone:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">POD Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="Proof of Delivery No." value={form.podNumber} onChange={e=>setForm(f=>({...f,podNumber:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Shortage Qty</label>
                    <input type="number" min="0" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.shortageQty} onChange={e=>setForm(f=>({...f,shortageQty:e.target.value}))} />
                  </div>
                </div>
                {form.condition !== 'GOOD' && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Damage/Shortage Notes</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.damageNotes} onChange={e=>setForm(f=>({...f,damageNotes:e.target.value}))} placeholder="Describe damage or shortage details..." />
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Confirming...':'Confirm Delivery'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
