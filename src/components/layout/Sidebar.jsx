'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import {
  ShoppingCart, LayoutDashboard, Settings, Building2, Factory,
  Layers, Users2, GitBranch, Calendar, ChevronDown, ChevronRight,
  Users, Hash, SlidersHorizontal, FileText, ClipboardList, Database,
  Shield, UserCheck, Activity, BarChart3, Truck, LogIn, PackageCheck,
  PackageOpen, BadgeCheck, Box, Ruler, Tag, List, CreditCard,
  Globe, Calculator, X
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

/**
 * Maps a nav item's href to the permission required to see it in the
 * sidebar. Reuses the exact same domain categorization established
 * tonight when fixing 70+ backend controllers' RBAC permissions, so
 * frontend visibility matches backend enforcement. A link only shows if
 * the user's actual role holds the VIEW permission for that domain.
 *
 * First comprehensive pass covering every link in NAV below. Unknown
 * path segments default to VISIBLE (fail open, not closed) so nothing
 * accidentally hides from a role that should see it - tighten specific
 * entries as gaps are found.
 */
/**
 * Maps a nav item's href to the EXACT permission required to see it -
 * now granular per-tab (e.g. Stock Adjustment and Stock Ledger require
 * different permissions), not shared domain-wide permissions. Reuses
 * the new granular permissions seeded into the database, inherited
 * automatically from whichever domain permission a role already held.
 *
 * Unknown path segments default to VISIBLE (fail open) so nothing
 * accidentally hides from a role that should see it.
 */
const PATH_PERMISSION = {
  'change-requests': 'CHANGE_REQUEST_VIEW',
  'gate-dashboard': 'GATE_DASHBOARD_VIEW', 'gate-inward': 'GATE_INWARD_VIEW',
  'gate-outward': 'GATE_OUTWARD_VIEW', 'gate-passes': 'GATE_PASS_VIEW',
  'visitors': 'VISITOR_VIEW', 'vehicle-logs': 'VEHICLE_LOG_VIEW',
  'purchase-requisitions': 'PURCHASE_REQUISITION_VIEW', 'purchase-orders': 'PURCHASE_ORDER_VIEW',
  'rfqs': 'RFQ_VIEW', 'rfq': 'RFQ_VIEW', 'vendor-quotations': 'VENDOR_QUOTATION_VIEW',
  'quotation-comparison': 'QUOTATION_COMPARISON_VIEW', 'po-amendments': 'PO_AMENDMENT_VIEW',
  'po-approvals': 'PO_APPROVAL_VIEW', 'purchase-analytics': 'PURCHASE_ANALYTICS_VIEW',
  'price-lists': 'PRICE_LIST_VIEW', 'price-history': 'PRICE_HISTORY_VIEW', 'vendors': 'VENDORS_VIEW',
  'import-orders': 'IMPORT_ORDER_VIEW', 'customs-entries': 'CUSTOMS_ENTRY_VIEW',
  'landed-costs': 'LANDED_COST_VIEW', 'shipments': 'SHIPMENT_VIEW', 'shipping-documents': 'SHIPPING_DOCUMENT_VIEW',
  'leads': 'LEAD_VIEW', 'quotations': 'QUOTATION_VIEW', 'customer-po': 'CUSTOMER_PO_VIEW',
  'sales-orders': 'SALES_ORDER_VIEW', 'dispatch-plans': 'DISPATCH_PLAN_VIEW', 'dispatch': 'DISPATCH_VIEW',
  'delivery-confirmations': 'DELIVERY_CONFIRMATION_VIEW', 'proforma-invoices': 'PROFORMA_INVOICE_VIEW',
  'credit-control': 'CREDIT_CONTROL_VIEW', 'customer-complaints': 'CUSTOMER_COMPLAINT_VIEW',
  'customer-portal': 'CUSTOMER_PORTAL_VIEW',
  'inventory-dashboard': 'INVENTORY_DASHBOARD_VIEW', 'warehouse': 'WAREHOUSE_VIEW',
  'bom': 'BOM_VIEW', 'bom-revisions': 'BOM_REVISION_VIEW', 'grn': 'GRN_VIEW', 'iqc': 'IQC_VIEW',
  'stock-ledger': 'STOCK_LEDGER_VIEW', 'rejected-stock': 'REJECTED_STOCK_VIEW', 'rack-bin': 'RACK_BIN_VIEW',
  'stock-putaway': 'STOCK_PUTAWAY_VIEW', 'stock-batches': 'STOCK_BATCH_VIEW', 'stock-issues': 'STOCK_ISSUE_VIEW',
  'stock-transfers': 'STOCK_TRANSFER_VIEW', 'stock-adjustments': 'STOCK_ADJUSTMENT_VIEW',
  'stock-reports': 'STOCK_REPORT_VIEW', 'inventory-valuation': 'INVENTORY_VALUATION_VIEW',
  'inventory-reports': 'INVENTORY_REPORT_VIEW', 'raw-materials': 'INVENTORY_VIEW', 'products': 'INVENTORY_VIEW',
  'production-dashboard': 'PRODUCTION_DASHBOARD_VIEW', 'work-orders': 'WORK_ORDER_VIEW', 'mrp': 'MRP_VIEW',
  'production-entries': 'PRODUCTION_ENTRY_VIEW', 'fg-receipts': 'FG_RECEIPT_VIEW',
  'production-issues': 'PRODUCTION_ISSUE_VIEW', 'production-cost-sheets': 'PRODUCTION_COST_SHEET_VIEW',
  'production-reports': 'PRODUCTION_REPORT_VIEW',
  'quality-dashboard': 'QUALITY_DASHBOARD_VIEW', 'production-qc': 'PRODUCTION_QC_VIEW', 'oqc': 'OQC_VIEW',
  'ncr': 'NCR_VIEW', 'capa': 'CAPA_VIEW', 'rca': 'RCA_VIEW', 'supplier-quality': 'SUPPLIER_QUALITY_VIEW',
  'quality-reports': 'QUALITY_REPORT_VIEW',
  'employees': 'EMPLOYEE_VIEW', 'attendance': 'ATTENDANCE_VIEW', 'leave': 'LEAVE_VIEW',
  'payroll': 'PAYROLL_VIEW', 'salary-slip': 'SALARY_SLIP_VIEW', 'pf-esi': 'PF_ESI_VIEW',
  'training': 'TRAINING_VIEW', 'hr-reports': 'HR_REPORT_VIEW',
  'accounting': 'ACCOUNTING_VIEW', 'accounts': 'CHART_OF_ACCOUNTS_VIEW', 'vouchers': 'VOUCHER_VIEW',
  'ar': 'AR_VIEW', 'ap': 'AP_VIEW', 'gst': 'GST_VIEW', 'bank-reconciliation': 'BANK_RECONCILIATION_VIEW',
  'payment-instruments': 'PAYMENT_INSTRUMENT_VIEW', 'tds': 'TDS_VIEW', 'financial-reports': 'FINANCIAL_REPORT_VIEW',
  'iot': 'IOT_VIEW', 'tasks': 'TASK_VIEW', 'notifications': 'NOTIFICATION_VIEW', 'documents': 'DOCUMENT_VIEW',
  'workflows': 'WORKFLOW_VIEW', 'alerts': 'ALERT_VIEW', 'vendor-portal': 'VENDOR_PORTAL_VIEW',
  'mis-reports': 'MIS_REPORT_VIEW', 'analytics': 'ANALYTICS_TAB_VIEW',
  'system': 'SETTINGS_VIEW', 'numbering': 'SETTINGS_VIEW', 'custom-fields': 'SETTINGS_VIEW', 'dummy-data': 'SETTINGS_VIEW',
};

// Full-path overrides checked before generic single-segment matching -
// needed when two different domains reuse the same final path segment
// for genuinely different features (e.g. /purchase/quotations is really
// "Vendor Quotations", distinct from /sales/quotations' customer quotes,
// even though both end in the same word).
const FULL_PATH_OVERRIDES = {
  '/purchase/quotations': 'VENDOR_QUOTATION_VIEW',
  '/purchase/shortages': 'PURCHASE_VIEW',
  '/gate/inward': 'GATE_INWARD_VIEW',
  '/gate/outward': 'GATE_OUTWARD_VIEW',
  '/gate/passes': 'GATE_PASS_VIEW',
  '/gate/vehicles': 'VEHICLE_LOG_VIEW',
  '/gate/visitors': 'VISITOR_VIEW',
  '/gate/check-in': 'GATE_INWARD_VIEW',
};

function getRequiredPermission(href) {
  if (!href) return null;
  if (FULL_PATH_OVERRIDES[href] !== undefined) return FULL_PATH_OVERRIDES[href];
  const segments = href.split('/').filter(Boolean);
  if (segments.includes('roles-permissions')) return 'SYSTEM_MANAGE_ROLES';
  for (const seg of segments) {
    if (PATH_PERMISSION[seg] !== undefined) return PATH_PERMISSION[seg];
  }
  return null; // unknown path - fail open (visible)
}

const ROLE_SECTIONS = {
  SUPER_ADMIN:      'ALL',
  CORPORATE_ADMIN:  'ALL',
  PLANT_HEAD:       ['Dashboard','Purchase','Import','Inventory','Production','Quality','HR','Finance','Industry 4.0','Analytics','Settings'],
  PLANNING_MANAGER: ['Dashboard','Purchase','Inventory','Production','Quality','Analytics','Settings'],
  PURCHASE_MANAGER: ['Dashboard','Purchase','Import','Inventory','Settings'],
  STORE_MANAGER:    ['Dashboard','Inventory','Purchase'],
  PRODUCTION_HEAD:  ['Dashboard','Production','Inventory','Quality','Settings'],
  QC_MANAGER:       ['Dashboard','Quality','Inventory'],
  FINANCE_MANAGER:  ['Dashboard','Finance','Analytics','Settings'],
  HR_MANAGER:       ['Dashboard','HR','Settings'],
  UNIT_HEAD:        ['Dashboard','Sales','Inventory','Analytics','Settings'],
  SUPERVISOR:       ['Dashboard','Purchase','Sales','Inventory','Production','Quality','HR','Finance'],
  OPERATOR:         ['Dashboard','Inventory','Production'],
  VIEWER:           ['Dashboard'],
};
const GATE_SECTIONS = ['Dashboard','Gate Management'];

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Change Requests', icon: ClipboardList,
    children: [
      { label: 'All Requests', href: '/change-requests', icon: ClipboardList },
      { label: 'New Request', href: '/change-requests/create', icon: FileText },
    ],
  },
  {
    label: 'Gate Management', icon: Shield,
    children: [
      { label: 'Gate Dashboard', href: '/gate-dashboard', icon: LayoutDashboard },
      { label: 'Gate Inward', href: '/gate/inward', icon: PackageCheck },
      { label: 'Gate Outward', href: '/gate/outward', icon: PackageOpen },
      { label: 'Gate Passes', href: '/gate/passes', icon: BadgeCheck },
      { label: 'Vehicle Log', href: '/gate/vehicles', icon: Truck },
      { label: 'Visitors', href: '/gate/visitors', icon: UserCheck },
      { label: 'Check-In', href: '/gate/check-in', icon: LogIn },
    ],
  },
  {
    label: 'Purchase', icon: ShoppingCart,
    children: [
      { label: 'Purchase Requisitions', href: '/purchase-requisitions', icon: FileText },
      { label: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
      { label: 'Material Shortages', href: '/purchase/shortages', icon: ClipboardList },
      { label: 'RFQs', href: '/purchase/rfqs', icon: FileText },
      { label: 'Vendor Quotations', href: '/purchase/quotations', icon: FileText },
      { label: 'Quotation Comparison', href: '/purchase/comparison', icon: BarChart3 },
      { label: 'PO Amendments', href: '/purchase/amendments', icon: GitBranch },
      { label: 'PO Approvals', href: '/purchase/approvals', icon: BadgeCheck },
      { label: 'Purchase Analytics', href: '/purchase/analytics', icon: BarChart3 },
      { label: 'Price Lists', href: '/masters/price-lists', icon: Tag },
      { label: 'Price History', href: '/masters/price-history', icon: Activity },
      { label: 'Vendors', href: '/masters/vendors', icon: Users2 },
    ],
  },
  {
    label: 'Import', icon: Globe,
    children: [
      { label: 'Import Orders', href: '/import/orders', icon: PackageOpen },
      { label: 'Customs Entries', href: '/import/customs', icon: FileText },
      { label: 'Landed Costs', href: '/import/landed-cost', icon: Calculator },
      { label: 'Shipments', href: '/import/shipments', icon: Truck },
    ],
  },
  {
    label: 'Sales', icon: Tag,
    children: [
      { label: 'Leads', href: '/sales/leads', icon: Users2 },
      { label: 'Quotations', href: '/sales/quotations', icon: FileText },
      { label: 'Customer PO', href: '/customer-po', icon: ClipboardList },
      { label: 'Sales Orders', href: '/sales/sales-orders', icon: ShoppingCart },
      { label: 'Dispatch Plans', href: '/sales/dispatch-planning', icon: Truck },
      { label: 'Dispatch', href: '/sales/dispatch', icon: Truck },
      { label: 'Delivery Confirmations', href: '/sales/delivery', icon: BadgeCheck },
      { label: 'Proforma Invoices', href: '/proforma-invoices', icon: FileText },
      { label: 'Credit Control', href: '/sales/credit-control', icon: CreditCard },
      { label: 'Customer Complaints', href: '/customer-complaints', icon: Activity },
      { label: 'Customer Portal', href: '/customer-portal', icon: Globe },
    ],
  },
  {
    label: 'Inventory', icon: Database,
    children: [
      { label: 'Inv. Dashboard', href: '/inventory-dashboard', icon: BarChart3 },
      { label: 'Warehouses', href: '/warehouse', icon: Building2 },
      { label: 'BOM', href: '/inventory/bom', icon: ClipboardList },
      { label: 'BOM Revisions', href: '/inventory/bom-revisions', icon: GitBranch },
      { label: 'GRN', href: '/inventory/grn', icon: PackageCheck },
      { label: 'IQC', href: '/inventory/iqc', icon: BadgeCheck },
      { label: 'Stock Ledger', href: '/stock-ledger', icon: Database },
      { label: 'Rejected Stock', href: '/inventory/rejected', icon: Activity },
      { label: 'Rack & Bin', href: '/inventory/rack-bin', icon: Database },
      { label: 'Stock Putaway', href: '/inventory/putaway', icon: PackageOpen },
      { label: 'Batches & Lots', href: '/inventory/batches', icon: Layers },
      { label: 'Stock Issues', href: '/inventory/issues', icon: LogIn },
      { label: 'Stock Transfer', href: '/inventory/transfers', icon: Truck },
      { label: 'Stock Adjustment', href: '/inventory/adjustments', icon: SlidersHorizontal },
      { label: 'Stock Reports', href: '/stock-reports', icon: FileText },
      { label: 'Inv. Valuation', href: '/inventory/valuation', icon: BarChart3 },
      { label: 'Inv. Reports', href: '/inventory-reports', icon: FileText },
    ],
  },
  {
    label: 'Production', icon: Factory,
    children: [
      { label: 'Production Dashboard', href: '/production-dashboard', icon: BarChart3 },
      { label: 'Work Orders', href: '/production/work-orders', icon: ClipboardList },
      { label: 'Routing', href: '/production/routing', icon: ClipboardList },
      { label: 'MRP', href: '/production/mrp', icon: BarChart3 },
      { label: 'Production Entries', href: '/production-entries', icon: FileText },
      { label: 'FG Receipts', href: '/production/fg-receipt', icon: PackageCheck },
      { label: 'Production Issues', href: '/production-issues', icon: Activity },
      { label: 'Cost Sheets', href: '/production/cost-sheet', icon: Calculator },
      { label: 'Production Reports', href: '/production/reports', icon: FileText },
    ],
  },
  {
    label: 'Quality', icon: BadgeCheck,
    children: [
      { label: 'Quality Dashboard', href: '/quality-dashboard', icon: BarChart3 },
      { label: 'IQC', href: '/inventory/iqc', icon: BadgeCheck },
      { label: 'Production QC', href: '/production-qc', icon: BadgeCheck },
      { label: 'OQC', href: '/quality/oqc', icon: ClipboardList },
      { label: 'NCR', href: '/quality/ncr', icon: FileText },
      { label: 'CAPA', href: '/quality/capa', icon: ClipboardList },
      { label: 'RCA', href: '/quality/rca', icon: Activity },
      { label: 'Supplier Quality', href: '/quality/supplier', icon: Users2 },
      { label: 'Quality Reports', href: '/quality/reports', icon: FileText },
    ],
  },
  {
    label: 'HR', icon: Users2,
    children: [
      { label: 'Employees', href: '/hr/employees', icon: Users2 },
      { label: 'Attendance', href: '/hr/attendance', icon: Calendar },
      { label: 'Leave', href: '/hr/leave', icon: Calendar },
      { label: 'Payroll', href: '/hr/payroll', icon: CreditCard },
      { label: 'PF/ESI', href: '/hr/pf-esi', icon: FileText },
      { label: 'Training', href: '/hr/training', icon: BadgeCheck },
    ],
  },
  {
    label: 'Finance', icon: CreditCard,
    children: [
      { label: 'Chart of Accounts', href: '/finance/accounts', icon: List },
      { label: 'Vouchers', href: '/finance/vouchers', icon: FileText },
      { label: 'Accounts Receivable', href: '/finance/ar', icon: CreditCard },
      { label: 'Accounts Payable', href: '/finance/ap', icon: CreditCard },
      { label: 'GST', href: '/finance/gst', icon: FileText },
      { label: 'TDS', href: '/hr/tds', icon: Calculator },
    ],
  },
  {
    label: 'Industry 4.0', icon: Activity,
    children: [
      { label: 'IoT Dashboard', href: '/iot', icon: Activity },
      { label: 'Tasks', href: '/tasks', icon: ClipboardList },
      { label: 'Notifications', href: '/notifications', icon: Activity },
      { label: 'Documents', href: '/documents', icon: FileText },
      { label: 'Workflows', href: '/workflows', icon: GitBranch },
      { label: 'Alerts', href: '/alerts', icon: Activity },
      { label: 'Vendor Portal', href: '/vendor-portal', icon: Globe },
    ],
  },
  {
    label: 'Analytics', icon: BarChart3,
    children: [
      { label: 'MIS Reports', href: '/mis-reports', icon: FileText },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Settings', icon: Settings,
    children: [
      { label: 'Companies', href: '/masters/company', icon: Building2 },
      { label: 'Plants', href: '/masters/plant', icon: Factory },
      { label: 'Units', href: '/masters/unit', icon: Layers },
      { label: 'Departments', href: '/masters/department', icon: Users2 },
      { label: 'Branches', href: '/masters/branch', icon: GitBranch },
      { label: 'Financial Year', href: '/masters/financial-year', icon: Calendar },
      { label: 'Users', href: '/users', icon: Users },
      { label: 'System Settings', href: '/settings/system', icon: Settings },
      { label: 'Roles & Permissions', href: '/settings/roles-permissions', icon: Shield },
      { label: 'Numbering Series', href: '/settings/numbering', icon: Hash },
      { label: 'Custom Fields', href: '/settings/custom-fields', icon: SlidersHorizontal },
      { label: 'Dummy Data', href: '/settings/dummy-data', icon: Database },
    ],
  },
];

const SIDEBAR_STORAGE_KEY = 'erp_sidebar_open_sections';

export default function Sidebar() {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState({});
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved) setOpenSections(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);
  const [user, setUser] = useState(null);
  const [myPermissions, setMyPermissions] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    fetch(`${API}/permissions/my-permissions`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMyPermissions(new Set(d.permissions)); })
      .catch(() => {});
  }, []);

  if (!user) return null;

  const role = user.role;
  const isSuperAdmin = role === 'SUPER_ADMIN' || (Array.isArray(user.allRoles) && user.allRoles.includes('SUPER_ADMIN'));
  const isGateOperator = role === 'OPERATOR' && user.email?.includes('gate');

  const knownRoleSections = isGateOperator ? GATE_SECTIONS
    : (ROLE_SECTIONS[role] === 'ALL' || isSuperAdmin) ? 'ALL'
    : ROLE_SECTIONS[role];

  function itemVisible(href) {
    if (isSuperAdmin) return true;
    const required = getRequiredPermission(href);
    if (!required) return true;
    if (!myPermissions) return true;
    return myPermissions.has(required);
  }

  function sectionVisible(label, children) {
    if (knownRoleSections === 'ALL') return true;
    if (Array.isArray(knownRoleSections)) return knownRoleSections.includes(label);
    if (!children || children.length === 0) return true;
    return children.some(c => itemVisible(c.href));
  }

  function toggleSection(label) {
    setOpenSections(prev => {
      const next = { ...prev, [label]: !prev[label] };
      try { localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <nav className="w-64 bg-white border-r h-screen overflow-y-auto flex-shrink-0">
      <div className="p-4">
        {NAV.map(item => {
          if (!sectionVisible(item.label, item.children)) return null;

          if (!item.children) {
            if (!itemVisible(item.href)) return null;
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Icon size={16} /> {item.label}
              </Link>
            );
          }

          const visibleChildren = item.children.filter(c => itemVisible(c.href));
          if (visibleChildren.length === 0) return null;

          const containsActivePage = visibleChildren.some(c => c.href === pathname);
          const sectionIsOpen = item.label in openSections ? openSections[item.label] : (hydrated && containsActivePage);
          const Icon = item.icon;
          return (
            <div key={item.label} className="mb-1">
              <button onClick={() => toggleSection(item.label)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">
                <span className="flex items-center gap-2"><Icon size={16} /> {item.label}</span>
                {sectionIsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {sectionIsOpen && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {visibleChildren.map(child => {
                    const ChildIcon = child.icon;
                    const active = pathname === child.href;
                    return (
                      <Link key={child.href} href={child.href} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <ChildIcon size={14} /> {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
