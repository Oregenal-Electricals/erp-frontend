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