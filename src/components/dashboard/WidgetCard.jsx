'use client';
import { ChevronDown } from 'lucide-react';
import BarList from '@/components/charts/BarList';
import Donut from '@/components/charts/Donut';
import DetailPanel from './DetailPanel';

export const COLOR_CLASSES = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  teal: 'bg-teal-50 text-teal-700 border-teal-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  slate: 'bg-slate-50 text-slate-700 border-slate-100',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
};

export default function WidgetCard({ widget, data, loading, expanded, onToggle }) {
  const Icon = widget.icon;
  const colorClass = COLOR_CLASSES[widget.color];
  const chartData = data && widget.chart ? widget.chart.data(data) : null;
  const hasDetails = Array.isArray(widget.details) && widget.details.length > 0;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      {hasDetails && data ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="w-full flex items-center justify-between mb-4 group"
        >
          <span className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
              <Icon size={16} />
            </span>
            <h3 className="font-semibold text-gray-800 text-sm">{widget.title}</h3>
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-gray-600">
            Details
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
            <Icon size={16} />
          </div>
          <h3 className="font-semibold text-gray-800 text-sm">{widget.title}</h3>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-gray-400">Loading...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {widget.stats(data).map((s, i) => (
              <div key={i}>
                <div className="text-lg font-bold text-gray-900">{s.value ?? '—'}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {chartData && chartData.length > 0 && (
            widget.chart.type === 'donut' ? (
              <Donut segments={chartData} />
            ) : (
              <BarList items={chartData} />
            )
          )}
        </>
      ) : (
        <div className="text-xs text-gray-400">No data available</div>
      )}

      {hasDetails && expanded && data && <DetailPanel sources={widget.details} />}
    </div>
  );
}
