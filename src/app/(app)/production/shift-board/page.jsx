'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

// Shift Board — a deliberately simple hourly production-entry tool.
// No time picker: the clock picks the current hour. One form per line,
// per hour. Day totals + costing update live underneath.
//
// Client-side only for now (localStorage) while Rahul iterates the UX
// directly in the real app. Nothing here touches ProductionEntry,
// WorkOrder, or any costing module — once the flow is settled this gets
// wired to real shared storage.

const STORAGE_KEY = 'shopfloor_shift_board_v1';
const DEPT_ORDER = ['ASSEMBLY', 'MI', 'SMT'];

function uid() { return 'l' + Math.random().toString(36).slice(2, 9); }
function hour12(h) { const ap = h >= 12 ? 'PM' : 'AM'; let h12 = h % 12; if (h12 === 0) h12 = 12; return h12 + ' ' + ap; }
function slotLabel(h) { return hour12(h) + ' – ' + hour12((h + 1) % 24); }
function slotKey(h) { return String(h).padStart(2, '0'); }
function fmtDateIN(iso) { if (!iso) return ''; const p = iso.split('-'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : iso; }
function money(n) { if (n === null || n === undefined || isNaN(n)) return '—'; const neg = n < 0; n = Math.abs(n); return (neg ? '−' : '') + '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function num(n) { return (n === null || n === undefined || isNaN(n)) ? '—' : Math.round(n).toLocaleString('en-IN'); }

// Example data loaded from Rahul's own 29-Oct board photos, so the maths
// can be checked against numbers he already knows.
function exampleState() {
  return {
    date: '2026-10-29',
    shift: 'Day Shift · 8:00 AM–5:30 PM',
    activeDept: 'ASSEMBLY',
    departments: {
      ASSEMBLY: {
        label: 'Assembly & Packing', workerRate: 60,
        lines: [
          { id: 'assy01', name: 'Assy-01 (2x2 Havells Assy)', manpower: 9, target: 140, stdCost: 12 },
          { id: 'pack01', name: 'Packing-01 (Gluing)', manpower: 3, target: 180, stdCost: 10 },
          { id: 'assy02', name: 'Assy-02 (Framing)', manpower: 1, target: 180, stdCost: 8 },
          { id: 'pack02', name: 'Packing-02 (Panel Packing)', manpower: 9, target: 140, stdCost: 12 },
        ],
        log: {
          '08': { assy01: { a: 140, r: 0 }, pack01: { a: 80, r: 1 }, assy02: { a: 180, r: 0 }, pack02: { a: 140, r: 0 } },
          '09': { assy01: { a: 140, r: 0 }, pack01: { a: 80, r: 0 }, assy02: { a: 180, r: 2 }, pack02: { a: 140, r: 1 } },
          '10': { assy01: { a: 140, r: 1 }, pack01: { a: 143, r: 0 }, assy02: { a: 180, r: 0 }, pack02: { a: 140, r: 0 } },
          '11': { assy01: { a: 140, r: 0 }, pack01: { a: 160, r: 1 }, assy02: { a: 180, r: 0 }, pack02: { a: 140, r: 0 } },
          '13': { assy01: { a: 140, r: 0 }, pack01: { a: 160, r: 0 }, assy02: { a: 180, r: 1 }, pack02: { a: 140, r: 0 } },
          '14': { assy01: { a: 72, r: 0 }, pack01: { a: 77, r: 0 }, assy02: { a: 80, r: 0 }, pack02: { a: 72, r: 0 } },
          '15': { assy01: { a: 140, r: 1 }, pack01: { a: 160, r: 0 }, assy02: { a: 180, r: 0 }, pack02: { a: 140, r: 0 } },
        },
      },
      MI: {
        label: 'MI', workerRate: 60,
        lines: [{ id: 'mi36w', name: '36W 2x2 Driver', manpower: 7, target: 322, stdCost: 6 }],
        log: {
          '08': { mi36w: { a: 210, r: 2 } }, '09': { mi36w: { a: 270, r: 3 } }, '10': { mi36w: { a: 300, r: 3 } },
          '11': { mi36w: { a: 280, r: 4 } }, '12': { mi36w: { a: 304, r: 8 } }, '14': { mi36w: { a: 300, r: 5 } },
        },
      },
      SMT: {
        label: 'SMT', workerRate: 60,
        lines: [{ id: 'smt9w', name: '9W Inv DOB Bulb (Rework)', manpower: 2, target: 0, stdCost: 4 }],
        log: { '10': { smt9w: { a: 120, r: 0 } }, '14': { smt9w: { a: 91, r: 0 } } },
      },
    },
  };
}

function lineTotals(dept, lineId) {
  let actual = 0, rej = 0, hours = 0;
  for (const k in dept.log) {
    const e = dept.log[k][lineId];
    if (e) { actual += (e.a || 0); rej += (e.r || 0); hours++; }
  }
  return { actual, rej, hours, good: actual - rej };
}

function deptCosting(dept) {
  let totalTarget = 0, totalActual = 0, totalRej = 0, totalCost = 0, totalValue = 0, totalManpower = 0;
  dept.lines.forEach((ln) => {
    const t = lineTotals(dept, ln.id);
    totalTarget += ln.target * t.hours;
    totalActual += t.actual;
    totalRej += t.rej;
    totalManpower += (ln.manpower || 0);
    totalCost += (ln.manpower || 0) * t.hours * (dept.workerRate || 0);
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

export default function ShiftBoardPage() {
  const [state, setState] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null); // null = this hour
  const [draft, setDraft] = useState({});
  const [now, setNow] = useState(() => new Date());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setState(raw ? JSON.parse(raw) : exampleState());
    } catch (e) { setState(exampleState()); }
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!state) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }, [state]);

  const dept = state ? state.departments[state.activeDept] : null;
  const currentHour = now.getHours();
  const activeHour = editingSlot !== null ? parseInt(editingSlot, 10) : currentHour;
  const activeKey = slotKey(activeHour);
  const isCurrent = editingSlot === null;

  // Reset the entry form whenever the department or the hour being edited changes.
  useEffect(() => {
    if (!dept) return;
    const next = {};
    dept.lines.forEach((ln) => {
      const existing = dept.log[activeKey] && dept.log[activeKey][ln.id];
      next[ln.id] = { a: existing ? String(existing.a) : '', r: existing ? String(existing.r) : '' };
    });
    setDraft(next);
  }, [state?.activeDept, activeKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const setDept = useCallback((k) => {
    setEditingSlot(null);
    setState((s) => ({ ...s, activeDept: k }));
  }, []);

  // Not wrapped in useCallback: it closes over `draft`, which the React
  // Compiler can't prove stays stable, so manual memoization here would be
  // silently dropped anyway (compiler auto-memoizes this component instead).
  function saveHour() {
    setState((s) => {
      const next = structuredClone(s);
      const d = next.departments[next.activeDept];
      const entry = d.log[activeKey] || {};
      d.lines.forEach((ln) => {
        const v = draft[ln.id] || {};
        entry[ln.id] = { a: v.a === '' || v.a === undefined ? 0 : parseInt(v.a, 10), r: v.r === '' || v.r === undefined ? 0 : parseInt(v.r, 10) };
      });
      d.log[activeKey] = entry;
      return next;
    });
    setEditingSlot(null);
  }

  const updateLine = useCallback((idx, field, value) => {
    setState((s) => {
      const next = structuredClone(s);
      const d = next.departments[next.activeDept];
      d.lines[idx][field] = field === 'name' ? value : (parseFloat(value) || 0);
      return next;
    });
  }, []);

  const removeLine = useCallback((idx) => {
    setState((s) => {
      const next = structuredClone(s);
      const d = next.departments[next.activeDept];
      const removed = d.lines.splice(idx, 1)[0];
      for (const k in d.log) delete d.log[k][removed.id];
      return next;
    });
  }, []);

  const addLine = useCallback(() => {
    setState((s) => {
      const next = structuredClone(s);
      next.departments[next.activeDept].lines.push({ id: uid(), name: 'New line', manpower: 1, target: 100, stdCost: 10 });
      return next;
    });
  }, []);

  const resetToday = useCallback(() => {
    setState((s) => {
      const next = structuredClone(s);
      next.departments[next.activeDept].log = {};
      return next;
    });
  }, []);

  const copyWhatsApp = useCallback(() => {
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
  }, [state]);

  if (!state || !dept) {
    return <AppLayout><div className="p-6 text-sm text-gray-500">Loading…</div></AppLayout>;
  }

  const keys = Object.keys(dept.log).sort();

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto pb-10">
        {/* top bar */}
        <div className="sticky top-0 z-10 bg-amber-500 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="font-semibold text-amber-950 text-lg leading-tight">Shift Board</div>
              <div className="text-[11px] text-amber-900/70">Oregenal Electricals · daily entry &amp; costing</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <input type="date" value={state.date} onChange={(e) => setState((s) => ({ ...s, date: e.target.value }))}
              className="text-xs font-semibold rounded px-2 py-1 bg-white/60 text-amber-950 border border-black/10" />
            <input type="text" value={state.shift} onChange={(e) => setState((s) => ({ ...s, shift: e.target.value }))}
              className="text-xs font-semibold rounded px-2 py-1 bg-white/60 text-amber-950 border border-black/10 flex-1 min-w-[160px]" />
          </div>
          <div className="flex gap-1.5 mt-2 overflow-x-auto">
            {DEPT_ORDER.map((k) => (
              <button key={k} onClick={() => setDept(k)}
                className={`flex-1 text-xs font-semibold rounded-md px-2 py-1.5 whitespace-nowrap border border-black/10 ${
                  k === state.activeDept ? 'bg-amber-950 text-amber-400' : 'bg-white/35 text-amber-950'
                }`}>
                {state.departments[k].label}
              </button>
            ))}
          </div>
        </div>

        {/* overview strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
          {[['Target today', num(allCosting.target)], ['Actual today', num(allCosting.actual)], ['Manpower', num(allCosting.manpower)], ['Day P&L', money(allCosting.pnl)]].map(([lbl, val]) => (
            <div key={lbl} className="flex-1 min-w-[100px] bg-white border border-gray-200 rounded-lg px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">{lbl}</div>
              <div className="text-xl font-bold tabular-nums">{val}</div>
            </div>
          ))}
        </div>

        {/* current hour card */}
        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-lg font-semibold">{isCurrent ? 'This hour' : 'Editing an hour'}</h2>
          </div>
          <div className={`bg-white border rounded-xl p-4 border-l-4 ${isCurrent ? 'border-l-amber-500' : 'border-l-gray-400'} border-gray-200`}>
            <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
              <div>
                <div className="text-2xl font-bold leading-tight">{slotLabel(activeHour)}</div>
                <div className="text-xs text-gray-500">{isCurrent ? 'Detected from the clock — no need to pick a time' : 'Correcting an earlier hour'}</div>
              </div>
              {!isCurrent && (
                <button onClick={() => setEditingSlot(null)} className="text-xs font-semibold text-amber-700">← back to this hour</button>
              )}
            </div>

            {dept.lines.map((ln, i) => (
              <div key={ln.id} className={`grid grid-cols-[1fr_72px_72px] gap-2 items-center py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{ln.name}</div>
                  <div className="text-[11px] text-gray-500">Manpower {ln.manpower} · target {ln.target}/hr</div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 mb-0.5">Actual</label>
                  <input type="number" inputMode="numeric" min="0" value={draft[ln.id]?.a ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [ln.id]: { ...d[ln.id], a: e.target.value } }))}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm font-semibold tabular-nums" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 mb-0.5">Reject</label>
                  <input type="number" inputMode="numeric" min="0" value={draft[ln.id]?.r ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [ln.id]: { ...d[ln.id], r: e.target.value } }))}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm font-semibold tabular-nums" />
                </div>
              </div>
            ))}

            <button onClick={saveHour} className="w-full mt-3 py-3 rounded-lg bg-amber-500 text-amber-950 font-bold text-sm">
              Save this hour
            </button>
            <div className="text-center text-xs text-gray-500 mt-2">Saves actual + rejection for every line shown, for {slotLabel(activeHour)}.</div>
          </div>
        </div>

        {/* lines & rates */}
        <details className="mb-5 bg-white border border-gray-200 rounded-xl">
          <summary className="list-none cursor-pointer px-4 py-3 font-semibold text-sm flex items-center justify-between">
            Lines &amp; rates for {dept.label} <span className="text-gray-400">▸</span>
          </summary>
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="flex items-center gap-2 py-2.5">
              <label className="flex-1 text-xs text-gray-500">Worker rate (₹ per hour, applies to this department)</label>
              <input type="number" min="0" value={dept.workerRate}
                onChange={(e) => setState((s) => { const n = structuredClone(s); n.departments[n.activeDept].workerRate = parseFloat(e.target.value) || 0; return n; })}
                className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm font-semibold" />
            </div>
            {dept.lines.map((ln, i) => (
              <div key={ln.id} className="grid grid-cols-[1fr_56px_56px_64px_28px] gap-1.5 items-end py-2 border-t border-gray-100">
                <div>
                  <label className="block text-[9px] uppercase text-gray-500 mb-0.5">Line name</label>
                  <input type="text" value={ln.name} onChange={(e) => updateLine(i, 'name', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-1.5 py-1 text-xs" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-gray-500 mb-0.5">MP</label>
                  <input type="number" min="0" value={ln.manpower} onChange={(e) => updateLine(i, 'manpower', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-1.5 py-1 text-xs" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-gray-500 mb-0.5">Target/hr</label>
                  <input type="number" min="0" value={ln.target} onChange={(e) => updateLine(i, 'target', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-1.5 py-1 text-xs" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-gray-500 mb-0.5">₹/piece</label>
                  <input type="number" min="0" step="0.5" value={ln.stdCost} onChange={(e) => updateLine(i, 'stdCost', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-1.5 py-1 text-xs" />
                </div>
                <button onClick={() => removeLine(i)} title="Remove line" className="h-[30px] rounded-md bg-red-50 text-red-600 text-sm">✕</button>
              </div>
            ))}
            <button onClick={addLine} className="w-full mt-2.5 py-2 rounded-md border border-dashed border-gray-300 text-xs font-semibold text-gray-500">
              + Add a line
            </button>
            <button onClick={resetToday} className="w-full mt-2 py-1.5 text-xs font-semibold text-red-600">
              Clear today&apos;s entries for {dept.label}
            </button>
          </div>
        </details>

        {/* today's log */}
        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-lg font-semibold">Today&apos;s hours</h2>
            <span className="text-xs text-gray-500">Tap a row to correct it</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            {keys.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">No hours entered yet today — fill in &ldquo;This hour&rdquo; above to start.</div>
            ) : (
              <table className="w-full min-w-[360px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-[10px] uppercase text-gray-500 px-3 py-2">Hour</th>
                    {dept.lines.map((ln) => (
                      <th key={ln.id} className="text-right text-[10px] uppercase text-gray-500 px-3 py-2">{ln.name.split(' ')[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k} onClick={() => { setEditingSlot(k); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${k === slotKey(currentHour) ? 'bg-emerald-50' : ''}`}>
                      <td className="px-3 py-2 text-sm">{slotLabel(parseInt(k, 10))}</td>
                      {dept.lines.map((ln) => {
                        const e = dept.log[k][ln.id];
                        return (
                          <td key={ln.id} className="px-3 py-2 text-sm text-right tabular-nums">
                            {e ? <>{e.a}{e.r ? <span className="text-red-500"> −{e.r}</span> : null}</> : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* costing */}
        <div className="mb-5">
          <h2 className="text-lg font-semibold mb-2">Day total &amp; costing</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-2.5">
              <Tile label="Target so far" value={num(costing.target)} />
              <Tile label="Actual so far" value={num(costing.actual)} />
              <Tile label="Good pieces" value={num(costing.good)} />
              <Tile label="Achievement" value={costing.achievement === null ? '—' : Math.round(costing.achievement) + '%'} />
              <Tile label="Manpower cost" value={money(costing.cost)} />
              <Tile label="₹ / piece" value={costing.perPiece === null ? '—' : money(costing.perPiece)} />
              <div className={`col-span-2 rounded-lg px-3 py-2.5 bg-gray-50 ${costing.pnl >= 0 ? '' : ''}`}>
                <div className="text-[11px] uppercase text-gray-500">{dept.label} profit / loss so far</div>
                <div className={`text-2xl font-bold tabular-nums ${costing.pnl >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{money(costing.pnl)}</div>
              </div>
            </div>
            <div className="text-[11px] text-gray-400 mt-3 leading-relaxed">
              Cost = manpower × hours entered × ₹/hr rate. Value of output = good pieces × ₹/piece. P&amp;L = value of output − cost.
            </div>
            <button onClick={copyWhatsApp}
              className={`w-full mt-3 py-3 rounded-lg border text-sm font-semibold ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
              {copied ? '✓ Copied — paste into WhatsApp' : '📋 Copy day summary for WhatsApp'}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-500 leading-relaxed">
          <b className="text-gray-700">This is still a working draft, not yet connected to the database.</b> It saves only in this browser for now, so other people on other phones won&apos;t see these entries yet. Keep changing it and telling Claude what to fix — once the flow is right, it gets wired to real shared storage.
        </div>
      </div>
    </AppLayout>
  );
}

function Tile({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="text-[11px] uppercase text-gray-500">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-0.5">{value}</div>
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
