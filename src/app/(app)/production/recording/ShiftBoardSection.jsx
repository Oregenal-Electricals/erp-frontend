'use client';
import { useState, useEffect, useMemo } from 'react';

// Shift Board — hourly production entry + live costing, inside Production
// Recording (this page's only entry surface — see page.jsx). Redesigned
// 2026-10-31 per Rahul's feedback:
//
// - Only ONE hour is open for entry at a time, per line. Past hours show as
//   a compact, read-only history; future hours aren't rendered at all until
//   their turn comes ("8-9 daala to phir 9-10 ka column banayein" - no more
//   showing all 10 hours at once).
// - Reject is gone from this board entirely - Rahul's call: a reject is
//   repaired or scrapped elsewhere, and either way it shouldn't count
//   against this hour's target/actual efficiency. "Actual" here is simply
//   what the line produced, full stop.
// - Base Manpower seeds the very first hour and then locks (no more editing
//   it directly) once that hour is done. From the second hour onward, each
//   hour's MP defaults to the previous hour's MP; typing a different number
//   opens a prompt asking which other line in this department that
//   manpower came from/went to, and applies the opposite change to that
//   other line's SAME hour automatically - no second prompt on that line.
// - The old unexplained "Backend" column is gone. Each finished hour just
//   carries a small ✓ (green + entry number if it's a real backend entry,
//   grey if the line isn't linked to a Work Order and the hour only lives
//   in this browser).
// - A line linked to a Work Order shows that WO's planned/done/remaining
//   quantity right under the picker, so it's obvious how much is actually
//   left to produce before over- or under-filling it.
//
// Updated 2026-10-31 (still per Rahul): every line MUST be linked to a real
// Work Order before any hour can be entered — there is no more "local only"
// mode. Rahul's own workflow is 100% Sales Order -> Work Order based, so an
// hour that doesn't map to a Work Order isn't a real thing for him; letting
// it live only in this browser was leftover scaffolding from before the
// backend was wired up, and it's gone now.

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STORAGE_KEY = 'shopfloor_shift_board_v4';
const DEPT_ORDER = ['ASSEMBLY', 'MI', 'SMT'];

// ProductionEntry.shift only accepts MORNING/EVENING/NIGHT (no generic "day
// shift" value exists yet). This whole board is Rahul's single 8 AM–5:30 PM
// shift, so every hourly entry it creates is tagged MORNING — a real but
// low-stakes simplification, flagged here rather than silently picked.
const BACKEND_SHIFT_LABEL = 'MORNING';

// Fixed shift slots, 8 AM to 5:30 PM — Rahul's real shift timing.
const SHIFT_SLOTS = [
  { key: '08', label: '8-9', dur: 1 },
  { key: '09', label: '9-10', dur: 1 },
  { key: '10', label: '10-11', dur: 1 },
  { key: '11', label: '11-12', dur: 1 },
  { key: '12', label: '12-1', dur: 1 },
  { key: '13', label: '1-2', dur: 1 },
  { key: '14', label: '2-3', dur: 1 },
  { key: '15', label: '3-4', dur: 1 },
  { key: '16', label: '4-5', dur: 1 },
  { key: '17', label: '5-5:30', dur: 0.5 },
];

function uid() { return 'l' + Math.random().toString(36).slice(2, 9); }
function fmtDateIN(iso) { if (!iso) return ''; const p = iso.split('-'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : iso; }
function money(n) { if (n === null || n === undefined || isNaN(n)) return '—'; const neg = n < 0; n = Math.abs(n); return (neg ? '−' : '') + '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function num(n) { return (n === null || n === undefined || isNaN(n)) ? '—' : Math.round(n).toLocaleString('en-IN'); }
// Used for every numeric input's onChange. Keeps a cleared field genuinely
// empty ('') instead of snapping it to 0 — a controlled number input whose
// value gets forced back to 0 on every keystroke makes it impossible to
// clear and retype a number (the next digit lands after the "0" instead of
// replacing it). All totals below already fall back to 0 via `|| 0`, so an
// empty field is safe to leave empty until the person types a real value.
function parseNumOrBlank(v) {
  if (v === '' || v === null || v === undefined) return '';
  const n = parseFloat(v);
  return isNaN(n) ? '' : n;
}

// Builds this slot's periodStart/periodEnd as explicit IST (+05:30)
// timestamps for a given board date — never a bare timezone-less string,
// which Node would parse in whatever timezone the server happens to be
// running in and silently shift the hour.
function slotPeriodIso(dateStr, slot) {
  const startHour = parseInt(slot.key, 10);
  const endTotalMinutes = startHour * 60 + slot.dur * 60;
  const endHour = Math.floor(endTotalMinutes / 60);
  const endMin = endTotalMinutes % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return {
    periodStart: `${dateStr}T${pad(startHour)}:00:00+05:30`,
    periodEnd: `${dateStr}T${pad(endHour)}:${pad(endMin)}:00+05:30`,
  };
}

// An hour that hasn't happened yet can't have a real number — the backend
// already enforces this, but checking it here too means the person sees a
// clear warning instead of a save that silently fails.
function isSlotInFuture(dateStr, slot) {
  const { periodEnd } = slotPeriodIso(dateStr, slot);
  return new Date(periodEnd).getTime() > Date.now();
}

function emptySlots() {
  const slots = {};
  SHIFT_SLOTS.forEach((s) => { slots[s.key] = { mp: '', target: '', a: '', done: false, sync: null }; });
  return slots;
}

// Walks back from slotKey through already-done hours to find the last
// known manpower count, falling back to the line's locked Base Manpower —
// this is both the default shown for a new active hour AND the "previous"
// value a manpower change is compared against to trigger the transfer
// prompt. Pure function of the line's own data, so it works for the line
// being edited and for the other line on the receiving/giving end of a
// transfer.
function prefillMpFor(line, slotKey) {
  const idx = SHIFT_SLOTS.findIndex((s) => s.key === slotKey);
  for (let i = idx - 1; i >= 0; i--) {
    const prevRow = line.slots[SHIFT_SLOTS[i].key];
    if (prevRow && prevRow.done && prevRow.mp !== '' && prevRow.mp != null) return prevRow.mp;
  }
  return line.manpower === '' || line.manpower == null ? 0 : line.manpower;
}

function newLine(name = 'New line') {
  return { id: uid(), name, manpower: 1, stdCost: 10, closed: false, workOrderId: null, slots: emptySlots(), remarks: '' };
}

// Example data — every demo line starts fresh with no Work Order linked and
// no done hours, since that's the only reachable starting state now (a
// line can't have a done hour without a Work Order behind it any more).
function exampleState() {
  return {
    date: '2026-10-31',
    shift: 'Day Shift · 8:00 AM–5:30 PM',
    activeDept: 'ASSEMBLY',
    departments: {
      ASSEMBLY: {
        label: 'Assembly & Packing', workerRate: 60,
        lines: [
          { id: 'assy01', name: 'Assy-01 (2x2 Havells Assy)', manpower: 9, stdCost: 12, closed: false, workOrderId: null, remarks: '',
            slots: emptySlots() },
          { id: 'pack01', name: 'Packing-01 (Gluing)', manpower: 3, stdCost: 10, closed: false, workOrderId: null, remarks: '',
            slots: emptySlots() },
          { id: 'assy02', name: 'Assy-02 (Framing)', manpower: 1, stdCost: 8, closed: false, workOrderId: null, remarks: '',
            slots: emptySlots() },
          { id: 'pack02', name: 'Packing-02 (Panel Packing)', manpower: 9, stdCost: 12, closed: false, workOrderId: null, remarks: '',
            slots: emptySlots() },
        ],
      },
      MI: {
        label: 'MI', workerRate: 60,
        lines: [
          { id: 'mi36w', name: '36W 2x2 Driver', manpower: 7, stdCost: 6, closed: false, workOrderId: null, remarks: '',
            slots: emptySlots() },
        ],
      },
      SMT: {
        label: 'SMT', workerRate: 60,
        lines: [
          { id: 'smt9w', name: '9W Inv DOB Bulb (Rework)', manpower: 2, stdCost: 4, closed: false, workOrderId: null, remarks: '',
            slots: emptySlots() },
        ],
      },
    },
  };
}

// Only done hours count — an hour that's still being typed into the active
// row isn't real until "Save & next hour" (or the backend) confirms it.
// Overtime manpower is no longer tracked as a separate client-side bucket
// (see OvertimeRequest workflow) - an OT-covered hour's mp already
// includes the approved extra men, so it's already inside the normal
// per-hour sum below; the backend's own otLabourCost (at the OT
// multiplier, not this flat workerRate) is what actually prices that
// slice, visible on the Cost Sheet / costing sheets, not here.
function lineSlotTotals(line, workerRate) {
  let target = 0, actual = 0, cost = 0;
  SHIFT_SLOTS.forEach((s) => {
    const row = line.slots[s.key];
    if (!row || !row.done) return;
    target += row.target || 0;
    actual += row.a || 0;
    cost += (row.mp || 0) * s.dur * (workerRate || 0);
  });
  return { target, actual, good: actual, cost };
}

function deptCosting(dept) {
  let totalTarget = 0, totalActual = 0, totalCost = 0, totalValue = 0, totalManpower = 0;
  dept.lines.forEach((ln) => {
    const t = lineSlotTotals(ln, dept.workerRate);
    totalTarget += t.target;
    totalActual += t.actual;
    totalManpower += (ln.manpower || 0);
    totalCost += t.cost;
    totalValue += t.good * (ln.stdCost || 0);
  });
  return {
    target: totalTarget, actual: totalActual, good: totalActual,
    manpower: totalManpower, cost: totalCost, value: totalValue, pnl: totalValue - totalCost,
    perPiece: totalActual > 0 ? totalCost / totalActual : null,
    achievement: totalTarget > 0 ? (totalActual / totalTarget * 100) : null,
  };
}

export default function ShiftBoardSection({ onEntryCreated }) {
  const [state, setState] = useState(null);
  const [copied, setCopied] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [woLoadError, setWoLoadError] = useState('');
  const [todaysEntries, setTodaysEntries] = useState([]);
  const [entriesLoadError, setEntriesLoadError] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [mpPrompt, setMpPrompt] = useState(null);
  const [otRequests, setOtRequests] = useState([]);
  const [otRequestsError, setOtRequestsError] = useState('');
  const [otModal, setOtModal] = useState(null); // { lineId, lineName, workOrderId }
  const [otSubmitting, setOtSubmitting] = useState(false);
  const [otSubmitError, setOtSubmitError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setState(raw ? JSON.parse(raw) : exampleState());
    } catch (e) { setState(exampleState()); }
  }, []);

  useEffect(() => {
    if (!state) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }, [state]);

  // Only IN_PROGRESS Work Orders are even legal to record against
  // (ProductionEntryService.create() rejects anything else), so that's all
  // this dropdown ever needs to offer. Re-fetched after every save/confirm
  // too, so the planned/done/remaining quantity shown under the picker
  // stays current.
  async function fetchWorkOrders() {
    if (!getToken()) return;
    try {
      const res = await fetch(`${API}/work-orders?status=IN_PROGRESS&limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setWorkOrders(Array.isArray(d) ? d : (d.data || []));
      setWoLoadError('');
    } catch (e) {
      setWoLoadError('Active Work Orders could not be loaded — Work Order linking will not work until this is fixed.');
    }
  }
  useEffect(() => { fetchWorkOrders(); }, []);

  // The one ledger this page shows now: entries this board has actually
  // created, for the day on screen. findAll() has no entryDate filter, so
  // this pulls the latest entries (already sorted entryDate desc server
  // side) and narrows to this board's date client side - plenty for a
  // single day's worth of hourly entries across a handful of lines.
  async function fetchTodaysEntries(dateStr) {
    if (!getToken() || !dateStr) return;
    try {
      const res = await fetch(`${API}/production-entries?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setTodaysEntries((d.data || []).filter((e) => e.entryDate && e.entryDate.slice(0, 10) === dateStr));
      setEntriesLoadError('');
    } catch (e) {
      setEntriesLoadError('Today\'s entries could not be loaded.');
    }
  }
  useEffect(() => { if (state?.date) fetchTodaysEntries(state.date); }, [state?.date]);

  // Overtime (Shift Board "Request Overtime"): findAll() has no shiftDate
  // filter server side (same shape as fetchTodaysEntries above), so pull
  // every active request and narrow to this board's date client side.
  // Used both to show each line's current OT status and to block
  // double-requesting while one is already pending/approved for today.
  async function fetchOtRequests(dateStr) {
    if (!getToken() || !dateStr) return;
    try {
      const res = await fetch(`${API}/overtime-requests?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error();
      const d = await res.json();
      const list = Array.isArray(d) ? d : (d.data || []);
      setOtRequests(list.filter((r) => r.shiftDate && r.shiftDate.slice(0, 10) === dateStr));
      setOtRequestsError('');
    } catch (e) {
      setOtRequestsError('Overtime requests could not be loaded.');
    }
  }
  useEffect(() => { if (state?.date) fetchOtRequests(state.date); }, [state?.date]);

  // Most recent OT request (if any) covering this line's linked Work
  // Order on the board's current date - findAll() already orders desc by
  // createdAt, so the first match is the latest.
  function lineOtRequest(ln) {
    if (!ln.workOrderId) return null;
    return otRequests.find((r) => r.workOrderId === ln.workOrderId) || null;
  }

  function openOtModal(ln) {
    setOtSubmitError('');
    setOtModal({ lineId: ln.id, lineName: ln.name, workOrderId: ln.workOrderId, requestedMenCount: '', requestedHours: '', reason: '' });
  }

  async function submitOtRequest() {
    if (!otModal) return;
    const menCount = Number(otModal.requestedMenCount);
    const hours = Number(otModal.requestedHours);
    if (!menCount || menCount <= 0) { setOtSubmitError('Enter how many extra men.'); return; }
    if (!hours || hours <= 0) { setOtSubmitError('Enter how many extra hours.'); return; }
    if (!otModal.reason || !otModal.reason.trim()) { setOtSubmitError('Reason is required.'); return; }
    setOtSubmitting(true); setOtSubmitError('');
    try {
      const res = await fetch(`${API}/overtime-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          workOrderId: otModal.workOrderId, shiftDate: state.date,
          requestedMenCount: menCount, requestedHours: hours, reason: otModal.reason.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Overtime request failed');
      setOtModal(null);
      await fetchOtRequests(state.date);
    } catch (e) {
      setOtSubmitError(e.message || 'Overtime request failed');
    } finally {
      setOtSubmitting(false);
    }
  }

  async function handleConfirm(id) {
    setConfirmingId(id);
    try {
      const res = await fetch(`${API}/production-entries/${id}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Confirm failed');
      await fetchTodaysEntries(state.date);
      await fetchWorkOrders();
      onEntryCreated?.();
    } catch (e) {
      alert(e.message || 'Confirm failed');
    } finally {
      setConfirmingId(null);
    }
  }

  const dept = state ? state.departments[state.activeDept] : null;

  // WorkOrder.stageName casing isn't consistent everywhere in this codebase
  // (seen as both "Assembly" and "ASSEMBLY" in different places) — matching
  // case-insensitively avoids a dropdown that quietly shows zero options
  // just because of how a stage name happened to be typed.
  const deptWorkOrders = useMemo(
    () => workOrders.filter((w) => (w.stageName || '').toUpperCase() === state?.activeDept),
    [workOrders, state?.activeDept],
  );

  const costing = useMemo(() => (dept ? deptCosting(dept) : null), [dept]);
  const allCosting = useMemo(() => {
    if (!state) return null;
    const tot = { target: 0, actual: 0, manpower: 0, pnl: 0 };
    DEPT_ORDER.forEach((k) => {
      const c = deptCosting(state.departments[k]);
      tot.target += c.target; tot.actual += c.actual; tot.manpower += c.manpower; tot.pnl += c.pnl;
    });
    return tot;
  }, [state]);

  function setDept(k) {
    setState((s) => ({ ...s, activeDept: k }));
  }

  function withLine(lineId, fn) {
    setState((s) => {
      const next = structuredClone(s);
      const d = next.departments[next.activeDept];
      const idx = d.lines.findIndex((l) => l.id === lineId);
      if (idx === -1) return s;
      fn(d.lines[idx], d);
      return next;
    });
  }

  function updateSlotField(lineId, slotKey, field, value) {
    withLine(lineId, (ln) => {
      if (!ln.slots[slotKey]) ln.slots[slotKey] = { mp: '', target: '', a: '', done: false, sync: null };
      ln.slots[slotKey][field] = parseNumOrBlank(value);
    });
  }

  function updateLineField(lineId, field, value) {
    withLine(lineId, (ln) => { ln[field] = field === 'name' || field === 'remarks' ? value : parseNumOrBlank(value); });
  }

  function toggleClosed(lineId) {
    withLine(lineId, (ln) => { ln.closed = !ln.closed; });
  }

  function addLine() {
    setState((s) => {
      const next = structuredClone(s);
      next.departments[next.activeDept].lines.push(newLine());
      return next;
    });
  }

  function removeLine(lineId) {
    setState((s) => {
      const next = structuredClone(s);
      const d = next.departments[next.activeDept];
      d.lines = d.lines.filter((l) => l.id !== lineId);
      return next;
    });
  }

  function updateWorkerRate(value) {
    const r = parseNumOrBlank(value);
    setState((s) => { const n = structuredClone(s); n.departments[n.activeDept].workerRate = r; return n; });
  }

  // The Work Order a line is linked to is locked once any hour has actually
  // saved against it (hasDoneHours, computed at the call site) — switching
  // WOs mid-day would leave earlier hours pointing at one WO and later
  // hours at another, which is not something to allow silently.
  function setLineWorkOrder(lineId, woId) {
    withLine(lineId, (ln) => { ln.workOrderId = woId || null; });
  }

  // MP changed from the previous hour (doneCount must be > 0 - the very
  // first hour of the day has no "previous" to compare against, it's just
  // whatever Base Manpower was set to). Opens the transfer prompt instead
  // of silently accepting the new number.
  function handleMpBlur(ln, slotDef, doneCount, typedValue) {
    if (doneCount === 0) return;
    if (typedValue === '' || typedValue === null || typedValue === undefined) return;
    const typed = Number(typedValue);
    const prev = prefillMpFor(ln, slotDef.key);
    if (typed !== prev) {
      setMpPrompt({
        lineId: ln.id, lineName: ln.name, slotKey: slotDef.key, slotLabel: slotDef.label,
        prevMp: prev, newMp: typed,
        otherLines: dept.lines.filter((l) => l.id !== ln.id).map((l) => ({ id: l.id, name: l.name })),
      });
    }
  }

  // targetLineId === null means "no transfer, the number just is what it
  // is" (overtime help, someone left with no replacement, etc.) - the
  // current line's own value is already committed via onChange, this only
  // ever needs to touch the OTHER line, applying the opposite of this
  // line's change to that line's same hour.
  function resolveManpowerTransfer(targetLineId) {
    if (!mpPrompt) return;
    const { slotKey, newMp, prevMp } = mpPrompt;
    const delta = newMp - prevMp;
    if (targetLineId) {
      withLine(targetLineId, (other) => {
        if (!other.slots[slotKey]) other.slots[slotKey] = { mp: '', target: '', a: '', done: false, sync: null };
        const otherPrev = other.slots[slotKey].mp === '' || other.slots[slotKey].mp == null
          ? prefillMpFor(other, slotKey) : other.slots[slotKey].mp;
        other.slots[slotKey].mp = Math.max(0, otherPrev - delta);
      });
    }
    setMpPrompt(null);
  }

  // Finishes the active hour by creating a real backend ProductionEntry.
  // A line must be linked to a Work Order before this is ever reachable
  // (the active-hour block below doesn't render otherwise), so there's no
  // local-only branch any more — this is the only thing that ever sets
  // done:true, which is what advances the board to the next hour.
  async function saveActiveHour(ln, slotDef, mpVal, actualVal, dateStr) {
    if (!ln.workOrderId) return;
    withLine(ln.id, (l) => {
      const r = l.slots[slotDef.key];
      r.mp = mpVal; r.a = actualVal;
    });

    withLine(ln.id, (l) => { l.slots[slotDef.key].sync = { status: 'saving' }; });
    try {
      const { periodStart, periodEnd } = slotPeriodIso(dateStr, slotDef);
      const res = await fetch(`${API}/production-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          workOrderId: ln.workOrderId,
          entryDate: dateStr,
          shift: BACKEND_SHIFT_LABEL,
          goodQty: Math.max(0, actualVal),
          scrapQty: 0,
          manpowerQty: mpVal,
          periodStart, periodEnd,
          remarks: `Shift Board — ${ln.name} — ${slotDef.label}`,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || `Save failed (${res.status})`);
      withLine(ln.id, (l) => {
        const r = l.slots[slotDef.key];
        r.done = true;
        r.sync = { status: 'saved', entryId: body.id, entryNumber: body.entryNumber, achievementPercent: body.achievementPercent };
        if (body.targetQty != null) r.target = Math.round(body.targetQty);
      });
      fetchTodaysEntries(dateStr);
      fetchWorkOrders();
      onEntryCreated?.();
    } catch (e) {
      withLine(ln.id, (l) => { l.slots[slotDef.key].sync = { status: 'error', error: e.message || 'Save failed' }; });
    }
  }

  function copyWhatsApp() {
    if (!state) return;
    const lines = [`*OREGENAL ELECTRICALS* — ${fmtDateIN(state.date)}`, state.shift, ''];
    let grand = { target: 0, actual: 0, pnl: 0 };
    DEPT_ORDER.forEach((k) => {
      const d = state.departments[k];
      const c = deptCosting(d);
      if (c.actual === 0 && c.target === 0) return;
      lines.push(`*${d.label}*`);
      lines.push(`Target: ${num(c.target)}  Actual: ${num(c.actual)}`);
      lines.push(`Achv: ${c.achievement === null ? '—' : Math.round(c.achievement) + '%'}  P&L: ${money(c.pnl)}`);
      lines.push('');
      grand.target += c.target; grand.actual += c.actual; grand.pnl += c.pnl;
    });
    lines.push(`*Day total* — Target ${num(grand.target)} | Actual ${num(grand.actual)} | P&L ${money(grand.pnl)}`);
    const text = lines.join('\n');
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }

  if (!state || !dept) {
    return <div className="text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Shift Board</h2>
          <p className="text-gray-500 text-sm mt-1">One hour at a time, line by line</p>
        </div>
        <div className="flex gap-2">
          <input type="date" value={state.date} onChange={(e) => setState((s) => ({ ...s, date: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input type="text" value={state.shift} onChange={(e) => setState((s) => ({ ...s, shift: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52" />
        </div>
      </div>

      {woLoadError && (
        <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{woLoadError}</div>
      )}

      {/* Today's saved entries — the one ledger this page shows now. Only
          ever has rows once a line is linked to a Work Order and an hour
          gets saved. */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Today&apos;s entries</div>
            <div className="text-xs text-gray-500 mt-0.5">Saved from the hour-by-hour entry below — confirm here once reviewed</div>
          </div>
          <span className="text-xs text-gray-400">{todaysEntries.length} for {fmtDateIN(state.date)}</span>
        </div>
        {entriesLoadError && (
          <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-200">{entriesLoadError}</div>
        )}
        {todaysEntries.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            No Work Order-linked entries saved yet today — link a line below and finish an hour to see it here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase">
                <tr>{['Entry No.', 'Work Order', 'Good Qty', 'Achv.', 'Status', ''].map((h) => (
                  <th key={h} className="px-3 py-2 text-left">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {todaysEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{e.entryNumber}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      <span className="font-mono">{e.workOrder?.woNumber}</span>
                      <span className="ml-2 text-gray-400">{e.workOrder?.productName}</span>
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-green-700">{e.goodQty}</td>
                    <td className="px-3 py-2 text-xs font-medium text-gray-600">{e.achievementPercent != null ? `${e.achievementPercent}%` : '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      {e.status === 'DRAFT' && (
                        <button onClick={() => handleConfirm(e.id)} disabled={confirmingId === e.id}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                          {confirmingId === e.id ? 'Confirming…' : 'Confirm'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* overview strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Target today', value: num(allCosting.target), color: 'bg-gray-50' },
          { label: 'Actual today', value: num(allCosting.actual), color: 'bg-blue-50' },
          { label: 'Manpower', value: num(allCosting.manpower), color: 'bg-purple-50' },
          { label: 'Day P&L', value: money(allCosting.pnl), color: allCosting.pnl >= 0 ? 'bg-green-50' : 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-lg p-4`}>
            <div className="text-2xl font-bold text-gray-800 tabular-nums">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* department tabs */}
      <div className="flex gap-1.5 mb-6 bg-white border border-gray-200 rounded-lg p-1.5 w-fit">
        {DEPT_ORDER.map((k) => (
          <button key={k} onClick={() => setDept(k)}
            className={`text-sm font-medium rounded-md px-4 py-2 ${
              k === state.activeDept ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}>
            {state.departments[k].label}
          </button>
        ))}
      </div>

      {/* line cards */}
      <div className="space-y-5 mb-6">
        {dept.lines.map((ln) => {
          const t = lineSlotTotals(ln, dept.workerRate);
          const doneSlots = SHIFT_SLOTS.filter((s) => ln.slots[s.key]?.done);
          const activeSlotDef = ln.closed ? null : SHIFT_SLOTS.find((s) => !ln.slots[s.key]?.done);
          const activeRow = activeSlotDef ? (ln.slots[activeSlotDef.key] || { mp: '', target: '', a: '', done: false, sync: null }) : null;
          const effMp = activeRow ? (activeRow.mp === '' || activeRow.mp == null ? prefillMpFor(ln, activeSlotDef.key) : activeRow.mp) : null;
          // Target always comes from the backend now (it needs a Work
          // Order's product/productivity to compute), so there's no live
          // Eff% until after the hour is actually saved.
          const futureLocked = activeSlotDef ? isSlotInFuture(state.date, activeSlotDef) : false;
          const selectedWo = ln.workOrderId ? workOrders.find((w) => w.id === ln.workOrderId) : null;
          const remainingQty = selectedWo ? Math.max(0, (selectedWo.plannedQty || 0) - (selectedWo.completedQty || 0)) : null;

          return (
            <div key={ln.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-[220px]">
                  <input value={ln.name} onChange={(e) => updateLineField(ln.id, 'name', e.target.value)}
                    className="font-semibold text-gray-900 text-base border-0 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 -mx-1 w-full" />
                  <div className="mt-1.5 flex items-center gap-2">
                    <select value={ln.workOrderId || ''} disabled={ln.closed || doneSlots.length > 0}
                      onChange={(e) => setLineWorkOrder(ln.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-600 max-w-[280px] disabled:bg-gray-50 disabled:text-gray-400">
                      <option value="">— Select Work Order (required) —</option>
                      {deptWorkOrders.map((w) => (
                        <option key={w.id} value={w.id}>{w.woNumber} · {w.productName}</option>
                      ))}
                    </select>
                    {ln.workOrderId ? (
                      <span className="text-[10px] text-green-600 font-medium whitespace-nowrap">
                        ● linked{doneSlots.length > 0 ? ' · locked' : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-medium whitespace-nowrap">
                        Work Order required
                      </span>
                    )}
                  </div>
                  {selectedWo && (
                    <div className="text-[11px] text-gray-500 mt-1">
                      Planned <b className="text-gray-700">{num(selectedWo.plannedQty)}</b> · Done <b className="text-gray-700">{num(selectedWo.completedQty)}</b> · Remaining{' '}
                      <b className={remainingQty <= 0 ? 'text-red-600' : 'text-gray-700'}>{num(remainingQty)}</b>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Target so far</div>
                  <div className="font-semibold text-gray-900 tabular-nums">{num(t.target)}</div>
                </div>
                <button onClick={() => toggleClosed(ln.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md ${
                    ln.closed ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {ln.closed ? 'Reopen' : 'Close'}
                </button>
                <button onClick={() => removeLine(ln.id)} title="Remove line"
                  className="text-xs text-gray-400 hover:text-red-600 px-1">✕</button>
              </div>

              <div className="px-4 pt-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  ln.closed ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ln.closed ? 'bg-red-500' : 'bg-green-500'}`} />
                  {ln.closed ? 'Line closed' : 'Line open'}
                </span>
              </div>

              <div className="p-4 flex items-center gap-2">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Base manpower</label>
                <input type="number" min="0" disabled={doneSlots.length > 0} value={ln.manpower}
                  title={doneSlots.length > 0 ? 'Locked once the first hour is done — change manpower hour by hour below instead' : undefined}
                  onChange={(e) => updateLineField(ln.id, 'manpower', e.target.value)}
                  className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm font-semibold disabled:bg-gray-50 disabled:text-gray-400" />
                {doneSlots.length > 0 && <span className="text-[11px] text-gray-400">locked for the day</span>}
              </div>

              {/* done hours — compact history, read-only */}
              {doneSlots.length > 0 && (
                <div className="px-4 pb-2 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-[10px] uppercase text-gray-400">
                        <th className="text-left font-medium py-1.5 pr-3">Hour</th>
                        <th className="text-right font-medium py-1.5 px-3">MP</th>
                        <th className="text-right font-medium py-1.5 px-3">Target</th>
                        <th className="text-right font-medium py-1.5 px-3">Actual</th>
                        <th className="text-right font-medium py-1.5 pl-3">Eff%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doneSlots.map((s) => {
                        const row = ln.slots[s.key];
                        const eff = row.target > 0 ? Math.round((row.a / row.target) * 100) : null;
                        const synced = row.sync?.status === 'saved';
                        return (
                          <tr key={s.key} className="border-b border-gray-50 text-gray-500">
                            <td className="py-1.5 pr-3 whitespace-nowrap">
                              {s.label}
                              <span className={`ml-1.5 ${synced ? 'text-green-500' : 'text-gray-300'}`}
                                title={synced ? `${row.sync.entryNumber}${row.sync.achievementPercent != null ? ` · ${Math.round(row.sync.achievementPercent)}%` : ''}` : 'Saved before this line required a Work Order link'}>
                                ✓
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-right tabular-nums">{num(row.mp)}</td>
                            <td className="py-1.5 px-3 text-right tabular-nums">{num(row.target)}</td>
                            <td className="py-1.5 px-3 text-right tabular-nums font-medium text-gray-700">{num(row.a)}</td>
                            <td className="py-1.5 pl-3 text-right tabular-nums">{eff === null ? '—' : `${eff}%`}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* the one active hour */}
              {ln.closed ? (
                <div className="px-4 pb-4 text-xs text-gray-400">Line is closed — reopen it to continue entering hours.</div>
              ) : !ln.workOrderId ? (
                <div className="px-4 pb-4">
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Pehle is line ke liye Work Order select karein — tab hi ghante ki entry shuru hogi.
                  </div>
                </div>
              ) : !activeSlotDef ? (
                <div className="px-4 pb-4 text-sm text-green-700 font-medium">✓ All hours recorded for today.</div>
              ) : (
                <div className="px-4 pb-4">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Now entering — {activeSlotDef.label}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">Manpower</label>
                      <input type="number" min="0" value={activeRow.mp === '' || activeRow.mp == null ? effMp : activeRow.mp}
                        onChange={(e) => updateSlotField(ln.id, activeSlotDef.key, 'mp', e.target.value)}
                        onBlur={(e) => handleMpBlur(ln, activeSlotDef, doneSlots.length, e.target.value === '' ? effMp : e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm font-semibold tabular-nums" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">Target</label>
                      <div className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-400 bg-gray-50" title="Computed by the backend from the product's standard productivity once this hour is saved">
                        computed after save
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">Actual</label>
                      <input type="number" min="0" value={activeRow.a}
                        onChange={(e) => updateSlotField(ln.id, activeSlotDef.key, 'a', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm font-semibold tabular-nums" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">Eff% (live)</label>
                      <div className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-400 bg-gray-50 tabular-nums" title="Achievement % is computed by the backend after this hour is saved">
                        —
                      </div>
                    </div>
                  </div>

                  {futureLocked && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                      This hour hasn&apos;t finished yet — it can be saved once {activeSlotDef.label} is over.
                    </div>
                  )}
                  {activeRow.sync?.status === 'error' && (
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{activeRow.sync.error}</div>
                  )}

                  <button
                    disabled={futureLocked || activeRow.a === '' || activeRow.a === null || activeRow.sync?.status === 'saving'}
                    onClick={() => saveActiveHour(
                      ln, activeSlotDef,
                      activeRow.mp === '' || activeRow.mp == null ? effMp : Number(activeRow.mp),
                      activeRow.a === '' || activeRow.a == null ? 0 : Number(activeRow.a),
                      state.date,
                    )}
                    className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm disabled:bg-gray-300 disabled:cursor-not-allowed">
                    {activeRow.sync?.status === 'saving' ? 'Saving…' : activeRow.sync?.status === 'error' ? 'Retry save' : 'Save & next hour'}
                  </button>
                </div>
              )}

              <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2 mt-2">
                  <div className="text-xs font-semibold text-gray-700">Overtime</div>
                  <button onClick={() => openOtModal(ln)} disabled={ln.closed || !ln.workOrderId}
                    title={!ln.workOrderId ? 'Link a Work Order first' : undefined}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400">
                    Request Overtime
                  </button>
                </div>
                {lineOtRequest(ln) ? (
                  <a href={`/production/overtime-requests/${lineOtRequest(ln).id}`}
                    className={`block text-xs px-3 py-2 rounded-lg border mb-3 hover:opacity-80 ${
                      lineOtRequest(ln).status === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-700'
                        : lineOtRequest(ln).status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                    <span className="font-mono font-semibold">{lineOtRequest(ln).requestNumber}</span> — {lineOtRequest(ln).status.replace(/_/g, ' ')}
                    {lineOtRequest(ln).status === 'APPROVED'
                      ? ` · ${lineOtRequest(ln).approvedMenCount} men × ${lineOtRequest(ln).approvedHours} hrs approved — type the extra manpower into the hour above`
                      : ` · ${lineOtRequest(ln).requestedMenCount} men × ${lineOtRequest(ln).requestedHours} hrs requested`}
                  </a>
                ) : !ln.workOrderId ? null : (
                  <div className="text-xs text-gray-400 mb-3">No overtime requested for this Work Order today.</div>
                )}
                {otRequestsError && <div className="text-xs text-amber-700 mb-3">{otRequestsError}</div>}

                <label className="block text-[10px] uppercase text-gray-500 mb-1">Remarks</label>
                <textarea value={ln.remarks} disabled={ln.closed} placeholder="Optional…"
                  onChange={(e) => updateLineField(ln.id, 'remarks', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-400" rows={2} />
              </div>
            </div>
          );
        })}

        <button onClick={addLine}
          className="w-full py-2.5 rounded-lg border border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50">
          + Add a line
        </button>
      </div>

      {/* rates & costing setup */}
      <details className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <summary className="list-none cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 flex items-center justify-between">
          Rates &amp; costing setup for {dept.label} <span className="text-gray-400">▸</span>
        </summary>
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="flex items-center gap-2 py-2.5">
            <label className="flex-1 text-xs text-gray-500">Worker rate (₹ per hour, applies to this department)</label>
            <input type="number" min="0" value={dept.workerRate} onChange={(e) => updateWorkerRate(e.target.value)}
              className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm font-semibold" />
          </div>
          {dept.lines.map((ln) => (
            <div key={ln.id} className="grid grid-cols-[1fr_72px] gap-2 items-end py-2 border-t border-gray-100">
              <div className="text-xs text-gray-600 truncate">{ln.name}</div>
              <div>
                <label className="block text-[10px] uppercase text-gray-500 mb-0.5">₹/piece</label>
                <input type="number" min="0" step="0.5" value={ln.stdCost} onChange={(e) => updateLineField(ln.id, 'stdCost', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-1.5 py-1 text-xs" />
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* costing */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Day total &amp; costing — {dept.label}</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Tile label="Target so far" value={num(costing.target)} />
            <Tile label="Actual so far" value={num(costing.actual)} />
            <Tile label="Achievement" value={costing.achievement === null ? '—' : Math.round(costing.achievement) + '%'} />
            <Tile label="Manpower cost" value={money(costing.cost)} />
            <Tile label="₹ / piece" value={costing.perPiece === null ? '—' : money(costing.perPiece)} />
          </div>
          <div className={`rounded-lg px-3 py-3 mt-3 ${costing.pnl >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="text-xs uppercase text-gray-500">{dept.label} profit / loss so far</div>
            <div className={`text-2xl font-bold tabular-nums ${costing.pnl >= 0 ? 'text-green-700' : 'text-red-600'}`}>{money(costing.pnl)}</div>
          </div>
          <div className="text-xs text-gray-400 mt-3 leading-relaxed">
            Cost = manpower × hours × ₹/hr rate (shift + OT). Value of output = actual pieces × ₹/piece. P&amp;L = value of output − cost.
          </div>
          <button onClick={copyWhatsApp}
            className={`w-full mt-3 py-2.5 rounded-lg border text-sm font-medium ${copied ? 'bg-green-50 text-green-700 border-green-300' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            {copied ? '✓ Copied — paste into WhatsApp' : 'Copy day summary for WhatsApp'}
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 leading-relaxed">
        <b className="text-gray-700">Every line must be linked to a Work Order before any hour can be entered.</b> Once
        linked, each finished hour becomes a real Production Entry (visible in &quot;Today&apos;s entries&quot; above,
        confirmable from there) and that hour locks.
      </div>

      {mpPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900">Manpower changed</h3>
              <button onClick={() => resolveManpowerTransfer(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">
                <b>{mpPrompt.lineName}</b> · {mpPrompt.slotLabel}: manpower {mpPrompt.prevMp} → <b>{mpPrompt.newMp}</b>
                {' '}({mpPrompt.newMp > mpPrompt.prevMp ? '+' : ''}{mpPrompt.newMp - mpPrompt.prevMp})
              </p>
              <p className="text-sm text-gray-700">
                {mpPrompt.newMp > mpPrompt.prevMp
                  ? 'Yeh extra manpower kis line se aayi hai?'
                  : 'Yeh manpower kis line mein gayi hai?'}
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {mpPrompt.otherLines.map((l) => (
                  <button key={l.id} onClick={() => resolveManpowerTransfer(l.id)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-sm">
                    {l.name}
                  </button>
                ))}
                {mpPrompt.otherLines.length === 0 && <p className="text-xs text-gray-400">Is department mein koi doosri line nahi hai.</p>}
              </div>
            </div>
            <div className="p-5 border-t">
              <button onClick={() => resolveManpowerTransfer(null)} className="w-full py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
                Kisi line se transfer nahi — bas yahi number sahi hai
              </button>
            </div>
          </div>
        </div>
      )}

      {otModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900">Request Overtime — {otModal.lineName}</h3>
              <button onClick={() => setOtModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500">
                Goes to Plant Manager, then Management, for approval before it can be used in any hour&apos;s entry — see{' '}
                <a href="/my-approvals" className="text-blue-600 hover:underline">My Approvals</a> to track it.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 mb-1">Extra men</label>
                  <input type="number" min="1" value={otModal.requestedMenCount}
                    onChange={(e) => setOtModal((m) => ({ ...m, requestedMenCount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" autoFocus />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 mb-1">Extra hours</label>
                  <input type="number" min="0.5" step="0.5" value={otModal.requestedHours}
                    onChange={(e) => setOtModal((m) => ({ ...m, requestedHours: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-gray-500 mb-1">Reason</label>
                <textarea value={otModal.reason} rows={2} placeholder="e.g. Rush order from Havells, need extra hands this evening"
                  onChange={(e) => setOtModal((m) => ({ ...m, reason: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
              </div>
              {otSubmitError && <p className="text-xs text-red-600">{otSubmitError}</p>}
            </div>
            <div className="p-5 border-t">
              <button onClick={submitOtRequest} disabled={otSubmitting}
                className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm disabled:opacity-50">
                {otSubmitting ? 'Submitting…' : 'Submit for approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="text-[11px] uppercase text-gray-500">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-0.5 text-gray-900">{value}</div>
    </div>
  );
}

function fallbackCopy(text, done) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    done();
  } catch (e) {}
}
