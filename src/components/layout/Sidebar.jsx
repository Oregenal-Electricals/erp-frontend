'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { getUser } from '@/lib/auth';
import {
  ShoppingCart, LayoutDashboard, Settings, Building2, Factory,
  Layers, Users2, GitBranch, Calendar, ChevronDown, ChevronRight,
  Users, Hash, SlidersHorizontal, FileText, ClipboardList, Database,
  Shield, UserCheck, Activity, BarChart3, Truck, LogIn, PackageCheck,
  PackageOpen, BadgeCheck, Box, Ruler, Tag, List, CreditCard,
  Globe, Calculator, X
} from 'lucide-react';

// Role-based section visibility
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

// Gate operator specific
const GATE_SECTIONS = ['Dashboard','Gate Management'];

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
      { label: 'Vendors',         href: '/masters/vendors',        icon: Truck     },
      { label: 'Products',        href: '/masters/products',       icon: Box       },
      { label: 'Raw Materials',   href: '/masters/raw-materials',  icon: PackageOpen },
      { label: 'HSN / SAC',       href: '/masters/hsn-sac',        icon: Hash      },
      { label: 'Price Lists',     href: '/masters/price-lists',    icon: Tag       },
      { label: 'Price History',   href: '/masters/price-history',  icon: Activity  },
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
      { label: 'Dashboard',       href: '/gate-dashboard',   icon: BarChart3    },
      { label: 'Visitors',        href: '/gate/visitors',    icon: Users2       },
      { label: 'Vehicles',        href: '/gate/vehicles',    icon: Truck        },
      { label: 'Gate Inward',     href: '/gate/inward',      icon: PackageCheck },
      { label: 'Gate Outward',    href: '/gate/outward',     icon: PackageOpen  },
      { label: 'Gate Passes',     href: '/gate/passes',      icon: BadgeCheck   },
    ],
  },
  {
    label: 'Purchase', icon: ShoppingCart,
    children: [
      { label: 'Requisitions',    href: '/purchase-requisitions', icon: ClipboardList },
      { label: 'RFQ',             href: '/rfq',                   icon: FileText      },
      { label: 'Quotations',      href: '/quotations',            icon: BadgeCheck    },
      { label: 'Comparison',      href: '/quotation-comparison',  icon: BarChart3     },
      { label: 'Purchase Orders', href: '/purchase-orders',       icon: PackageCheck  },
      { label: 'PO Approvals',    href: '/po-approvals',          icon: BadgeCheck    },
      { label: 'PO Amendments',   href: '/po-amendments',         icon: GitBranch     },
      { label: 'Analytics',       href: '/purchase-analytics',    icon: BarChart3     },
    ],
  },
  {
    label: 'Import', icon: Globe,
    children: [
      { label: 'Import Orders',     href: '/import-orders',     icon: PackageCheck },
      { label: 'Proforma Invoices', href: '/proforma-invoices', icon: FileText     },
      { label: 'Shipments',         href: '/shipments',         icon: Truck        },
      { label: 'Customs & Duty',    href: '/customs-entries',   icon: Shield       },
      { label: 'Landed Cost',       href: '/landed-costs',      icon: Calculator   },
    ],
  },
  {
    label: 'Sales', icon: Tag,
    children: [
      { label: 'Leads',           href: '/leads',                 icon: Users        },
      { label: 'Quotations',      href: '/quotations',            icon: FileText     },
      { label: 'Customer PO',     href: '/customer-po',           icon: ClipboardList },
      { label: 'Sales Orders',    href: '/sales-orders',          icon: FileText     },
      { label: 'Dispatch Plan',   href: '/dispatch-plans',        icon: ClipboardList },
      { label: 'Dispatch',        href: '/dispatches',            icon: Truck        },
      { label: 'Delivery',        href: '/delivery-confirmations',icon: PackageCheck },
      { label: 'Credit Control',  href: '/credit-control',        icon: CreditCard   },
    ],
  },
  {
    label: 'Inventory', icon: Database,
    children: [
      { label: 'Inv. Dashboard',  href: '/inventory-dashboard',   icon: BarChart3      },
      { label: 'Warehouses',      href: '/warehouse',             icon: Box            },
      { label: 'BOM',             href: '/bom',                   icon: ClipboardList  },
      { label: 'BOM Revisions',   href: '/bom-revisions',         icon: GitBranch      },
      { label: 'GRN',             href: '/grn',                   icon: PackageOpen    },
      { label: 'IQC',             href: '/iqc',                   icon: BadgeCheck     },
      { label: 'Stock Ledger',    href: '/stock-ledger',          icon: Database       },
      { label: 'Rejected Stock',  href: '/rejected-stock',        icon: Activity       },
      { label: 'Rack & Bin',      href: '/rack-bin',              icon: Database       },
      { label: 'Stock Putaway',   href: '/stock-putaway',         icon: PackageCheck   },
      { label: 'Batches & Lots',  href: '/stock-batches',         icon: Layers         },
      { label: 'Stock Issues',    href: '/stock-issues',          icon: LogIn          },
      { label: 'Stock Transfer',  href: '/stock-transfers',       icon: Truck          },
      { label: 'Stock Adjustment',href: '/stock-adjustments',     icon: SlidersHorizontal },
      { label: 'Stock Reports',   href: '/stock-reports',         icon: FileText       },
      { label: 'Inv. Valuation',  href: '/inventory-valuation',   icon: BarChart3      },
      { label: 'Inv. Reports',    href: '/inventory-reports',     icon: FileText       },
    ],
  },
  {
    label: 'Production', icon: Factory,
    children: [
      { label: 'Dashboard',       href: '/production-dashboard',    icon: BarChart3     },
      { label: 'Work Orders',     href: '/work-orders',             icon: ClipboardList },
      { label: 'MRP',             href: '/mrp',                     icon: BarChart3     },
      { label: 'Material Issue',  href: '/production-issues',       icon: LogIn         },
      { label: 'Production Entry',href: '/production-entries',      icon: ClipboardList },
      { label: 'IPQC',            href: '/production-qc',           icon: BadgeCheck    },
      { label: 'FG Receipt',      href: '/fg-receipts',             icon: LogIn         },
      { label: 'Cost Sheet',      href: '/production-cost-sheets',  icon: BarChart3     },
      { label: 'Reports',         href: '/production-reports',      icon: FileText      },
    ],
  },
  {
    label: 'Quality', icon: BadgeCheck,
    children: [
      { label: 'Dashboard',       href: '/quality-dashboard',   icon: BarChart3     },
      { label: 'NCR',             href: '/ncr',                 icon: ClipboardList },
      { label: 'CAPA',            href: '/capa',                icon: ClipboardList },
      { label: 'Root Cause',      href: '/quality-rca',         icon: ClipboardList },
      { label: 'OQC',             href: '/oqc',                 icon: ClipboardList },
      { label: 'Supplier Quality',href: '/supplier-quality',    icon: ClipboardList },
      { label: 'Complaints',      href: '/customer-complaints', icon: ClipboardList },
      { label: 'Reports',         href: '/quality-reports',     icon: FileText      },
    ],
  },
  {
    label: 'HR', icon: Users,
    children: [
      { label: 'My Profile',   href: '/hr/my-profile',  icon: UserCheck  },
      { label: 'Employees',    href: '/hr/employees',   icon: Users2     },
      { label: 'Departments',  href: '/hr/departments', icon: Users2     },
      { label: 'Attendance',   href: '/hr/attendance',  icon: Activity   },
      { label: 'Leave',        href: '/hr/leave',       icon: Calendar   },
      { label: 'Payroll',      href: '/hr/payroll',     icon: Calculator },
      { label: 'PF & ESI',     href: '/hr/pf-esi',      icon: Shield     },
      { label: 'TDS',          href: '/hr/tds',         icon: FileText   },
      { label: 'HR Reports',   href: '/hr/reports',     icon: BarChart3  },
      { label: 'Training',     href: '/hr/training',    icon: ClipboardList },
    ],
  },
  {
    label: 'Finance', icon: Calculator,
    children: [
      { label: 'Chart of Accounts',  href: '/finance/accounts',  icon: BarChart3  },
      { label: 'Vouchers',           href: '/finance/vouchers',  icon: FileText   },
      { label: 'Accounts Receivable',href: '/finance/ar',        icon: FileText   },
      { label: 'Accounts Payable',   href: '/finance/ap',        icon: FileText   },
      { label: 'GST Management',     href: '/finance/gst',       icon: FileText   },
      { label: 'Bank Reconciliation',href: '/finance/bank-recon',icon: FileText   },
      { label: 'Financial Reports',  href: '/finance/reports',   icon: FileText   },
    ],
  },
  {
    label: 'Industry 4.0', icon: BarChart3,
    children: [
      { label: 'IoT & AI Dashboard', href: '/iot',              icon: BarChart3 },
      { label: 'Vendor Portal',      href: '/vendor-portal',    icon: BarChart3 },
      { label: 'Customer Portal',    href: '/customer-portal',  icon: BarChart3 },
    ],
  },
  {
    label: 'Analytics', icon: BarChart3,
    children: [
      { label: 'Sales Analytics',       href: '/analytics/sales',       icon: BarChart3 },
      { label: 'Purchase Analytics',    href: '/analytics/purchase',    icon: BarChart3 },
      { label: 'Inventory Analytics',   href: '/analytics/inventory',   icon: BarChart3 },
      { label: 'Production Analytics',  href: '/analytics/production',  icon: BarChart3 },
      { label: 'Quality Analytics',     href: '/analytics/quality',     icon: BarChart3 },
      { label: 'Finance Analytics',     href: '/analytics/finance',     icon: BarChart3 },
    ],
  },
  {
    label: 'Settings', icon: Settings,
    children: [
      { label: 'System Settings', href: '/settings/system',        icon: Settings      },
      { label: 'Numbering Series',href: '/settings/numbering',     icon: Hash          },
      { label: 'Custom Fields',   href: '/settings/custom-fields', icon: SlidersHorizontal },
      { label: 'Dummy Data',      href: '/settings/dummy-data',    icon: Database      },
    ],
  },
];

function NavItem({ item, onClose }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => item.children?.some(c => pathname.startsWith(c.href)));
  const isActive = item.href ? pathname === item.href : item.children?.some(c => pathname.startsWith(c.href));

  if (item.href) {
    return (
      <Link
        href={item.href}
        onClick={() => onClose && onClose()}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          pathname === item.href
            ? 'bg-indigo-50 text-indigo-700 font-semibold'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <item.icon size={16} className="shrink-0" />
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive ? 'text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <item.icon size={16} className="shrink-0" />
          {item.label}
        </div>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-100 pl-3">
          {item.children.map(child => (
            <Link
              key={child.href}
              href={child.href}
              onClick={() => onClose && onClose()}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                pathname === child.href || pathname.startsWith(child.href + '/')
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <child.icon size={13} className="shrink-0" />
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ onClose }) {
  const user = getUser();
  const role = user?.role || 'VIEWER';

  // Filter nav based on role
  const allowedSections = ROLE_SECTIONS[role];

  // Gate operator only sees gate
  const isGateOperator = role === 'OPERATOR' && user?.email?.includes('gate');

  const filteredNav = NAV.filter(item => {
    if (allowedSections === 'ALL') return true;
    if (isGateOperator) return GATE_SECTIONS.includes(item.label);
    return allowedSections.includes(item.label);
  });

  // Always show My Profile under HR for all users
  const navWithProfile = filteredNav.map(item => {
    if (item.label === 'HR' && role !== 'SUPER_ADMIN' && role !== 'CORPORATE_ADMIN' && role !== 'HR_MANAGER') {
      return { ...item, children: item.children?.filter(c => c.href === '/hr/my-profile') };
    }
    return item;
  });

  return (
    <aside className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Mobile close button */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 lg:hidden border-b mb-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Navigation</span>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 text-lg leading-none">
          <X size={18} />
        </button>
      </div>

      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Factory size={16} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-800 leading-tight">Oregenal</div>
            <div className="text-xs text-gray-400 leading-tight">ERP / MES</div>
          </div>
        </div>
        {/* Role badge */}
        <div className="mt-2">
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
            {role.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navWithProfile.map(item => (
          <NavItem key={item.label} item={item} onClose={onClose} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="text-xs text-gray-400 text-center">
          Oregenal Electricals India Pvt Ltd
        </div>
      </div>
    </aside>
  );
}
