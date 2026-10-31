'use client';
import { useState, useEffect, useMemo } from 'react';

// Shift Board — hourly production entry + live costing, one slot table per
// line for the whole shift (Slot / MP / Target / Actual / Reject / Eff%).
// Lives inside the Production Recording page (below the work-order entry
// list) rather than its own tab — Rahul's call: having two separate places
// to log production numbers was duplication, so this is now the one place.
//
// Client-side only for now (localStorage) while the UX is still being
// iterated. Nothing here touches ProductionEntry, WorkOrder, or any
// costing module yet — wiring this to the real backend is a deliberate
// next step, not done silently, since it needs a real design decision
// about how a "line" here maps to a Work Order.

const STORAGE_KEY = 'shopfloor_shift_board_v2';
const DEPT_ORDER = ['ASSEMBLY', 'MI', 'SMT'];

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

function freshSlots(manpower, target) {
  const slots = {};
  SHIFT_SLOTS.forEach((s) => { slots[s.key] = { mp: manpower, target: Math.round(target * s.dur), a: 0, r: 0 }; });
  return slots;
}

function newLine(name = 'New line') {
  return { id: uid(), name, manpower: 1, target: 100, stdCost: 10, closed: false, slots: freshSlots(1, 100), ot: { hours: 0, manpower: 0, target: 0, actual: 0 }, remarks: '' };
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
          { id: 'assy01', name: 'Assy-01 (2x2 Havells Assy)', manpower: 9, target: 140, stdCost: 12, closed: false, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
            slots: withSlots(9, 140, { '08': [140, 0], '09': [140, 0], '10': [140, 1], '11': [140, 0], '13': [140, 0], '14': [72, 0], '15': [140, 1] }) },
          { id: 'pack01', name: 'Packing-01 (Gluing)', manpower: 3, target: 180, stdCost: 10, closed: false, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
            slots: withSlots(3, 180, { '08': [80, 1], '09': [80, 0], '10': [143, 0], '11': [160, 1], '13': [160, 0], '14': [77, 0], '15': [160, 0] }) },
          { id: 'assy02', name: 'Assy-02 (Framing)', manpower: 1, target: 180, stdCost: 8, closed: false, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
            slots: withSlots(1, 180, { '08': [180, 0], '09': [180, 2], '10': [180, 0], '11': [180, 0], '13': [180, 1], '14': [80, 0], '15': [180, 0] }) },
          { id: 'pack02', name: 'Packing-02 (Panel Packing)', manpower: 9, target: 140, stdCost: 12, closed: false, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
            slots: withSlots(9, 140, { '08': [140, 0], '09': [140, 1], '10': [140, 0], '11': [140, 0], '13': [140, 0], '14': [72, 0], '15': [140, 0] }) },
        ],
      },
      MI: {
        label: 'MI', workerRate: 60,
        lines: [
          { id: 'mi36w', name: '36W 2x2 Driver', manpower: 7, target: 322, stdCost: 6, closed: false, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
            slots: withSlots(7, 322, { '08': [210, 2], '09': [270, 3], '10': [300, 3], '11': [280, 4], '12': [304, 8], '14': [300, 5] }) },
        ],
      },
      SMT: {
        label: 'SMT', workerRate: 60,
        lines: [
          { id: 'smt9w', name: '9W Inv DOB Bulb (Rework)', manpower: 2, target: 0, stdCost: 4, closed: false, remarks: '', ot: { hours: 0, manpower: 0, target: 0, actual: 0 },
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

export default function ShiftBoardSection() {
  const [state, setState] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const dept = state ? state.departments[state.activeDept] : null;

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
      SHIFT_SLOTS.forEach((s) => { ln.slots[s.key].mp = mp; });
    });
  }

  // Same pattern as Base Manpower: type freely, fan out to the slot targets
  // only on blur.
  function updateLineTargetInput(lineId, value) {
    withLine(lineId, (ln) => { ln.target = parseNumOrBlank(value); });
  }
  function applyLineTarget(lineId) {
    withLine(lineId, (ln) => {
      const t = ln.target === '' ? 0 : ln.target;
      ln.target = t;
      SHIFT_SLOTS.forEach((s) => { ln.slots[s.key].target = Math.round(t * s.dur); });
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
          return (
            <div key={ln.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-[160px]">
                  <input value={ln.name} onChange={(e) => updateLineField(ln.id, 'name', e.target.value)}
                    className="font-semibold text-gray-900 text-base border-0 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 -mx-1 w-full" />
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
                <table className="w-full min-w-[480px] table-fixed border-collapse text-sm">
                  <colgroup>
                    <col />
                    <col className="w-[76px]" />
                    <col className="w-[76px]" />
                    <col className="w-[76px]" />
                    <col className="w-[76px]" />
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
                    </tr>
                  </thead>
                  <tbody>
                    {SHIFT_SLOTS.map((s) => {
                      const row = ln.slots[s.key];
                      const eff = row.target > 0 ? Math.round((row.a / row.target) * 100) : null;
                      return (
                        <tr key={s.key} className="border-b border-gray-50">
                          <td className="py-1.5 pr-2 text-gray-700 whitespace-nowrap">{s.label}</td>
                          <td className="py-1.5 px-2">
                            <input type="number" min="0" disabled={ln.closed} value={row.mp}
                              onChange={(e) => updateSlotField(ln.id, s.key, 'mp', e.target.value)}
                              className="w-full text-right border border-gray-200 rounded px-1.5 py-1 tabular-nums disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" min="0" disabled={ln.closed} value={row.target}
                              onChange={(e) => updateSlotField(ln.id, s.key, 'target', e.target.value)}
                              className="w-full text-right border border-gray-200 rounded px-1.5 py-1 tabular-nums disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" min="0" disabled={ln.closed} value={row.a}
                              onChange={(e) => updateSlotField(ln.id, s.key, 'a', e.target.value)}
                              className="w-full text-right border border-gray-300 rounded px-1.5 py-1 font-semibold tabular-nums disabled:bg-gray-50 disabled:text-gray-400 disabled:font-normal" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" min="0" disabled={ln.closed} value={row.r}
                              onChange={(e) => updateSlotField(ln.id, s.key, 'r', e.target.value)}
                              className="w-full text-right border border-gray-300 rounded px-1.5 py-1 font-semibold tabular-nums disabled:bg-gray-50 disabled:text-gray-400 disabled:font-normal" />
                          </td>
                          <td className="py-1.5 pl-2 text-right tabular-nums text-gray-600">{eff === null ? '—' : `${eff}%`}</td>
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
                  {ln.closed ? 'Reopen Entry' : 'Save Entry'}
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
                <input type="number" min="0" value={ln.target}
                  onChange={(e) => updateLineTargetInput(ln.id, e.target.value)}
                  onBlur={() => applyLineTarget(ln.id)}
                  className="w-full border border-gray-300 rounded-md px-1.5 py-1 text-xs" />
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
        <b className="text-gray-700">This is still a working draft, not yet connected to the database.</b> It saves only in this browser for now, so other people on other phones won&apos;t see these entries yet. Keep changing it and telling Claude what to fix — once the flow is right, it gets wired to real shared storage.
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
