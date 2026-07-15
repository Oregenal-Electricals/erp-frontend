'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const AVL_COLORS = { APPROVED:'bg-green-100 text-green-700', PROBATION:'bg-yellow-100 text-yellow-700', BLACKLISTED:'bg-red-100 text-red-700' };
const RATING_COLORS = { A:'text-green-600 font-bold', B:'text-blue-600 font-bold', C:'text-yellow-600 font-bold', D:'text-red-600 font-bold' };
const CAR_STATUS_COLORS = { SENT:'bg-blue-100 text-blue-700', RESPONDED:'bg-yellow-100 text-yellow-700', VERIFIED:'bg-purple-100 text-purple-700', CLOSED:'bg-green-100 text-green-700' };
const SEV_COLORS = { MINOR:'bg-gray-100 text-gray-600', MAJOR:'bg-orange-100 text-orange-700', CRITICAL:'bg-red-100 text-red-700' };

const TABS = ['Ratings & Scorecard','CAR Management'];

export default function SupplierQualityPage() {
  const [activeTab, setActiveTab] = useState('Ratings & Scorecard');
  const [ratings, setRatings] = useState([]);
  const [cars, setCars] = useState([]);
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [ncrs, setNcrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCarModal, setShowCarModal] = useState(false);
  const [respondModal, setRespondModal] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [scorecard, setScorecard] = useState(null);
  const [ratingForm, setRatingForm] = useState({ vendorId:'', period:'', totalReceived:'', totalRejected:'', onTimeDelivery:'95' });
  const [carForm, setCarForm] = useState({ vendorId:'', ncrId:'', description:'', severity:'MAJOR', dueDate:'' });
  const [respondForm, setRespondForm] = useState({ supplierResponse:'', supplierRootCause:'', supplierAction:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const [ratRes, carRes, statsRes, vRes, ncrRes] = await Promise.all([
      fetch(`${API}/supplier-quality/ratings`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/supplier-quality/cars`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/supplier-quality/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/vendors?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/ncr?limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (ratRes.ok) { const d = await ratRes.json(); setRatings(d.data||[]); }
    if (carRes.ok) { const d = await carRes.json(); setCars(d.data||[]); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (vRes.ok) { const d = await vRes.json(); setVendors(d.data||d||[]); }
    if (ncrRes.ok) { const d = await ncrRes.json(); setNcrs(d.data||[]); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleScorecard(vendorId) {
    setSelectedVendor(vendorId); setScorecard(null);
    const res = await fetch(`${API}/supplier-quality/scorecard/${vendorId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setScorecard(await res.json());
  }

  async function handleCreateRating() {
    setSaving(true); setError('');
    const body = { ...ratingForm, totalReceived: parseFloat(ratingForm.totalReceived)||0, totalRejected: parseFloat(ratingForm.totalRejected)||0, onTimeDelivery: parseFloat(ratingForm.onTimeDelivery)||100 };
    const res = await fetch(`${API}/supplier-quality/ratings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowRatingModal(false); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleCreateCar() {
    setSaving(true); setError('');
    const body = { ...carForm, dueDate: new Date(carForm.dueDate).toISOString() };
    if (!body.ncrId) delete body.ncrId;
    const res = await fetch(`${API}/supplier-quality/cars`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowCarModal(false); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleRespond() {
    setSaving(true);
    const res = await fetch(`${API}/supplier-quality/cars/${respondModal}/respond`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(respondForm),
    });
    if (res.ok) { setRespondModal(null); fetchAll(); }
    else { const d = await res.json(); alert(d.message); }
    setSaving(false);
  }

  async function handleCarAction(id, action) {
    const res = await fetch(`${API}/supplier-quality/cars/${id}/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({}),
    });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  const currentMonth = new Date().toISOString().slice(0,7);
  const isOverdue = c => ['SENT','RESPONDED'].includes(c.status) && new Date(c.dueDate) < new Date();

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Supplier Quality Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track vendor quality ratings, scorecards and corrective action requests</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              {label:'Ratings',value:stats.totalRatings,color:'bg-gray-50'},
              {label:'Total CARs',value:stats.totalCars,color:'bg-blue-50'},
              {label:'Open CARs',value:stats.openCars,color:'bg-orange-50'},
              {label:'Probation',value:stats.probation,color:'bg-yellow-50'},
              {label:'Blacklisted',value:stats.blacklisted,color:'bg-red-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-lg font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
          ))}
        </div>

        {activeTab==='Ratings & Scorecard' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={()=>{setRatingForm({vendorId:'',period:currentMonth,totalReceived:'',totalRejected:'',onTimeDelivery:'95'});setError('');setShowRatingModal(true);}} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Generate Rating</button>
            </div>
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['Vendor','Period','Received','Rejected','Defect Rate','OTD%','NCR Count','Score','Rating','AVL Status','Action'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? <tr><td colSpan={11} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  : ratings.length===0 ? <tr><td colSpan={11} className="text-center py-8 text-gray-400">No ratings yet</td></tr>
                  : ratings.map(r=>(
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs font-medium">{r.vendor?.name}</td>
                      <td className="px-3 py-2 text-xs font-mono">{r.period}</td>
                      <td className="px-3 py-2 text-xs">{r.totalReceived}</td>
                      <td className="px-3 py-2 text-xs text-red-500">{r.totalRejected}</td>
                      <td className="px-3 py-2 text-xs font-bold">{r.defectRate}%</td>
                      <td className="px-3 py-2 text-xs">{r.onTimeDelivery}%</td>
                      <td className="px-3 py-2 text-xs">{r.ncrCount}</td>
                      <td className="px-3 py-2 text-xs font-bold">{r.qualityScore}</td>
                      <td className={`px-3 py-2 text-lg ${RATING_COLORS[r.rating]}`}>{r.rating}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${AVL_COLORS[r.avlStatus]}`}>{r.avlStatus}</span></td>
                      <td className="px-3 py-2"><button onClick={()=>handleScorecard(r.vendorId)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Scorecard</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {scorecard && (
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">Scorecard: {scorecard.vendor?.name}</h3>
                  <button onClick={()=>setScorecard(null)} className="text-gray-400 text-sm">✕ Close</button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[{label:'Total CARs',value:scorecard.totalCars},{label:'Open CARs',value:scorecard.openCars},{label:'Periods Rated',value:scorecard.ratings.length}].map(s=>(
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
                  ))}
                </div>
                <div className="text-xs font-semibold text-gray-500 mb-2">RATING HISTORY</div>
                <div className="space-y-2">
                  {scorecard.ratings.map(r=>(
                    <div key={r.id} className="flex items-center gap-4 p-2 bg-gray-50 rounded">
                      <span className="font-mono text-xs">{r.period}</span>
                      <span className="text-xs">Defect: {r.defectRate}%</span>
                      <span className="text-xs">OTD: {r.onTimeDelivery}%</span>
                      <span className="text-xs font-bold">Score: {r.qualityScore}</span>
                      <span className={`text-lg ${RATING_COLORS[r.rating]}`}>{r.rating}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${AVL_COLORS[r.avlStatus]}`}>{r.avlStatus}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab==='CAR Management' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={()=>{setCarForm({vendorId:'',ncrId:'',description:'',severity:'MAJOR',dueDate:''});setError('');setShowCarModal(true);}} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">+ Send CAR</button>
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="divide-y">
                {cars.length===0 ? <div className="text-center py-8 text-gray-400">No CARs yet</div>
                : cars.map(c=>(
                  <div key={c.id} className={`p-4 ${isOverdue(c)?'bg-red-50':''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono font-bold text-orange-600">{c.carNumber}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${SEV_COLORS[c.severity]}`}>{c.severity}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${CAR_STATUS_COLORS[c.status]}`}>{c.status}</span>
                        <span className="text-xs font-medium text-gray-700">{c.vendor?.name}</span>
                        {c.ncr && <span className="font-mono text-xs text-red-500">{c.ncr.ncrNumber}</span>}
                        {isOverdue(c) && <span className="text-xs text-red-600 font-bold">⚠ OVERDUE</span>}
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-400">Due: {fmtDate(c.dueDate)}</span>
                        {c.status==='SENT' && <button onClick={()=>{setRespondModal(c.id);setRespondForm({supplierResponse:'',supplierRootCause:'',supplierAction:''});}} className="px-2 py-1 text-xs bg-yellow-500 text-gray-900 rounded">Record Response</button>}
                        {c.status==='RESPONDED' && <button onClick={()=>handleCarAction(c.id,'verify')} className="px-2 py-1 text-xs bg-purple-600 text-white rounded">Verify</button>}
                        {c.status==='VERIFIED' && <button onClick={()=>handleCarAction(c.id,'close')} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Close</button>}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 line-clamp-1">{c.description}</div>
                    {c.supplierResponse && <div className="mt-2 text-xs bg-yellow-50 rounded p-2"><span className="font-semibold text-yellow-700">Supplier Response: </span>{c.supplierResponse}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showRatingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">Generate Supplier Rating</h2>
                <button onClick={()=>setShowRatingModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Vendor *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={ratingForm.vendorId} onChange={e=>setRatingForm(f=>({...f,vendorId:e.target.value}))}>
                    <option value="">— Select Vendor —</option>
                    {vendors.map(v=><option key={v.id} value={v.id}>{v.name} ({v.code})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Period *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="2026-06" value={ratingForm.period} onChange={e=>setRatingForm(f=>({...f,period:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">OTD % (On Time)</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={ratingForm.onTimeDelivery} onChange={e=>setRatingForm(f=>({...f,onTimeDelivery:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Total Received *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={ratingForm.totalReceived} onChange={e=>setRatingForm(f=>({...f,totalReceived:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Total Rejected</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={ratingForm.totalRejected} onChange={e=>setRatingForm(f=>({...f,totalRejected:e.target.value}))} />
                  </div>
                </div>

              <DocumentAttachments referenceType="SUPPLIER_QUALITY" referenceId={viewDetail?.id} referenceNumber={viewDetail?.sqNumber} title="SQ Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setShowRatingModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreateRating} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Generating...':'Generate Rating'}</button>
              </div>
            </div>
          </div>
        )}

        {showCarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-orange-700">Send Corrective Action Request (CAR)</h2>
                <button onClick={()=>setShowCarModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Vendor *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={carForm.vendorId} onChange={e=>setCarForm(f=>({...f,vendorId:e.target.value}))}>
                      <option value="">— Select Vendor —</option>
                      {vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Severity</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={carForm.severity} onChange={e=>setCarForm(f=>({...f,severity:e.target.value}))}>
                      {['MINOR','MAJOR','CRITICAL'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Due Date *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={carForm.dueDate} onChange={e=>setCarForm(f=>({...f,dueDate:e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Link NCR</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={carForm.ncrId} onChange={e=>setCarForm(f=>({...f,ncrId:e.target.value}))}>
                      <option value="">— Optional —</option>
                      {ncrs.map(n=><option key={n.id} value={n.id}>{n.ncrNumber} — {n.description?.slice(0,40)}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description *</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={carForm.description} onChange={e=>setCarForm(f=>({...f,description:e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setShowCarModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreateCar} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Sending...':'Send CAR'}</button>
              </div>
            </div>
          </div>
        )}

        {respondModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-yellow-700">Record Supplier Response</h2>
                <button onClick={()=>setRespondModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Supplier Response *</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={respondForm.supplierResponse} onChange={e=>setRespondForm(f=>({...f,supplierResponse:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Root Cause (per supplier) *</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={respondForm.supplierRootCause} onChange={e=>setRespondForm(f=>({...f,supplierRootCause:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Corrective Action (per supplier) *</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={respondForm.supplierAction} onChange={e=>setRespondForm(f=>({...f,supplierAction:e.target.value}))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setRespondModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleRespond} disabled={saving} className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Record Response'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
