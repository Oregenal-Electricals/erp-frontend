'use client';
import { TONE_HEX } from './tone';

// Small donut for a status breakdown that sums to a meaningful whole
// (e.g. BOM: Approved + Active + Obsolete + Draft = Total). Always paired
// with a text legend so identity never rests on color alone.
export default function Donut({ segments, size = 88, strokeWidth = 13 }) {
  if (!segments || segments.length === 0) return null;
  const total = segments.reduce((sum, seg) => sum + (Number(seg.value) || 0), 0);
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const gap = total > 0 ? Math.min(3, circumference * 0.01) : 0;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {total === 0 ? (
          <circle cx={c} cy={c} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        ) : (
          segments
            .filter((seg) => (Number(seg.value) || 0) > 0)
            .map((seg, i) => {
              const frac = (Number(seg.value) || 0) / total;
              const len = Math.max(0, frac * circumference - gap);
              const dashoffset = -offset;
              offset += frac * circumference;
              return (
                <circle
                  key={seg.label ?? i}
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke={TONE_HEX[seg.tone] || TONE_HEX.neutral}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${c} ${c})`}
                >
                  <title>{`${seg.label}: ${seg.value ?? 0}`}</title>
                </circle>
              );
            })
        )}
      </svg>
      <ul className="space-y-1.5 text-xs flex-1 min-w-0">
        {segments.map((seg, i) => (
          <li key={seg.label ?? i} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: TONE_HEX[seg.tone] || TONE_HEX.neutral }}
            />
            <span className="text-gray-500 truncate">{seg.label}</span>
            <span className="font-semibold text-gray-800 ml-auto">{seg.value ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
