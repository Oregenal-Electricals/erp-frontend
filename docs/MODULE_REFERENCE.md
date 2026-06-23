# ACME ELECTRONICS — ERP/MES PLATFORM
## Complete Module Reference Guide
> **Auto-updated as modules are built. Last updated: June 23, 2026**
> Stack: NestJS + Prisma + PostgreSQL (Backend) | Next.js + Tailwind (Frontend)
> Hosting: Render (Backend) | Vercel (Frontend) | Neon (Database)

---

## HOW TO READ THIS FILE

Each module entry contains:
- **What it does** — plain English explanation
- **Database tables** — what gets stored
- **API endpoints** — what URLs exist
- **Frontend pages** — where users interact
- **Business rules** — critical constraints
- **Status** — COMPLETE / IN PROGRESS / PLANNED

---

# PHASE 0 — INFRASTRUCTURE ✅

## Module 0.1 — GitHub Repositories
**What it does:** Version control for all code.
- Repos: `Oregenal-Electricals/erp-backend`, `Oregenal-Electricals/erp-frontend`
- Branch strategy: `staging` for live staging, `main` for production
- `dist/` committed to repo so Render can deploy without build step

## Module 0.2 — Development Environment
**What it does:** Local developer setup.
- Backend: `npm run start:dev` on port 3001
- Frontend: `npm run dev` on port 3000
- Dev DB: `erp_development` on Neon (Singapore)

## Module 0.3 — Live Staging Environment
**What it does:** Always-on staging environment.
- Backend: `https://erp-backend-ry5v.onrender.com`
- Frontend: `https://erp-frontend-five-alpha.vercel.app`
- Staging DB: `erp_staging` on Neon

---

# PHASE 1 — CORE ERP FOUNDATION ✅

## Module 1 — Master Setup
**What it does:** Defines the company, plants, units, departments, branches, and financial year. Everything else in the system belongs to a company.
- **Tables:** `companies`, `plants`, `units`, `departments`, `branches`, `financial_years`
- **Key rule:** Every record in the system has a `companyId` — data is scoped per company
- **Admin:** `admin@acmeelectronics.com` / `Admin@1234`
- **Company ID (dev):** `aaba1738-6e81-44f7-b630-aa0327620870`

## Module 2 — Users Management
**What it does:** Create, activate, deactivate users. Each user belongs to a company.
- **Tables:** `users`
- **API:** `GET/POST/PUT /users`, `POST /users/:id/activate`, `/deactivate`, `/reset-password`
- **Frontend:** `/users`, `/users/create`, `/users/:id`

## Module 3 — Roles & Permissions (RBAC)
**What it does:** Controls what each user can see and do. Permissions are assigned per role.
- **Tables:** `roles`, `permissions`, `role_permissions`
- **Key rule:** Every API endpoint checks `PermissionsGuard` — access denied if permission missing
- **Super Admin:** bypasses all permission checks
- **Pattern:** `@RequirePermissions(Permission.INVENTORY_VIEW)` on every controller

## Module 4 — Super Admin Settings
**What it does:** Global system settings, approval workflows, numbering series (PO numbers, PR numbers etc.)
- **Tables:** `settings`, `numbering_series`
- **Numbering:** Uses `SELECT FOR UPDATE` pessimistic locking to prevent duplicate numbers
- **Frontend:** `/settings/system`, `/settings/numbering`

## Module 5 — Change Request Management
**What it does:** Formal change request process for master data modifications.
- **Tables:** `change_requests`
- **Workflow:** DRAFT → SUBMITTED → APPROVED/REJECTED

## Module 6 — Dummy Data Management
**What it does:** Load sample/test data for demos. Purge all test data when done.
- **API:** `POST /dummy-data/seed/:companyId`, `DELETE /dummy-data/purge/:companyId`
- **Key rule:** All test records have `isTestData: true` — purge only deletes these
- **Admin protected:** `admin@acmeelectronics.com` never purged

---

# PHASE 2 — GATE MANAGEMENT ✅ (44 E2E tests)

## Module 7 — Visitor Management
**What it does:** Register visitors entering the factory. Track their purpose, ID proof, and host.
- **Tables:** `visitors`, `visitor_logs`
- **Frontend:** `/gate/visitors`, `/gate/active`
- **Flow:** Register → Check-in → Check-out

## Module 8 — Vehicle Management
**What it does:** Register vehicles (trucks, cars) entering/exiting the factory.
- **Tables:** `vehicles`, `vehicle_logs`
- **Frontend:** `/gate/vehicles`

## Module 9 — Gate Inward
**What it does:** Record materials entering the factory gate — before they go to GRN.
- **Tables:** `gate_inwards`, `gate_inward_items`
- **Frontend:** `/gate/inward`
- **Key rule:** Every inward must have a purpose (purchase delivery, returnable, other)

## Module 10 — Gate Outward
**What it does:** Record materials leaving the factory gate.
- **Tables:** `gate_outwards`, `gate_outward_items`
- **Frontend:** `/gate/outward`

## Module 11 — Gate Pass System
**What it does:** Generate gate passes for materials going out — returnable or non-returnable.
- **Tables:** `gate_passes`, `gate_pass_items`
- **Types:** RETURNABLE (must come back), NON_RETURNABLE (permanent exit)
- **Frontend:** `/gate/passes`

## Module 12 — Gate Security Dashboard
**What it does:** Real-time view of who/what is currently inside the factory.
- **Frontend:** `/gate/dashboard`
- **Shows:** Active visitors, active vehicles, today's inward/outward counts

---

# PHASE 3 — MASTER DATA MANAGEMENT ✅ (55 E2E tests)

## Module 13 — Item Master
**What it does:** Master catalog of all items (raw materials, components, finished goods). Defines UOM, categories, HSN codes.
- **Tables:** `items`, `item_categories`, `uoms`
- **API:** `GET/POST/PUT /items`, `/items/uom`, `/items/categories`
- **Frontend:** `/inventory/items`, `/inventory/items/:id`, `/inventory/items/create`

## Module 14 — Vendor Master
**What it does:** Master list of all suppliers/vendors. Stores contact, GST, payment terms, ratings.
- **Tables:** `vendors`
- **API:** `GET/POST/PUT /vendors`, `/vendors/stats`
- **Frontend:** `/masters/vendors`
- **Custom Fields:** Supported via `<CustomFields module="VENDOR" />`
- **Key fields:** gstin, state, paymentTerms, creditLimit, rating

## Module 15 — Product Master
**What it does:** Finished products that Acme Electronics manufactures and sells.
- **Tables:** `products`
- **API:** `GET/POST/PUT /products`
- **Frontend:** `/masters/products`
- **Custom Fields:** Supported
- **Key fields:** code, name, productType, hsnCode, gstRate, brand, revision

## Module 16 — Raw Material Master
**What it does:** All raw materials and components used in production.
- **Tables:** `raw_materials`
- **API:** `GET/POST/PUT /raw-materials`
- **Frontend:** `/masters/raw-materials`
- **Custom Fields:** Supported
- **Key fields:** materialType, hsnCode, minStockLevel, reorderQty, leadTimeDays

## Module 17 — HSN/SAC Master
**What it does:** GST tax codes for all items. HSN for goods, SAC for services.
- **Tables:** `hsn_sac_codes`
- **API:** `GET/POST/PUT /hsn-sac`
- **Frontend:** `/masters/hsn-sac`
- **Key rule:** GST auto-splits into IGST/CGST/SGST based on rate:
  - Inter-state: full rate goes to IGST
  - Intra-state: rate split 50/50 into CGST + SGST

## Module 18 — Price List Management
**What it does:** Manage sales and purchase price lists per product/item.
- **Tables:** `price_lists`, `price_list_items`
- **API:** `GET/POST/PUT /price-lists`, `/price-lists/:id/items`, `/items/:id/approve`
- **Frontend:** `/masters/price-lists`
- **KEY RULE (Rule #10):** Once a price is approved, it is FROZEN FOREVER. Old approved order prices never change after revision.

## Module 19 — Price History
**What it does:** Read-only audit trail of all price changes over time.
- **Tables:** `price_history` (auto-created when prices change)
- **API:** `GET /price-history/search`, `/price-history/effective/:itemCode`
- **Frontend:** `/masters/price-history`
- **Key rule:** Read-only. No create/update/delete.

## Module 20 — Product Revision Control
**What it does:** Track engineering changes to products over time.
- **Tables:** `product_revisions`
- **API:** `GET/POST /product-revisions`, `POST /:id/approve`, `/:id/obsolete`
- **Frontend:** `/masters/product-revisions`
- **Workflow:** DRAFT → APPROVED → OBSOLETE

## Module 21 — BOM Management
**What it does:** Bill of Materials — defines exactly which raw materials/components make one unit of a finished product, with quantities.
- **Tables:** `boms`, `bom_items`
- **API:** `GET/POST/PUT /boms`, `/boms/:id/items`, `/boms/:id/approve`, `/boms/:id/clone`
- **Frontend:** `/inventory/bom`, `/inventory/bom/:id`
- **Custom Fields:** Supported (shown on detail page)
- **Business rules:**
  - BOM must have at least 1 item before approval
  - APPROVED BOM is locked — no item edits allowed
  - Clone creates new DRAFT version with all items copied
  - `effectiveQty = quantity × (1 + wastagePercent/100)`
  - `totalCost = effectiveQty × unitPrice`
  - BOM totalCost auto-recalculates when items change

## Module 22 — BOM Revision Control
**What it does:** Tracks ECN (Engineering Change Notes) — formal records of what changed between BOM versions.
- **Tables:** `bom_revisions`
- **API:** `GET/POST /bom-revisions`, `/bom-revisions/product/:productId`, `POST /:id/approve`
- **Frontend:** `/inventory/bom-revisions`
- **Fields:** revisionNumber, changeType (MAJOR/MINOR/PATCH), changeDescription, ecnNumber, old BOM vs new BOM links

## Module 22A — Custom Fields Engine
**What it does:** Super Admin can add custom fields to any module without writing code. Fields appear automatically in forms.
- **Tables:** `custom_field_definitions`, `custom_field_values`
- **API:** `GET/POST/PUT /custom-fields/definitions`, `GET/POST /custom-fields/values/:module/:recordId`
- **Frontend:** `/settings/custom-fields` (Super Admin settings page)
- **Component:** `<CustomFields module="BOM" recordId={item.id} />` — drop into any page
- **Field types:** TEXT, NUMBER, DATE, BOOLEAN, DROPDOWN
- **Modules supported:** BOM, VENDOR, PRODUCT, RAW_MATERIAL, ITEM, PRICE_LIST
- **How to use:** Super Admin adds a field → appears on all create/edit forms for that module → users fill it → data saved per record

---

# PHASE 4 — PURCHASE MANAGEMENT 🔄 (In Progress)

## Module 23 — Purchase Requisition ✅
**What it does:** Internal request to purchase materials. Raised by production/engineering team when they need something.
- **Tables:** `purchase_requisitions`, `purchase_requisition_items`
- **API:** `GET/POST/PUT /purchase-requisitions`, `POST /:id/submit`, `/:id/approve`, `/:id/reject`, `/:id/items`
- **Frontend:** `/purchase/requisitions`, `/purchase/requisitions/:id`
- **Workflow:** DRAFT → SUBMITTED → APPROVED/REJECTED → PO_RAISED → CLOSED
- **Business rules:**
  - Must have at least 1 item before submitting
  - Rejection requires a reason
  - `requiredDate` must be future date
  - `estimatedTotal = requiredQty × estimatedUnitPrice`

## Module 24 — RFQ Management ✅
**What it does:** Request for Quotation — sent to multiple vendors asking them to provide pricing.
- **Tables:** `rfqs`, `rfq_vendors`, `rfq_items`
- **API:** `GET/POST/PUT /rfqs`, `POST /:id/send`, `/:id/close`, `/:id/cancel`, `/:id/vendors`, `DELETE /:id/vendors/:vendorId`
- **Frontend:** `/purchase/rfqs`, `/purchase/rfqs/:id`
- **Workflow:** DRAFT → SENT → CLOSED / CANCELLED
- **Business rules:**
  - Must link to an APPROVED PR
  - Must have at least 1 vendor and 1 item before sending
  - Items auto-populated from PR items
  - Vendor status on RFQ: INVITED → QUOTED → DECLINED

## Module 25 — Vendor Quotation ✅
**What it does:** Records vendor's response to RFQ — their prices, delivery time, and terms.
- **Tables:** `vendor_quotations`, `vendor_quotation_items`
- **API:** `GET/POST/PUT /vendor-quotations`, `POST /:id/submit`, `/:id/finalize`, `/:id/reject`, `PUT /:id/items/:itemId`
- **Frontend:** `/purchase/quotations`, `/purchase/quotations/:id`
- **Workflow:** DRAFT → SUBMITTED → FINALIZED / REJECTED
- **Business rules:**
  - One quotation per vendor per RFQ
  - Items auto-populated from RFQ items (vendor fills in pricing)
  - All items must have unitPrice > 0 before submitting
  - `totalPrice = unitPrice × quotedQty × (1 - discount%) × (1 + taxRate%)`
  - When submitted, vendor status on RFQ changes to QUOTED

## Module 26 — Quotation Comparison ✅
**What it does:** Side-by-side comparison of all vendor quotations — L1/L2/L3 ranking. Purchasing team selects best vendor per item.
- **Tables:** `quotation_comparisons`
- **API:** `GET /quotation-comparison/:rfqId`, `POST /:rfqId/select`, `GET /:rfqId/summary`
- **Frontend:** `/purchase/comparison`
- **Business rules:**
  - L1 = cheapest price (highlighted green)
  - L2 = second cheapest (highlighted yellow)
  - L3 = third cheapest (highlighted orange)
  - Can select different vendors for different items (split PO)
  - Selections saved with reason

## Module 27 — Purchase Order ✅
**What it does:** The formal legal document sent to vendor to supply goods at agreed prices. Most critical procurement document.
- **Tables:** `purchase_orders`, `purchase_order_items`
- **API:** `GET/POST/PUT /purchase-orders`, `POST /:id/approve`, `/:id/send`, `/:id/cancel`, `/:id/items`, `PUT /:id/items/:itemId`, `DELETE /:id/items/:itemId`
- **Frontend:** `/purchase/orders`, `/purchase/orders/:id`
- **Workflow:** DRAFT → APPROVED → SENT → PARTIALLY_RECEIVED → CLOSED / CANCELLED
- **GST calculation:**
  - Inter-state vendor: full taxRate → IGST
  - Intra-state vendor: taxRate/2 → CGST + taxRate/2 → SGST
- **CRITICAL RULE (Rule #10):** Prices are FROZEN after approval. Cannot edit items after approval. System enforces with error: "Prices are FROZEN — cannot edit items after approval"
- **Totals:** `subtotal = sum(unitPrice × qty × (1-discount%))`, `totalTax = sum(taxAmount)`, `totalAmount = subtotal + totalTax`

## Module 28 — PO Approval ✅
**What it does:** Multi-level approval workflow for Purchase Orders based on value thresholds. Super Admin configures how many levels are needed.
- **Tables:** `po_approvals`, `po_approval_settings`
- **API:** `GET /po-approvals/pending`, `GET /po-approvals/settings`, `POST /po-approvals/settings`, `POST /po-approvals/:poId/approve`, `POST /po-approvals/:poId/reject`, `GET /po-approvals/:poId/history`
- **Frontend:** `/purchase/approvals` (2 tabs: Pending Approvals + Settings)
- **How levels work:**
  ```
  L1: ₹0 – ₹50,000      → Purchase Manager approves
  L2: ₹50,001 – ₹5,00,000 → GM Purchase also approves
  L3: Above ₹5,00,000    → CFO/MD also approves
  ```
- **Business rules:**
  - All required levels must approve before PO status → APPROVED
  - Any level can reject — PO stays DRAFT with rejection reason
  - If no settings configured → single-level approval (anyone can approve)
  - Approval audit trail stored with timestamp, user, level, remarks

## Module 29 — PO Amendment ⬜ PLANNED
**What it does:** When a PO needs to change after approval (qty, delivery date), a formal amendment is created. Old PO version is preserved.
- **Planned tables:** `po_amendments`, `po_amendment_items`
- **Planned workflow:** Create amendment → Approve amendment → Old PO superseded
- **Key rule:** Amendment also goes through approval workflow like original PO

## Module 30 — Purchase Analytics ⬜ PLANNED
**What it does:** Dashboard showing purchase trends, vendor performance, spend analysis, on-time delivery.
- **Planned:** Charts for monthly spend, vendor-wise spend, category-wise spend, PR-to-PO cycle time

---

# PHASE 5 — IMPORT MANAGEMENT ⬜ PLANNED

## Module 31 — Import Purchase Order
**What it does:** Special PO for international purchases with currency, Incoterms, LC details.

## Module 32 — Proforma Invoice
**What it does:** Vendor's invoice before shipment for LC/advance payment.

## Module 33 — LC / TT Management
**What it does:** Letter of Credit and Telegraphic Transfer payment tracking.

## Module 34 — Shipment Tracking
**What it does:** Track international shipments with vessel/flight details.

## Module 35 — BL / AWB Tracking
**What it does:** Bill of Lading / Airway Bill document management.

## Module 36 — Customs & Duty Management
**What it does:** Customs duty calculation, BOE (Bill of Entry) management.

## Module 37 — Landed Cost Calculation
**What it does:** Calculate total cost of imported goods including freight, insurance, customs duty.

---

# PHASE 6 — INVENTORY & WAREHOUSE ⬜ PLANNED

## Module 38 — GRN (Goods Receipt Note)
**What it does:** When vendor delivers goods, GRN is created against PO. Stock enters system here.
- **Critical link:** GRN → PO items → updates `receivedQty` and `pendingQty`
- **Key rule:** Cannot receive more than ordered qty

## Module 39 — IQC Pending Stock
**What it does:** Stock received but pending quality inspection.

## Module 40 — Accepted Stock
**What it does:** Stock passed quality inspection — available for production.

## Module 41 — Rejected Stock
**What it does:** Stock failed quality inspection — returned to vendor or scrapped.

## Module 42 — Warehouse Master ✅ (Built early)
**What it does:** Define warehouse zones, racks, bins.
- **Tables:** `warehouses`, `zones`, `racks`, `bins`
- **API:** `/masters/warehouses`
- **Frontend:** `/inventory/warehouses`

## Modules 43-52 — Inventory Operations ⬜ PLANNED
Rack Management, Bin Management, Batch Management, Lot Tracking, FIFO/FEFO, Stock Reservation, Stock Transfer, Stock Adjustment, Stock Ledger, Inventory Dashboard

---

# PHASE 7 — QUALITY MANAGEMENT ⬜ PLANNED

## Modules 53-62
IQC, PQC, OQC, NCR, CAPA, Root Cause Analysis, 5-Why, Fishbone, Supplier Quality, Customer Complaints

---

# PHASE 8 — PRODUCTION PLANNING ⬜ PLANNED

## Modules 63-68
Production Planning, Capacity Planning, Material Planning, Shift Planning, Resource Planning, APS Scheduling

---

# PHASE 9 — MES PRODUCTION EXECUTION ⬜ PLANNED

## Modules 69-83
Work Orders, Material Issue, Kitting, SMT Production, MI Production, Assembly Production, Testing, Quality Hold, Packing, Finished Goods Transfer, Production Dashboard, WIP Management, Line Balancing, OEE Tracking, Downtime Tracking

---

# PHASE 10-20 — REMAINING PHASES ⬜ PLANNED

| Phase | Name | Modules |
|-------|------|---------|
| 10 | Traceability | 84-88 |
| 11 | Maintenance | 89-94 |
| 12 | Sales & Dispatch | 95-102 |
| 13 | Finance & GST | 103-109 |
| 14 | Communication | 110-113 |
| 15 | Documents & Reports | 114-118 |
| 16 | Dashboards & BI | 119-124 |
| 17 | Portals | 125-126 |
| 18 | Industry 4.0 | 127-130 |
| 19 | Enterprise Expansion | 131-133 |
| 20 | Go Live | 134-138 |

---

# UNIVERSAL ARCHITECTURE RULES
> These rules apply to EVERY module, EVERY table, EVERY API.

## Database Rules
- Every table has: `id (UUID)`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `isActive`, `isTestData`
- Soft delete only — never hard delete. Use `isActive: false`
- Every record scoped by `companyId`
- No negative stock enforced at DB and service layer

## API Rules
- Every endpoint: JWT auth + RBAC (PermissionsGuard) + validation + error handling + audit log
- Auth: Access tokens in memory, refresh tokens in httpOnly cookies
- All writes logged to audit trail via `AuditLogInterceptor`
- Response format: `{ success, statusCode, message, data, errors, timestamp, path }`

## Frontend Rules
- Next.js (.jsx files only, not .tsx)
- Route structure: `src/app/(app)/` for authenticated, `src/app/(auth)/` for login
- Sidebar: `src/components/layout/Sidebar.jsx`
- Every page: permission-based UI (buttons/tables hidden if no permission)

## Business Rules
1. **Price freeze:** Approved prices never change after revision
2. **BOM immutability:** BOM locked after approval
3. **No negative stock:** Enforced at DB and service layer
4. **Soft deletes only:** `isActive: false`, never DELETE from DB
5. **Audit everything:** All writes logged with user, timestamp, old/new values
6. **Company scoping:** All data filtered by `companyId` for non-super-admin users
7. **Pessimistic locking:** `SELECT FOR UPDATE` for numbering series to prevent duplicates
8. **GST auto-split:** IGST (interstate) vs CGST+SGST (intra-state) based on vendor state

---

# CURRENT STATUS SUMMARY

```
COMPLETED: 28 modules across Phases 0-4
IN PROGRESS: Module 29-30 (PO Amendment, Purchase Analytics)
TOTAL PLANNED: 138 modules (152 with Costing Tool additions)

E2E TEST COVERAGE:
  Phase 2 (Gate Management):  44 tests ✅
  Phase 3 (Master Data):      55 tests ✅
  Phase 4 (Purchase):         Planned after Phase 4 complete

STAGING:
  Backend:  https://erp-backend-ry5v.onrender.com
  Frontend: https://erp-frontend-five-alpha.vercel.app
  All 28 modules verified on staging
```

---

# QUICK REFERENCE — API ENDPOINTS

| Module | Base URL | Key Actions |
|--------|----------|-------------|
| Users | `/api/v1/users` | CRUD, activate, deactivate |
| Vendors | `/api/v1/vendors` | CRUD, stats |
| Products | `/api/v1/products` | CRUD, stats |
| Raw Materials | `/api/v1/raw-materials` | CRUD, stats |
| HSN/SAC | `/api/v1/hsn-sac` | CRUD, GST split |
| Price Lists | `/api/v1/price-lists` | CRUD, approve (freeze) |
| Price History | `/api/v1/price-history` | Read-only |
| Product Revisions | `/api/v1/product-revisions` | CRUD, approve, obsolete |
| BOMs | `/api/v1/boms` | CRUD, approve, clone, items |
| BOM Revisions | `/api/v1/bom-revisions` | CRUD, approve |
| Custom Fields | `/api/v1/custom-fields` | definitions, values |
| Purchase Requisitions | `/api/v1/purchase-requisitions` | CRUD, submit, approve, reject |
| RFQs | `/api/v1/rfqs` | CRUD, send, close, cancel, vendors |
| Vendor Quotations | `/api/v1/vendor-quotations` | CRUD, submit, finalize, reject |
| Quotation Comparison | `/api/v1/quotation-comparison` | matrix, select, summary |
| Purchase Orders | `/api/v1/purchase-orders` | CRUD, approve (freeze), send, cancel |
| PO Approvals | `/api/v1/po-approvals` | pending, approve, reject, settings |

---

# QUICK REFERENCE — FRONTEND PAGES

| URL | Module | Description |
|-----|--------|-------------|
| `/inventory/items` | M13 | Item catalog |
| `/masters/vendors` | M14 | Vendor list |
| `/masters/products` | M15 | Product list |
| `/masters/raw-materials` | M16 | Raw material list |
| `/masters/hsn-sac` | M17 | HSN/SAC codes |
| `/masters/price-lists` | M18 | Price list management |
| `/masters/price-history` | M19 | Price audit trail |
| `/masters/product-revisions` | M20 | Product revision history |
| `/inventory/bom` | M21 | BOM list |
| `/inventory/bom/:id` | M21 | BOM detail with items |
| `/inventory/bom-revisions` | M22 | BOM revision history |
| `/settings/custom-fields` | M22A | Custom field manager |
| `/purchase/requisitions` | M23 | Purchase requisitions |
| `/purchase/rfqs` | M24 | RFQ management |
| `/purchase/quotations` | M25 | Vendor quotations |
| `/purchase/comparison` | M26 | L1/L2/L3 comparison |
| `/purchase/orders` | M27 | Purchase orders |
| `/purchase/approvals` | M28 | PO approval workflow |

---

*This document is manually updated after each module completion. Add to it at the end of each module.*
