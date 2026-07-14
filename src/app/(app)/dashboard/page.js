'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { getUser } from '@/lib/auth';
import { ShoppingCart, ClipboardList, Truck, Database, Factory, BadgeCheck, Users2, CreditCard, Shield } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const WIDGETS = [
  {
    key: 'customerPo', title: 'Customer Orders', icon: ClipboardList, color: 'indigo',
    permission: 'CUSTOMER_PO_VIEW', endpoint: '/customer-po/stats',
    stats: (d) => [
      { label: 'Total', value: d.total },
      { label: 'Open', value: d.received + d.acknowledged },
      { label: 'Overdue', value: d.overdueCount },
      { label: 'Order Value', value: fmt(d.totalOrderValue) },
    ],
  },
  {
    key: 'purchase', title: 'Purchase Orders', icon: ShoppingCart, color: 'blue',
    permission: 'PURCHASE_ORDER_VIEW', endpoint: '/purchase-orders/stats',
    stats: (d) => [
      { label: 'Total', value: d.total },
      { label: 'Draft', value: d.draft },
      { label: 'Approved', value: d.approved },
      { label: 'Value', value: fmt(d.totalValue) },
    ],
  },
  {
    key: 'salesOrders', title: 'Sales Orders', icon: Truck, color: 'teal',
    permission: 'SALES_ORDER_VIEW', endpoint: '/sales-orders/stats',
    stats: (d) => [
      { label: 'Total', value: d.total },
      { label: 'In Production', value: d.inProduction },
      { label: 'Overdue', value: d.overdue },
      { label: 'Value', value: fmt(d.totalValue) },
    ],
  },
  {
    key: 'inventory', title: 'Inventory', icon: Database, color: 'emerald',
    permission: 'INVENTORY_DASHBOARD_VIEW', endpoint: '/inventory-dashboard/overview',
    stats: (d) => [
      { label: 'Total Items', value: d.totalItems },
      { label: 'Stock Value', value: fmt(d.totalStockValue) },
      { label: 'Pending GRN', value: d.pendingGrns },
      { label: 'Pending IQC', value: d.pendingIqc },
    ],
  },
  {
    key: 'production', title: 'Production', icon: Factory, color: 'orange',
    permission: 'PRODUCTION_DASHBOARD_VIEW', endpoint: '/production-dashboard/overview',
    stats: (d) => [
      { label: 'Work Orders', value: d.workOrders?.total },
      { label: 'In Progress', value: d.workOrders?.inProgress },
      { label: "Today's Good Qty", value: d.today?.goodQty },
      { label: "Today's Scrap", value: d.today?.scrapQty },
    ],
  },
  {
    key: 'quality', title: 'Quality', icon: BadgeCheck, color: 'rose',
    permission: 'QUALITY_DASHBOARD_VIEW', endpoint: '/quality-dashboard/overview',
    stats: (d) => [
      { label: 'Open NCR', value: d.ncr?.open },
      { label: 'Critical NCR', value: d.ncr?.critical },
      { label: 'CAPA Overdue', value: d.capa?.overdue },
      { label: 'CAPA In Progress', value: d.capa?.inProgress },
    ],
  },
  {
    key: 'hr', title: 'HR', icon: Users2, color: 'violet',
    permission: 'EMPLOYEE_VIEW', endpoint: '/employees/stats',
    stats: (d) => [
      { label: 'Total Employees', value: d.total },
      { label: 'Active', value: d.active },
      { label: 'On Probation', value: d.onProbation },
      { label: 'Departments', value: d.departments },
    ],
  },
  {
    key: 'finance', title: 'Finance', icon: CreditCard, color: 'amber',
    permission: 'FINANCIAL_REPORT_VIEW', endpoint: '/financial-reports/summary',
    stats: (d) => [
      { label: 'Revenue (Month)', value: fmt(d.revenue) },
      { label: 'Net Profit', value: fmt(d.netProfit) },
      { label: 'AR Outstanding', value: fmt(d.arOutstanding) },
      { label: 'AP Outstanding', value: fmt(d.apOutstanding) },
    ],
  },
  {
    key: 'gate', title: 'Gate Security', icon: Shield, color: 'slate',
    permission: 'GATE_DASHBOARD_VIEW', endpoint: '/gate-dashboard/summary',
    stats: (d) => [
      { label: 'Visitors Inside', value: d.liveStats?.visitorsInside },
      { label: 'Vehicles Inside', value: d.liveStats?.vehiclesInside },
      { label: 'Pending Gate Passes', value: d.liveStats?.pendingPasses },
      { label: 'Pending GRN Inward', value: d.liveStats?.pendingGINs },
    ],
  },
];

const COLOR_CLASSES = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  teal: 'bg-teal-50 text-teal-700 border-teal-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  slate: 'bg-slate-50 text-slate-700 border-slate-100',
};

function WidgetCard({ widget, data, loading }) {
  const Icon = widget.icon;
  const colorClass = COLOR_CLASSES[widget.color];
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon size={16} />
        </div>
        <h3 className="font-semibold text-gray-800 text-sm">{widget.title}</h3>
      </div>
      {loading ? (
        <div className="text-xs text-gray-400">Loading...</div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3">
          {widget.stats(data).map((s, i) => (
            <div key={i}>
              <div className="text-lg font-bold text-gray-900">{s.value ?? '—'}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400">No data available</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [myPermissions, setMyPermissions] = useState(null);
  const [widgetData, setWidgetData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { setUser(getUser()); }, []);

  useEffect(() => {
    if (!getToken()) return;
    fetch(`${API}/permissions/my-permissions`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMyPermissions(new Set(d.permissions)); })
      .catch(() => {});
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || (Array.isArray(user?.allRoles) && user.allRoles.includes('SUPER_ADMIN'));

  useEffect(() => {
    if (!user || myPermissions === null) return;

    const visibleWidgets = WIDGETS.filter(w => isSuperAdmin || myPermissions.has(w.permission));

    if (visibleWidgets.length === 0) { setLoading(false); return; }

    Promise.all(
      visibleWidgets.map(w =>
        fetch(`${API}${w.endpoint}`, { headers: { Authorization: `Bearer ${getToken()}` } })
          .then(r => r.ok ? r.json() : null)
          .then(data => ({ key: w.key, data }))
          .catch(() => ({ key: w.key, data: null }))
      )
    ).then(results => {
      const next = {};
      results.forEach(r => { next[r.key] = r.data; });
      setWidgetData(next);
      setLoading(false);
    });
  }, [user, myPermissions, isSuperAdmin]);

  const visibleWidgets = WIDGETS.filter(w => isSuperAdmin || (myPermissions && myPermissions.has(w.permission)));

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {user?.role ? user.role.replace(/_/g, ' ') : ''} · Oregenal Smart Manufacturing ERP
        </p>
      </div>

      {myPermissions === null ? (
        <div className="text-center py-16 text-gray-400">Loading your dashboard...</div>
      ) : visibleWidgets.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
          <p className="text-gray-500 text-sm">No dashboard widgets are configured for your role yet.</p>
          <p className="text-gray-400 text-xs mt-1">Contact your Super Admin if you believe this is incorrect.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleWidgets.map(w => (
            <WidgetCard key={w.key} widget={w} data={widgetData[w.key]} loading={loading} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
