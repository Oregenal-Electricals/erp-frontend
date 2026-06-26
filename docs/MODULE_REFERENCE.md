# ACME ELECTRONICS — ERP/MES PLATFORM
## Complete Module Reference Guide
> **Auto-updated after every module completion. Last updated: June 26, 2026**
> Stack: NestJS + Prisma + PostgreSQL (Backend) | Next.js + Tailwind (Frontend)
> Hosting: Render (Backend) | Vercel (Frontend) | Neon (Database)

---

## HOW TO READ THIS FILE
Each module entry: What it does | DB tables | API endpoints | Frontend pages | Business rules | Status

---

# PHASE 0 — INFRASTRUCTURE ✅
## Module 0.1-0.5 — GitHub, Dev Environment, Staging, CI/CD, Monitoring
- Backend: https://erp-backend-ry5v.onrender.com | Frontend: https://erp-frontend-five-alpha.vercel.app
- Dev DB: erp_development | Staging DB: erp_staging (Neon, Singapore)
- Branch: staging (live) → main (production) | dist/ committed for Render deploy

---

# PHASE 1 — CORE ERP FOUNDATION ✅

## Module 1 — Master Setup ✅
Company, plants, units, departments, branches, financial year. Every record scoped by companyId.
- Admin: admin@acmeelectronics.com / Admin@1234 | Company ID dev: aaba1738-6e81-44f7-b630-aa0327620870

## Module 2 — Users Management ✅
Create/activate/deactivate users. Tables: users. API: /users CRUD + activate/deactivate/reset-password.
Frontend: /users, /users/create, /users/:id

## Module 3 — Roles & Permissions RBAC ✅
Controls what each user can see and do. Tables: roles, permissions, role_permissions.
Pattern: @RequirePermissions(Permission.INVENTORY_VIEW) on every controller. Super Admin bypasses all checks.

## Module 4 — Super Admin Settings ✅
Global settings, numbering series. SELECT FOR UPDATE for concurrency-safe numbering.
Frontend: /settings/system, /settings/numbering

## Module 5 — Change Request Management ✅
Formal change requests for master data. Workflow: DRAFT → SUBMITTED → APPROVED/REJECTED

## Module 6 — Dummy Data Management ✅
Seed/purge test data. isTestData: true on all test records. Admin never purged.
API: POST /dummy-data/seed/:companyId | DELETE /dummy-data/purge/:companyId

---

# PHASE 2 — GATE MANAGEMENT ✅ (44 E2E tests)

## Module 7 — Visitor Management ✅
Register visitors, track check-in/out. Tables: visitors, visitor_logs. Frontend: /gate/visitors, /gate/active

## Module 8 — Vehicle Management ✅
Register vehicles entering/exiting. Tables: vehicles, vehicle_logs. Frontend: /gate/vehicles

## Module 9 — Gate Inward ✅
Record materials entering factory gate. Tables: gate_inwards, gate_inward_items. Frontend: /gate/inward

## Module 10 — Gate Outward ✅
Record materials leaving factory. Tables: gate_outwards, gate_outward_items. Frontend: /gate/outward

## Module 11 — Gate Pass System ✅
Generate gate passes — RETURNABLE (must return) or NON_RETURNABLE (permanent exit).
Tables: gate_passes, gate_pass_items. Frontend: /gate/passes

## Module 12 — Gate Security Dashboard ✅
Real-time view: active visitors, vehicles, today counts. Frontend: /gate/dashboard

---

# PHASE 3 — MASTER DATA MANAGEMENT ✅ (55 E2E tests)

## Module 13 — Item Master ✅
Master catalog of all items. Tables: items, item_categories, uoms.
API: /items, /items/uom, /items/categories. Frontend: /inventory/items, /inventory/items/:id

## Module 14 — Vendor Master ✅
All suppliers/vendors with contact, GST, payment terms, rating.
Tables: vendors. API: /vendors. Frontend: /masters/vendors. Custom Fields: supported.
Key fields: gstin, state, paymentTerms, creditLimit, rating

## Module 15 — Product Master ✅
Finished products manufactured by Acme. Tables: products. API: /products.
Frontend: /masters/products. Custom Fields: supported.

## Module 16 — Raw Material Master ✅
All raw materials and components for production. Tables: raw_materials. API: /raw-materials.
Frontend: /masters/raw-materials. Custom Fields: supported.
Key fields: materialType, hsnCode, minStockLevel, reorderQty, leadTimeDays

## Module 17 — HSN/SAC Master ✅
GST tax codes. HSN for goods, SAC for services. Tables: hsn_sac_codes. API: /hsn-sac.
Frontend: /masters/hsn-sac.
RULE: Inter-state → full rate to IGST. Intra-state → rate/2 to CGST + rate/2 to SGST

## Module 18 — Price List Management ✅
Sales/purchase price lists per product. Tables: price_lists, price_list_items.
API: /price-lists, /items/:id/approve. Frontend: /masters/price-lists.
CRITICAL RULE: Approved price = FROZEN FOREVER (Rule #10)

## Module 19 — Price History ✅
Read-only audit trail of all price changes. Tables: price_history.
API: /price-history/search, /price-history/effective/:itemCode. Frontend: /masters/price-history

## Module 20 — Product Revision Control ✅
Track engineering changes to products. Tables: product_revisions.
API: /product-revisions, /:id/approve, /:id/obsolete. Workflow: DRAFT→APPROVED→OBSOLETE

## Module 21 — BOM Management ✅
Bill of Materials — what components make one unit of a product.
Tables: boms, bom_items. API: /boms, /:id/items, /:id/approve, /:id/clone.
Frontend: /inventory/bom, /inventory/bom/:id. Custom Fields: supported on detail page.
Rules: min 1 item before approval | APPROVED BOM locked | effectiveQty = qty × (1 + wastage%) | totalCost auto-calc

## Module 22 — BOM Revision Control ✅
ECN (Engineering Change Notes) between BOM versions.
Tables: bom_revisions. API: /bom-revisions, /product/:productId, /:id/approve.
Fields: revisionNumber, changeType (MAJOR/MINOR/PATCH), ecnNumber. Frontend: /inventory/bom-revisions

## Module 22A — Custom Fields Engine ✅
Super Admin adds fields to any module without code. Fields appear in forms automatically.
Tables: custom_field_definitions, custom_field_values.
API: /custom-fields/definitions, /custom-fields/values/:module/:recordId.
Frontend: /settings/custom-fields. Component: <CustomFields module="BOM" recordId={id} />
Types: TEXT, NUMBER, DATE, BOOLEAN, DROPDOWN. Modules: BOM, VENDOR, PRODUCT, RAW_MATERIAL, ITEM, PRICE_LIST

---

# PHASE 4 — PURCHASE MANAGEMENT ✅

## Module 23 — Purchase Requisition ✅
Internal request to purchase materials. Raised by production/engineering.
Tables: purchase_requisitions, purchase_requisition_items.
API: /purchase-requisitions, /:id/submit, /:id/approve, /:id/reject, /:id/items.
Frontend: /purchase/requisitions, /purchase/requisitions/:id.
Workflow: DRAFT → SUBMITTED → APPROVED/REJECTED → PO_RAISED → CLOSED
Rules: min 1 item before submit | rejection needs reason | estimatedTotal = qty × unitPrice

## Module 24 — RFQ Management ✅
Request for Quotation sent to multiple vendors from an approved PR.
Tables: rfqs, rfq_vendors, rfq_items.
API: /rfqs, /:id/send, /:id/close, /:id/cancel, /:id/vendors.
Frontend: /purchase/rfqs, /purchase/rfqs/:id.
Workflow: DRAFT → SENT → CLOSED / CANCELLED
Rules: must link to APPROVED PR | min 1 vendor + 1 item before sending | items auto-from PR | vendor status: INVITED→QUOTED→DECLINED

## Module 25 — Vendor Quotation ✅
Records vendor pricing response to RFQ. One quotation per vendor per RFQ.
Tables: vendor_quotations, vendor_quotation_items.
API: /vendor-quotations, /:id/submit, /:id/finalize, /:id/reject, PUT /:id/items/:itemId.
Frontend: /purchase/quotations, /purchase/quotations/:id.
Workflow: DRAFT → SUBMITTED → FINALIZED / REJECTED
Rules: items auto-from RFQ | all items need unitPrice>0 before submit | totalPrice = unitPrice × qty × (1-disc%) × (1+tax%) | on submit → vendor QUOTED on RFQ

## Module 26 — Quotation Comparison ✅
Side-by-side matrix of all vendor quotations. L1/L2/L3 auto-ranked per item.
Tables: quotation_comparisons.
API: /quotation-comparison/:rfqId, /:rfqId/select, /:rfqId/summary.
Frontend: /purchase/comparison.
Rules: L1=cheapest(green) L2=2nd(yellow) L3=3rd(orange) | can split PO across vendors | selections saved with reason

## Module 27 — Purchase Order ✅
Formal legal procurement document sent to vendor at agreed prices.
Tables: purchase_orders, purchase_order_items.
API: /purchase-orders, /:id/approve, /:id/send, /:id/cancel, /:id/items, PUT /:id/items/:itemId.
Frontend: /purchase/orders, /purchase/orders/:id.
Workflow: DRAFT → APPROVED → SENT → PARTIALLY_RECEIVED → CLOSED / CANCELLED
GST: Inter-state → IGST | Intra-state → CGST + SGST (50/50)
CRITICAL: Prices FROZEN after approval. Error: "Prices are FROZEN — cannot edit items after approval"
Totals: subtotal + totalTax = totalAmount (auto-recalc on item changes)

## Module 28 — PO Approval ✅
Multi-level PO approval workflow based on PO value thresholds.
Tables: po_approvals, po_approval_settings.
API: /po-approvals/pending, /po-approvals/settings, /:poId/approve, /:poId/reject, /:poId/history.
Frontend: /purchase/approvals (tabs: Pending + Settings).
Example: L1 ₹0-50K Purchase Manager | L2 ₹50K-5L GM Purchase | L3 5L+ CFO/MD
Rules: all levels must approve → PO status APPROVED | any level can reject | no settings = single-level | full audit trail

## Module 29 — PO Amendment ✅
Formal change request for approved/sent PO. Original preserved. Goes through approval.
Tables: po_amendments.
API: /po-amendments, /po/:poId, /:id/submit, /:id/approve, /:id/reject.
Frontend: /purchase/amendments.
Workflow: DRAFT → SUBMITTED → APPROVED / REJECTED
Types: QUANTITY_CHANGE, DATE_CHANGE, ITEM_ADDITION, ITEM_CANCELLATION, PRICE_CORRECTION, GENERAL
Number format: PO-2026-0001/AMD-001 | Original PO snapshot stored in changes JSON

## Module 30 — Purchase Analytics ✅
Read-only procurement KPI dashboard. No new tables — computed from Phase 4 data.
API: /purchase-analytics/overview, /spend-by-vendor, /spend-by-month, /po-status, /pr-to-po-time, /rfq-conversion, /top-items.
Frontend: /purchase/analytics.
Metrics: Total/monthly/yearly PO value | Monthly spend bar chart | Top vendors by spend | Top items by spend | PO status distribution | RFQ→PO conversion rate | PR→PO cycle time

---

# PHASE 5 — IMPORT MANAGEMENT ⬜ PLANNED
M31 Import PO | M32 Proforma Invoice | M33 LC/TT Management | M34 Shipment Tracking | M35 BL/AWB | M36 Customs & Duty | M37 Landed Cost

# PHASE 6 — INVENTORY & WAREHOUSE ⬜ PLANNED
M38 GRN (stock enters here, links to PO) | M39 IQC Pending | M40 Accepted Stock | M41 Rejected Stock
M42 Warehouse Master ✅ (built early: /inventory/warehouses) | M43-52 Rack/Bin/Batch/FIFO/Transfer/Ledger/Dashboard

# PHASE 7 — QUALITY MANAGEMENT ⬜ M53-62
IQC, PQC, OQC, NCR, CAPA, Root Cause, 5-Why, Fishbone, Supplier Quality, Customer Complaints

# PHASE 8 — PRODUCTION PLANNING ⬜ M63-68
Production Planning, Capacity, Material, Shift, Resource, APS Scheduling

# PHASE 9 — MES PRODUCTION EXECUTION ⬜ M69-83
Work Orders, Material Issue, Kitting, SMT, MI, Assembly, Testing, Quality Hold, Packing, FG Transfer, Dashboard, WIP, Line Balancing, OEE, Downtime

# PHASE 10-20 — REMAINING ⬜
M84-88 Traceability | M89-94 Maintenance | M95-102 Sales & Dispatch | M103-109 Finance & GST
M110-113 Communication | M114-118 Documents & Reports | M119-124 Dashboards & BI
M125-126 Portals | M127-130 Industry 4.0 | M131-133 Enterprise Expansion | M134-138 Go Live

---

# UNIVERSAL ARCHITECTURE RULES

## Every Table Must Have
id (UUID) | createdAt | updatedAt | createdBy | updatedBy | isActive | isTestData | companyId

## Every API Must Have
JWT auth | RBAC PermissionsGuard | validation | error handling | audit log

## Critical Business Rules
1. Price freeze: Approved prices never change (Rule #10)
2. BOM immutability: Locked after approval
3. No negative stock: DB + service layer
4. Soft deletes: isActive=false, never hard DELETE
5. Audit everything: user + timestamp + old/new values
6. Company scoping: all data filtered by companyId
7. GST auto-split: IGST (interstate) vs CGST+SGST (intra-state)
8. RequiredDate: always convert string to new Date() in services
9. Numbering: SELECT FOR UPDATE for concurrency safety
10. Schema changes: Python scripts only, never sed

## Common Fixes / Gotchas
- requiredDate/deliveryDate fields need full ISO datetime (not date-only) → use new Date()
- Prisma relation errors → add reverse relation to both models
- Never use sed for schema — Python rewrites only
- Backend build script must be: "prisma generate && nest build"
- dist/ committed to repo for Render deploy

---

# CURRENT STATUS

COMPLETED: 30 modules (Phases 0-4)
E2E TESTS: Phase 2 = 44 tests | Phase 3 = 55 tests | Phase 4 = pending
STAGING: All 30 modules verified ✅
NEXT: Phase 4 E2E Tests → Phase 5 Import Management (M31-37)

---

# QUICK REFERENCE — API ENDPOINTS

/api/v1/users | /api/v1/vendors | /api/v1/products | /api/v1/raw-materials
/api/v1/hsn-sac | /api/v1/price-lists | /api/v1/price-history | /api/v1/product-revisions
/api/v1/boms | /api/v1/bom-revisions | /api/v1/custom-fields
/api/v1/purchase-requisitions | /api/v1/rfqs | /api/v1/vendor-quotations
/api/v1/quotation-comparison | /api/v1/purchase-orders | /api/v1/po-approvals
/api/v1/po-amendments | /api/v1/purchase-analytics

# QUICK REFERENCE — FRONTEND PAGES

/inventory/items | /masters/vendors | /masters/products | /masters/raw-materials
/masters/hsn-sac | /masters/price-lists | /masters/price-history | /masters/product-revisions
/inventory/bom | /inventory/bom/:id | /inventory/bom-revisions | /settings/custom-fields
/purchase/requisitions | /purchase/requisitions/:id | /purchase/rfqs | /purchase/rfqs/:id
/purchase/quotations | /purchase/quotations/:id | /purchase/comparison
/purchase/orders | /purchase/orders/:id | /purchase/approvals | /purchase/amendments | /purchase/analytics

---
Last updated: Module 30 complete — Phase 4 Purchase Management DONE
Next update: After Module 31 (Import Purchase Order)
