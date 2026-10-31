'use client';
import { useState, useEffect, useMemo } from 'react';

// Shift Board — hourly production entry + live costing, one slot table per
// line for the whole shift (Slot / MP / Target / Actual / Reject / Eff%).
// Lives inside the Production Recording page rather than its own tab, and
// is this page's ONLY input surface now — Rahul's call: a separate "+
// Record Production" form duplicated this. The old generic entries
// list/search/stats block on this page is gone too (2026-10-31): it looked
// like a second, disconnected entry system sitting above this one, so this
// component now carries its own small "Today's entries" ledger + Confirm
// action (see the section right below the date/shift header) instead of
// relying on anything above it on the page.
//
// Backend wiring (Rahul's decisions):
// - A line stays local-only (localStorage, fully editable) until a real,
//   IN_PROGRESS Work Order is linked to it from the dropdown in its header.
// - Once linked, each hour's slot is saved to the backend the moment that
//   hour is filled in and the operator clicks "Save" on that row — not
//   batched at line-close. That POST becomes one real ProductionEntry
//   against the linked Work Order (same model/API the old "+ Record
//   Production" modal used), so it shows up in this component's own
//   "Today's entries" ledger and goes through the same Confirm step.
// - A saved hour locks (MP/Actual/Reject become read-only) because the
//   backend's own duplicate-period rule rejects re-saving the same hour for
//   the same Work Order — this mirrors a real shift, where an hour that has
//   already passed can't be re-lived, not a UI limitation added for its own
//   sake.
// - Entries stay DRAFT after saving — a person reviews and clicks Confirm
//   (below) before it affects the Work Order's completed/rejected
//   quantities.
// - Target, once linked, is the backend's own number (computed from the
//   product's standard productivity × manpower × hour length) rather than
//   the manually-typed figure — so a line-level entry can't inflate its own
//   efficiency, per the standing rule that only higher management sets
//   targets.

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STORAGE_KEY = 'shopfloor_shift_board_v2';
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

function freshSlots(manpower, target) {
  const slots = {};
  SHIFT_SLOTS.forEach((s) => { slots[s.key] = { mp: manpower, target: Math.round(target * s.dur), a: 0, r: 0, sync: null }; });
  return slots;
}

function newLine(name = 'New line') {
  return { id: uid(), name, manpower: 1, target: 100, stdCost: 10, closed: false, workOrderId: null, slots: freshSlots(1, 100), ot: { hours: 0, manpower: 0, target: 0, actual: 0 }, remarks: '' };
}

// Example data ported from Rahul's own 29-Oct board photos, so the maths
// can be checked against numbers he already knows.
function exampleState() {
  const withSlots = (manpower, target, actuals) => {
    const slots = freshSlots(manpower, target);
    Object.entries(actuals).forEach(([k, [a, r]]) => { if (slots[k]) { slots[k].a = a; slots[k].r = r; } });
    return slots;
  };
  return {
    date: '2026-10-29',
    shift: 'Day Shift · 8:00 AM–5:30 PM',
    activeDept: 'ASSEMBLY',
    departments: {
      ASSEMBLY: {
        label: 'Assembly & Packing', workerRate: 60,
        lines: [
          { id: 'assy01', name: 'Assy-01 (2x2 Havells Assy)', manpower: 9, target: 140, stdCost: 12, closed: false, workOrderId: null, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
            slots: withSlots(9, 140, { '08': [140, 0], '09': [140, 0], '10': [140, 1], '11': [140, 0], '13': [140, 0], '14': [72, 0], '15': [140, 1] }) },
          { id: 'pack01', name: 'Packing-01 (Gluing)', manpower: 3, target: 180, stdCost: 10, closed: false, workOrderId: null, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
            slots: withSlots(3, 180, { '08': [80, 1], '09': [80, 0], '10': [143, 0], '11': [160, 1], '13': [160, 0], '14': [77, 0], '15': [160, 0] }) },
          { id: 'assy02', name: 'Assy-02 (Framing)', manpower: 1, target: 180, stdCost: 8, closed: false, workOrderId: null, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
            slots: withSlots(1, 180, { '08': [180, 0], '09': [180, 2], '10': [180, 0], '11': [180, 0], '13': [180, 1], '14': [80, 0], '15': [180, 0] }) },
          { id: 'pack02', name: 'Packing-02 (Panel Packing)', manpower: 9, target: 140, stdCost: 12, closed: false, workOrderId: null, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
            slots: withSlots(9, 140, { '08': [140, 0], '09': [140, 1], '10': [140, 0], '11': [140, 0], '13': [140, 0], '14': [72, 0], '15': [140, 0] }) },
        ],
      },
      MI: {
        label: 'MI', workerRate: 60,
        lines: [
          { id: 'mi36w', name: '36W 2x2 Driver', manpower: 7, target: 322, stdCost: 6, closed: false, workOrderId: null, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
            slots: withSlots(7, 322, { '08': [210, 2], '09': [270, 3], '10': [300, 3], '11': [280, 4], '12': [304, 8], '14': [300, 5] }) },
        ],
      },
      SMT: {
        label: 'SMT', workerRate: 60,
        lines: [
          { id: 'smt9w', name: '9W Inv DOB Bulb (Rework)', manpower: 2, target: 0, stdCost: 4, closed: false, workOrderId: null, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
            slots: withSlots(2, 0, { '10': [120, 0], '14': [91, 0] }) },
        ],
      },
    },
  };
}

function lineSlotTotals(line, workerRate) {
  let target = 0, actual = 0, rej = 0, cost = 0;
  SHIFT_SLOTS.forEach((s) => {
    const row = line.slots[s.key];
    if (!row) return;
    target += row.target || 0;
    actual += row.a || 0;
    rej += row.r || 0;
    cost += (row.mp || 0) * s.dur * (workerRate || 0);
  });
  cost += (line.ot?.manpower || 0) * (line.ot?.hours || 0) * (workerRate || 0);
  target += line.ot?.target || 0;
  actual += line.ot?.actual || 0;
  return { target, actual, rej, good: actual - rej, cost };
}

function deptCosting(dept) {
  let totalTarget = 0, totalActual = 0, totalRej = 0, totalCost = 0, totalValue = 0, totalManpower = 0;
  dept.lines.forEach((ln) => {
    const t = lineSlotTotals(ln, dept.workerRate);
    totalTarget += t.target;
    totalActual += t.actual;
    totalRej += t.rej;
    totalManpower += (ln.manpower || 0);
    totalCost += t.cost;
    totalValue += t.good * (ln.stdCost || 0);
  });
  const good = totalActual - totalRej;
  return {
    target: totalTarget, actual: totalActual, rej: totalRej, good,
    manpower: totalManpower, cost: totalCost, value: totalValue, pnl: totalValue - totalCost,
    perPiece: good > 0 ? totalCost / good : null,
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
  // this dropdown ever needs to offer.
  useEffect(() => {
    if (!getToken()) return;
    fetch(`${API}/work-orders?status=IN_PROGRESS&limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => setWorkOrders(Array.isArray(d) ? d : (d.data || [])))
      .catch(() => setWoLoadError('Active Work Orders could not be loaded — lines can stay local-only for now.'));
  }, []);

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

  async function handleConfirm(id) {
    setConfirmingId(id);
    try {
      const res = await fetch(`${API}/production-entries/${id}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Confirm failed');
      await fetchTodaysEntries(state.date);
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
    withLine(lineId, (ln) => { ln.slots[slotKey][field] = parseNumOrBlank(value); });
  }

  // Base Manpower only updates its own field while typing — pushing it to
  // all 10 slot rows on every keystroke would blank the whole table each
  // time the field passes through empty. It fans out to every slot's MP
  // only once, on blur (applyBaseManpower), when the number is final.
  function updateBaseManpowerInput(lineId, value) {
    withLine(lineId, (ln) => { ln.manpower = parseNumOrBlank(value); });
  }
  function applyBaseManpower(lineId) {
    withLine(lineId, (ln) => {
      const mp = ln.manpower === '' ? 0 : ln.manpower;
      ln.manpower = mp;
      SHIFT_SLOTS.forEach((s) => { if (ln.slots[s.key].sync?.status !== 'saved') ln.slots[s.key].mp = mp; });
    });
  }

  // Same pattern as Base Manpower: type freely, fan out to the slot targets
  // only on blur. Only touches lines with no linked Work Order — a linked
  // line's target comes from the backend instead (see saveSlot).
  function updateLineTargetInput(lineId, value) {
    withLine(lineId, (ln) => { ln.target = parseNumOrBlank(value); });
  }
  function applyLineTarget(lineId) {
    withLine(lineId, (ln) => {
      const t = ln.target === '' ? 0 : ln.target;
      ln.target = t;
      if (!ln.workOrderId) SHIFT_SLOTS.forEach((s) => { ln.slots[s.key].target = Math.round(t * s.dur); });
    });
  }

  function updateLineField(lineId, field, value) {
    withLine(lineId, (ln) => { ln[field] = field === 'name' || field === 'remarks' ? value : parseNumOrBlank(value); });
  }

  function updateOt(lineId, field, value) {
    withLine(lineId, (ln) => { ln.ot[field] = parseNumOrBlank(value); });
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
  // saved against it (anySaved, computed at the call site) — switching WOs
  // mid-day would leave earlier hours pointing at one WO and later hours at
  // another, which is not something to allow silently.
  function setLineWorkOrder(lineId, woId) {
    withLine(lineId, (ln) => { ln.workOrderId = woId || null; });
  }

  // Pushes one hour's slot to the real backend as a ProductionEntry against
  // the line's linked Work Order. Locks that slot on success (the backend's
  // own duplicate-period rule would reject a second save of the same hour
  // anyway) and surfaces the backend's error message on failure so a
  // genuine validation problem (future hour, WO not actually in progress,
  // overlapping period) is never swallowed.
  async function saveSlot(ln, slotDef, dateStr) {
    const row = ln.slots[slotDef.key];
    if (!ln.workOrderId || row.a === '' || row.a === null) return;
    withLine(ln.id, (l) => { l.slots[slotDef.key].sync = { status: 'saving' }; });
    try {
      const { periodStart, periodEnd } = slotPeriodIso(dateStr, slotDef);
      const actual = row.a === '' ? 0 : Number(row.a);
      const reject = row.r === '' ? 0 : Number(row.r);
      const manpowerQty = row.mp === '' ? 0 : Number(row.mp);
      const res = await fetch(`${API}/production-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          workOrderId: ln.workOrderId,
          entryDate: dateStr,
          shift: BACKEND_SHIFT_LABEL,
          goodQty: Math.max(0, actual - reject),
          scrapQty: reject,
          manpowerQty,
          periodStart, periodEnd,
          remarks: `Shift Board — ${ln.name} — ${slotDef.label}`,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || `Save failed (${res.status})`);
      withLine(ln.id, (l) => {
        const r = l.slots[slotDef.key];
        r.sync = { status: 'saved', entryId: body.id, entryNumber: body.entryNumber, achievementPercent: body.achievementPercent };
        if (body.targetQty != null) r.target = Math.round(body.targetQty);
      });
      fetchTodaysEntries(dateStr);
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
      lines.push(`Target: ${num(c.target)}  Actual: ${num(c.actual)}  Rej: ${num(c.rej)}`);
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
          <p className="text-gray-500 text-sm mt-1">Hourly production entry &amp; costing, line by line</p>
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
          gets saved (see saveSlot); an all-local-only day shows nothing
          here, same as before this board existed. */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Today&apos;s entries</div>
            <div className="text-xs text-gray-500 mt-0.5">Saved from the slot tables below — confirm here once reviewed</div>
          </div>
          <span className="text-xs text-gray-400">{todaysEntries.length} for {fmtDateIN(state.date)}</span>
        </div>
        {entriesLoadError && (
          <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-200">{entriesLoadError}</div>
        )}
        {todaysEntries.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            No Work Order-linked entries saved yet today — link a line below and save an hour to see it here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase">
                <tr>{['Entry No.', 'Work Order', 'Good', 'Scrap', 'Achv.', 'Status', ''].map((h) => (
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
                    <td className="px-3 py-2 text-xs font-bold text-red-500">{e.scrapQty}</td>
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
          const anySaved = SHIFT_SLOTS.some((s) => ln.slots[s.key]?.sync?.status === 'saved');
          return (
            <div key={ln.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-[160px]">
                  <input value={ln.name} onChange={(e) => updateLineField(ln.id, 'name', e.target.value)}
                    className="font-semibold text-gray-900 text-base border-0 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 -mx-1 w-full" />
                  <div className="mt-1.5 flex items-center gap-2">
                    <select value={ln.workOrderId || ''} disabled={ln.closed || anySaved}
                      onChange={(e) => setLineWorkOrder(ln.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-600 max-w-[280px] disabled:bg-gray-50 disabled:text-gray-400">
                      <option value="">— Local only (not linked to a Work Order) —</option>
                      {deptWorkOrders.map((w) => (
                        <option key={w.id} value={w.id}>{w.woNumber} · {w.productName}</option>
                      ))}
                    </select>
                    {ln.workOrderId && (
                      <span className="text-[10px] text-green-600 font-medium whitespace-nowrap">
                        ● linked{anySaved ? ' · locked' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Day Target</div>
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
                <input type="number" min="0" disabled={ln.closed} value={ln.manpower}
                  onChange={(e) => updateBaseManpowerInput(ln.id, e.target.value)}
                  onBlur={() => applyBaseManpower(ln.id)}
                  className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm font-semibold disabled:bg-gray-50 disabled:text-gray-400" />
              </div>

              <div className="overflow-x-auto px-4 pb-2">
                <table className="w-full min-w-[560px] table-fixed border-collapse text-sm">
                  <colgroup>
                    <col />
                    <col className="w-[72px]" />
                    <col className="w-[72px]" />
                    <col className="w-[72px]" />
                    <col className="w-[72px]" />
                    <col className="w-[56px]" />
                    <col className="w-[64px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-[11px] uppercase text-gray-500 font-medium py-2 pr-2">Slot</th>
                      <th className="text-right text-[11px] uppercase text-gray-500 font-medium py-2 px-2">MP</th>
                      <th className="text-right text-[11px] uppercase text-gray-500 font-medium py-2 px-2">Target</th>
                      <th className="text-right text-[11px] uppercase text-gray-500 font-medium py-2 px-2">Actual</th>
                      <th className="text-right text-[11px] uppercase text-gray-500 font-medium py-2 px-2">Reject</th>
                      <th className="text-right text-[11px] uppercase text-gray-500 font-medium py-2 pl-2">Eff%</th>
                      <th className="text-center text-[11px] uppercase text-gray-500 font-medium py-2 pl-2">Backend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHIFT_SLOTS.map((s) => {
                      const row = ln.slots[s.key];
                      const eff = row.target > 0 ? Math.round((row.a / row.target) * 100) : null;
                      const saved = row.sync?.status === 'saved';
                      const rowLocked = ln.closed || saved;
                      const badReject = row.r !== '' && row.r !== null && row.a !== '' && row.a !== null && Number(row.r) > Number(row.a);
                      return (
                        <tr key={s.key} className="border-b border-gray-50">
                          <td className="py-1.5 pr-2 text-gray-700 whitespace-nowrap">{s.label}</td>
                          <td className="py-1.5 px-2">
                            <input type="number" min="0" disabled={rowLocked} value={row.mp}
                              onChange={(e) => updateSlotField(ln.id, s.key, 'mp', e.target.value)}
                              className="w-full text-right border border-gray-200 rounded px-1.5 py-1 tabular-nums disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" min="0" disabled={rowLocked || !!ln.workOrderId} value={row.target}
                              title={ln.workOrderId ? 'Computed by the backend from the product\'s standard productivity once this hour is saved' : undefined}
                              onChange={(e) => updateSlotField(ln.id, s.key, 'target', e.target.value)}
                              className="w-full text-right border border-gray-200 rounded px-1.5 py-1 tabular-nums disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" min="0" disabled={rowLocked} value={row.a}
                              onChange={(e) => updateSlotField(ln.id, s.key, 'a', e.target.value)}
                              className="w-full text-right border border-gray-300 rounded px-1.5 py-1 font-semibold tabular-nums disabled:bg-gray-50 disabled:text-gray-400 disabled:font-normal" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" min="0" disabled={rowLocked} value={row.r}
                              onChange={(e) => updateSlotField(ln.id, s.key, 'r', e.target.value)}
                              className={`w-full text-right border rounded px-1.5 py-1 font-semibold tabular-nums disabled:bg-gray-50 disabled:text-gray-400 disabled:font-normal ${badReject ? 'border-red-400' : 'border-gray-300'}`} />
                          </td>
                          <td className="py-1.5 pl-2 text-right tabular-nums text-gray-600">{eff === null ? '—' : `${eff}%`}</td>
                          <td className="py-1.5 pl-2 text-center">
                            {!ln.workOrderId ? (
                              <span className="text-[10px] text-gray-400">Local</span>
                            ) : saved ? (
                              <span className="text-[10px] text-green-600 font-medium"
                                title={`${row.sync.entryNumber}${row.sync.achievementPercent != null ? ` · ${Math.round(row.sync.achievementPercent)}%` : ''}`}>
                                ✓ Saved
                              </span>
                            ) : row.sync?.status === 'saving' ? (
                              <span className="text-[10px] text-gray-400">Saving…</span>
                            ) : row.sync?.status === 'error' ? (
                              <button title={row.sync.error} onClick={() => saveSlot(ln, s, state.date)}
                                className="text-[10px] text-red-600 underline">Retry</button>
                            ) : (
                              <button
                                disabled={ln.closed || row.a === '' || row.a === null || badReject}
                                title={badReject ? 'Reject can\'t be more than Actual' : undefined}
                                onClick={() => saveSlot(ln, s, state.date)}
                                className="text-[10px] text-blue-600 underline disabled:text-gray-300 disabled:no-underline">
                                Save
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="py-2 pr-2 text-gray-700">TOTAL</td>
                      <td className="py-2 px-2 text-right text-gray-400">—</td>
                      <td className="py-2 px-2 text-right tabular-nums">{num(t.target)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{num(t.actual)}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-red-600">{num(t.rej)}</td>
                      <td className="py-2 pl-2 text-right tabular-nums">{t.target > 0 ? `${Math.round((t.actual / t.target) * 100)}%` : '—'}</td>
                      <td className="py-2 pl-2 text-center text-gray-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="px-4 pb-4">
                <div className="text-xs font-semibold text-gray-700 mb-2">Overtime (if any)</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {[['hours', 'OT hours'], ['manpower', 'OT manpower'], ['target', 'OT target'], ['actual', 'OT actual']].map(([f, lbl]) => (
                    <div key={f}>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">{lbl}</label>
                      <input type="number" min="0" disabled={ln.closed} value={ln.ot[f]}
                        onChange={(e) => updateOt(ln.id, f, e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm tabular-nums disabled:bg-gray-50 disabled:text-gray-400" />
                    </div>
                  ))}
                </div>
                <label className="block text-[10px] uppercase text-gray-500 mb-1">Remarks</label>
                <textarea value={ln.remarks} disabled={ln.closed} placeholder="Optional…"
                  onChange={(e) => updateLineField(ln.id, 'remarks', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-400" rows={2} />
              </div>

              <div className="px-4 pb-4">
                <button onClick={() => toggleClosed(ln.id)}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm">
                  {ln.closed ? 'Reopen line' : 'Close line for the day'}
                </button>
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
            <div key={ln.id} className="grid grid-cols-[1fr_72px_72px] gap-2 items-end py-2 border-t border-gray-100">
              <div className="text-xs text-gray-600 truncate">{ln.name}</div>
              <div>
                <label className="block text-[10px] uppercase text-gray-500 mb-0.5">Target/hr</label>
                <input type="number" min="0" value={ln.target} disabled={!!ln.workOrderId}
                  title={ln.workOrderId ? 'Linked lines get their target from the backend instead' : undefined}
                  onChange={(e) => updateLineTargetInput(ln.id, e.target.value)}
                  onBlur={() => applyLineTarget(ln.id)}
                  className="w-full border border-gray-300 rounded-md px-1.5 py-1 text-xs disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
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
            <Tile label="Good pieces" value={num(costing.good)} />
            <Tile label="Achievement" value={costing.achievement === null ? '—' : Math.round(costing.achievement) + '%'} />
            <Tile label="Manpower cost" value={money(costing.cost)} />
            <Tile label="₹ / piece" value={costing.perPiece === null ? '—' : money(costing.perPiece)} />
          </div>
          <div className={`rounded-lg px-3 py-3 mt-3 ${costing.pnl >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="text-xs uppercase text-gray-500">{dept.label} profit / loss so far</div>
            <div className={`text-2xl font-bold tabular-nums ${costing.pnl >= 0 ? 'text-green-700' : 'text-red-600'}`}>{money(costing.pnl)}</div>
          </div>
          <div className="text-xs text-gray-400 mt-3 leading-relaxed">
            Cost = manpower × hours × ₹/hr rate (shift + OT). Value of output = good pieces × ₹/piece. P&amp;L = value of output − cost.
          </div>
          <button onClick={copyWhatsApp}
            className={`w-full mt-3 py-2.5 rounded-lg border text-sm font-medium ${copied ? 'bg-green-50 text-green-700 border-green-300' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            {copied ? '✓ Copied — paste into WhatsApp' : 'Copy day summary for WhatsApp'}
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 leading-relaxed">
        <b className="text-gray-700">Local-only lines stay in this browser until linked.</b> Link a line to a Work Order above
        and each hour you save becomes a real Production Entry (visible in the table above, confirmable from there) — that
        hour then locks, same as a real shift hour that has already passed. An unlinked line keeps working exactly as before,
        saved only on this device.
      </div>
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
