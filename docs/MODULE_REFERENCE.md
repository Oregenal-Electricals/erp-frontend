# ACME ELECTRONICS — ERP/MES PLATFORM

## Complete Module Reference Guide

> **Auto-updated after every module completion. Last updated: June 26, 2026**
> Stack: NestJS + Prisma + PostgreSQL (Backend) | Next.js + Tailwind (Frontend)
> Hosting: Render (Backend) | Vercel (Frontend) | Neon (Database)

---

# PHASE 0 — INFRASTRUCTURE ✅

## Module 0.1-0.5 — GitHub, Dev Environment, Staging, CI/CD

- Backend: https://erp-backend-ry5v.onrender.com
- Frontend: https://erp-frontend-five-alpha.vercel.app
- Dev DB: erp_development | Staging DB: erp_staging (Neon)
- Branch: staging (live) → main (production)

---

# PHASE 1 — CORE ERP FOUNDATION ✅

## Module 1 — Master Setup ✅

Company, plants, units, departments, branches, financial year. Every record scoped by companyId.
Admin: admin@acmeelectronics.com / Admin@1234 | Company ID dev: aaba1738-6e81-44f7-b630-aa0327620870

## Module 2 — Users Management ✅

Create/activate/deactivate users. Tables: users. API: /users CRUD + activate/deactivate/reset-password.
Frontend: /users, /users/create, /users/:id

## Module 3 — Roles & Permissions RBAC ✅

Controls access. Tables: roles, permissions, role_permissions.
Pattern: @RequirePermissions(Permission.INVENTORY_VIEW) on every controller. Super Admin bypasses all.

## Module 4 — Super Admin Settings ✅

Global settings, numbering series. SELECT FOR UPDATE for concurrency-safe numbers.
Frontend: /settings/system, /settings/numbering

## Module 5 — Change Request Management ✅

Formal change requests. Workflow: DRAFT → SUBMITTED → APPROVED/REJECTED

## Module 6 — Dummy Data Management ✅

Seed/purge test data. isTestData: true on test records. Admin never purged.
API: POST /dummy-data/seed/:companyId | DELETE /dummy-data/purge/:companyId

---

# PHASE 2 — GATE MANAGEMENT ✅ (44 E2E tests)

## Module 7 — Visitor Management ✅

Register visitors, track check-in/out. Tables: visitors, visitor_logs. Frontend: /gate/visitors

## Module 8 — Vehicle Management ✅

Register vehicles. Tables: vehicles, vehicle_logs. Frontend: /gate/vehicles

## Module 9 — Gate Inward ✅

Materials entering factory gate. Tables: gate_inwards, gate_inward_items. Frontend: /gate/inward

## Module 10 — Gate Outward ✅

Materials leaving factory. Tables: gate_outwards, gate_outward_items. Frontend: /gate/outward

## Module 11 — Gate Pass System ✅

Gate passes — RETURNABLE or NON_RETURNABLE. Tables: gate_passes. Frontend: /gate/passes

## Module 12 — Gate Security Dashboard ✅

Real-time view: active visitors, vehicles, counts. Frontend: /gate/dashboard

---

# PHASE 3 — MASTER DATA MANAGEMENT ✅ (55 E2E tests)

## Module 13 — Item Master ✅

Master catalog of all items. Tables: items, item_categories, uoms.
API: /items, /items/uom, /items/categories. Frontend: /inventory/items, /inventory/items/:id

## Module 14 — Vendor Master ✅

All suppliers. Tables: vendors. API: /vendors. Frontend: /masters/vendors. Custom Fields: supported.
Key fields: gstin, state, paymentTerms, creditLimit, rating

## Module 15 — Product Master ✅

Finished products. Tables: products. API: /products. Frontend: /masters/products.

## Module 16 — Raw Material Master ✅

All raw materials. Tables: raw_materials. API: /raw-materials. Frontend: /masters/raw-materials.
Key fields: materialType, hsnCode, minStockLevel, reorderQty, leadTimeDays

## Module 17 — HSN/SAC Master ✅

GST tax codes. Tables: hsn_sac_codes. API: /hsn-sac. Frontend: /masters/hsn-sac.
Rule: Inter-state → IGST. Intra-state → CGST + SGST (50/50 split)

## Module 18 — Price List Management ✅

Sales/purchase price lists. Tables: price_lists, price_list_items.
API: /price-lists, /items/:id/approve. Frontend: /masters/price-lists.
CRITICAL: Approved price = FROZEN FOREVER (Rule #10)

## Module 19 — Price History ✅

Read-only audit trail. Tables: price_history. API: /price-history/search. Frontend: /masters/price-history

## Module 20 — Product Revision Control ✅

Engineering changes. Tables: product_revisions. Workflow: DRAFT→APPROVED→OBSOLETE
Frontend: /masters/product-revisions

## Module 21 — BOM Management ✅

Bill of Materials — components for one unit of product.
Tables: boms, bom_items. API: /boms, /:id/items, /:id/approve, /:id/clone.
Frontend: /inventory/bom, /inventory/bom/:id. Custom Fields: supported.
Rules: min 1 item before approval | APPROVED BOM locked | effectiveQty = qty × (1 + wastage%) | totalCost auto-calc

## Module 22 — BOM Revision Control ✅

ECN tracking between BOM versions. Tables: bom_revisions.
Fields: revisionNumber, changeType (MAJOR/MINOR/PATCH), ecnNumber. Frontend: /inventory/bom-revisions

## Module 22A — Custom Fields Engine ✅

Super Admin adds fields to any module without code.
Tables: custom_field_definitions, custom_field_values.
API: /custom-fields/definitions, /custom-fields/values/:module/:recordId.
Frontend: /settings/custom-fields. Component: <CustomFields module="BOM" recordId={id} />
Types: TEXT, NUMBER, DATE, BOOLEAN, DROPDOWN. Modules: BOM, VENDOR, PRODUCT, RAW_MATERIAL, ITEM

---

# PHASE 4 — PURCHASE MANAGEMENT ✅ (51 E2E tests)

## Module 23 — Purchase Requisition ✅

Internal request to purchase materials.
Tables: purchase_requisitions, purchase_requisition_items.
API: /purchase-requisitions, /:id/submit, /:id/approve, /:id/reject, /:id/items.
Frontend: /purchase/requisitions, /purchase/requisitions/:id.
Workflow: DRAFT → SUBMITTED → APPROVED/REJECTED → PO_RAISED → CLOSED

## Module 24 — RFQ Management ✅

Request for Quotation sent to multiple vendors from approved PR.
Tables: rfqs, rfq_vendors, rfq_items.
API: /rfqs, /:id/send, /:id/close, /:id/cancel, /:id/vendors.
Frontend: /purchase/rfqs, /purchase/rfqs/:id.
Workflow: DRAFT → SENT → CLOSED / CANCELLED

## Module 25 — Vendor Quotation ✅

Records vendor pricing response to RFQ. One quotation per vendor per RFQ.
Tables: vendor_quotations, vendor_quotation_items.
API: /vendor-quotations, /:id/submit, /:id/finalize, /:id/reject.
Frontend: /purchase/quotations, /purchase/quotations/:id.
Workflow: DRAFT → SUBMITTED → FINALIZED / REJECTED
Formula: totalPrice = unitPrice × qty × (1 - disc%) × (1 + tax%)

## Module 26 — Quotation Comparison ✅

Side-by-side L1/L2/L3 ranking matrix. Can split PO across vendors.
Tables: quotation_comparisons.
API: /quotation-comparison/:rfqId, /:rfqId/select, /:rfqId/summary.
Frontend: /purchase/comparison.
L1=cheapest(green) L2=2nd(yellow) L3=3rd(orange)

## Module 27 — Purchase Order ✅

Formal legal procurement document.
Tables: purchase_orders, purchase_order_items.
API: /purchase-orders, /:id/approve, /:id/send, /:id/cancel, /:id/items.
Frontend: /purchase/orders, /purchase/orders/:id.
Workflow: DRAFT → APPROVED → SENT → PARTIALLY_RECEIVED → CLOSED / CANCELLED
GST: Inter-state → IGST | Intra-state → CGST + SGST (50/50)
CRITICAL: Prices FROZEN after approval. Error: "Prices are FROZEN — cannot edit items after approval"

## Module 28 — PO Approval ✅

Multi-level PO approval based on value thresholds.
Tables: po_approvals, po_approval_settings.
API: /po-approvals/pending, /po-approvals/settings, /:poId/approve, /:poId/reject, /:poId/history.
Frontend: /purchase/approvals (Pending + Settings tabs).
Example: L1 up to ₹50K Purchase Manager | L2 up to ₹5L GM Purchase | L3 above ₹5L CFO/MD
All levels must approve → PO status APPROVED. Any level can reject.

## Module 29 — PO Amendment ✅

Formal change request for approved/sent PO. Original preserved.
Tables: po_amendments.
API: /po-amendments, /po/:poId, /:id/submit, /:id/approve, /:id/reject.
Frontend: /purchase/amendments.
Workflow: DRAFT → SUBMITTED → APPROVED / REJECTED
Types: QUANTITY_CHANGE, DATE_CHANGE, ITEM_ADDITION, ITEM_CANCELLATION, PRICE_CORRECTION, GENERAL
Number format: PO-2026-0001/AMD-001

## Module 30 — Purchase Analytics ✅

Read-only KPI dashboard. No new tables — computed from Phase 4 data.
API: /purchase-analytics/overview, /spend-by-vendor, /spend-by-month, /po-status, /pr-to-po-time, /rfq-conversion, /top-items.
Frontend: /purchase/analytics.
Metrics: Total/monthly/yearly PO value | Monthly bar chart | Top vendors | Top items | PO status | RFQ conversion rate

---

# PHASE 5 — IMPORT MANAGEMENT 🔄 (In Progress)

## Module 31 — Import Purchase Order ✅

International procurement with foreign currency, exchange rates, Incoterms, and import duty.
Tables: import_purchase_orders, import_po_items.
API: /import-orders, /:id/approve, /:id/status/:status, /:id/cancel, /:id/items.
Frontend: /import/orders, /import/orders/:id.
Workflow: DRAFT → APPROVED → SENT → PROFORMA_RECEIVED → LC_OPENED → SHIPPED → CUSTOMS_CLEARED → CLOSED
Currencies: USD, EUR, CNY, GBP, JPY, SGD with live exchange rate
Incoterms: FOB, CIF, EXW, CFR, DDP, FCA | Payment: LC, TT, DP, DA
Cost: unitPriceForeign × rate = INR base → +BCD% → +IGST% on (base+BCD) = totalInr

## Module 32 — Proforma Invoice ✅

Vendor's pre-shipment invoice — used for LC opening and advance payment confirmation.

- **Tables:** `proforma_invoices`, `proforma_invoice_items`
- **API:** `GET/POST/PUT /proforma-invoices`, `POST /:id/accept`, `/:id/reject`, `GET /ipo/:ipoId`
- **Frontend:** `/import/proforma`
- **Workflow:** RECEIVED → ACCEPTED / REJECTED
- **Auto-action:** Creating PI automatically updates Import PO status to PROFORMA_RECEIVED
- **Key fields:** vendorPiNumber, bankName, swiftCode (for LC opening), validUntil, subtotalForeign, totalAmount (INR)
- **Number format:** PI-2026-0001

## Module 33 — LC / TT Management ⬜ PLANNED

Letter of Credit and Telegraphic Transfer payment tracking.
Tables: payment_instruments
Fields: lcNumber, bankName, openDate, expiryDate, amount, currency, status

## Module 34 — Shipment Tracking ✅

Track international shipments from origin port to destination.

- **Tables:** `shipments`, `shipment_containers`
- **API:** `GET/POST/PUT /shipments`, `POST /:id/depart`, `/:id/arrive`, `/:id/deliver`, `/:id/cancel`, `/:id/containers`, `GET /ipo/:ipoId`
- **Frontend:** `/import/shipments`
- **Modes:** SEA (with container tracking), AIR (flight/AWB), ROAD, COURIER
- **Workflow:** BOOKED → DEPARTED → ARRIVED → DELIVERED / CANCELLED
- **Auto-action:** arrive() updates Import PO status to SHIPPED
- **SEA fields:** vesselName, voyageNumber, blNumber, portOfLoading, portOfDischarge, totalVolume (CBM)
- **AIR fields:** flightNumber, awbNumber
- **Container types:** 20GP, 40GP, 40HC, 20RF, 40RF with seal numbers
- **Number format:** SHP-2026-0001

## Module 35 — BL / AWB Management ✅

Bill of Lading and Airway Bill document management for import customs clearance.

- **Tables:** `shipping_documents`
- **API:** `GET/POST/PUT /shipping-documents`, `POST /:id/verify`, `/:id/surrender`, `GET /shipment/:shipmentId`
- **Frontend:** `/import/bl-awb`
- **Types:** BL (Bill of Lading), AWB (Airway Bill), SEAWAY_BILL
- **Workflow:** RECEIVED → VERIFIED → SURRENDERED
- **Key fields:** documentNumber, issueDate, placeOfIssue, shipperName, consigneeName, notifyParty, freightTerms (PREPAID/COLLECT)
- **BL fields:** numberOfOriginals, originalsReceived (title document — must surrender to claim goods)

## Module 36 — Customs & Duty (BOE) ✅

Bill of Entry filing and Indian customs duty calculation.

- **Tables:** `customs_entries`
- **API:** `GET/POST/PUT /customs-entries`, `POST /:id/file`, `/:id/assess`, `/:id/pay-duty`, `/:id/out-of-charge`, `GET /ipo/:ipoId`
- **Frontend:** `/import/customs`
- **Workflow:** DRAFT → FILED → ASSESSED → DUTY_PAID → OUT_OF_CHARGE / CANCELLED
- **Auto-action:** out-of-charge updates Import PO status to CUSTOMS_CLEARED
- **Duty formula:** BCD = CIF × BCD% | SWS = BCD × 10% | IGST = (CIF+BCD+SWS+AIDC) × IGST% | Total = BCD+SWS+IGST+AIDC
- **Key fields:** boeNumber, customsBoeNumber (from customs dept), chaName, portOfEntry, cifValue, bcdRate, igstRate, aidcAmount, dutyPaidDate, outOfChargeDate

## Module 37 — Landed Cost Calculation ✅

True total cost of imported goods including all charges — used for inventory valuation in GRN (Phase 6).

- **Tables:** `landed_costs`, `landed_cost_items`
- **API:** `GET/POST/PUT /landed-costs`, `POST /:id/calculate`, `/:id/finalize`, `GET /ipo/:ipoId`
- **Frontend:** `/import/landed-cost` (expandable cards with item breakdown)
- **Workflow:** DRAFT → FINALIZED
- **Cost components:** invoiceValue + customsDuty + freightCharges + chaCharges + portCharges + bankCharges + insuranceCharges + otherCharges = totalLandedCost
- **Allocation methods:** BY_VALUE (proportional to item INR value) | BY_QTY (equal per unit)
- **Per-unit calc:** (itemValueInr + allocatedCost) / qty = landedCostPerUnit
- **Auto-populate:** Items auto-loaded from Import PO items
- **Phase 6 link:** GRN will use landedCostPerUnit as inventory valuation cost

---

# PHASE 6 — INVENTORY & WAREHOUSE ⬜ PLANNED

## Module 38 — GRN (Goods Receipt Note) ✅

Stock entry point — physical receipt of goods against domestic PO or Import PO.

- **Tables:** `grn_headers`, `grn_items`
- **API:** `GET/POST/PUT /grn`, `POST /:id/submit`, `GET /stats`
- **Frontend:** `/inventory/grn` (expandable rows with item breakdown)
- **Types:** DOMESTIC (links to PO) | IMPORT (links to IPO + Landed Cost)
- **Workflow:** DRAFT → IQC_PENDING → PARTIALLY_ACCEPTED / ACCEPTED / CLOSED
- **Key rules:** Max 5% over-receipt tolerance | Price locked from PO | Landed cost per unit from M37
- **Number format:** GRN-2026-0001

## Module 39 — IQC (Incoming Quality Control) ✅

Inspect received goods and record accepted/rejected quantities per GRN.

- **Tables:** `iqc_inspections`, `iqc_items`
- **API:** `GET/POST /iqc`, `PUT /:id/items`, `POST /:id/approve`, `GET /grn/:grnId`
- **Frontend:** `/inventory/iqc`
- **Workflow:** IN_PROGRESS → APPROVED
- **Auto-populate:** Items loaded from GRN items with received qty
- **On approve:** Updates GRN items accepted/rejected qty → GRN status PARTIALLY_ACCEPTED or ACCEPTED
- **Number format:** IQC-2026-0001

## Module 40 — Stock Ledger & Balance ✅

Real-time inventory tracking — every movement recorded, balance maintained per item per warehouse.

- **Tables:** `stock_ledger`, `stock_balance`
- **API:** `GET /stock-ledger`, `GET /stock-ledger/balance`, `POST /stock-ledger/receive/:iqcId`, `POST /stock-ledger/adjust`, `GET /stock-ledger/item/:code`
- **Frontend:** `/inventory/stock` (Balance tab + Movement Ledger tab)
- **Transaction types:** IQC_ACCEPT, IQC_REJECT, ISSUE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT
- **Weighted avg cost:** Auto-calculated on each receipt
- **No negative stock:** Enforced at postTransaction level
- **IQC receive:** One-click stock credit from approved IQC inspections

## Module 41 — Rejected Stock Handling ✅
Quarantine, disposition and RTV management for IQC-rejected goods.
- **Tables:** `rejected_stock`, `rejected_stock_items`
- **API:** `GET/POST /rejected-stock`, `POST /from-iqc/:iqcId`, `PUT /:id/items/:itemId/dispose`, `POST /:id/close`
- **Frontend:** `/inventory/rejected`
- **Workflow:** QUARANTINED → PARTIALLY_DISPOSITIONED → CLOSED
- **Disposition options:** RTV (Return to Vendor), SCRAPPED, REWORK, ACCEPTED (Under Deviation)
- **Auto-create:** One click to create quarantine record from approved IQC
- **Number format:** REJ-2026-0001

## Module 43 — Rack & Bin Management ✅
Manage warehouse storage locations — zones, racks and bins.
- **Tables:** `warehouse_zones`, `warehouse_racks`, `warehouse_bins`
- **API:** `GET/POST /rack-bin/zones/:wId`, `GET/POST /rack-bin/racks/:wId`, `GET/POST /rack-bin/bins/rack/:rId`, `POST /rack-bin/bins/bulk`, `GET /rack-bin/stats/:wId`
- **Frontend:** `/inventory/rack-bin` (zone/rack list + bin grid view)
- **Bin statuses:** EMPTY, PARTIAL, FULL, RESERVED, BLOCKED
- **Bulk create:** Create N bins at once with prefix (e.g. A-01-01 to A-01-10)
- **Stats:** utilization %, empty/partial/full bin counts per warehouse

## Module 44 — Stock Putaway ✅
Assign accepted IQC stock to specific rack/bin locations within the warehouse.
- **Tables:** `stock_putaway`, `stock_putaway_items`
- **API:** `GET/POST /stock-putaway`, `PUT /:id/items`, `POST /:id/complete`
- **Frontend:** `/inventory/putaway`
- **Workflow:** IN_PROGRESS → COMPLETED
- **On complete:** Updates bin currentQty and status (EMPTY→PARTIAL/FULL)
- **Links:** GRN + IQC for full traceability
- **Number format:** PUT-2026-0001

## Module 44 — Stock Putaway ✅
Assign accepted IQC stock to specific rack/bin locations within the warehouse.
- **Tables:** `stock_putaway`, `stock_putaway_items`
- **API:** `GET/POST /stock-putaway`, `PUT /:id/items`, `POST /:id/complete`
- **Frontend:** `/inventory/putaway`
- **Workflow:** IN_PROGRESS → COMPLETED
- **On complete:** Updates bin currentQty and status (EMPTY→PARTIAL/FULL)
- **Links:** GRN + IQC for full traceability
- **Number format:** PUT-2026-0001

## Module 45 — Batch & Lot Management ✅
Track stock batches for FIFO issue, expiry management and quality traceability.
- **Tables:** `stock_batches`
- **API:** `GET/POST /stock-batches`, `POST /from-grn/:grnId`, `PUT /:id`, `POST /:id/quarantine`, `GET /item/:itemCode`
- **Frontend:** `/inventory/batches`
- **Statuses:** ACTIVE, EXHAUSTED, EXPIRED, QUARANTINED
- **Auto-create:** One click to create batches from accepted GRN items
- **FIFO order:** Sorted by receivedDate ASC for issue priority
- **Expiry tracking:** Auto-expire past expiry date, 30-day warning alert
- **Number format:** BAT-2026-0001

## Module 46 — FIFO / FEFO Stock Issue Engine ✅
Issue materials from warehouse using FIFO or FEFO batch allocation.
- **Tables:** `stock_issues`, `stock_issue_items`
- **API:** `GET/POST /stock-issues`, `POST /:id/confirm`, `GET /fifo-plan`
- **Frontend:** `/inventory/issues`
- **FIFO:** Allocates oldest batch (by receivedDate) first
- **FEFO:** Allocates soonest-expiring batch first
- **Preview:** GET /fifo-plan shows allocation before committing
- **On confirm:** Deducts from stock_batches + posts ISSUE entry to stock_ledger
- **Number format:** ISS-2026-0001

## Module 47 — Stock Transfer ✅
Move inventory between warehouses or between bins within the same warehouse.
- **Tables:** `stock_transfers`, `stock_transfer_items`
- **API:** `GET/POST /stock-transfers`, `POST /:id/confirm`, `/:id/cancel`
- **Frontend:** `/inventory/transfers`
- **Types:** INTER_WAREHOUSE (between warehouses) | INTRA_WAREHOUSE (bin-to-bin)
- **Workflow:** DRAFT → CONFIRMED / CANCELLED
- **On confirm:** Posts TRANSFER_OUT to source + TRANSFER_IN to destination in stock_ledger
- **Bin update:** Updates currentQty and status on fromBin and toBin
- **Batch tracking:** Updates batch warehouseId on transfer
- **Number format:** TRF-2026-0001

## Module 47 — Stock Transfer ✅
Move inventory between warehouses or between bins within the same warehouse.
- **Tables:** `stock_transfers`, `stock_transfer_items`
- **API:** `GET/POST /stock-transfers`, `POST /:id/confirm`, `/:id/cancel`
- **Frontend:** `/inventory/transfers`
- **Types:** INTER_WAREHOUSE (between warehouses) | INTRA_WAREHOUSE (bin-to-bin)
- **Workflow:** DRAFT → CONFIRMED / CANCELLED
- **On confirm:** Posts TRANSFER_OUT to source + TRANSFER_IN to destination in stock_ledger
- **Bin update:** Updates currentQty and status on fromBin and toBin
- **Batch tracking:** Updates batch warehouseId on transfer
- **Number format:** TRF-2026-0001

## Module 48 — Stock Adjustment ✅
Correct inventory discrepancies from physical counts, damage, theft, or opening entries.
- **Tables:** `stock_adjustments`, `stock_adjustment_items`
- **API:** `GET/POST /stock-adjustments`, `POST /:id/approve`, `/:id/cancel`
- **Frontend:** `/inventory/adjustments`
- **Types:** INCREASE, DECREASE, RECOUNT
- **Reasons:** DAMAGE, EXPIRY, THEFT, FOUND, OPENING, AUDIT, OTHER
- **Workflow:** DRAFT → APPROVED / CANCELLED
- **On approve:** Posts ADJUSTMENT entry to stock_ledger, updates stock_balance
- **No negative stock:** Enforced on DECREASE before approval
- **Number format:** ADJ-2026-0001

## Module 49 — Stock Ledger Reports ✅
Five reporting views for complete inventory visibility and audit trail.
- **Tables:** Uses existing stock_ledger, stock_balance, stock_batches (read-only)
- **API:** GET /stock-reports/ledger, /balance-summary, /item-card/:code, /batch-movements, /consumption
- **Frontend:** `/inventory/reports` (5 tabs)
- **Ledger:** All movements with type filter, date range, warehouse filter
- **Balance Summary:** All items with stock value and low stock alerts
- **Item Card:** Single item full history with running balance
- **Batch Movements:** Batch-wise FIFO tracking with expiry
- **Consumption:** Issue analysis sorted by value consumed

## Module 50 — Inventory Valuation ✅
Stock value analysis with aging, slow-moving detection and FIFO valuation.
- **Tables:** Uses existing stock_balance, stock_batches, stock_ledger (read-only)
- **API:** GET /inventory-valuation/summary, /aging, /slow-moving, /fifo-value
- **Frontend:** `/inventory/valuation` (4 tabs)
- **Summary:** Grand total value, by-warehouse breakdown with % share
- **Aging:** 5 buckets — 0-30, 31-60, 61-90, 91-180, 180+ (dead stock)
- **Slow Moving:** Configurable threshold (30/60/90/180 days), value at risk
- **FIFO Value:** Batch-level valuation with avg cost per item-warehouse

## Module 51 — Inventory Dashboard ✅
Real-time inventory command center for warehouse managers.
- **Tables:** Uses existing tables (read-only)
- **API:** GET /inventory-dashboard/overview, /alerts, /activity, /top-items
- **Frontend:** `/inventory/dashboard`
- **KPIs:** Total stock value, active batches, today receipts/issues, month totals
- **Alerts:** Low stock (≤10), expiring in 30d, expired batches, quarantined, pending GRN/IQC
- **Top Items:** Top 10 by stock value with visual progress bars
- **Activity Feed:** Last 15 movements with color-coded transaction types
- **Pending Actions:** Quick links to pending GRN, IQC, Putaway

## Module 52 — Inventory Reports ✅
Formal inventory registers and ABC analysis for management and auditors.
- **Tables:** Uses existing tables (read-only)
- **API:** GET /inventory-reports/stock-register, /grn-register, /issue-register, /transfer-register, /abc-analysis
- **Frontend:** `/inventory/inv-reports` (5 tabs)
- **Stock Register:** Item-wise stock with value, % of total, totals row
- **GRN Register:** All GRNs with received/accepted/rejected qty and value
- **Issue Register:** All issues with method (FIFO/FEFO), reference type, value
- **Transfer Register:** All confirmed transfers with from/to warehouse
- **ABC Analysis:** Classify items by consumption value (A=top 70%, B=next 20%, C=bottom 10%)

## Module 54 — Work Order Management ✅
Plan and track production work orders from creation to completion.
- **Tables:** `work_orders`
- **API:** GET/POST /work-orders, PUT /:id, POST /:id/release, /start, /complete, /cancel
- **Frontend:** `/production/work-orders` (new Production sidebar section)
- **Workflow:** DRAFT → RELEASED → IN_PROGRESS → COMPLETED / CANCELLED
- **Priority:** LOW, MEDIUM, HIGH, URGENT
- **BOM link:** Expandable component list from linked BOM
- **Progress:** Visual progress bar (completedQty/plannedQty)
- **Complete modal:** Captures completedQty + rejectedQty
- **Number format:** WO-2026-0001

## Module 55 — Material Requirement Planning (MRP) ✅
Calculate material needs for work orders and identify shortages.
- **Tables:** Uses existing work_orders, boms, stock_balance, stock_batches (read-only)
- **API:** GET /mrp/calculate/:woId, /shortage-report, /material-plan
- **Frontend:** `/production/mrp` (3 tabs)
- **MRP Calculator:** Gross/net requirements per component, FIFO batch check
- **Shortage Report:** All active WOs with material shortages
- **Material Plan:** Aggregate requirements across multiple WOs
- **canProduce flag:** Green/red indicator per work order

## Module 56 — Production Material Issue ✅
Issue raw materials to production floor based on MRP requirements.
- **Tables:** `production_issues`, `production_issue_items`
- **API:** GET/POST /production-issues, POST /from-mrp/:woId, POST /:id/confirm
- **Frontend:** `/production/material-issue`
- **MRP auto-load:** Select WO → MRP requirements auto-populated
- **Workflow:** DRAFT → ISSUED (deducts from stock_ledger)
- **Auto-start WO:** RELEASED → IN_PROGRESS on first material issue
- **Partial issue:** Orange rows when insufficient stock available
- **Number format:** PI-2026-0001

## Module 57 — Production Recording & Output ✅
Record daily/shift production output against work orders.
- **Tables:** `production_entries`
- **API:** GET/POST /production-entries, POST /:id/confirm, GET /wo-progress/:woId
- **Frontend:** `/production/recording`
- **Shifts:** MORNING, EVENING, NIGHT
- **Workflow:** DRAFT → CONFIRMED (updates WO completedQty)
- **Auto-complete:** WO status → COMPLETED when completedQty >= plannedQty
- **Progress tracker:** Visual % completion per WO with remaining qty
- **5% over-production:** Allowed tolerance above planned qty
- **Number format:** PE-2026-0001

## Module 58 — In-Process Quality Control (IPQC) ✅
Record and track in-process quality inspections during production.
- **Tables:** `production_qc`
- **API:** GET/POST /production-qc, POST /:id/complete, GET /stats
- **Frontend:** `/production/ipqc`
- **Stages:** IN_PROCESS, FINAL, INLINE
- **Results:** PASS, FAIL, CONDITIONAL
- **Pass Rate:** Calculated per inspection and overall aggregate
- **Corrective Action:** Recorded for FAIL/CONDITIONAL results
- **Number format:** PQC-2026-0001

## Module 59 — Finished Goods Receipt ✅
Receive completed production output into FG warehouse stock.
- **Tables:** `fg_receipts`
- **API:** GET/POST /fg-receipts, POST /from-wo/:woId, POST /:id/confirm, GET /pending-wos
- **Frontend:** `/production/fg-receipt`
- **Auto-create:** One-click FGR from completed WO
- **Pending WOs:** Alert banner for completed WOs without FGR
- **Workflow:** DRAFT → RECEIVED (posts stock ledger RECEIPT)
- **FG Batch:** Auto-creates batch for FG item
- **Stock update:** FG item appears in stock balance after confirm
- **Number format:** FGR-2026-0001

## Module 60 — Production Cost Sheet ✅
Auto-calculate actual cost of manufacturing per work order.
- **Tables:** `production_cost_sheets`
- **API:** POST /production-cost-sheets/generate/:woId, PUT /:id, POST /:id/finalize
- **Frontend:** `/production/cost-sheet`
- **Material Cost:** Auto from confirmed production issues (price locked at issue time)
- **Labor Cost:** Auto from production entries (shifts × 8hrs × ₹50/hr, editable)
- **Overhead/Other:** Manual entry per WO
- **Unit Cost:** totalCost ÷ completedQty (feeds back to FG Receipt)
- **Variance:** Actual vs planned material cost
- **Finalize:** Locks sheet, cannot edit after

## Module 61 — Production Dashboard ✅
Real-time production command center for shop floor managers.
- **Tables:** Uses existing tables (read-only aggregation)
- **API:** GET /production-dashboard/overview, /active-wos, /today, /alerts, /quality
- **Frontend:** `/production/dashboard`
- **KPIs:** WO status counts, today's output, quality pass rate, production cost
- **Active WOs:** Progress bars, overdue flags, priority, material issue status
- **Alerts:** Overdue WOs, no material issued, QC failures, pending FGR
- **Quality Metrics:** Overall pass rate, PASS/FAIL/CONDITIONAL breakdown

## Module 62 — Production Reports ✅
Formal production reports for management — WO completion, shifts, material, scrap, quality.
- **Tables:** Uses existing tables (read-only)
- **API:** GET /production-reports/wo-completion, /shift-production, /material-consumption, /scrap-analysis, /quality-summary
- **Frontend:** `/production/reports` (5 tabs)
- **WO Completion:** Planned vs actual, achievement %, cost per WO
- **Shift Production:** By shift and operator with good/scrap breakdown
- **Material Consumption:** Item-wise actual usage with value
- **Scrap Analysis:** By product with scrap rate %
- **Quality Summary:** By inspection stage with pass rate

---

# 🎉 PHASE 7 — PRODUCTION PLANNING & MES — COMPLETE ✅

All 10 modules (M53-M62) covering the full manufacturing execution lifecycle:
BOM → Work Orders → MRP → Material Issue → Production Recording → IPQC → FG Receipt → Cost Sheet → Dashboard → Reports

## Module 63 — NCR & CAPA Management ✅
Formal non-conformance reporting and corrective/preventive action tracking.
- **Tables:** `ncr_records`, `capa_records`
- **API:** GET/POST /ncr, POST /ncr/:id/close | GET/POST /capa, PUT /:id, POST /:id/verify
- **Frontend:** `/quality/ncr`, `/quality/capa` (new Quality sidebar section)
- **NCR Sources:** IQC, IPQC, OQC, CUSTOMER_COMPLAINT, INTERNAL_AUDIT, SUPPLIER
- **Severity:** MINOR, MAJOR, CRITICAL
- **NCR Flow:** OPEN → CAPA_PENDING → VERIFICATION_PENDING → CLOSED
- **CAPA Flow:** ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED
- **Disposition:** USE_AS_IS, REWORK, SCRAP, RETURN_TO_VENDOR
- **Guard:** NCR cannot close until all CAPAs are VERIFIED
- **Overdue:** CAPA overdue detection and highlighting

Phase 8: Quality Management System  🔄 (7/10 complete — M63-69 done)

## Module 64 — Root Cause Analysis (RCA) ✅
Structured root cause analysis using 5-Why and Fishbone (Ishikawa) methods.
- **Tables:** `rca_records`
- **API:** GET/POST /rca, PUT /:id, POST /:id/complete
- **Frontend:** `/quality/rca`
- **Methods:** FIVE_WHY, FISHBONE, BOTH
- **5-Why:** Up to 5 levels deep with root cause conclusion
- **Fishbone:** 6M categories (Man, Machine, Material, Method, Environment, Measurement)
- **NCR linkage:** Auto-updates NCR status (ROOT_CAUSE_PENDING → CAPA_PENDING)
- **Visual display:** Color-coded why levels, fishbone grid layout

## Module 65 — Outgoing Quality Control (OQC) ✅
Final quality inspection before dispatch to customer.
- **Tables:** `oqc_inspections`
- **API:** GET/POST /oqc, POST /:id/complete, POST /:id/release
- **Frontend:** `/quality/oqc`
- **Parameters:** Visual, Dimensional, Functional, Packaging, Labelling checks
- **Auto result:** failQty=0→PASS, >10% fail→FAIL, else CONDITIONAL
- **CoC:** Certificate of Conformance number recorded
- **FG Receipt link:** Auto-fills item details from FG receipt
- **Release:** Only PASS inspections released for dispatch
- **Workflow:** PENDING → COMPLETED → RELEASED

## Module 66 — Supplier Quality Management ✅
Track vendor quality performance, ratings and corrective action requests.
- **Tables:** `supplier_quality_ratings`, `supplier_cars`
- **API:** GET/POST /supplier-quality/ratings, /cars, /scorecard/:vendorId
- **Frontend:** `/quality/supplier` (2 tabs)
- **Rating:** Auto-score (0-100) from defect rate + OTD% + NCR count
- **Grades:** A/B/C/D with AVL status (APPROVED/PROBATION/BLACKLISTED)
- **CAR:** Corrective Action Request → SENT→RESPONDED→VERIFIED→CLOSED
- **Scorecard:** Per-vendor rating history + all CARs
- **Overdue CAR:** Highlighted in red when past due date

## Module 67 — Customer Complaints ✅
Track, investigate and resolve customer quality complaints.
- **Tables:** `customer_complaints`
- **API:** GET/POST /customer-complaints, PUT /:id, POST /:id/respond, POST /:id/close
- **Frontend:** `/quality/complaints`
- **Types:** FUNCTIONAL, VISUAL, WRONG_ITEM, DAMAGED, DOCUMENTATION, PERFORMANCE
- **Severity:** MINOR, MAJOR, CRITICAL
- **Flow:** OPEN → INVESTIGATING → RESPONDED → CLOSED
- **8D Report:** 8D report number recorded on response
- **Customer Request:** REPLACEMENT, CREDIT_NOTE, REPAIR, NONE
- **Response:** Root cause + corrective action + 8D number sent to customer

## Module 68 — Quality Dashboard ✅
Real-time quality management command center for QA Manager and MD.
- **Tables:** Uses existing tables (read-only aggregation)
- **API:** GET /quality-dashboard/overview, /ncr-summary, /oqc-trend, /alerts
- **Frontend:** `/quality/dashboard` (first item in Quality sidebar)
- **KPIs:** NCR open/critical, CAPA overdue, OQC pass rate, complaints, supplier AVL, open CARs
- **NCR Breakdown:** By source, by severity, recent open NCRs
- **OQC Trend:** 6-month pass rate bar chart (color-coded green/yellow/red)
- **Alerts:** Priority-sorted (CRITICAL→HIGH→MEDIUM) — overdue CAPAs, critical NCRs, open complaints, overdue CARs

## Module 69 — Quality Reports ✅
Formal quality management reports for management review and compliance.
- **Tables:** Uses existing tables (read-only)
- **API:** GET /quality-reports/ncr-report, /capa-report, /oqc-report, /supplier-report, /complaint-report, /kpi-summary
- **Frontend:** `/quality/reports` (6 tabs)
- **KPI Summary:** Single-page executive quality scorecard
- **NCR Report:** Aging, closing days, CAPA count per NCR
- **CAPA Report:** Completion rate, overdue flag, avg days to close
- **OQC Report:** By-product pass rate analysis
- **Supplier Report:** Vendor ratings, AVL status, CAR summary
- **Complaint Report:** Response time, closure rate, type breakdown

## Module 69 — Quality Reports ✅
Formal quality management reports for management review and compliance.
- **Tables:** Uses existing tables (read-only)
- **API:** GET /quality-reports/ncr-report, /capa-report, /oqc-report, /supplier-report, /complaint-report, /kpi-summary
- **Frontend:** `/quality/reports` (6 tabs)
- **KPI Summary:** Single-page executive quality scorecard
- **NCR Report:** Aging, closing days, CAPA count per NCR
- **CAPA Report:** Completion rate, overdue flag, avg days to close
- **OQC Report:** By-product pass rate analysis
- **Supplier Report:** Vendor ratings, AVL status, CAR summary
- **Complaint Report:** Response time, closure rate, type breakdown

---

# 🚀 PHASE 12 — SALES & DISPATCH

## Module 95 — Lead Management ✅
Sales pipeline tracking from first contact to conversion.
- **Tables:** `leads`
- **API:** GET/POST /leads, PUT /:id, POST /:id/convert
- **Frontend:** `/sales/leads` (new Sales sidebar section)
- **Numbering:** LEAD-YEAR-XXXX
- **Sources:** REFERRAL, COLD_CALL, EXHIBITION, WEBSITE, EXISTING_CUSTOMER, OTHER
- **Flow:** NEW → CONTACTED → QUALIFIED → CONVERTED / LOST
- **Pipeline:** Estimated value tracking for qualified leads
- **Overdue:** Follow-up date overdue detection with orange highlight
- **Lost:** Mandatory lost reason required

Phase 12: Sales & Dispatch  ✅ COMPLETE (M95-M102 + M99 all done)

## Module 96 — Quotation ✅
Customer quotations with line items, GST calculation and approval workflow.
- **Tables:** `quotations`, `quotation_items`
- **API:** GET/POST /quotations, POST /:id/send, /accept, /reject, /revise
- **Frontend:** `/sales/quotations`
- **Numbering:** QT-YEAR-XXXX (Rev 0,1,2...)
- **GST:** CGST+SGST split, rates 0/5/12/18/28%, per line item
- **Discount:** Per line item discount %
- **Flow:** DRAFT → SENT → ACCEPTED / REJECTED
- **Revision:** Create new revision from SENT/REJECTED quotation
- **Lead link:** Auto-fills customer details, auto-converts lead on acceptance
- **Price lock:** Accepted quotation prices immutable (new revision required)

## Module 97 — Customer PO ✅
Register and track customer purchase orders linked to accepted quotations.
- **Tables:** `customer_pos`, `customer_po_items`
- **API:** GET/POST /customer-po, POST /:id/acknowledge, POST /:id/cancel
- **Frontend:** `/sales/customer-po`
- **Numbering:** CPO-YEAR-XXXX
- **Flow:** RECEIVED → ACKNOWLEDGED → IN_PROGRESS → COMPLETED / CANCELLED
- **Quotation link:** Auto-fills customer details from accepted quotation
- **Delivery tracking:** Item-level deliveredQty + pendingQty
- **Overdue detection:** Orange highlight when delivery date passed
- **Price lock:** Unit prices locked at PO time (Rule 10 compliant)
- **Cancel:** Mandatory cancellation reason

## Module 98 — Sales Order ✅
Internal fulfillment commitment created from Customer POs.
- **Tables:** `sales_orders`, `sales_order_items`
- **API:** GET/POST /sales-orders, POST /:id/confirm, POST /:id/cancel, GET /by-cpo/:cpoId
- **Frontend:** `/sales/sales-orders`
- **Numbering:** SO-YEAR-XXXX
- **Flow:** DRAFT → CONFIRMED → IN_PRODUCTION → DISPATCHED → COMPLETED / CANCELLED
- **CPO link:** Mandatory — auto-loads items from CPO, updates CPO to IN_PROGRESS
- **Price lock:** Unit prices locked at SO creation (Rule 10 compliant)
- **Dispatch tracking:** Item-level dispatchedQty + pendingQty
- **Overdue detection:** Orange highlight when delivery date passed
- **Cancel:** Mandatory reason, cannot cancel DISPATCHED or COMPLETED

## Module 100 — Dispatch Planning ✅
Plan and approve dispatch of sales order items to customers.
- **Tables:** `dispatch_plans`, `dispatch_plan_items`
- **API:** GET/POST /dispatch-plans, POST /:id/approve, POST /:id/cancel, GET /pending-so-items/:soId
- **Frontend:** `/sales/dispatch-planning`
- **Numbering:** DP-YEAR-XXXX
- **Flow:** DRAFT → APPROVED → DISPATCHED / CANCELLED
- **SO link:** Mandatory — auto-loads pending items from SO
- **Qty validation:** Cannot plan more than SO pending qty
- **Transport:** Mode (ROAD/RAIL/AIR/COURIER), vehicle, driver, transporter
- **Overdue:** Orange highlight when planned date passed
- **Cancel:** Mandatory reason

## Module 101 — Dispatch ✅
Execute dispatches from approved plans — Delivery Challans with LR and E-Way Bill.
- **Tables:** `dispatches`, `dispatch_items`
- **API:** GET/POST /dispatches, GET /dispatches/stats
- **Frontend:** `/sales/dispatch`
- **Numbering:** DSP-YEAR-XXXX
- **Flow:** Creates DISPATCHED record → updates SO pendingQty → auto-updates SO/Plan status
- **Documents:** LR Number, E-Way Bill Number recorded
- **Transport:** Vehicle, driver, transporter auto-filled from plan
- **Qty validation:** Cannot dispatch more than planned qty
- **Auto-updates:** SO → DISPATCHED when all items dispatched, Plan → DISPATCHED
- **Price lock:** Unit prices from SO (Rule 10 compliant)

## Module 102 — Delivery Confirmation ✅
Record customer delivery confirmations with POD — completes the full sales cycle.
- **Tables:** `delivery_confirmations`
- **API:** GET/POST /delivery-confirmations, GET /stats
- **Frontend:** `/sales/delivery`
- **Numbering:** DC-YEAR-XXXX
- **Conditions:** GOOD / DAMAGED / PARTIAL
- **POD:** Proof of Delivery number recorded
- **Auto-updates:** Dispatch→DELIVERED, SO→COMPLETED, CPO→COMPLETED
- **Duplicate guard:** One DC per dispatch (unique constraint)
- **Shortage/Damage:** Qty shortage and damage notes captured
- **Sales cycle complete:** Lead→Quote→CPO→SO→Dispatch→Delivery ✅

---

# 🚀 PHASE 13 — FINANCE & GST

## Module 103 — Chart of Accounts ✅
Hierarchical double-entry ledger account master — foundation of all finance.
- **Tables:** `accounts`, `voucher_entries` (stub)
- **API:** GET/POST /accounts, GET /accounts/tree, POST /accounts/seed
- **Frontend:** `/finance/accounts` (new Finance sidebar section)
- **Default accounts:** 42 accounts seeded (ASSET/LIABILITY/EQUITY/INCOME/EXPENSE)
- **Hierarchy:** Parent-child tree with expand/collapse UI
- **Views:** Tree mode + Flat table mode
- **System accounts:** isSystemAccount flag — cannot be deleted
- **Seed:** Idempotent — safe to run multiple times
- **Account types:** ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
- **Sub types:** BANK, CASH, DEBTOR, CREDITOR, GST, STOCK, FIXED_ASSET, REVENUE, COGS, OPEX

Phase 13: Finance & GST  ✅ COMPLETE (M103-109 all done)

## Module 104 — Voucher Engine ✅
Double-entry bookkeeping engine — the core of all financial transactions.
- **Tables:** `vouchers`, `voucher_entries`
- **API:** GET/POST /vouchers, POST /:id/post, POST /:id/cancel
- **Frontend:** `/finance/vouchers`
- **Types:** SALES_INVOICE, RECEIPT, PURCHASE_BILL, PAYMENT, JOURNAL, CREDIT_NOTE, DEBIT_NOTE
- **Balance rule:** Total Debits must equal Total Credits — enforced at API level
- **Account update:** currentBalance auto-updated on POST
- **Numbering:** SINV/RCP/PBIL/PAY/JRN/CN/DN-YEAR-XXXX by type
- **Flow:** DRAFT → POSTED → CANCELLED
- **Cancel:** Reverses account balance changes, mandatory reason

## Module 105 — Accounts Receivable ✅
Customer invoices, payment tracking and aging analysis.
- **Tables:** `ar_invoices`, `ar_payments`
- **API:** GET/POST /ar, POST /ar/from-dispatch/:id, POST /ar/payments, GET /ar/aging
- **Frontend:** `/finance/ar` (2 tabs: Invoices + Aging Report)
- **Auto-invoice:** Create from delivered dispatch with auto-voucher
- **Payment flow:** Partial or full payments with mode tracking
- **Auto-vouchers:** Sales Invoice (DR Debtors/CR Sales+GST) + Receipt (DR Bank/CR Debtors)
- **Aging buckets:** Current, 1-30, 31-60, 61-90, 90+ days
- **Terms:** IMMEDIATE, NET_30, NET_45, NET_60, NET_90
- **Status:** DRAFT→SENT→PARTIAL→PAID / OVERDUE

## Module 106 — Accounts Payable ✅
Vendor bills, payment tracking and payables aging analysis.
- **Tables:** `ap_bills`, `ap_payments`
- **API:** GET/POST /ap, POST /ap/payments, GET /ap/aging, GET /ap/stats
- **Frontend:** `/finance/ap` (2 tabs: Bills + Aging Report)
- **Auto-vouchers:** Purchase Bill (DR Purchases+GST/CR Creditors) + Payment (DR Creditors/CR Bank)
- **Payment flow:** Partial or full vendor payments with NEFT/RTGS/Cheque/UPI
- **Aging buckets:** Current, 1-30, 31-60, 61-90, 90+ days
- **PO linkage:** Optional link to Purchase Order
- **Status:** DRAFT→APPROVED→PARTIAL→PAID / OVERDUE
- **Mirror of AR:** Same pattern as M105 but vendor-side

## Module 107 — GST Management ✅
Indian GST compliance — GSTR-1, GSTR-3B, Input Tax Credit, return filing.
- **Tables:** `gst_returns`
- **API:** GET /gst/dashboard, /gst/gstr1, /gst/gstr3b, /gst/returns, POST /generate, /:id/file
- **Frontend:** `/finance/gst` (4 tabs: Dashboard, GSTR-1, GSTR-3B, Returns)
- **Dashboard:** Output GST, Input Credit, Net Liability, 6-month trend
- **GSTR-1:** Sales register — invoice-wise GST breakdown
- **GSTR-3B:** Summary return — outward supplies vs input credit
- **Returns:** Generate DRAFT → File (irreversible)
- **Period selector:** Month/Year dropdown, last 12 months
- **Computed on-the-fly:** From AR invoices + AP bills (no duplication)

## Module 108 — Bank Reconciliation ✅
Match bank statement transactions with ledger voucher entries.
- **Tables:** `bank_statements`, `bank_statement_lines`
- **API:** GET/POST /bank-reconciliation, POST /reconcile, /unreconcile/:id, GET /suggestions/:lineId
- **Frontend:** `/finance/bank-recon`
- **Import:** Manual entry of bank statement lines (date, desc, ref, credit/debit/balance)
- **Suggestions:** Auto-match voucher entries by amount (±1%)
- **Reconcile:** Mark line matched + link to voucher entry
- **Unreconcile:** Undo reconciliation (undo button)
- **Status:** DRAFT → RECONCILED (when all lines matched)
- **Bank accounts:** Only BANK subtype accounts shown
- **Duplicate guard:** One statement per bank account per period

## Module 109 — Financial Reports ✅
Complete financial reporting suite — Trial Balance, P&L, Balance Sheet, Cash Flow.
- **Tables:** None (computed from accounts + voucher_entries)
- **API:** GET /financial-reports/summary, /trial-balance, /profit-and-loss, /balance-sheet, /cash-flow
- **Frontend:** `/finance/reports` (5 tabs: Summary, Trial Balance, P&L, Balance Sheet, Cash Flow)
- **Trial Balance:** All accounts Dr/Cr with self-check (Dr=Cr)
- **P&L:** Revenue - COGS = Gross Profit - Opex = Net Profit with margins
- **Balance Sheet:** Assets = Liabilities + Equity + Retained Earnings (self-check)
- **Cash Flow:** Bank receipts/payments with voucher detail
- **Summary:** KPI cards with AR/AP outstanding
- **Period:** Month selector (last 12 months)

## Module 99 — Credit Control ✅
Customer credit limits, real-time AR exposure tracking and order hold management.
- **Tables:** `customer_credit_limits`, `credit_holds`
- **API:** GET /credit-control/dashboard, /limits, /holds, /position/:name, POST /check, /limits, /holds/:id/release
- **Frontend:** `/sales/credit-control` (3 tabs: Dashboard, Limits, Holds)
- **Credit check:** Real-time check against AR outstanding + new order amount
- **Auto-hold:** Creates credit hold when order exceeds available credit
- **Dashboard:** Over-limit alerts, at-risk (80%+), portfolio utilization
- **Utilization bar:** Visual indicator per customer
- **Release:** Management override with mandatory reason
- **Built on M105 AR:** Uses real outstanding balances (reason for deferral)

---

# 🚀 PHASE 14 — COMMUNICATION & WORKFLOW

## Module 110 — Notification Engine ✅
In-app notification system with event triggers, priority levels and read tracking.
- **Tables:** `notifications`
- **API:** GET /notifications, /unread-count, POST /mark-read, /clear-old
- **Frontend:** `/notifications` (new Notifications sidebar section)
- **Types:** SO_CREATED, PO_APPROVED, INVOICE_OVERDUE, CREDIT_HOLD, STOCK_LOW, DISPATCH_DONE, PAYMENT_RECEIVED, QUALITY_ALERT, TASK_ASSIGNED
- **Priority:** LOW, MEDIUM, HIGH, URGENT (color-coded border + dot)
- **Event triggers:** notifyCompany() broadcasts to all users in company
- **Read tracking:** isRead, readAt per notification
- **Auto-clear:** Removes 30-day-old read notifications
- **Filters:** All / Unread only

Phase 14: Communication & Workflow  ✅ COMPLETE (M110-113 all done)

## Module 111 — Email/SMS Alerts ✅
Alert template engine with event triggers, variable substitution and send logging.
- **Tables:** `alert_templates`, `alert_logs`
- **API:** GET/POST /alerts/templates, PUT /templates/:id, POST /trigger, /seed, GET /logs, /stats
- **Frontend:** `/alerts` (3 tabs: Templates, Alert Log, Trigger Alert)
- **Default templates:** 7 seeded (INVOICE_OVERDUE, DISPATCH, PAYMENT, CREDIT_HOLD, PO_APPROVED, SO_CONFIRMED, NCR_RAISED)
- **Variable substitution:** {{customerName}} {{amount}} {{invoiceNumber}} etc.
- **Recipients:** CUSTOMER, INTERNAL, BOTH
- **Channels:** EMAIL, SMS, BOTH
- **Log:** Full history with status SENT/FAILED/PENDING
- **Seed:** Idempotent — 7 default templates

## Module 111 — Email/SMS Alerts ✅
Alert template engine with event triggers, variable substitution and send logging.
- **Tables:** `alert_templates`, `alert_logs`
- **API:** GET/POST /alerts/templates, PUT /templates/:id, POST /trigger, /seed, GET /logs, /stats
- **Frontend:** `/alerts` (3 tabs: Templates, Alert Log, Trigger Alert)
- **Default templates:** 7 seeded (INVOICE_OVERDUE, DISPATCH, PAYMENT, CREDIT_HOLD, PO_APPROVED, SO_CONFIRMED, NCR_RAISED)
- **Variable substitution:** customerName, amount, invoiceNumber etc.
- **Recipients:** CUSTOMER, INTERNAL, BOTH
- **Channels:** EMAIL, SMS, BOTH
- **Log:** Full history with status SENT/FAILED/PENDING
- **Seed:** Idempotent

## Module 111 — Email/SMS Alerts ✅
Alert template engine with event triggers, variable substitution and send logging.
- **Tables:** `alert_templates`, `alert_logs`
- **API:** GET/POST /alerts/templates, PUT /templates/:id, POST /trigger, /seed, GET /logs, /stats
- **Frontend:** `/alerts` (3 tabs: Templates, Alert Log, Trigger Alert)
- **Default templates:** 7 seeded (INVOICE_OVERDUE, DISPATCH, PAYMENT, CREDIT_HOLD, PO_APPROVED, SO_CONFIRMED, NCR_RAISED)
- **Variable form:** User-friendly key-value fields (not raw JSON)
- **Recipients:** CUSTOMER, INTERNAL, BOTH
- **Channels:** EMAIL, SMS, BOTH
- **Log:** Full history with status SENT/FAILED/PENDING
- **Seed:** Idempotent — 7 default templates

## Module 112 — Approval Workflows ✅
Multi-level document approval engine with configurable workflows and audit trail.
- **Tables:** `workflow_definitions`, `workflow_steps`, `approval_requests`, `approval_actions`
- **API:** GET/POST /workflows/definitions, /requests, /submit, /requests/:id/action, /cancel, /seed
- **Frontend:** `/workflows` (3 tabs: Pending Approvals, All Requests, Definitions)
- **Default workflows:** 5 seeded (PO, SO, AP_BILL, CREDIT_OVERRIDE, VOUCHER)
- **Triggers:** ALWAYS or ABOVE_AMOUNT threshold
- **Multi-level:** Up to 3 approval levels (e.g. AP_BILL has 2 levels)
- **Auto-approve:** Below threshold → no request created
- **Actions:** APPROVED / REJECTED with mandatory comments on reject
- **Pending badge:** Count shown on tab
- **Seed:** Idempotent

## Module 113 — Task Management ✅
Cross-department task assignment, tracking and completion with comments.
- **Tables:** `tasks`, `task_comments`
- **API:** GET/POST /tasks, PUT /tasks/:id, POST /tasks/:id/status, /tasks/:id/comments
- **Frontend:** `/tasks` (3 tabs: My Tasks, All Tasks, Create Task)
- **Numbering:** TASK-YEAR-XXXX
- **Priorities:** LOW, MEDIUM, HIGH, URGENT (color-coded)
- **Categories:** QUALITY, PURCHASE, SALES, FINANCE, PRODUCTION, GENERAL
- **Status:** OPEN → IN_PROGRESS → COMPLETED / CANCELLED
- **Reference:** Link to any document (NCR, PO, SO, INVOICE etc.)
- **My Tasks:** Filter tasks assigned to current user
- **Overdue:** Red border + badge when past due date
- **Comments:** Threaded comments per task
- **Complete modal:** Mandatory completion note

---

# 🚀 PHASE 15 — DOCUMENT CENTER

## Module 114 — Document Management ✅
Upload, categorize, version-control and download company documents.
- **Tables:** `documents`
- **API:** GET/POST /documents, GET /documents/:id, GET /documents/:id/download, POST /documents/version, DELETE /documents/:id
- **Frontend:** `/documents` (new Documents sidebar section)
- **Upload:** Base64 encoded, max 10MB, drag-drop UI
- **File types:** PDF, IMAGE, EXCEL, WORD, OTHER (auto-detected from MIME)
- **Categories:** PURCHASE, QUALITY, SALES, FINANCE, HR, PRODUCTION, GENERAL
- **Versioning:** v1→v2→v3, parent-child relationship, version history in detail
- **Reference:** Link to any ERP record (PO, SO, NCR, VENDOR etc.)
- **Tags:** Comma-separated for search
- **Download:** Streams binary file with correct MIME type

Phase 15: Document Center  🔄 (1/3 complete — M114 done)