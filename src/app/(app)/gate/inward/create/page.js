'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
const UNITS = ['NOS','KG','TON','MTR','LTR','BOX','BUNDLE','BAG','ROLL','SET','PCS'];
export default function CreateGateInwardPage() {
  const router = useRouter();
  const [plants, setPlants]           = useState([]);
  const [vehicleLogs, setVehicleLogs] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [warning, setWarning] = useState('');
  const [form, setForm] = useState({
    plantId: '', vehicleLogId: '',
    poId: '',
    supplierName: '', supplierMobile: '', supplierGstin: '',
    invoiceNumber: '', invoiceDate: '', invoiceAmount: '',
    materialDescription: '', quantity: '', unit: 'NOS',
    grossWeight: '', netWeight: '', packageCount: '',
    remarks: '',
  });
  // Real per-item lines for this gate entry - a real invoice/delivery
  // can carry several different materials in one truck. Populated
  // from the selected PO's real items, editable, with an "Add Item"
  // row for anything not on the PO. Empty array means "no PO picked
  // yet" - falls back to the old single Material Description field.
  const [gateItems, setGateItems] = useState([]);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get('/masters/plants').then(({ data }) => setPlants(data));
    api.get('/vehicle-logs/active').then(({ data }) => setVehicleLogs(data));
    api.get('/purchase-orders?limit=200&status=SENT').then((res) => setPurchaseOrders(res.data?.data || []));
  }, []);
  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handlePoSelect = async (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    setForm(p => ({
      ...p,
      poId,
      supplierName: po?.vendor?.name || p.supplierName,
      supplierGstin: po?.vendor?.gstin || p.supplierGstin,
    }));
    if (!poId) { setGateItems([]); return; }
    const { data: fullPo } = await api.get(`/purchase-orders/${poId}`);
    setGateItems((fullPo.items || []).map(item => ({
      poItemId: item.id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      uom: item.uom || 'NOS',
      quantity: item.orderedQty,
      packageCount: '',
    })));
  };
  function updateGateItem(i, field, value) {
    setGateItems(items => items.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }
  function removeGateItem(i) {
    setGateItems(items => items.filter((_, idx) => idx !== i));
  }
  function addBlankGateItem() {
    setGateItems(items => [...items, { poItemId: '', itemCode: '', itemName: '', uom: 'NOS', quantity: '', packageCount: '' }]);
  }
  const handleSubmit = async () => {
    const usingItems = gateItems.length > 0;
    if (!form.plantId || !form.supplierName) {
      setError('Plant and supplier are required');
      return;
    }
    if (!usingItems && (!form.materialDescription || !form.quantity)) {
      setError('Material description and quantity are required (or add items above)');
      return;
    }
    if (usingItems && gateItems.some(it => !it.itemName || !it.quantity)) {
      setError('Every item row needs a name and quantity');
      return;
    }
    setError(''); setWarning(''); setSaving(true);
    try {
      const payload = { ...form };
      if (payload.quantity)      payload.quantity      = parseFloat(payload.quantity);
      if (payload.grossWeight)   payload.grossWeight    = parseFloat(payload.grossWeight);
      if (payload.netWeight)     payload.netWeight      = parseFloat(payload.netWeight);
      if (payload.invoiceAmount) payload.invoiceAmount  = parseFloat(payload.invoiceAmount);
      if (payload.packageCount)  payload.packageCount   = parseInt(payload.packageCount);
      if (!payload.poId)          delete payload.poId;
      if (!payload.vehicleLogId)  delete payload.vehicleLogId;
      if (!payload.invoiceDate)   delete payload.invoiceDate;
      if (!payload.invoiceAmount) delete payload.invoiceAmount;
      if (!payload.grossWeight)   delete payload.grossWeight;
      if (!payload.netWeight)     delete payload.netWeight;
      if (!payload.packageCount)  delete payload.packageCount;
      if (usingItems) {
        delete payload.materialDescription;
        delete payload.quantity;
        payload.items = gateItems.map(it => ({
          poItemId: it.poItemId || undefined,
          itemCode: it.itemCode || it.itemName,
          itemName: it.itemName,
          uom: it.uom || 'NOS',
          quantity: parseFloat(it.quantity),
          packageCount: it.packageCount ? parseInt(it.packageCount) : undefined,
        }));
      }
      const { data } = await api.post('/gate-inward', payload);
      if (data.vendorMismatchWarning) {
        router.push(`/gate/inward/${data.id}?warning=${encodeURIComponent(data.vendorMismatchWarning)}`);
      } else {
        router.push(`/gate/inward/${data.id}`);
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create GIN');
    } finally { setSaving(false); }
  };
  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";
  return (
    <AppLayout>
      <PageHeader title="New Gate Inward Entry" subtitle="Record goods received at gate" />
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}
          {/* Gate Info */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Gate Information</h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelClass}>Plant<span className="text-red-500">*</span></label>
              <select name="plantId" value={form.plantId} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select Plant</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Link to Vehicle (Optional)</label>
              <select name="vehicleLogId" value={form.vehicleLogId} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select Vehicle (if applicable)</option>
                {vehicleLogs.map(v => (
                  <option key={v.id} value={v.id}>{v.vehicle?.vehicleNumber} — {v.logNumber}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Supplier Info */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Supplier Information</h3>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="col-span-1">
              <label className={labelClass}>Supplier Name <span className="text-red-500">*</span></label>
              <input type="text" name="supplierName" value={form.supplierName} onChange={handleChange}
                placeholder="ABC Steel Suppliers"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mobile</label>
              <input type="text" name="supplierMobile" value={form.supplierMobile} onChange={handleChange}
                placeholder="9876543210"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>GSTIN</label>
              <input type="text" name="supplierGstin" value={form.supplierGstin} onChange={handleChange}
                placeholder="27AABCA1234Z1ZX"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>
          {/* Invoice Info */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Invoice / PO Details</h3>
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="col-span-2">
              <label className={labelClass}>Purchase Order</label>
              <select value={form.poId} onChange={e=>handlePoSelect(e.target.value)}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">No PO (non-purchase delivery)</option>
                {purchaseOrders.map(po => (
                  <option key={po.id} value={po.id}>{po.poNumber} — {po.vendor?.name} ({po.vendor?.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Invoice Number</label>
              <input type="text" name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange}
                placeholder="INV-2024-001"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Invoice Date</label>
              <input type="date" name="invoiceDate" value={form.invoiceDate} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Invoice Amount (₹)</label>
              <input type="number" name="invoiceAmount" value={form.invoiceAmount} onChange={handleChange}
                placeholder="125000"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>
          {/* Material Info */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Material Details</h3>
          {gateItems.length > 0 ? (
            <div className="mb-5">
              <table className="w-full text-sm border rounded-lg overflow-hidden mb-2">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Material</th>
                    <th className="px-3 py-2 text-left">Qty Received</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-left">Packages</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {gateItems.map((it, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        {it.poItemId
                          ? <span>{it.itemName}</span>
                          : <input className="border rounded px-2 py-1 text-xs w-full" placeholder="Material name" value={it.itemName} onChange={e=>updateGateItem(i,'itemName',e.target.value)} />}
                      </td>
                      <td className="px-3 py-2"><input type="number" className="border rounded px-2 py-1 text-xs w-24" value={it.quantity} onChange={e=>updateGateItem(i,'quantity',e.target.value)} /></td>
                      <td className="px-3 py-2 text-xs text-gray-500">{it.uom}</td>
                      <td className="px-3 py-2"><input type="number" className="border rounded px-2 py-1 text-xs w-20" value={it.packageCount} onChange={e=>updateGateItem(i,'packageCount',e.target.value)} /></td>
                      <td className="px-3 py-2"><button type="button" onClick={()=>removeGateItem(i)} className="text-red-400 hover:text-red-600 text-lg">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={addBlankGateItem} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-100">+ Add another item (e.g. not on this PO)</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="col-span-2">
                <label className={labelClass}>Material Description <span className="text-red-500">*</span></label>
                <input type="text" name="materialDescription" value={form.materialDescription} onChange={handleChange}
                  placeholder="MS Steel Rods 10mm dia - 50 bundles"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
              <div className="grid grid-cols-3 gap-3 col-span-2">
                <div>
                  <label className={labelClass}>Quantity <span className="text-red-500">*</span></label>
                  <input type="number" name="quantity" value={form.quantity} onChange={handleChange}
                    placeholder="50"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Unit</label>
                  <select name="unit" value={form.unit} onChange={handleChange}
                    style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Package Count</label>
                  <input type="number" name="packageCount" value={form.packageCount} onChange={handleChange}
                    placeholder="50"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelClass}>Gross Weight (kg)</label>
              <input type="number" name="grossWeight" value={form.grossWeight} onChange={handleChange}
                placeholder="2500.5"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Net Weight (kg)</label>
              <input type="number" name="netWeight" value={form.netWeight} onChange={handleChange}
                placeholder="2450.0"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Remarks</label>
              <input type="text" name="remarks" value={form.remarks} onChange={handleChange}
                placeholder="Any special notes..."
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3 pt-5 border-t border-gray-100">
            <button onClick={handleSubmit} disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating...' : 'Create GIN'}
            </button>
            <button onClick={() => router.push('/gate/inward')}
              className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
