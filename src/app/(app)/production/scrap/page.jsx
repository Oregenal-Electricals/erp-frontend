'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { getToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

const STATUS_COLORS = {
  PENDING_DISPOSITION: 'bg-amber-100 text-amber-700',
  DISPOSITION_COMPLETED: 'bg-green-100 text-green-700',
};

export default function ScrapPage() {
  const [rejections, setRejections] = useState([]);
  const [pendingQc, setPendingQc] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ sourceQcInspectionId: '', quantity: '', defectDescription: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [dispositionModal, setDispositionModal] = useState(null);
  const [dispositionForm, setDispositionForm] = useState({ scrapQty: '', recoveryQty: '', otherDispositionQty: '', estimatedScrapValue: '', recognizedScrapRecovery: '', recoveredComponents: '', remarks: '' });
  const [dispositioning, setDispositioning] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [scrapRes, qcRes] = await Promise.all([
      fetch(`${API}/scrap`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/production-qc?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (scrapRes.ok) setRejections(await scrapRes.json());
    if (qcRes.ok) {
      const d = await qcRes.json();
      setPendingQc((d.data || []).filter(q => q.failQty > 0));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function selectedQc() {
    return pendingQc.find(q => q.id === createForm.sourceQcInspectionId);
  }

  function onQcChange(id) {
    const qc = pendingQc.find(q => q.id === id);
    setCreateForm(f => ({ ...f, sourceQcInspectionId: id, quantity: qc ? String(qc.failQty) : '' }));
  }

  async function handleCreate() {
    setCreateError('');
    if (!createForm.sourceQcInspectionId || !createForm.quantity) {
      setCreateError('Select a source QC inspection and a quantity'); return;
    }
    const qc = selectedQc();
    setCreating(true);
    const res = await fetch(`${API}/scrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        workOrderId: qc.workOrderId, sourceQcInspectionId: createForm.sourceQcInspectionId,
        quantity: parseInt(createForm.quantity), defectDescription: createForm.defectDescription || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) { setCreateModal(false); setCreateForm({ sourceQcInspectionId: '', quantity: '', defectDescription: '' }); fetchAll(); }
    else setCreateError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setCreating(false);
  }

  async function handleDisposition() {
    setDispositioning(true);
    const body = {
      scrapQty: parseInt(dispositionForm.scrapQty) || 0,
      recoveryQty: parseInt(dispositionForm.recoveryQty) || 0,
    };
    if (dispositionForm.otherDispositionQty) body.otherDispositionQty = parseInt(dispositionForm.otherDispositionQty);
    if (dispositionForm.estimatedScrapValue) body.estimatedScrapValue = parseFloat(dispositionForm.estimatedScrapValue);
    if (dispositionForm.recognizedScrapRecovery) body.recognizedScrapRecovery = parseFloat(dispositionForm.recognizedScrapRecovery);
    if (dispositionForm.recoveredComponents) body.recoveredComponents = dispositionForm.recoveredComponents;
    if (dispositionForm.remarks) body.remarks = dispositionForm.remarks;
    const res = await fetch(`${API}/scrap/${dispositionModal.id}/disposition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    setDispositioning(false);
    if (res.ok) { setDispositionModal(null); setDispositionForm({ scrapQty: '', recoveryQty: '', otherDispositionQty: '', estimatedScrapValue: '', recognizedScrapRecovery: '', recoveredComponents: '', remarks: '' }); fetchAll(); }
    else { const d = await res.json(); alert(d.message); }
  }

  const dispAlreadyDone = dispositionModal ? (dispositionModal.scrapQty + dispositionModal.recoveryQty + dispositionModal.otherDispositionQty) : 0;
  const dispNewSum = (parseInt(dispositionForm.scrapQty) || 0) + (parseInt(dispositionForm.recoveryQty) || 0) + (parseInt(dispositionForm.otherDispositionQty) || 0);
  const dispRemainingAfter = dispositionModal ? dispositionModal.quantity - dispAlreadyDone - dispNewSum : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Final Rejection / Scrap</h1>
            <p className="text-gray-500 text-sm mt-1">Controlled disposition of rejected quantity - never becomes usable FG.</p>
          </div>
          <button onClick={() => { setCreateForm({ sourceQcInspectionId: '', quantity: '', defectDescription: '' }); setCreateError(''); setCreateModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Final Rejection</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Rejection No.', 'Work Order', 'Defect', 'Qty', 'Scrap', 'Recovery', 'Other', 'Status', 'Action'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {loading ? <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
                : rejections.length === 0 ? <tr><td colSpan={9} className="text-center py-10 text-gray-400">No final rejection records</td></tr>
                : rejections.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{r.rejectionNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{r.workOrder?.woNumber}</td>
                    <td className="px-3 py-2 text-xs">{r.defectDescription || '-'}</td>
                    <td className="px-3 py-2 text-xs font-bold">{r.quantity}</td>
                    <td className="px-3 py-2 text-xs">{r.scrapQty}</td>
                    <td className="px-3 py-2 text-xs">{r.recoveryQty}</td>
                    <td className="px-3 py-2 text-xs">{r.otherDispositionQty}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status?.replace(/_/g, ' ')}</span></td>
                    <td className="px-3 py-2">
                      {r.status === 'PENDING_DISPOSITION' && <button onClick={() => { setDispositionModal(r); setDispositionForm({ scrapQty: '', recoveryQty: '', otherDispositionQty: '', estimatedScrapValue: '', recognizedScrapRecovery: '', recoveredComponents: '', remarks: '' }); }} className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">Disposition</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {createModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">New Final Rejection</h2>
                <button onClick={() => setCreateModal(false)} className="text-gray-400 text-xl">X</button>
              </div>
              <div className="p-6 space-y-4">
                {createError && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{createError}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Source QC Inspection (with rejected qty) *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={createForm.sourceQcInspectionId} onChange={e => onQcChange(e.target.value)}>
                    <option value="">Select</option>
                    {pendingQc.map(q => <option key={q.id} value={q.id}>{q.qcNumber} - {q.workOrder?.woNumber} ({q.failQty} rejected)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Quantity *</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={createForm.quantity} onChange={e => setCreateForm(f => ({ ...f, quantity: e.target.value }))} />
                  {selectedQc() && <p className="text-xs text-gray-400 mt-1">Max {selectedQc().failQty} rejected</p>}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Defect Description</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={createForm.defectDescription} onChange={e => setCreateForm(f => ({ ...f, defectDescription: e.target.value }))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setCreateModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {dispositionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <div>
                  <h2 className="text-lg font-bold">Disposition</h2>
                  <p className="text-xs text-gray-400 font-mono">{dispositionModal.rejectionNumber}</p>
                </div>
                <button onClick={() => setDispositionModal(null)} className="text-gray-400 text-xl">X</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-gray-800">{dispositionModal.quantity}</div>
                    <div className="text-xs text-gray-500">Total Final Reject Qty</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-gray-800">{dispositionModal.quantity - dispAlreadyDone}</div>
                    <div className="text-xs text-gray-500">Pending Disposition</div>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Partial disposition is supported - enter only what you're dispositioning now.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Scrap Qty</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={dispositionForm.scrapQty} onChange={e => setDispositionForm(f => ({ ...f, scrapQty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Component Recovery Qty</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={dispositionForm.recoveryQty} onChange={e => setDispositionForm(f => ({ ...f, recoveryQty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Other Disposition Qty</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={dispositionForm.otherDispositionQty} onChange={e => setDispositionForm(f => ({ ...f, otherDispositionQty: e.target.value }))} />
                  </div>
                </div>
                <div className={`rounded-lg p-3 text-center text-sm font-medium ${dispRemainingAfter >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {dispRemainingAfter > 0 ? `${dispRemainingAfter} PCS will remain pending disposition` : dispRemainingAfter === 0 ? 'This will complete disposition' : `Exceeds pending quantity by ${-dispRemainingAfter}`}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Estimated Scrap Value</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={dispositionForm.estimatedScrapValue} onChange={e => setDispositionForm(f => ({ ...f, estimatedScrapValue: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Recognized Recovery (Rs)</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={dispositionForm.recognizedScrapRecovery} onChange={e => setDispositionForm(f => ({ ...f, recognizedScrapRecovery: e.target.value }))} />
                    <p className="text-xs text-gray-400 mt-1">Only recognized recovery offsets WO cost.</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Recovered Components</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Driver x1, PCB x1" value={dispositionForm.recoveredComponents} onChange={e => setDispositionForm(f => ({ ...f, recoveredComponents: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={dispositionForm.remarks} onChange={e => setDispositionForm(f => ({ ...f, remarks: e.target.value }))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setDispositionModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleDisposition} disabled={dispositioning || dispRemainingAfter < 0} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">{dispositioning ? 'Saving...' : 'Submit Disposition'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
