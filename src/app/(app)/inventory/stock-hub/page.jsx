'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
async function api(path) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}
const listOf = d => Array.isArray(d) ? d : (d?.data || []);
// STORE-009 section 51: "Put-Away Pending Since" / Age - helps spot
// material that's been sitting in the receiving/IQC area too long.
function formatAge(dateStr) {
  if (!dateStr) return '-';
  const ms = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const TABS = ['Available', 'Put-Away Pending', 'QC Pending', 'Hold', 'Rejected', 'Location View', 'Material View'];

export default function StockPage() {
  const [activeTab, setActiveTab] = useState('Available');
  const [warehouses, setWarehouses] = useState([]);
  useEffect(() => { api('/warehouses?limit=100').then(d => setWarehouses(listOf(d))).catch(() => {}); }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
          <p className="text-gray-500 text-sm mt-1">Available stock, what's still waiting for a shelf, what's rejected, and where everything physically sits.</p>
        </div>

        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'Available' && <AvailableTab warehouses={warehouses} />}
        {activeTab === 'Put-Away Pending' && <PutAwayPendingTab />}
        {activeTab === 'QC Pending' && <QcPendingTab />}
        {activeTab === 'Hold' && <HoldTab />}
        {activeTab === 'Rejected' && <RejectedTab />}
        {activeTab === 'Location View' && <LocationViewTab warehouses={warehouses} />}
        {activeTab === 'Material View' && <MaterialViewTab />}
      </div>
    </AppLayout>
  );
}

// ---------- TAB 1: Available ----------
function AvailableTab({ warehouses }) {
  const [rows, setRows] = useState([]);
  const [pendingItemCodes, setPendingItemCodes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (search) params.set('search', search);
      if (warehouseId) params.set('warehouseId', warehouseId);
      const [balanceRes, pendingList] = await Promise.all([
        api(`/stock-ledger/balance?${params}`),
        api('/stock-putaway/pending-iqcs').catch(() => []),
      ]);
      setRows(listOf(balanceRes));
      // pending-iqcs' list response has no items array (only grn summary) -
      // fetch each pending IQC's full detail to get its item codes. This
      // list is normally small (a handful of IQC-approved, not-yet-binned
      // records), so N+1 here is fine for a dashboard-style view.
      const codes = new Set();
      await Promise.all((pendingList || []).map(async iqc => {
        try {
          const full = await api(`/iqc/${iqc.id}`);
          (full.items || []).forEach(it => { if (it.acceptedQty > 0) codes.add(it.itemCode); });
        } catch (e) { /* skip */ }
      }));
      setPendingItemCodes(codes);
    } catch (e) { /* silent */ }
    setLoading(false);
  }, [search, warehouseId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Search item code or name..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
          <option value="">All Warehouses</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Item','Warehouse','Available','Reserved','In QC',''].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {rows.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-xs">No stock found</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs">{r.itemName} <span className="text-gray-400 font-mono">({r.itemCode})</span></td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.warehouse?.name}</td>
                <td className="px-3 py-2 text-xs font-bold text-green-600">{r.availableQty}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.reservedQty}</td>
                <td className="px-3 py-2 text-xs text-yellow-600">{r.inQcQty}</td>
                <td className="px-3 py-2 text-xs">
                  {pendingItemCodes.has(r.itemCode) && <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs">No bin yet</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- TAB 2: Put-Away Pending (summary + link to the action) ----------
function PutAwayPendingTab() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/stock-putaway/pending-iqcs').then(setPending).catch(() => setPending([])).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Already counted as Available Stock (IQC-approved) - just waiting for a physical shelf location. To place it, use the Put-Away tab in Material In.</p>
      {pending.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">Nothing waiting for a bin.</div>}
      {pending.map(iqc => (
        <div key={iqc.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between">
          <div>
            <span className="font-mono text-green-600 font-bold text-sm">{iqc.iqcNumber}</span>
            <span className="text-xs text-gray-500 ml-3">{iqc.grn?.grnNumber}</span>
            <span className="text-xs text-gray-400 ml-3">{iqc.grn?.warehouse?.name}</span>
            <span className="text-xs text-gray-400 ml-3">Pending {formatAge(iqc.updatedAt)}</span>
          </div>
          <Link href="/inventory/material-in" className="text-sm text-blue-600 hover:underline">Put Away →</Link>
        </div>
      ))}
    </div>
  );
}

// ---------- QC Pending (summary - actual action is in Material In's IQC Handover tab) ----------
function QcPendingTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api('/iqc?limit=100').then(d => setRows(listOf(d).filter(i => !['APPROVED', 'REJECTED'].includes(i.status)))).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Received and handed to IQC, not yet quality-released - not Available, not issueable. To act on these, use Material In's IQC Handover tab.</p>
      {rows.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">Nothing waiting on QC.</div>}
      {rows.map(iqc => (
        <div key={iqc.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between">
          <div>
            <span className="font-mono text-purple-600 font-bold text-sm">{iqc.iqcNumber}</span>
            <span className="text-xs text-gray-500 ml-3">{iqc.grn?.grnNumber}</span>
            <span className="text-xs text-gray-400 ml-3">{iqc.grn?.warehouse?.name}</span>
          </div>
          <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">{iqc.status}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Hold (summary - actual reinspect action is in Material In's Hold tab) ----------
function HoldTab() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/hold-stock?limit=50').then(d => setRecords(listOf(d))).catch(() => setRecords([])).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Held material is never Available Stock or WO-issueable until Quality reinspects it. To reinspect, use the Hold tab in Material In.</p>
      {records.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">No held stock.</div>}
      {records.map(r => (
        <div key={r.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between">
          <div>
            <span className="font-mono text-orange-600 font-bold text-sm">{r.holdNumber}</span>
            <span className="text-xs text-gray-500 ml-3">{r.warehouse?.name}</span>
            <span className="text-xs text-gray-400 ml-3">Total: {r.totalHoldQty}</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs ${r.status === 'CLOSED' ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>{r.status}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- TAB 3: Rejected (summary + link to the action) ----------
function RejectedTab() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/rejected-stock?limit=50').then(d => setRecords(listOf(d))).catch(() => setRecords([])).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Rejected material is never Available Stock or WO-issueable - kept physically and system-wise separate. To disposition it, use the Rejected tab in Material In.</p>
      {records.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">No rejected stock.</div>}
      {records.map(r => (
        <div key={r.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between">
          <div>
            <span className="font-mono text-red-600 font-bold text-sm">{r.rejectionNumber}</span>
            <span className="text-xs text-gray-500 ml-3">{r.warehouse?.name}</span>
            <span className="text-xs text-gray-400 ml-3">Total: {r.totalRejectedQty}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded-full text-xs ${r.status === 'QUARANTINED' ? 'bg-yellow-100 text-yellow-700' : r.status === 'CLOSED' ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>{r.status}</span>
            {r.status !== 'CLOSED' && <Link href="/inventory/material-in" className="text-sm text-blue-600 hover:underline">Disposition →</Link>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- TAB 4: Location View ----------
function LocationViewTab({ warehouses }) {
  const [warehouseId, setWarehouseId] = useState('');
  const [zones, setZones] = useState([]);
  const [racks, setRacks] = useState({});
  const [bins, setBins] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (warehouses.length > 0 && !warehouseId) setWarehouseId(warehouses[0].id); }, [warehouses, warehouseId]);

  const load = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    try {
      const zoneList = await api(`/warehouses/${warehouseId}/zones`);
      setZones(listOf(zoneList));
      const rackMap = {};
      for (const z of listOf(zoneList)) {
        const rackList = await api(`/warehouses/zones/${z.id}/racks`);
        rackMap[z.id] = listOf(rackList);
      }
      setRacks(rackMap);
      const binMap = {};
      for (const rackArr of Object.values(rackMap)) {
        for (const rack of rackArr) {
          const binList = await api(`/warehouses/racks/${rack.id}/bins`);
          binMap[rack.id] = listOf(binList);
        }
      }
      setBins(binMap);
    } catch (e) { /* silent */ }
    setLoading(false);
  }, [warehouseId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <select className="border rounded-lg px-3 py-2 text-sm" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}
      {!loading && zones.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">No zones set up for this warehouse yet.</div>}

      {!loading && zones.map(z => (
        <div key={z.id} className="bg-white rounded-xl border shadow-sm p-4">
          <div className="font-semibold text-gray-700 mb-2">{z.name} <span className="text-xs text-gray-400 font-mono">({z.code})</span></div>
          {(racks[z.id] || []).map(rack => (
            <div key={rack.id} className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Rack {rack.code}</div>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {(bins[rack.id] || []).map(bin => (
                  <div key={bin.id} className={`rounded-lg border p-2 text-xs ${bin.status === 'EMPTY' ? 'bg-gray-50 border-gray-200' : bin.status === 'FULL' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="font-mono font-bold">{bin.code}</div>
                    {bin.status === 'EMPTY' ? <div className="text-gray-400">Empty</div> : (
                      <>
                        <div className="text-gray-600 truncate">{bin.itemCode}</div>
                        <div className="font-bold">{bin.currentQty}{bin.maxQty ? `/${bin.maxQty}` : ''}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- TAB 5: Material View (STORE-009) ----------
function MaterialViewTab() {
  const [itemCode, setItemCode] = useState('');
  const [result, setResult] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search() {
    if (!itemCode.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSummary(null);
    try {
      const [locations, materialSummary] = await Promise.all([
        api(`/stock-putaway/by-item/${encodeURIComponent(itemCode.trim())}`),
        api(`/stock-ledger/summary/${encodeURIComponent(itemCode.trim())}`),
      ]);
      setResult(locations);
      setSummary(materialSummary);
    } catch (e) { setError('Could not load that item.'); }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text" placeholder="Search item code (e.g. DRIVER-01)..."
          className="border rounded-lg px-3 py-2 text-sm flex-1"
          value={itemCode} onChange={ev => setItemCode(ev.target.value)}
          onKeyDown={ev => ev.key === 'Enter' && search()}
        />
        <button onClick={search} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {summary && (
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono font-bold text-gray-900">{summary.itemCode}</span>
            <span className="text-xs text-gray-400">{summary.itemName}</span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
            <div><div className="text-xs text-gray-400">Physical Total</div><div className="font-bold text-gray-900">{summary.physicalTotal}</div></div>
            <div><div className="text-xs text-gray-400">Available</div><div className="font-bold text-green-600">{summary.available}</div></div>
            <div><div className="text-xs text-gray-400">Reserved</div><div className="font-bold text-blue-600">{summary.reserved}</div></div>
            <div><div className="text-xs text-gray-400">Free Available</div><div className="font-bold text-green-700">{summary.freeAvailable}</div></div>
            <div><div className="text-xs text-gray-400">Put-Away Pending</div><div className="font-bold text-yellow-600">{summary.putAwayPending}</div></div>
            <div><div className="text-xs text-gray-400">QC Pending</div><div className="font-bold text-purple-600">{summary.qcPending}</div></div>
            <div><div className="text-xs text-gray-400">Hold</div><div className="font-bold text-orange-600">{summary.hold}</div></div>
            <div><div className="text-xs text-gray-400">Rejected</div><div className="font-bold text-red-600">{summary.rejected}</div></div>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs text-gray-400 mb-3">Available by batch and location</div>
          {result.locations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No completed put-away found for this item yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Warehouse', 'Rack/Bin', 'Batch', 'Qty'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {result.locations.map((loc, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-xs text-gray-500">{loc.putaway?.warehouse?.name}</td>
                    <td className="px-3 py-2 text-xs font-mono">{loc.bin?.rack?.code}/{loc.bin?.code}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{loc.stockBatch?.batchNumber || '-'}</td>
                    <td className="px-3 py-2 text-xs font-bold text-green-600">{loc.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
