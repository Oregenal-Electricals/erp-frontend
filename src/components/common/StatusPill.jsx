'use client';

// Generic status pill for cross-module tables (the dashboard's drill-down
// panels show rows from many different modules, each with its own status
// vocabulary). Classifies by keyword instead of a per-module map so one
// component covers all of them consistently; a module's own page keeps its
// own precise STATUS_COLORS map for its primary list view.
const RULES = [
  { test: /CANCEL|REJECT|CRITICAL|OVERDUE|FAIL|HOLD/, cls: 'bg-rose-100 text-rose-700' },
  { test: /ESCALAT|LOW.?STOCK/, cls: 'bg-orange-100 text-orange-700' },
  { test: /PENDING|DRAFT|OPEN|SUBMIT|NEW/, cls: 'bg-amber-100 text-amber-700' },
  { test: /PROGRESS|PARTIAL|SENT|ACKNOWLEDG|REVIEW/, cls: 'bg-blue-100 text-blue-700' },
  { test: /APPROV|ACTIVE|CLOSED|COMPLET|RECEIVED|GOOD|PASS|CONFIRM/, cls: 'bg-emerald-100 text-emerald-700' },
];

export default function StatusPill({ value }) {
  if (!value) return <span className="text-gray-400">—</span>;
  const v = String(value).toUpperCase();
  const match = RULES.find((r) => r.test.test(v));
  const cls = match?.cls || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>
      {String(value).replace(/_/g, ' ')}
    </span>
  );
}
