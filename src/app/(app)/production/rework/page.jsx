'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { getToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';

const STATUS_COLORS = {
  REWORK_PENDING: 'bg-amber-100 text-amber-700',
  IN_REWORK: 'bg-blue-100 text-blue-700',
  PENDING_QC_REINSPECTION: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

export default function ReworkPage() {
  const [reworks, setReworks] = useState([]);
  const [pendingQc, setPendingQc] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ originalQcInspectionId: '', quantity: '', defectDescription: '', reworkStage: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [startModal, setStartModal] = useState(null);
  const [manpowerQty, setManpowerQty] = useState('');
  const [starting, setStarting] = useState(false);

  const [completeModal, setCompleteModal] = useState(null);
  const [completeForm, setCompleteForm] = useState({ successfullyReworkedQty: '', stillDefectiveQty: '', additionalMaterialCost: '', additionalOtherCost: '', remarks: '' });
  const [completing, setCompleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [reworkRes, qcRes] = await Promise.all([
      fetch(`${API}/rework`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/production-qc?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (reworkRes.ok) setReworks(await reworkRes.json());
    if (qcRes.ok) {
      const d = await qcRes.json();
      // Only inspections that still have rework-pending quantity are
      // useful sources for a new rework record - the backend re-checks
      // exact availability (minus already-claimed prior reworks) at
      // creation time, this is just for a sensible dropdown.
      setPendingQc((d.data || []).filter(q => q.reworkQty > 0));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function selectedQc() {
    return pendingQc.find(q => q.id === createForm.originalQcInspectionId);
  }

  function onQcChange(id) {
    const qc = pendingQc.find(q => q.id === id);
    setCreateForm(f => ({ ...f, originalQcInspectionId: id, quantity: qc ? String(qc.reworkQty) : '' }));
  }

  async function handleCreate() {
    setCreateError('');
    if (!createForm.originalQcInspectionId || !createForm.quantity) {
      setCreateError('Select a source QC inspection and a quantity'); return;
    }
    const qc = selectedQc();
    setCreating(true);
    const res = await fetch(`${API}/rework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        workOrderId: qc.workOrderId, originalQcInspectionId: createForm.originalQcInspectionId,
        quantity: parseInt(createForm.quantity), defectDescription: createForm.defectDescription || undefined,
        reworkStage: createForm.reworkStage || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) { setCreateModal(false); setCreateForm({ originalQcInspectionId: '', quantity: '', defectDescription: '', reworkStage: '' }); fetchAll(); }
    else setCreateError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setCreating(false);
  }

  async function handleStart() {
    if (!manpowerQty) { alert('Enter manpower quantity'); return; }
    setStarting(true);
    const res = await fetch(`${API}/rework/${startModal.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ manpowerQty: parseInt(manpowerQty) }),
    });
    setStarting(false);
    if (res.ok) { setStartModal(null); setManpowerQty(''); fetchAll(); }
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleComplete() {
    setCompleting(true);
    const body = {
      successfullyReworkedQty: parseInt(completeForm.successfullyReworkedQty) || 0,
      stillDefectiveQty: parseInt(completeForm.stillDefectiveQty) || 0,
    };
    if (completeForm.additionalMaterialCost) body.additionalMaterialCost = parseFloat(completeForm.additionalMaterialCost);
    if (completeForm.additionalOtherCost) body.additionalOtherCost = parseFloat(completeForm.additionalOtherCost);
    if (completeForm.remarks) body.remarks = completeForm.remarks;
    const res = await fetch(`${API}/rework/${completeModal.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    setCompleting(false);
    if (res.ok) { setCompleteModal(null); setCompleteForm({ successfullyReworkedQty: '', stillDefectiveQty: '', additionalMaterialCost: '', additionalOtherCost: '', remarks: '' }); fetchAll(); }
    else { const d = await res.json(); alert(d.message); }
  }

  const completeSum = (parseInt(completeForm.successfullyReworkedQty) || 0) + (parseInt(completeForm.stillDefectiveQty) || 0);
  const completeReconciled = completeModal && completeSum === completeModal.quantity;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rework</h1>
            <p className="text-gray-500 text-sm mt-1">Quantity that already passed through production, being corrected rather than started fresh.</p>
          </div>
          <button onClick={() => { setCreateForm({ originalQcInspectionId: '', quantity: '', defectDescription: '', reworkStage: '' }); setCreateError(''); setCreateModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Rework</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Rework No.', 'Work Order', 'Defect', 'Qty', 'Cycle', 'Manpower', 'Status', 'Action'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {loading ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
                : reworks.length === 0 ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">No rework records</td></tr>
                : reworks.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{r.reworkNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{r.workOrder?.woNumber}</td>
                    <td className="px-3 py-2 text-xs">{r.defectDescription || '-'}</td>
                    <td className="px-3 py-2 text-xs font-bold">{r.quantity}</td>
                    <td className="px-3 py-2 text-xs">{r.cycleNumber}</td>
                    <td className="px-3 py-2 text-xs">{r.manpowerQty ?? '-'}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status?.replace(/_/g, ' ')}</span></td>
                    <td className="px-3 py-2">
                      {r.status === 'REWORK_PENDING' && <button onClick={() => { setStartModal(r); setManpowerQty(''); }} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Start</button>}
                      {r.status === 'IN_REWORK' && <button onClick={() => { setCompleteModal(r); setCompleteForm({ successfullyReworkedQty: '', stillDefectiveQty: '', additionalMaterialCost: '', additionalOtherCost: '', remarks: '' }); }} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Complete</button>}
                      {r.status === 'PENDING_QC_REINSPECTION' && <span className="text-xs text-gray-400">Awaiting QC</span>}
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
                <h2 className="text-lg font-bold">New Rework</h2>
                <button onClick={() => setCreateModal(false)} className="text-gray-400 text-xl">X</button>
              </div>
              <div className="p-6 space-y-4">
                {createError && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{createError}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Source QC Inspection (with rework-pending qty) *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={createForm.originalQcInspectionId} onChange={e => onQcChange(e.target.value)}>
                    <option value="">Select</option>
                    {pendingQc.map(q => <option key={q.id} value={q.id}>{q.qcNumber} - {q.workOrder?.woNumber} ({q.reworkQty} rework pending)</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Quantity *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={createForm.quantity} onChange={e => setCreateForm(f => ({ ...f, quantity: e.target.value }))} />
                    {selectedQc() && <p className="text-xs text-gray-400 mt-1">Max {selectedQc().reworkQty} pending</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Rework Stage</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. MI, Assembly" value={createForm.reworkStage} onChange={e => setCreateForm(f => ({ ...f, reworkStage: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Defect Description</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={createForm.defectDescription} onChange={e => setCreateForm(f => ({ ...f, defectDescription: e.target.value }))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setCreateModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{creating ? 'Creating...' : 'Create Rework'}</button>
              </div>
            </div>
          </div>
        )}

        {startModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-6 border-b flex justify-between">
                <div>
                  <h2 className="text-lg font-bold">Start Rework</h2>
                  <p className="text-xs text-gray-400 font-mono">{startModal.reworkNumber}</p>
                </div>
                <button onClick={() => setStartModal(null)} className="text-gray-400 text-xl">X</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Manpower Qty *</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={manpowerQty} onChange={e => setManpowerQty(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">Quantity-based - no employee IDs needed.</p>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setStartModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleStart} disabled={starting} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{starting ? 'Starting...' : 'Start'}</button>
              </div>
            </div>
          </div>
        )}

        {completeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <div>
                  <h2 className="text-lg font-bold">Complete Rework</h2>
                  <p className="text-xs text-gray-400 font-mono">{completeModal.reworkNumber}</p>
                </div>
                <button onClick={() => setCompleteModal(null)} className="text-gray-400 text-xl">X</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-800">{completeModal.quantity}</div>
                  <div className="text-xs text-gray-500">Rework Input Qty</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Successfully Reworked</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={completeForm.successfullyReworkedQty} onChange={e => setCompleteForm(f => ({ ...f, successfullyReworkedQty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Still Defective</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={completeForm.stillDefectiveQty} onChange={e => setCompleteForm(f => ({ ...f, stillDefectiveQty: e.target.value }))} />
                  </div>
                </div>
                <div className={`rounded-lg p-3 text-center text-sm font-medium ${completeReconciled ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {completeReconciled ? 'Reconciled' : completeModal.quantity - completeSum > 0 ? `${completeModal.quantity - completeSum} PCS UNRECONCILED` : `Exceeds input qty by ${completeSum - completeModal.quantity}`}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Additional Material Cost</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={completeForm.additionalMaterialCost} onChange={e => setCompleteForm(f => ({ ...f, additionalMaterialCost: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Other Cost</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={completeForm.additionalOtherCost} onChange={e => setCompleteForm(f => ({ ...f, additionalOtherCost: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={completeForm.remarks} onChange={e => setCompleteForm(f => ({ ...f, remarks: e.target.value }))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setCompleteModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleComplete} disabled={completing || !completeReconciled} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">{completing ? 'Saving...' : 'Complete Rework'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
