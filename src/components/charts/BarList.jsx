'use client';
import { TONE } from './tone';

// Thin horizontal bar list: one row per status/category, bar length is
// magnitude relative to the largest value in the set, value is always a
// direct label (never hidden behind hover-only color).
export default function BarList({ items }) {
  if (!items || items.length === 0) return null;
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0));

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const tone = TONE[item.tone] || TONE.neutral;
        const value = Number(item.value) || 0;
        const pct = value > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
        return (
          <div key={item.label ?? i} title={`${item.label}: ${item.display ?? item.value ?? 0}`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">{item.label}</span>
              <span className={`font-semibold ${tone.text}`}>{item.display ?? item.value ?? 0}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${tone.bar} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
