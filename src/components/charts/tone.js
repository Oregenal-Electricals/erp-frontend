// Shared status-tone palette for dashboard mini-charts.
// Every dashboard breakdown is a STATE breakdown (draft/approved, open/critical,
// pending/overdue, ...), so charts are colored by status meaning, not by an
// arbitrary per-series hue. Reuse these tones everywhere a widget chart needs
// color instead of inventing a new ramp per widget.
//
// good      -> on track / approved / active / completed
// info      -> in progress / acknowledged / informational
// warning   -> pending / needs attention, but not yet late
// critical  -> overdue / rejected / critical severity
// neutral   -> draft / inactive / not yet meaningful

export const TONE = {
  good: { bar: 'bg-emerald-500', text: 'text-emerald-700' },
  info: { bar: 'bg-blue-500', text: 'text-blue-700' },
  warning: { bar: 'bg-amber-500', text: 'text-amber-700' },
  critical: { bar: 'bg-rose-500', text: 'text-rose-700' },
  neutral: { bar: 'bg-slate-300', text: 'text-slate-600' },
};

export const TONE_HEX = {
  good: '#10b981',
  info: '#3b82f6',
  warning: '#f59e0b',
  critical: '#f43f5e',
  neutral: '#cbd5e1',
};
