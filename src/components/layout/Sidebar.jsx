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
const PATH_PERMISSION_PREFIX = {
  'companies': 'COMPANY', 'plants': 'PLANT', 'units': 'UNIT',
  'departments': 'DEPARTMENT', 'branches': 'BRANCH', 'financial-years': 'FINANCIAL_YEAR',
  'users': 'USER',
  'purchase-requisitions': 'PURCHASE', 'purchase-orders': 'PURCHASE',
  'vendor-quotations': 'PURCHASE', 'po-amendments': 'PURCHASE', 'po-approvals': 'PURCHASE',
  'purchase-analytics': 'PURCHASE', 'price-lists': 'PURCHASE', 'price-history': 'PURCHASE',
  'rfqs': 'PURCHASE', 'rfq': 'PURCHASE', 'quotation-comparison': 'PURCHASE', 'vendors': 'VENDORS',
  'customs-entries': 'PURCHASE', 'import-orders': 'PURCHASE', 'landed-costs': 'PURCHASE',
  'shipments': 'SALES', 'shipping-documents': 'SALES',
  'sales-orders': 'SALES', 'quotations': 'SALES', 'leads': 'SALES', 'customer-po': 'SALES',
  'customer-complaints': 'SALES', 'delivery-confirmations': 'SALES', 'dispatch': 'SALES',
  'dispatch-plans': 'SALES', 'proforma-invoices': 'SALES', 'credit-control': 'SALES',
  'customer-portal': 'SYSTEM',
  'inventory-dashboard': 'INVENTORY', 'warehouse': 'INVENTORY', 'warehouses': 'INVENTORY',
  'bom': 'INVENTORY', 'bom-revisions': 'INVENTORY', 'grn': 'INVENTORY', 'iqc': 'QUALITY',
  'stock-ledger': 'INVENTORY', 'rejected-stock': 'INVENTORY', 'rack-bin': 'INVENTORY',
  'stock-putaway': 'INVENTORY', 'stock-batches': 'INVENTORY', 'stock-issues': 'INVENTORY',
  'stock-transfers': 'INVENTORY', 'stock-adjustments': 'INVENTORY', 'stock-reports': 'INVENTORY',
  'inventory-valuation': 'INVENTORY', 'inventory-reports': 'INVENTORY', 'raw-materials': 'INVENTORY',
  'products': 'INVENTORY', 'product-revisions': 'INVENTORY',
  'work-orders': 'PRODUCTION', 'production-entries': 'PRODUCTION', 'production-cost-sheets': 'PRODUCTION',
  'production-issues': 'PRODUCTION', 'production-dashboard': 'PRODUCTION', 'production-reports': 'PRODUCTION',
  'mrp': 'PRODUCTION', 'fg-receipts': 'PRODUCTION',
  'oqc': 'QUALITY', 'production-qc': 'QUALITY', 'capa': 'QUALITY', 'ncr': 'QUALITY',
  'rca': 'QUALITY', 'quality-dashboard': 'QUALITY', 'quality-reports': 'QUALITY', 'supplier-quality': 'QUALITY',
  'attendance': 'HR', 'hr-reports': 'HR', 'payroll': 'HR', 'salary-slip': 'HR',
  'pf-esi': 'HR', 'employees': 'HR', 'leave': 'HR', 'training': 'HR',
  'accounting': 'FINANCE', 'accounts': 'FINANCE', 'ar': 'FINANCE', 'ap': 'FINANCE',
  'gst': 'FINANCE', 'bank-reconciliation': 'FINANCE', 'financial-reports': 'FINANCE',
  'tds': 'FINANCE', 'payment-instruments': 'FINANCE', 'vouchers': 'FINANCE',
  'iot': 'SYSTEM', 'tasks': 'SYSTEM', 'notifications': 'SYSTEM', 'documents': 'SYSTEM',
  'workflows': 'SYSTEM', 'alerts': 'SYSTEM', 'vendor-portal': 'SYSTEM',
  'mis-reports': 'REPORTS', 'analytics': 'REPORTS',
  'system': 'SETTINGS', 'numbering': 'SETTINGS', 'custom-fields': 'SETTINGS', 'dummy-data': 'SETTINGS',
  'gate-inward': null, 'gate-outward': null, 'gate-passes': null, 'visitors': null,
  'vehicle-logs': null, 'gate-dashboard': null, 'change-requests': null,
};

function getRequiredPermission(href) {
  if (!href) return null;
  const segments = href.split('/').filter(Boolean);
  if (segments.includes('roles-permissions')) return 'SYSTEM_MANAGE_ROLES';
  for (const seg of segments) {
    if (PATH_PERMISSION_PREFIX[seg] !== undefined) {
      const prefix = PATH_PERMISSION_PREFIX[seg];
      if (prefix === null) return null;
      return `${prefix}_VIEW`;
    }
  }
  return null; // unknown path - fail open (visible)
}

const ROLE_SECTIONS = {
  SUPER_ADMIN:      'ALL',
  CORPORATE_ADMIN:  'ALL',
  PLANT_HEAD:       ['Dashboard','Master Setup','User Management','Purchase','Import','Inventory','Production','Quality','HR','Finance','Industry 4.0','Analytics','Settings'],
  PLANNING_MANAGER: ['Dashboard','Master Setup','Purchase','Inventory','Production','Quality','Analytics'],
  PURCHASE_MANAGER: ['Dashboard','Master Setup','Purchase','Import','Inventory'],
  STORE_MANAGER:    ['Dashboard','Inventory','Purchase'],
  PRODUCTION_HEAD:  ['Dashboard','Master Setup','Production','Inventory','Quality'],
  QC_MANAGER:       ['Dashboard','Quality','Inventory'],
  FINANCE_MANAGER:  ['Dashboard','Finance','Analytics','Settings'],
  HR_MANAGER:       ['Dashboard','HR','Settings'],
  UNIT_HEAD:        ['Dashboard','Sales','Master Setup','Inventory','Analytics'],
  SUPERVISOR:       ['Dashboard','Purchase','Sales','Inventory','Production','Quality','HR','Finance'],
  OPERATOR:         ['Dashboard','Inventory','Production'],
  VIEWER:           ['Dashboard'],
};
const GATE_SECTIONS = ['Dashboard','Gate Management'];

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Master Setup', icon: Settings,
    children: [
      { label: 'Companies', href: '/masters/companies', icon: Building2 },
      { label: 'Plants', href: '/masters/plants', icon: Factory },
      { label: 'Units', href: '/masters/units', icon: Layers },
      { label: 'Departments', href: '/masters/departments', icon: Users2 },
      { label: 'Branches', href: '/masters/branches', icon: GitBranch },
      { label: 'Financial Year', href: '/masters/financial-years', icon: Calendar },
    ],
  },
  {
    label: 'User Management', icon: Users,
    children: [
      { label: 'Users', href: '/users', icon: Users },
    ],
  },
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
      { label: 'Gate Inward', href: '/gate-inward', icon: LogIn },
      { label: 'Gate Outward', href: '/gate-outward', icon: Truck },
      { label: 'Gate Passes', href: '/gate-passes', icon: BadgeCheck },
      { label: 'Visitors', href: '/visitors', icon: UserCheck },
      { label: 'Vehicle Logs', href: '/vehicle-logs', icon: Activity },
    ],
  },
  {
    label: 'Purchase', icon: ShoppingCart,
    children: [
      { label: 'Purchase Requisitions', href: '/purchase-requisitions', icon: FileText },
      { label: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
      { label: 'RFQs', href: '/rfqs', icon: FileText },
      { label: 'Vendor Quotations', href: '/vendor-quotations', icon: FileText },
      { label: 'Quotation Comparison', href: '/quotation-comparison', icon: BarChart3 },
      { label: 'PO Amendments', href: '/po-amendments', icon: GitBranch },
      { label: 'PO Approvals', href: '/po-approvals', icon: BadgeCheck },
      { label: 'Purchase Analytics', href: '/purchase-analytics', icon: BarChart3 },
      { label: 'Price Lists', href: '/price-lists', icon: Tag },
      { label: 'Price History', href: '/price-history', icon: Activity },
      { label: 'Vendors', href: '/vendors', icon: Users2 },
    ],
  },
  {
    label: 'Import', icon: Globe,
    children: [
      { label: 'Import Orders', href: '/import-orders', icon: PackageOpen },
      { label: 'Customs Entries', href: '/customs-entries', icon: FileText },
      { label: 'Landed Costs', href: '/landed-costs', icon: Calculator },
      { label: 'Shipments', href: '/import/shipments', icon: Truck },
      { label: 'Shipping Documents', href: '/shipping-documents', icon: FileText },
    ],
  },
  {
    label: 'Sales', icon: Tag,
    children: [
      { label: 'Leads', href: '/leads', icon: Users2 },
      { label: 'Quotations', href: '/quotations', icon: FileText },
      { label: 'Customer PO', href: '/customer-po', icon: ClipboardList },
      { label: 'Sales Orders', href: '/sales-orders', icon: ShoppingCart },
      { label: 'Dispatch Plans', href: '/dispatch-plans', icon: Truck },
      { label: 'Dispatch', href: '/dispatch', icon: Truck },
      { label: 'Delivery Confirmations', href: '/delivery-confirmations', icon: BadgeCheck },
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
      { label: 'Rejected Stock', href: '/rejected-stock', icon: Activity },
      { label: 'Rack & Bin', href: '/inventory/rack-bin', icon: Database },
      { label: 'Stock Putaway', href: '/stock-putaway', icon: PackageOpen },
      { label: 'Batches & Lots', href: '/stock-batches', icon: Layers },
      { label: 'Stock Issues', href: '/stock-issues', icon: LogIn },
      { label: 'Stock Transfer', href: '/stock-transfers', icon: Truck },
      { label: 'Stock Adjustment', href: '/stock-adjustments', icon: SlidersHorizontal },
      { label: 'Stock Reports', href: '/stock-reports', icon: FileText },
      { label: 'Inv. Valuation', href: '/inventory-valuation', icon: BarChart3 },
      { label: 'Inv. Reports', href: '/inventory-reports', icon: FileText },
    ],
  },
  {
    label: 'Production', icon: Factory,
    children: [
      { label: 'Production Dashboard', href: '/production-dashboard', icon: BarChart3 },
      { label: 'Work Orders', href: '/work-orders', icon: ClipboardList },
      { label: 'MRP', href: '/production/mrp', icon: BarChart3 },
      { label: 'Production Entries', href: '/production-entries', icon: FileText },
      { label: 'FG Receipts', href: '/fg-receipts', icon: PackageCheck },
      { label: 'Production Issues', href: '/production-issues', icon: Activity },
      { label: 'Cost Sheets', href: '/production-cost-sheets', icon: Calculator },
      { label: 'Production Reports', href: '/production-reports', icon: FileText },
    ],
  },
  {
    label: 'Quality', icon: BadgeCheck,
    children: [
      { label: 'Quality Dashboard', href: '/quality-dashboard', icon: BarChart3 },
      { label: 'IQC', href: '/inventory/iqc', icon: BadgeCheck },
      { label: 'Production QC', href: '/production-qc', icon: BadgeCheck },
      { label: 'OQC', href: '/quality/oqc', icon: ClipboardList },
      { label: 'NCR', href: '/ncr', icon: FileText },
      { label: 'CAPA', href: '/capa', icon: ClipboardList },
      { label: 'RCA', href: '/rca', icon: Activity },
      { label: 'Supplier Quality', href: '/supplier-quality', icon: Users2 },
      { label: 'Quality Reports', href: '/quality-reports', icon: FileText },
    ],
  },
  {
    label: 'HR', icon: Users2,
    children: [
      { label: 'Employees', href: '/employees', icon: Users2 },
      { label: 'Attendance', href: '/attendance', icon: Calendar },
      { label: 'Leave', href: '/leave', icon: Calendar },
      { label: 'Payroll', href: '/payroll', icon: CreditCard },
      { label: 'Salary Slip', href: '/salary-slip', icon: FileText },
      { label: 'PF/ESI', href: '/pf-esi', icon: FileText },
      { label: 'Training', href: '/training', icon: BadgeCheck },
      { label: 'HR Reports', href: '/hr-reports', icon: FileText },
    ],
  },
  {
    label: 'Finance', icon: CreditCard,
    children: [
      { label: 'Accounting', href: '/accounting', icon: Calculator },
      { label: 'Chart of Accounts', href: '/accounts', icon: List },
      { label: 'Vouchers', href: '/vouchers', icon: FileText },
      { label: 'Accounts Receivable', href: '/ar', icon: CreditCard },
      { label: 'Accounts Payable', href: '/ap', icon: CreditCard },
      { label: 'GST', href: '/gst', icon: FileText },
      { label: 'Bank Reconciliation', href: '/bank-reconciliation', icon: Database },
      { label: 'Payment Instruments', href: '/payment-instruments', icon: CreditCard },
      { label: 'TDS', href: '/tds', icon: Calculator },
      { label: 'Financial Reports', href: '/financial-reports', icon: FileText },
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
      { label: 'System Settings', href: '/settings/system', icon: Settings },
      { label: 'Roles & Permissions', href: '/settings/roles-permissions', icon: Shield },
      { label: 'Numbering Series', href: '/settings/numbering', icon: Hash },
      { label: 'Custom Fields', href: '/settings/custom-fields', icon: SlidersHorizontal },
      { label: 'Dummy Data', href: '/settings/dummy-data', icon: Database },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState({});
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

  const allowedSections = isGateOperator ? GATE_SECTIONS
    : (ROLE_SECTIONS[role] === 'ALL' || isSuperAdmin) ? 'ALL'
    : (ROLE_SECTIONS[role] || ['Dashboard']);

  function sectionVisible(label) {
    return allowedSections === 'ALL' || allowedSections.includes(label);
  }

  function itemVisible(href) {
    if (isSuperAdmin) return true;
    const required = getRequiredPermission(href);
    if (!required) return true;
    if (!myPermissions) return true;
    return myPermissions.has(required);
  }

  function toggleSection(label) {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <nav className="w-64 bg-white border-r h-screen overflow-y-auto flex-shrink-0">
      <div className="p-4">
        {NAV.map(item => {
          if (!sectionVisible(item.label)) return null;

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

          const isOpen = openSections[item.label] ?? true;
          const Icon = item.icon;
          return (
            <div key={item.label} className="mb-1">
              <button onClick={() => toggleSection(item.label)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">
                <span className="flex items-center gap-2"><Icon size={16} /> {item.label}</span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {isOpen && (
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
