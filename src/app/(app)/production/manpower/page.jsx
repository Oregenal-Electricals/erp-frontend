'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { getToken, getUser } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-600',
  ACCEPTED: 'bg-green-100 text-green-700',
  QUERIED: 'bg-red-100 text-red-600',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
};
const CATEGORY_OPTIONS = ['SMT', 'MI', 'Assembly', 'Packaging', 'STORE', 'QUALITY'];
const WO_APPROVAL_ROLES = ['SUPER_ADMIN', 'HR_MANAGER', 'PLANT_HEAD', 'UNIT_HEAD', 'PRODUCTION_HEAD', 'PLANNING_MANAGER'];

export default function ManpowerPage() {
  const me = getUser() || {};
  const [allocations, setAllocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sendForm, setSendForm] = useState({ date: new Date().toISOString().slice(0, 10), toUserId: '', count: '', remarks: '' });
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  const [distributeFor, setDistributeFor] = useState(null); // allocation being distributed
  const [distLines, setDistLines] = useState([{ toUserId: '', workOrderId: '', category: '', count: '' }]);
  const [distError, setDistError] = useState('');
  const [distResult, setDistResult] = useState(null);
  const [distributing, setDistributing] = useState(false);

  const [queryFor, setQueryFor] = useState(null);
  const [queryMessage, setQueryMessage] = useState('');

  const [adjustFor, setAdjustFor] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const [transferFor, setTransferFor] = useState(null);
  const [transferTo, setTransferTo] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Today's reconciliation dashboard - "of everyone HR says is
  // present, where is everyone right now" (the core question this
  // whole module exists to answer).
  const [reconciliation, setReconciliation] = useState(null);
  const [reconLoading, setReconLoading] = useState(true);
  const [rosterModal, setRosterModal] = useState(null); // { title, employees }
  const [rosterLoading, setRosterLoading] = useState(false);
  const [timelineModal, setTimelineModal] = useState(null); // { employee, attendance, assignments }
  const [timelineLoading, setTimelineLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [allocRes, userRes, relRes, ipRes] = await Promise.all([
      fetch(`${API}/manpower/allocations`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/users?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=RELEASED&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=IN_PROGRESS&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (allocRes.ok) setAllocations(await allocRes.json());
    if (userRes.ok) { const d = await userRes.json(); setUsers(d.data || d || []); }
    const [relData, ipData] = await Promise.all([
      relRes.ok ? relRes.json() : { data: [] },
      ipRes.ok ? ipRes.json() : { data: [] },
    ]);
    setWorkOrders([...(ipData.data || []), ...(relData.data || [])]);
    setLoading(false);
  }, []);

  const fetchReconciliation = useCallback(async () => {
    setReconLoading(true);
    const res = await fetch(`${API}/manpower/reconciliation`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setReconciliation(await res.json());
    setReconLoading(false);
  }, []);

  useEffect(() => { fetchAll(); fetchReconciliation(); }, [fetchAll, fetchReconciliation]);

  const [availability, setAvailability] = useState(null);
  const [availLoading, setAvailLoading] = useState(true);
  const [availFilters, setAvailFilters] = useState({ date: new Date().toISOString().slice(0, 10), shiftId: '', skill: '', availabilityStatus: '' });
  const [availShifts, setAvailShifts] = useState([]);
  const fetchAvailability = useCallback(async () => {
    setAvailLoading(true);
    const params = new URLSearchParams();
    if (availFilters.date) params.set('date', availFilters.date);
    if (availFilters.shiftId) params.set('shiftId', availFilters.shiftId);
    if (availFilters.skill) params.set('skill', availFilters.skill);
    if (availFilters.availabilityStatus) params.set('availabilityStatus', availFilters.availabilityStatus);
    const res = await fetch(`${API}/manpower/availability?${params.toString()}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setAvailability(await res.json());
    setAvailLoading(false);
  }, [availFilters]);
  useEffect(() => {
    fetch(`${API}/attendance/shifts`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : []).then(setAvailShifts).catch(() => {});
  }, []);
  useEffect(() => { fetchAvailability(); }, [fetchAvailability]);

  // PROD-003: Plant Head Allocates Manpower to Production Stage.
  const [selectedForStage, setSelectedForStage] = useState(new Set());
  const [stageForm, setStageForm] = useState({ stageName: '', startTime: '', plannedEndTime: '' });
  const [stageAllocResult, setStageAllocResult] = useState(null);
  const [stageAllocSaving, setStageAllocSaving] = useState(false);
  const [stageAllocError, setStageAllocError] = useState('');
  function toggleSelected(employeeId) {
    setSelectedForStage(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId); else next.add(employeeId);
      return next;
    });
  }
  async function submitStageAllocation() {
    if (!stageForm.stageName || selectedForStage.size === 0) return;
    setStageAllocSaving(true);
    setStageAllocError('');
    const body = {
      employeeIds: Array.from(selectedForStage),
      stageName: stageForm.stageName,
      activityType: 'PRODUCTION',
    };
    if (stageForm.startTime) body.startTime = new Date(`${availFilters.date}T${stageForm.startTime}:00`).toISOString();
    if (stageForm.plannedEndTime) body.plannedEndTime = new Date(`${availFilters.date}T${stageForm.plannedEndTime}:00`).toISOString();
    const res = await fetch(`${API}/manpower/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setStageAllocResult(data);
      setSelectedForStage(new Set());
      setStageForm({ stageName: '', startTime: '', plannedEndTime: '' });
      fetchAvailability();
    } else {
      const d = await res.json();
      setStageAllocError(Array.isArray(d.message) ? d.message.join(', ') : d.message || 'Allocation failed');
    }
    setStageAllocSaving(false);
  }

  // PROD-004: Stage Head Allocates Manpower to Work Order.
  const [myStageWorkers, setMyStageWorkers] = useState([]);
  const [eligibleWOs, setEligibleWOs] = useState([]);
  const [woAllocLoading, setWoAllocLoading] = useState(false);
  const [selectedForWO, setSelectedForWO] = useState(new Set());
  const [woForm, setWoForm] = useState({ workOrderId: '', startTime: '', plannedEndTime: '' });
  const [woAllocResult, setWoAllocResult] = useState(null);
  const [woAllocSaving, setWoAllocSaving] = useState(false);
  const [woAllocError, setWoAllocError] = useState('');
  const fetchMyStageWO = useCallback(async () => {
    setWoAllocLoading(true);
    const [rosterRes, woRes] = await Promise.all([
      fetch(`${API}/manpower/roster?activityType=PRODUCTION`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=RELEASED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (rosterRes.ok) {
      const roster = await rosterRes.json();
      // Only stage-level assignments (not already tied to a specific WO) are available to sub-allocate.
      setMyStageWorkers(Array.isArray(roster) ? roster.filter(a => !a.workOrderId) : []);
    }
    if (woRes.ok) {
      const wos = await woRes.json();
      setEligibleWOs(wos.data || wos.workOrders || (Array.isArray(wos) ? wos : []));
    }
    setWoAllocLoading(false);
  }, []);
  function toggleSelectedForWO(employeeId) {
    setSelectedForWO(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId); else next.add(employeeId);
      return next;
    });
  }
  async function submitWOAllocation() {
    if (!woForm.workOrderId || selectedForWO.size === 0) return;
    setWoAllocSaving(true);
    setWoAllocError('');
    const selectedWO = eligibleWOs.find(w => w.id === woForm.workOrderId);
    const body = {
      employeeIds: Array.from(selectedForWO),
      workOrderId: woForm.workOrderId,
      stageName: selectedWO?.stageName,
      activityType: 'PRODUCTION',
    };
    const dateStr = availFilters.date;
    if (woForm.startTime) body.startTime = new Date(`${dateStr}T${woForm.startTime}:00`).toISOString();
    if (woForm.plannedEndTime) body.plannedEndTime = new Date(`${dateStr}T${woForm.plannedEndTime}:00`).toISOString();
    const res = await fetch(`${API}/manpower/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setWoAllocResult(data);
      setSelectedForWO(new Set());
      setWoForm({ workOrderId: '', startTime: '', plannedEndTime: '' });
      fetchMyStageWO();
    } else {
      const d = await res.json();
      setWoAllocError(Array.isArray(d.message) ? d.message.join(', ') : d.message || 'Allocation failed');
    }
    setWoAllocSaving(false);
  }
  useEffect(() => { fetchMyStageWO(); }, [fetchMyStageWO]);

  async function openStageRoster(stageKey) {
    setRosterLoading(true);
    setRosterModal({ title: stageKey, employees: [] });
    const res = await fetch(`${API}/manpower/roster?stageName=${encodeURIComponent(stageKey)}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      setRosterModal({ title: stageKey, employees: data.map(a => ({ ...a.employee, assignment: a })) });
    }
    setRosterLoading(false);
  }

  function openUnallocated() {
    setRosterModal({ title: 'Unallocated', employees: (reconciliation?.unallocatedEmployees || []).map(u => u.employee) });
  }

  async function openEmployeeTimeline(employeeId) {
    setTimelineLoading(true);
    setTimelineModal({ loading: true });
    const res = await fetch(`${API}/manpower/employees/${employeeId}/timeline`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setTimelineModal(await res.json());
    setTimelineLoading(false);
  }

  function userName(id) {
    const u = users.find(x => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : '—';
  }

  async function handleSend() {
    setSendError('');
    if (!sendForm.toUserId) { setSendError('Select a recipient'); return; }
    setSending(true);
    const res = await fetch(`${API}/manpower/allocations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ date: sendForm.date, level: 'HR_TO_PLANT', toUserId: sendForm.toUserId, remarks: sendForm.remarks || undefined }),
    });
    const data = await res.json();
    if (res.ok) { setSendForm(f => ({ ...f, toUserId: '', remarks: '' })); fetchAll(); fetchReconciliation(); }
    else setSendError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSending(false);
  }

  async function handleAccept(id) {
    await fetch(`${API}/manpower/allocations/${id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  function openDistribute(allocation) {
    setDistributeFor(allocation);
    setDistLines([{ toUserId: '', workOrderId: '', category: allocation.level === 'HR_TO_PLANT' ? 'SMT' : '', count: '', startTime: '', plannedEndTime: '' }]);
    setDistError(''); setDistResult(null);
  }

  async function handleDistribute() {
    setDistError(''); setDistResult(null);
    const lines = distLines.filter(l => l.count && (l.toUserId || l.workOrderId)).map(l => ({
      toUserId: l.toUserId || undefined, workOrderId: l.workOrderId || undefined, category: l.category || undefined, count: parseInt(l.count),
      startTime: l.startTime ? new Date(l.startTime).toISOString() : undefined,
      plannedEndTime: l.plannedEndTime ? new Date(l.plannedEndTime).toISOString() : undefined,
    }));
    if (lines.length === 0) { setDistError('Add at least one line with a count and either a recipient or a Work Order'); return; }
    setDistributing(true);
    const res = await fetch(`${API}/manpower/allocations/distribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ parentId: distributeFor.id, lines }),
    });
    const data = await res.json();
    if (res.ok) { setDistResult(data); fetchAll(); }
    else setDistError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setDistributing(false);
  }

  async function approveWOAllocation(allocation, action) {
    const comments = action === 'REJECTED' ? window.prompt('Reason for rejection (required):') : undefined;
    if (action === 'REJECTED' && !comments) return;
    await fetch(`${API}/manpower/allocations/${allocation.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ action, comments }),
    });
    fetchAll();
  }
  async function handleRaiseQuery() {
    if (!queryMessage.trim()) return;
    await fetch(`${API}/manpower/queries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ allocationId: queryFor.id, message: queryMessage }),
    });
    setQueryFor(null); setQueryMessage(''); fetchAll();
  }

  async function handleAdjust() {
    setAdjustError('');
    const delta = parseInt(adjustDelta);
    if (!delta) { setAdjustError('Enter a positive number to increase, or a negative number to decrease'); return; }
    setAdjusting(true);
    const res = await fetch(`${API}/manpower/allocations/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ allocationId: adjustFor.id, delta, reason: adjustReason || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.pendingApproval) alert(data.message);
      setAdjustFor(null); setAdjustDelta(''); setAdjustReason(''); fetchAll();
    } else {
      setAdjustError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    }
    setAdjusting(false);
  }

  async function handleTransfer() {
    setTransferError('');
    // PROD-008: reason is now mandatory on the backend (spec section 31).
    if (!transferTo || !transferQty) { setTransferError('Select a destination Work Order and a quantity'); return; }
    if (!transferReason.trim()) { setTransferError('A reason is required for every manpower transfer'); return; }
    setTransferring(true);
    const res = await fetch(`${API}/manpower/allocations/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ allocationId: transferFor.id, toWorkOrderId: transferTo, qty: parseInt(transferQty), reason: transferReason }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.pendingApproval) alert(data.message);
      setTransferFor(null); setTransferTo(''); setTransferQty(''); setTransferReason(''); fetchAll();
    } else {
      setTransferError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    }
    setTransferring(false);
  }

  async function handleResolveQuery(queryId, response) {
    if (!response?.trim()) return;
    await fetch(`${API}/manpower/queries/${queryId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ response }),
    });
    fetchAll();
  }

  const pendingForMe = allocations.filter(a => a.toUserId === me.id && a.status === 'PENDING');
  const myAllocations = allocations.filter(a => a.toUserId === me.id || a.fromUserId === me.id);
  const openQueriesForMe = allocations.flatMap(a => (a.queries || []).filter(q => q.raisedToUserId === me.id && q.status === 'OPEN').map(q => ({ ...q, allocation: a })));

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manpower Allocation</h1>
          <p className="text-gray-500 text-sm mt-1">HR → Plant Manager → Stage/Store/Quality Head → Line, with accept and query at every step.</p>
        </div>

        {/* Today's reconciliation dashboard */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Today&apos;s Manpower</h2>
            {reconciliation && <span className="text-xs text-gray-400">{reconciliation.date}</span>}
          </div>
          {reconLoading ? (
            <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
          ) : reconciliation ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-800">{reconciliation.hrPresent}</div>
                  <div className="text-xs text-gray-500 mt-1">HR Present</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{reconciliation.accounted}</div>
                  <div className="text-xs text-gray-500 mt-1">Allocated / Accounted</div>
                </div>
                <button
                  onClick={reconciliation.unallocated > 0 ? openUnallocated : undefined}
                  disabled={reconciliation.unallocated === 0}
                  className={`rounded-lg p-4 text-center ${reconciliation.unallocated > 0 ? 'bg-red-50 hover:bg-red-100 cursor-pointer' : 'bg-gray-50'}`}
                >
                  <div className={`text-2xl font-bold ${reconciliation.unallocated > 0 ? 'text-red-600' : 'text-gray-400'}`}>{reconciliation.unallocated}</div>
                  <div className="text-xs text-gray-500 mt-1">Unallocated {reconciliation.unallocated > 0 && '— click to see who'}</div>
                </button>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{reconciliation.accountedPercent}%</div>
                  <div className="text-xs text-gray-500 mt-1">Accounted</div>
                </div>
              </div>

              {reconciliation.unallocated > 0 && (
                <div className="mb-5 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm font-semibold text-red-700 mb-2">🔴 Present but Unallocated</div>
                  <div className="flex flex-wrap gap-2">
                    {reconciliation.unallocatedEmployees.map(u => (
                      <button key={u.employee.id} onClick={() => openEmployeeTimeline(u.employee.id)}
                        className="text-xs bg-white border border-red-200 rounded-full px-3 py-1 hover:bg-red-100">
                        {u.employee.employeeNumber} — {u.employee.firstName} {u.employee.lastName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {reconciliation.stageBreakdown.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Stage Distribution</div>
                  <div className="flex flex-wrap gap-2">
                    {reconciliation.stageBreakdown.map(s => (
                      <button key={s.key} onClick={() => openStageRoster(s.key)}
                        className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border rounded-lg px-3 py-2 text-sm">
                        <span className="text-gray-700">{s.key}</span>
                        <span className="font-bold text-gray-900">{s.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">Could not load reconciliation</div>
          )}
        </div>
        {/* PROD-002: Manpower Available from HR Attendance */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Manpower Availability</h2>
            {availability && <span className="text-xs text-gray-400">{availability.date}</span>}
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={availFilters.date} onChange={e => setAvailFilters(f => ({ ...f, date: e.target.value }))} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={availFilters.shiftId} onChange={e => setAvailFilters(f => ({ ...f, shiftId: e.target.value }))}>
              <option value="">All Shifts</option>
              {availShifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="text" placeholder="Skill" className="border rounded-lg px-3 py-2 text-sm" value={availFilters.skill} onChange={e => setAvailFilters(f => ({ ...f, skill: e.target.value }))} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={availFilters.availabilityStatus} onChange={e => setAvailFilters(f => ({ ...f, availabilityStatus: e.target.value }))}>
              <option value="">All Availability</option>
              <option value="AVAILABLE FOR ALLOCATION">Available for Allocation</option>
              <option value="ALREADY ALLOCATED">Already Allocated</option>
              <option value="NOT AVAILABLE">Not Available</option>
            </select>
          </div>
          {availLoading ? (
            <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
          ) : availability ? (
            <>
              <div className="grid grid-cols-5 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-800">{availability.totalPresent}</div>
                  <div className="text-xs text-gray-500 mt-1">Total Present</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-700">{availability.productionEligiblePresent}</div>
                  <div className="text-xs text-gray-500 mt-1">Production Eligible</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-700">{availability.allocated}</div>
                  <div className="text-xs text-gray-500 mt-1">Allocated</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-yellow-700">{availability.unallocated}</div>
                  <div className="text-xs text-gray-500 mt-1">Unallocated</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-700">{availability.temporarilyUnavailable}</div>
                  <div className="text-xs text-gray-500 mt-1">Temp. Unavailable</div>
                </div>
              </div>
              {!availability.reconciles && (
                <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">Totals do not reconcile - data inconsistency detected.</div>
              )}
              {availability.exceptions?.length > 0 && (
                <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">
                  {availability.exceptions.map((ex, i) => (
                    <div key={i}>{ex.employeeName} ({ex.employeeNumber}): {ex.issue}</div>
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-500 mb-2">Absent: {availability.absent} · Leave: {availability.leave} · Week Off: {availability.weekOff} · Holiday: {availability.holiday}</div>
              {stageAllocResult && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <div className="font-semibold text-blue-800 mb-1">Allocated {stageAllocResult.createdCount} worker{stageAllocResult.createdCount === 1 ? '' : 's'}{stageAllocResult.skippedCount > 0 ? `, ${stageAllocResult.skippedCount} skipped` : ''}</div>
                  {stageAllocResult.skipped?.map((s, i) => <div key={i} className="text-red-600 text-xs">Skipped: {s.reason}</div>)}
                  {stageAllocResult.warnings?.map((w, i) => <div key={i} className="text-yellow-700 text-xs">Warning: {w.warning}</div>)}
                  {stageAllocResult.estimatedCost && (
                    <div className="text-xs text-gray-600 mt-1">
                      Estimated stage labour cost (planning reference only): {stageAllocResult.estimatedCost.workerCount} workers × {stageAllocResult.estimatedCost.hours}h × ₹{stageAllocResult.estimatedCost.hourlyRate}/h = ₹{stageAllocResult.estimatedCost.estimatedCost}
                    </div>
                  )}
                  <button onClick={() => setStageAllocResult(null)} className="text-blue-400 hover:text-blue-600 text-xs mt-1">Dismiss</button>
                </div>
              )}
              <table className="w-full text-sm">
                <thead className="text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-2 py-1"></th>
                    {['Code', 'Name', 'Department', 'Skill', 'Shift', 'In-Time', 'Attendance', 'Allocation', 'Availability'].map(h => <th key={h} className="text-left px-2 py-1">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {availability.workers.map(w => (
                    <tr key={w.employeeId} className={selectedForStage.has(w.employeeId) ? 'bg-blue-50' : ''}>
                      <td className="px-2 py-1">
                        {w.allocationStatus === 'UNALLOCATED' && (
                          <input type="checkbox" checked={selectedForStage.has(w.employeeId)} onChange={() => toggleSelected(w.employeeId)} />
                        )}
                      </td>
                      <td className="px-2 py-1 font-mono">{w.employeeNumber}</td>
                      <td className="px-2 py-1">{w.employeeName}</td>
                      <td className="px-2 py-1">{w.department}</td>
                      <td className="px-2 py-1">{w.skill || '-'}</td>
                      <td className="px-2 py-1">{w.shift?.name || '-'}</td>
                      <td className="px-2 py-1">{w.inTime ? new Date(w.inTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="px-2 py-1">{w.attendanceStatus}</td>
                      <td className="px-2 py-1">{w.allocationStatus}{w.currentWorkOrder ? ` (${w.currentWorkOrder})` : ''}</td>
                      <td className={`px-2 py-1 font-medium ${w.availabilityStatus === 'AVAILABLE FOR ALLOCATION' ? 'text-yellow-700' : w.availabilityStatus === 'ALREADY ALLOCATED' ? 'text-green-700' : 'text-red-600'}`}>{w.availabilityStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {availability.workers.length === 0 && <div className="text-center py-6 text-gray-400 text-sm">No production-eligible present workers match the current filters.</div>}
              {selectedForStage.size > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Allocate {selectedForStage.size} selected worker{selectedForStage.size === 1 ? '' : 's'} to a stage</div>
                  {stageAllocError && <div className="mb-2 p-2 bg-red-50 text-red-600 rounded text-xs">{stageAllocError}</div>}
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Stage</label>
                      <input type="text" placeholder="e.g. Assembly" className="border rounded-lg px-3 py-2 text-sm" value={stageForm.stageName} onChange={e => setStageForm(f => ({ ...f, stageName: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                      <input type="time" className="border rounded-lg px-3 py-2 text-sm" value={stageForm.startTime} onChange={e => setStageForm(f => ({ ...f, startTime: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Planned End Time</label>
                      <input type="time" className="border rounded-lg px-3 py-2 text-sm" value={stageForm.plannedEndTime} onChange={e => setStageForm(f => ({ ...f, plannedEndTime: e.target.value }))} />
                    </div>
                    <button disabled={!stageForm.stageName || stageAllocSaving} onClick={submitStageAllocation} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                      {stageAllocSaving ? 'Allocating...' : 'Allocate to Stage'}
                    </button>
                    <button onClick={() => setSelectedForStage(new Set())} className="px-3 py-2 text-gray-500 text-sm">Clear selection</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">Could not load manpower availability</div>
          )}
        </div>
        {/* PROD-004: Stage Head Allocates Manpower to Work Order */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">WO Manpower Allocation</h2>
          <p className="text-xs text-gray-500 mb-3">Allocate manpower already on your stage to a specific released Work Order. Requires Plant Head approval before it takes effect.</p>
          {woAllocResult && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <div className="font-semibold text-blue-800 mb-1">
                {woAllocResult.createdCount} worker{woAllocResult.createdCount === 1 ? '' : 's'} submitted for Plant Head approval{woAllocResult.skippedCount > 0 ? `, ${woAllocResult.skippedCount} skipped` : ''}
              </div>
              {woAllocResult.skipped?.map((s, i) => <div key={i} className="text-red-600 text-xs">Skipped: {s.reason}</div>)}
              {woAllocResult.warnings?.map((w, i) => <div key={i} className="text-yellow-700 text-xs">Warning: {w.warning}</div>)}
              {woAllocResult.estimatedCost && (
                <div className="text-xs text-gray-600 mt-1">
                  Planned target: {woAllocResult.estimatedCost.plannedTargetQty ?? '-'} pcs · Planned labour hours: {woAllocResult.estimatedCost.labourHours} · Estimated labour cost (planning reference only): ₹{woAllocResult.estimatedCost.estimatedCost}
                </div>
              )}
              <button onClick={() => setWoAllocResult(null)} className="text-blue-400 hover:text-blue-600 text-xs mt-1">Dismiss</button>
            </div>
          )}
          {woAllocLoading ? (
            <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
          ) : (
            <>
              <table className="w-full text-sm mb-4">
                <thead className="text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-2 py-1"></th>
                    {['Employee', 'Stage', 'Line', 'Allocation Start', 'Allocation End'].map(h => <th key={h} className="text-left px-2 py-1">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {myStageWorkers.map(a => (
                    <tr key={a.id} className={selectedForWO.has(a.employeeId) ? 'bg-blue-50' : ''}>
                      <td className="px-2 py-1"><input type="checkbox" checked={selectedForWO.has(a.employeeId)} onChange={() => toggleSelectedForWO(a.employeeId)} /></td>
                      <td className="px-2 py-1">{a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : a.employeeId}</td>
                      <td className="px-2 py-1">{a.stageName || '-'}</td>
                      <td className="px-2 py-1">-</td>
                      <td className="px-2 py-1">{a.startTime ? new Date(a.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="px-2 py-1">{(a.endTime || a.plannedEndTime) ? new Date(a.endTime || a.plannedEndTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Ongoing'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {myStageWorkers.length === 0 && <div className="text-center py-4 text-gray-400 text-sm mb-3">No stage-level manpower currently on your stage.</div>}
              {selectedForWO.size > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Allocate {selectedForWO.size} selected worker{selectedForWO.size === 1 ? '' : 's'} to a Work Order</div>
                  {woAllocError && <div className="mb-2 p-2 bg-red-50 text-red-600 rounded text-xs">{woAllocError}</div>}
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Work Order</label>
                      <select className="border rounded-lg px-3 py-2 text-sm" value={woForm.workOrderId} onChange={e => setWoForm(f => ({ ...f, workOrderId: e.target.value }))}>
                        <option value="">Select WO</option>
                        {eligibleWOs.map(w => <option key={w.id} value={w.id}>{w.woNumber} - {w.productName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                      <input type="time" className="border rounded-lg px-3 py-2 text-sm" value={woForm.startTime} onChange={e => setWoForm(f => ({ ...f, startTime: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Planned End Time</label>
                      <input type="time" className="border rounded-lg px-3 py-2 text-sm" value={woForm.plannedEndTime} onChange={e => setWoForm(f => ({ ...f, plannedEndTime: e.target.value }))} />
                    </div>
                    <button disabled={!woForm.workOrderId || woAllocSaving} onClick={submitWOAllocation} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                      {woAllocSaving ? 'Submitting...' : 'Submit for Plant Head Approval'}
                    </button>
                    <button onClick={() => setSelectedForWO(new Set())} className="px-3 py-2 text-gray-500 text-sm">Clear selection</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Send (HR -> Plant Manager) */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Send Today&apos;s Manpower to Plant Manager</h2>
          {sendError && <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">{sendError}</div>}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={sendForm.date} onChange={e => setSendForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Plant Manager</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={sendForm.toUserId} onChange={e => setSendForm(f => ({ ...f, toUserId: e.target.value }))}>
                <option value="">— Select —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Total Count</label>
              <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
                Auto-computed from today&apos;s Attendance
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Remarks</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={sendForm.remarks} onChange={e => setSendForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleSend} disabled={sending} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>

        {/* Pending for me */}
        {pendingForMe.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h2 className="font-semibold text-amber-800 mb-3">📋 Waiting for Your Acceptance</h2>
            <div className="space-y-2">
              {pendingForMe.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                  <span className="text-sm">
                    <strong>{a.count}</strong> from {userName(a.fromUserId)} {a.category ? `— ${a.category}` : ''} <span className="text-gray-400">({new Date(a.date).toLocaleDateString()})</span>
                  </span>
                  <button onClick={() => handleAccept(a.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700">Accept</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open queries directed to me */}
        {openQueriesForMe.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <h2 className="font-semibold text-red-700 mb-3">⚠️ Queries Needing Your Response</h2>
            <div className="space-y-3">
              {openQueriesForMe.map(q => (
                <QueryRow key={q.id} query={q} onResolve={handleResolveQuery} />
              ))}
            </div>
          </div>
        )}

        {/* My allocations */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-semibold text-gray-800">My Allocations</div>
          <div className="divide-y">
            {loading ? (
              <div className="p-6 text-center text-gray-400">Loading...</div>
            ) : myAllocations.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No allocations yet</div>
            ) : myAllocations.map(a => (
              <div key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-mono text-xs text-gray-400">{a.level}</span>
                    <span className="ml-2">{userName(a.fromUserId)}{a.toUserId ? ` → ${userName(a.toUserId)}` : ''}</span>
                    {a.category && <span className="ml-2 text-blue-600">{a.category}</span>}
                    {a.workOrder && <span className="ml-2 text-purple-600 font-mono text-xs">{a.workOrder.woNumber}</span>}
                    <span className="ml-2 font-bold">{a.count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                    {a.toUserId === me.id && a.status !== 'PENDING' && a.level !== 'STAGE_TO_LINE' && (
                      <button onClick={() => openDistribute(a)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Distribute</button>
                    )}
                    {a.toUserId && (a.toUserId === me.id || a.fromUserId === me.id) && (
                      <button onClick={() => setQueryFor(a)} className="text-xs text-red-500 hover:underline">Raise Query</button>
                    )}
                    {a.status === 'PENDING_APPROVAL' && WO_APPROVAL_ROLES.includes(me.role) && (
                      <>
                        <button onClick={() => approveWOAllocation(a, 'APPROVED')} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Approve</button>
                        <button onClick={() => approveWOAllocation(a, 'REJECTED')} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Reject</button>
                      </>
                    )}
                    {a.workOrderId && a.status === 'ACCEPTED' && (
                      <>
                        <button onClick={() => { setAdjustFor(a); setAdjustDelta(''); setAdjustReason(''); setAdjustError(''); }} className="text-xs bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600">Adjust</button>
                        <button onClick={() => { setTransferFor(a); setTransferTo(''); setTransferQty(''); setTransferReason(''); setTransferError(''); }} className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700">Transfer</button>
                      </>
                    )}
                  </div>
                </div>
                {(a.queries || []).length > 0 && (
                  <div className="mt-2 pl-4 border-l-2 border-red-200 space-y-1">
                    {a.queries.map(q => (
                      <div key={q.id} className="text-xs text-gray-600">
                        <span className="text-red-600 font-medium">{q.raisedBy?.firstName}:</span> {q.message}
                        {q.response && <span className="block text-green-700 mt-0.5">↳ {q.response}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Distribute modal */}
        {distributeFor && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold">Distribute {distributeFor.count} — {distributeFor.category || 'Total'}</h2>
                <button onClick={() => setDistributeFor(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-5 space-y-3">
                {distError && <div className="p-2 bg-red-50 text-red-600 rounded text-sm">{distError}</div>}
                {distResult && (
                  <div className={`p-3 rounded-lg text-sm ${distResult.difference === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    Distributed {distResult.distributedTotal} of {distResult.parentCount}.
                    {distResult.difference !== 0 && ` Difference: ${distResult.difference > 0 ? '-' : '+'}${Math.abs(distResult.difference)}. Consider raising a query if this looks wrong.`}
                  </div>
                )}
                {distLines.map((line, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                    <div className="grid grid-cols-3 gap-2">
                      <select className="border rounded-lg px-2 py-2 text-sm" value={line.category} onChange={e => setDistLines(prev => prev.map((l, i) => i === idx ? { ...l, category: e.target.value } : l))}>
                        <option value="">— Category —</option>
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select className="border rounded-lg px-2 py-2 text-sm" value={line.toUserId} onChange={e => setDistLines(prev => prev.map((l, i) => i === idx ? { ...l, toUserId: e.target.value } : l))}>
                        <option value="">— Line Incharge (optional) —</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                      </select>
                      <input type="number" min="1" placeholder="Count" className="border rounded-lg px-2 py-2 text-sm" value={line.count} onChange={e => setDistLines(prev => prev.map((l, i) => i === idx ? { ...l, count: e.target.value } : l))} />
                    </div>
                    <select className="w-full border rounded-lg px-2 py-2 text-sm" value={line.workOrderId} onChange={e => setDistLines(prev => prev.map((l, i) => i === idx ? { ...l, workOrderId: e.target.value } : l))}>
                      <option value="">— Work Order (optional) —</option>
                      {workOrders.map(w => <option key={w.id} value={w.id}>{w.woNumber} — {w.productName} ({w.stageName || 'Production'})</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="datetime-local" placeholder="Start" className="border rounded-lg px-2 py-2 text-sm" value={line.startTime} onChange={e => setDistLines(prev => prev.map((l, i) => i === idx ? { ...l, startTime: e.target.value } : l))} />
                      <input type="datetime-local" placeholder="Planned end" className="border rounded-lg px-2 py-2 text-sm" value={line.plannedEndTime} onChange={e => setDistLines(prev => prev.map((l, i) => i === idx ? { ...l, plannedEndTime: e.target.value } : l))} />
                    </div>
                    <p className="text-xs text-gray-400">Pick a Line Incharge, a Work Order, or both — at least one is required. Times are optional but needed for the overlap/capacity check and target/cost calculation when allocating to a Work Order.</p>
                  </div>
                ))}
                <button onClick={() => setDistLines(prev => [...prev, { toUserId: '', workOrderId: '', category: '', count: '', startTime: '', plannedEndTime: '' }])} className="text-xs text-blue-600 hover:underline">+ Add Row</button>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => setDistributeFor(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
                <button onClick={handleDistribute} disabled={distributing} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {distributing ? 'Submitting...' : 'Submit Distribution'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Raise query modal */}
        {queryFor && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold">Raise Query</h2>
                <button onClick={() => setQueryFor(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-5">
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Describe the discrepancy..." value={queryMessage} onChange={e => setQueryMessage(e.target.value)} />
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => setQueryFor(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleRaiseQuery} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Send Query</button>
              </div>
            </div>
          </div>
        )}

        {/* Adjust modal */}
        {adjustFor && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold">Adjust Manpower — {adjustFor.workOrder?.woNumber}</h2>
                <button onClick={() => setAdjustFor(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-5 space-y-3">
                {adjustError && <div className="p-2 bg-red-50 text-red-600 rounded text-sm">{adjustError}</div>}
                <p className="text-xs text-gray-500">Current count: <strong>{adjustFor.count}</strong>. Enter a positive number to increase, or a negative number to decrease. Not Plant Head/Admin? This will need approval before it takes effect.</p>
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 3 or -2" value={adjustDelta} onChange={e => setAdjustDelta(e.target.value)} />
                <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Reason (optional)" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => setAdjustFor(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleAdjust} disabled={adjusting} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">{adjusting ? 'Submitting...' : 'Submit'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer modal */}
        {transferFor && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold">Transfer Manpower — {transferFor.workOrder?.woNumber}</h2>
                <button onClick={() => setTransferFor(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-5 space-y-3">
                {transferError && <div className="p-2 bg-red-50 text-red-600 rounded text-sm">{transferError}</div>}
                <p className="text-xs text-gray-500">Currently allocated: <strong>{transferFor.count}</strong>. Not Plant Head/Admin? This will need approval before manpower actually moves.</p>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={transferTo} onChange={e => setTransferTo(e.target.value)}>
                  <option value="">— Destination Work Order —</option>
                  {workOrders.filter(w => w.id !== transferFor.workOrderId).map(w => <option key={w.id} value={w.id}>{w.woNumber} — {w.productName} ({w.stageName || 'Production'})</option>)}
                </select>
                <input type="number" min="1" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Quantity to move" value={transferQty} onChange={e => setTransferQty(e.target.value)} />
                <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Reason (required)" value={transferReason} onChange={e => setTransferReason(e.target.value)} />
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => setTransferFor(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleTransfer} disabled={transferring} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{transferring ? 'Submitting...' : 'Submit'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Roster drill-down - "click Assembly -> see the 45 people" */}
        {rosterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold">{rosterModal.title} — {rosterModal.employees.length} {rosterModal.employees.length === 1 ? 'person' : 'people'}</h2>
                <button onClick={() => setRosterModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                {rosterLoading ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
                ) : rosterModal.employees.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">No one here</div>
                ) : (
                  <div className="space-y-2">
                    {rosterModal.employees.map(e => (
                      <button key={e.id} onClick={() => openEmployeeTimeline(e.id)}
                        className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-2.5 text-left">
                        <span className="text-sm">
                          <span className="font-mono text-xs text-gray-400">{e.employeeNumber}</span>
                          <span className="ml-2 font-medium text-gray-800">{e.firstName} {e.lastName}</span>
                        </span>
                        <span className="text-xs text-blue-600">View →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Employee daily timeline - Plant -> Stage -> Work Order -> Employee drill-down */}
        {timelineModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold">
                  {timelineLoading || !timelineModal.employee ? 'Loading...' : `${timelineModal.employee.employeeNumber} — ${timelineModal.employee.firstName} ${timelineModal.employee.lastName}`}
                </h2>
                <button onClick={() => setTimelineModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {timelineLoading || !timelineModal.employee ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
                ) : (
                  <>
                    <div className="text-sm">
                      <span className="text-gray-500">Attendance:</span>{' '}
                      <span className="font-medium">{timelineModal.attendance?.status || 'No record'}</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Today&apos;s Timeline</div>
                      {timelineModal.assignments.length === 0 ? (
                        <div className="text-sm text-gray-400">No assignments yet today — present but currently unallocated.</div>
                      ) : (
                        <div className="space-y-2">
                          {timelineModal.assignments.map(a => (
                            <div key={a.id} className="border-l-2 border-blue-300 pl-3">
                              <div className="text-sm font-medium text-gray-800">
                                {a.stageName || a.activityType} {a.workOrder && <span className="font-mono text-xs text-purple-600 ml-1">{a.workOrder.woNumber}</span>}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {' → '}
                                {a.endTime ? new Date(a.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-green-600 font-medium">Running</span>}
                              </div>
                              {a.remarks && <div className="text-xs text-gray-400 mt-0.5">{a.remarks}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function QueryRow({ query, onResolve }) {
  const [response, setResponse] = useState('');
  return (
    <div className="bg-white rounded-lg px-4 py-3 border border-red-100">
      <div className="text-sm text-gray-700 mb-2">{query.message}</div>
      <div className="flex gap-2">
        <input className="flex-1 border rounded-lg px-3 py-1.5 text-sm" placeholder="Your response..." value={response} onChange={e => setResponse(e.target.value)} />
        <button onClick={() => onResolve(query.id, response)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700">Resolve</button>
      </div>
    </div>
  );
}
