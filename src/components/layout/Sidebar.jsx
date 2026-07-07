'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useState } from 'react';
import { ShoppingCart,
  LayoutDashboard, Settings, Building2, Factory,
  Layers, Users2, GitBranch, Calendar, ChevronDown,
  ChevronRight, Users, Hash, SlidersHorizontal,
  FileText, ClipboardList, Database, Shield,
  UserCheck, Activity, BarChart3, Truck, LogIn,
  PackageCheck, PackageOpen, BadgeCheck, Box,
  Ruler, Tag, List, CreditCard, Globe, Calculator } from 'lucide-react';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Master Setup', icon: Settings,
    children: [
      { label: 'Company',         href: '/masters/company',        icon: Building2 },
      { label: 'Plants',          href: '/masters/plant',          icon: Factory   },
      { label: 'Units',           href: '/masters/unit',           icon: Layers    },
      { label: 'Departments',     href: '/masters/department',     icon: Users2    },
      { label: 'Branches',        href: '/masters/branch',         icon: GitBranch },
      { label: 'Financial Years', href: '/masters/financial-year', icon: Calendar  },
      { label: 'Vendors', href: '/masters/vendors', icon: Truck },
      { label: 'Products', href: '/masters/products', icon: Box },
      { label: 'Raw Materials', href: '/masters/raw-materials', icon: PackageOpen },
      { label: 'HSN / SAC', href: '/masters/hsn-sac', icon: Hash },
      { label: 'Price Lists', href: '/masters/price-lists', icon: Tag },
      { label: 'Price History', href: '/masters/price-history', icon: Activity },
      { label: 'Product Revisions', href: '/masters/product-revisions', icon: GitBranch },
    ],
  },
  {
    label: 'User Management', icon: Users,
    children: [{ label: 'Users', href: '/users', icon: Users2 }],
  },
  {
    label: 'Change Requests', icon: ClipboardList,
    children: [
      { label: 'All Requests', href: '/change-requests',        icon: FileText      },
      { label: 'New Request',  href: '/change-requests/create', icon: ClipboardList },
    ],
  },
  {
    label: 'Gate Management', icon: Shield,
    children: [
      { label: 'Dashboard',       href: '/gate/dashboard',       icon: BarChart3    },
      { label: 'Visitors',        href: '/gate/visitors',        icon: Users2       },
      { label: 'Check In',        href: '/gate/check-in',        icon: UserCheck    },
      { label: 'Active Visitors', href: '/gate/active',          icon: Activity     },
      { label: 'Vehicles',        href: '/gate/vehicles',        icon: Truck        },
      { label: 'Vehicle Entry',   href: '/gate/vehicle-entry',   icon: LogIn        },
      { label: 'Active Vehicles', href: '/gate/vehicles-active', icon: Truck        },
      { label: 'Gate Inward',     href: '/gate/inward',          icon: PackageCheck },
      { label: 'Gate Outward',    href: '/gate/outward',         icon: PackageOpen  },
      { label: 'Gate Passes',     href: '/gate/passes',          icon: BadgeCheck   },
    ],
  },
  {
    label: 'Purchase', icon: ShoppingCart,
    children: [
      { label: 'Requisitions', href: '/purchase/requisitions', icon: ClipboardList },
      { label: 'RFQ', href: '/purchase/rfqs', icon: FileText },
      { label: 'Quotations', href: '/purchase/quotations', icon: BadgeCheck },
      { label: 'Comparison', href: '/purchase/comparison', icon: BarChart3 },
      { label: 'Purchase Orders', href: '/purchase/orders', icon: PackageCheck },
      { label: 'PO Approvals', href: '/purchase/approvals', icon: BadgeCheck },
      { label: 'PO Amendments', href: '/purchase/amendments', icon: GitBranch },
      { label: 'Analytics', href: '/purchase/analytics', icon: BarChart3 },
    ] },
    { label: 'Import', icon: Globe, children: [
      { label: 'Import Orders', href: '/import/orders', icon: PackageCheck },
      { label: 'Proforma Invoices', href: '/import/proforma', icon: FileText },
      { label: 'LC / TT', href: '/import/lc-tt', icon: CreditCard },
      { label: 'Shipments', href: '/import/shipments', icon: Truck },
      { label: 'BL / AWB', href: '/import/bl-awb', icon: FileText },
      { label: 'Customs & Duty', href: '/import/customs', icon: Shield },
      { label: 'Landed Cost', href: '/import/landed-cost', icon: Calculator },
    ],
  },
  {
    label: 'Inventory', icon: Box,
    children: [
      { label: 'Inv. Dashboard', href: '/inventory/dashboard', icon: BarChart3 },
      { label: 'Items',       href: '/inventory/items',      icon: List  },
      { label: 'BOM',         href: '/inventory/bom',        icon: ClipboardList },
      { label: 'BOM Revisions', href: '/inventory/bom-revisions', icon: GitBranch },
      { label: 'UOM',         href: '/inventory/uom',        icon: Ruler },
      { label: 'Categories',  href: '/inventory/categories', icon: Tag       },
      { label: 'Warehouses',  href: '/inventory/warehouses', icon: Box       },
      { label: 'GRN', href: '/inventory/grn', icon: PackageOpen },
      { label: 'IQC', href: '/inventory/iqc', icon: BadgeCheck },
      { label: 'Stock Ledger', href: '/inventory/stock', icon: Database },
      { label: 'Rejected Stock', href: '/inventory/rejected', icon: Activity },
      { label: 'Rack & Bin', href: '/inventory/rack-bin', icon: Database },
      { label: 'Stock Putaway', href: '/inventory/putaway', icon: PackageCheck },
      { label: 'Batches & Lots', href: '/inventory/batches', icon: Layers },
      { label: 'Stock Issues', href: '/inventory/issues', icon: LogIn },
      { label: 'Stock Transfer', href: '/inventory/transfers', icon: Truck },
      { label: 'Stock Adjustment', href: '/inventory/adjustments', icon: SlidersHorizontal },
      { label: 'Stock Reports', href: '/inventory/reports', icon: FileText },
      { label: 'Inventory Valuation', href: '/inventory/valuation', icon: BarChart3 },
      { label: 'Inv. Reports', href: '/inventory/inv-reports', icon: ClipboardList },
    ],
  },
  {
    label: 'Production', icon: ClipboardList,
    children: [
      { label: 'Dashboard', href: '/production/dashboard', icon: BarChart3 },
      { label: 'Work Orders', href: '/production/work-orders', icon: ClipboardList },
      { label: 'MRP', href: '/production/mrp', icon: BarChart3 },
      { label: 'Material Issue', href: '/production/material-issue', icon: LogIn },
      { label: 'Production Entry', href: '/production/recording', icon: ClipboardList },
      { label: 'IPQC', href: '/production/ipqc', icon: ClipboardList },
      { label: 'FG Receipt', href: '/production/fg-receipt', icon: LogIn },
      { label: 'Cost Sheet', href: '/production/cost-sheet', icon: BarChart3 },
      { label: 'Production Reports', href: '/production/reports', icon: FileText },
    ],
  },
  {
    label: 'Quality', icon: ClipboardList,
    children: [
      { label: 'Dashboard', href: '/quality/dashboard', icon: BarChart3 },
      { label: 'NCR', href: '/quality/ncr', icon: ClipboardList },
      { label: 'CAPA', href: '/quality/capa', icon: ClipboardList },
      { label: 'Root Cause', href: '/quality/rca', icon: ClipboardList },
      { label: 'OQC', href: '/quality/oqc', icon: ClipboardList },
      { label: 'Supplier Quality', href: '/quality/supplier', icon: ClipboardList },
      { label: 'Complaints', href: '/quality/complaints', icon: ClipboardList },
      { label: 'Quality Reports', href: '/quality/reports', icon: FileText },
    ],
  },
  {
    label: 'Finance', icon: BarChart3,
    children: [
      { label: 'Chart of Accounts', href: '/finance/accounts', icon: FileText },
      { label: 'Vouchers', href: '/finance/vouchers', icon: FileText },
      { label: 'Accounts Receivable', href: '/finance/ar', icon: FileText },
      { label: 'Accounts Payable', href: '/finance/ap', icon: FileText },
      { label: 'GST Management', href: '/finance/gst', icon: FileText },
      { label: 'Bank Reconciliation', href: '/finance/bank-recon', icon: FileText },
      { label: 'Financial Reports', href: '/finance/reports', icon: FileText },
    ],
  },
  {
    label: 'My Profile', icon: BarChart3,
    children: [
      { label: 'My Profile & ESS', href: '/hr/my-profile', icon: BarChart3 },
    ],
  },
  {
    label: 'HR', icon: BarChart3,
    children: [
      { label: 'Employees', href: '/hr/employees', icon: BarChart3 },
      { label: 'Departments', href: '/hr/departments', icon: BarChart3 },
      { label: 'Attendance', href: '/hr/attendance', icon: BarChart3 },
      { label: 'Leave', href: '/hr/leave', icon: BarChart3 },
      { label: 'Payroll', href: '/hr/payroll', icon: BarChart3 },
      { label: 'PF & ESI', href: '/hr/pf-esi', icon: BarChart3 },
      { label: 'TDS', href: '/hr/tds', icon: BarChart3 },
      { label: 'HR Reports', href: '/hr/reports', icon: BarChart3 },
      { label: 'Training', href: '/hr/training', icon: BarChart3 },
    ],
  },
  {
    label: 'Industry 4.0', icon: BarChart3,
    children: [
      { label: 'IoT & AI Dashboard', href: '/iot', icon: BarChart3 },
      { label: 'Vendor Portal', href: '/vendor-portal', icon: BarChart3 },
      { label: 'Customer Portal', href: '/customer-portal', icon: BarChart3 },
    ],
  },
  {
    label: 'Analytics', icon: BarChart3,
    children: [
      { label: 'Executive Dashboard', href: '/analytics', icon: BarChart3 },
      { label: 'Sales Analytics', href: '/analytics/sales', icon: BarChart3 },
      { label: 'Purchase Analytics', href: '/analytics/purchase', icon: BarChart3 },
      { label: 'Inventory Analytics', href: '/analytics/inventory', icon: BarChart3 },
      { label: 'Production Analytics', href: '/analytics/production', icon: BarChart3 },
      { label: 'Quality Analytics', href: '/analytics/quality', icon: BarChart3 },
      { label: 'Finance Analytics', href: '/analytics/finance', icon: BarChart3 },
      { label: 'MIS Reports', href: '/analytics/mis-reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Documents', icon: FileText,
    children: [
      { label: 'Document Center', href: '/documents', icon: FileText },
    ],
  },
  {
    label: 'Notifications', icon: FileText,
    children: [
      { label: 'All Notifications', href: '/notifications', icon: FileText },
      { label: 'Alert Management', href: '/alerts', icon: FileText },
      { label: 'Approvals', href: '/workflows', icon: FileText },
      { label: 'Tasks', href: '/tasks', icon: FileText },
    ],
  },
  {
    label: 'Sales', icon: BarChart3,
    children: [
      { label: 'Leads', href: '/sales/leads', icon: Users },
      { label: 'Quotations', href: '/sales/quotations', icon: FileText },
      { label: 'Customer PO', href: '/sales/customer-po', icon: ClipboardList },
      { label: 'Sales Orders', href: '/sales/sales-orders', icon: FileText },
      { label: 'Dispatch Planning', href: '/sales/dispatch-planning', icon: ClipboardList },
      { label: 'Dispatch', href: '/sales/dispatch', icon: ClipboardList },
      { label: 'Delivery', href: '/sales/delivery', icon: ClipboardList },
      { label: 'Credit Control', href: '/sales/credit-control', icon: ClipboardList },
    ],
  },
  {
    label: 'Settings', icon: SlidersHorizontal,
    children: [
      { label: 'System Settings',  href: '/settings/system',     icon: Settings  },
      { label: 'Custom Fields',    href: '/settings/custom-fields', icon: Database  },
      { label: 'Numbering Series', href: '/settings/numbering',  icon: Hash      },
      { label: 'Dummy Data',       href: '/settings/dummy-data', icon: Database  },
    ],
  },
];

function NavItem({ item }) {
  const pathname = usePathname();
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(isChildActive ?? false);

  if (item.children) {
    return (
      <div>
        <button onClick={() => setOpen(!open)}
          className={clsx(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
            isChildActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}>
          <span className="flex items-center gap-2.5"><item.icon size={16} />{item.label}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div className="ml-3 mt-1 pl-3 border-l border-gray-200 space-y-0.5">
            {item.children.map((child) => {
              const active = pathname === child.href || pathname.startsWith(child.href + '/');
              return (
                <Link key={child.href} href={child.href}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    active ? 'bg-blue-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}>
                  <child.icon size={15} />{child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const active = pathname === item.href || pathname.startsWith(item.href + '/');
  return (
    <Link href={item.href}
      className={clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
        active ? 'bg-blue-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}>
      <item.icon size={16} />{item.label}
    </Link>
  );
}

export default function Sidebar({ onClose }) {
  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Oregenal ERP</p>
        <p className="text-sm font-bold text-gray-800 mt-0.5">Manufacturing</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => <NavItem key={item.href ?? item.label} item={item} />)}
      </nav>
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-400">Phase 3 — Module 14</p>
      </div>
    </aside>
  );
}
