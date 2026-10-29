'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { getUser } from '@/lib/auth';
import WidgetCard from '@/components/dashboard/WidgetCard';
import StatusPill from '@/components/common/StatusPill';
import { ShoppingCart, ClipboardList, Truck, Database, Factory, BadgeCheck, Users2, CreditCard, Shield, Warehouse, Layers } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = s => (s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');
const fullName = r => `${r.firstName || ''} ${r.lastName || ''}`.trim() || '—';

// Every widget below drives three things off ONE stats fetch + (on demand)
// ONE list fetch: the headline numbers (stats), a status-colored mini chart
// (chart), and a live drill-down table reusing that module's own list
// endpoint (details) with a link to the real page for full management -
// never a second, parallel table UI for the same data.
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
    chart: {
      type: 'bar',
      data: (d) => [
        { label: 'Received', value: d.received, tone: 'info' },
        { label: 'Acknowledged', value: d.acknowledged, tone: 'good' },
        { label: 'Overdue', value: d.overdueCount, tone: 'critical' },
      ],
    },
    details: [
      {
        key: 'recent', label: 'Recent Orders', url: '/customer-po?limit=5', link: '/customer-po',
        columns: [
          { key: 'cpoNumber', label: 'PO #' },
          { key: 'customerName', label: 'Customer' },
          { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
          { key: 'deliveryDate', label: 'Delivery', render: (r) => fmtDate(r.deliveryDate) },
        ],
      },
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
    chart: {
      type: 'bar',
      data: (d) => [
        { label: 'Draft', value: d.draft, tone: 'neutral' },
        { label: 'Approved', value: d.approved, tone: 'good' },
      ],
    },
    details: [
      {
        key: 'recent', label: 'Recent POs', url: '/purchase-orders?limit=5', link: '/purchase/orders',
        columns: [
          { key: 'poNumber', label: 'PO #' },
          { key: 'vendor', label: 'Vendor', render: (r) => r.vendor?.name || '—' },
          { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
          { key: 'totalAmount', label: 'Amount', render: (r) => fmt(r.totalAmount) },
        ],
      },
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
    chart: {
      type: 'bar',
      data: (d) => [
        { label: 'In Production', value: d.inProduction, tone: 'info' },
        { label: 'Overdue', value: d.overdue, tone: 'critical' },
      ],
    },
    details: [
      {
        key: 'recent', label: 'Recent Orders', url: '/sales-orders?limit=5', link: '/sales/sales-orders',
        columns: [
          { key: 'soNumber', label: 'SO #' },
          { key: 'cpo', label: 'Customer PO', render: (r) => r.cpo?.cpoNumber || r.cpo?.customerPoNumber || '—' },
          { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
          { key: 'deliveryDate', label: 'Delivery', render: (r) => fmtDate(r.deliveryDate) },
        ],
      },
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
    chart: {
      type: 'bar',
      data: (d) => [
        { label: 'Pending GRN', value: d.pendingGrns, tone: 'warning' },
        { label: 'Pending IQC', value: d.pendingIqc, tone: 'warning' },
      ],
    },
    details: [
      {
        key: 'stock', label: 'Stock Balance', url: '/stock-ledger/balance?limit=5', link: '/inventory/stock',
        columns: [
          { key: 'itemCode', label: 'Item' },
          { key: 'availableQty', label: 'Available Qty' },
          { key: 'isLowStock', label: 'Status', render: (r) => <StatusPill value={r.isLowStock ? 'LOW_STOCK' : 'OK'} /> },
        ],
      },
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
    chart: {
      type: 'bar',
      data: (d) => [
        { label: 'Work Orders In Progress', value: d.workOrders?.inProgress, tone: 'info' },
        { label: "Today's Good Qty", value: d.today?.goodQty, tone: 'good' },
        { label: "Today's Scrap", value: d.today?.scrapQty, tone: 'critical' },
      ],
    },
    details: [
      {
        key: 'wo', label: 'Work Orders', url: '/work-orders?limit=5', link: '/production/work-orders',
        columns: [
          { key: 'id', label: 'WO', render: (r) => r.routingGroupId || r.id?.slice(0, 8) || '—' },
          { key: 'plannedQty', label: 'Planned Qty' },
          { key: 'plannedManpower', label: 'Manpower' },
        ],
      },
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
    chart: {
      type: 'bar',
      data: (d) => [
        { label: 'NCR Open', value: d.ncr?.open, tone: 'warning' },
        { label: 'NCR Critical', value: d.ncr?.critical, tone: 'critical' },
        { label: 'CAPA Overdue', value: d.capa?.overdue, tone: 'critical' },
        { label: 'CAPA In Progress', value: d.capa?.inProgress, tone: 'info' },
      ],
    },
    details: [
      {
        key: 'ncr', label: 'NCR', url: '/ncr?limit=5', link: '/quality/ncr',
        columns: [
          { key: 'ncrNumber', label: 'NCR #' },
          { key: 'severity', label: 'Severity', render: (r) => <StatusPill value={r.severity} /> },
          { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
          { key: 'itemCode', label: 'Item' },
        ],
      },
      {
        key: 'capa', label: 'CAPA', url: '/capa?limit=5', link: '/quality/capa',
        columns: [
          { key: 'capaNumber', label: 'CAPA #' },
          { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
          { key: 'dueDate', label: 'Due', render: (r) => fmtDate(r.dueDate) },
        ],
      },
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
    chart: {
      type: 'bar',
      data: (d) => [
        { label: 'Active', value: d.active, tone: 'good' },
        { label: 'On Probation', value: d.onProbation, tone: 'warning' },
      ],
    },
    details: [
      {
        key: 'emp', label: 'Employees', url: '/employees?limit=5', link: '/hr/employees',
        columns: [
          { key: 'employeeNumber', label: 'Emp #' },
          { key: 'name', label: 'Name', render: fullName },
          { key: 'department', label: 'Department', render: (r) => r.department?.name || '—' },
          { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
        ],
      },
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
    chart: {
      type: 'bar',
      data: (d) => [
        { label: 'AR Outstanding', value: d.arOutstanding, display: fmt(d.arOutstanding), tone: 'info' },
        { label: 'AP Outstanding', value: d.apOutstanding, display: fmt(d.apOutstanding), tone: 'warning' },
      ],
    },
    details: [
      {
        key: 'ar', label: 'Receivables', url: '/ar?limit=5', link: '/finance/ar',
        columns: [
          { key: 'invoiceNumber', label: 'Invoice #' },
          { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
          { key: 'dueDate', label: 'Due', render: (r) => fmtDate(r.dueDate) },
        ],
      },
      {
        key: 'ap', label: 'Payables', url: '/ap?limit=5', link: '/finance/ap',
        columns: [
          { key: 'ref', label: 'Ref', render: (r) => r.billNumber || r.invoiceNumber || r.id?.slice(0, 8) || '—' },
          { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
          { key: 'dueDate', label: 'Due', render: (r) => fmtDate(r.dueDate) },
        ],
      },
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
    chart: {
      type: 'bar',
      data: (d) => [
        { label: 'Visitors Inside', value: d.liveStats?.visitorsInside, tone: 'info' },
        { label: 'Vehicles Inside', value: d.liveStats?.vehiclesInside, tone: 'info' },
        { label: 'Pending Gate Passes', value: d.liveStats?.pendingPasses, tone: 'warning' },
        { label: 'Pending GRN Inward', value: d.liveStats?.pendingGINs, tone: 'warning' },
      ],
    },
    details: [
      {
        key: 'visitors', label: 'Visitors', url: '/visitors', link: '/gate/visitors',
        columns: [{ key: 'name', label: 'Visitor', render: fullName }],
      },
      {
        key: 'vehicles', label: 'Vehicles', url: '/vehicles', link: '/gate/vehicles',
        columns: [
          { key: 'vehicleNumber', label: 'Vehicle #' },
          { key: 'vehicleType', label: 'Type' },
          { key: 'ownerName', label: 'Owner' },
        ],
      },
    ],
  },
  {
    // STORE-018: the real operational action cards, reusing the same
    // getActionCards() the Stock hub could also read from - never a
    // second, separately-maintained set of counts.
    key: 'storeActions', title: 'Store Actions', icon: Warehouse, color: 'cyan',
    permission: 'INVENTORY_DASHBOARD_VIEW', endpoint: '/inventory-dashboard/action-cards',
    stats: (d) => [
      { label: 'Hold Material', value: d.holdMaterial },
      { label: 'Stock Count Variance', value: d.stockCountVariancePending },
      { label: 'RTV Pending', value: (d.rtvApprovalPending || 0) + (d.rtvGateOutPending || 0) },
      { label: 'Reservation Shortfall', value: d.reservationShortfall },
    ],
    chart: {
      type: 'bar',
      data: (d) => [
        { label: 'Hold Material', value: d.holdMaterial, tone: 'warning' },
        { label: 'Stock Count Variance', value: d.stockCountVariancePending, tone: 'warning' },
        { label: 'RTV Pending', value: (d.rtvApprovalPending || 0) + (d.rtvGateOutPending || 0), tone: 'warning' },
        { label: 'Reservation Shortfall', value: d.reservationShortfall, tone: 'critical' },
      ],
    },
    details: [
      {
        key: 'adjust', label: 'Stock Adjustments', url: '/stock-adjustments?limit=5', link: '/inventory/stock-hub',
        columns: [
          { key: 'id', label: 'Adjustment', render: (r) => r.id?.slice(0, 8) || '—' },
          { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
        ],
      },
      {
        key: 'rtv', label: 'RTV Pending', url: '/rtv/pending', link: '/inventory/rtv-requests',
        columns: [
          { key: 'id', label: 'RTV', render: (r) => r.rtvNumber || r.id?.slice(0, 8) || '—' },
          { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
        ],
      },
    ],
  },
  {
    key: 'bom', title: 'BOM', icon: Layers, color: 'fuchsia',
    permission: 'BOM_VIEW', endpoint: '/boms/stats',
    stats: (d) => [
      { label: 'Total BOMs', value: d.total },
      { label: 'Approved', value: d.approved },
      { label: 'Active', value: d.active },
      { label: 'Obsolete', value: d.obsolete },
      { label: 'Draft', value: d.draft },
      { label: 'Items (Active)', value: d.totalItems },
    ],
    chart: {
      type: 'donut',
      data: (d) => [
        { label: 'Approved', value: d.approved, tone: 'good' },
        { label: 'Active', value: d.active, tone: 'info' },
        { label: 'Draft', value: d.draft, tone: 'warning' },
        { label: 'Obsolete', value: d.obsolete, tone: 'neutral' },
      ],
    },
    details: [
      {
        key: 'boms', label: 'BOMs', url: '/boms?limit=5', link: '/inventory/bom',
        columns: [
          { key: 'bomNumber', label: 'BOM #' },
          { key: 'product', label: 'Product', render: (r) => r.product?.name || '—' },
          { key: 'version', label: 'Version' },
          { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
        ],
      },
    ],
  },
];

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [myPermissions, setMyPermissions] = useState(null);
  const [widgetData, setWidgetData] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const toggleExpanded = (key) => setExpandedKeys((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

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
            <div key={w.key} className={expandedKeys.has(w.key) ? 'md:col-span-2' : ''}>
              <WidgetCard
                widget={w}
                data={widgetData[w.key]}
                loading={loading}
                expanded={expandedKeys.has(w.key)}
                onToggle={() => toggleExpanded(w.key)}
              />
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
