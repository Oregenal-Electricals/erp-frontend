'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const ITEM_TYPES = ['RAW_MATERIAL','SEMI_FINISHED','FINISHED_GOOD','CONSUMABLE','PACKAGING','SPARE_PART','TOOL','SERVICE'];
const GST_RATES  = [0, 5, 12, 18, 28];
const ABC_CLASS  = ['A','B','C'];
const CRITICALITY = ['CRITICAL','MAJOR','MINOR'];

export default function CreateItemPage() {
  const router = useRouter();
  const [uoms, setUoms]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    itemCode: '', itemName: '', shortName: '', description: '',
    itemType: 'RAW_MATERIAL', categoryId: '', uomId: '', purchaseUomId: '', salesUomId: '',
    hsnCode: '', gstRate: 18, purchaseRate: '', salesRate: '', standardCost: '',
    reorderLevel: '', reorderQty: '', minOrderQty: '', maxOrderQty: '', leadTimeDays: '',
    isBatchTracked: false, isSerialTracked: false,
    drawingNo: '', barcode: '', abcClass: '', criticalityLevel: '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/items/uom').then(({ data }) => setUoms(data));
    api.get('/items/categories').then(({ data }) => setCategories(data));
  }, []);

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: val }));
  };

  const handleSubmit = async () => {
    if (!form.itemCode || !form.itemName || !form.uomId) {
      setError('Item code, name and UOM are required'); return;
    }
    setError(''); setSaving(true);
    try {
      const payload = { ...form };
      const numFields = ['gstRate','purchaseRate','salesRate','standardCost','reorderLevel','reorderQty','minOrderQty','maxOrderQty'];
      const intFields = ['leadTimeDays'];
      numFields.forEach(f => { if (payload[f]) payload[f] = parseFloat(payload[f]); else delete payload[f]; });
      intFields.forEach(f => { if (payload[f]) payload[f] = parseInt(payload[f]); else delete payload[f]; });
      if (!payload.categoryId)   delete payload.categoryId;
      if (!payload.purchaseUomId) delete payload.purchaseUomId;
      if (!payload.salesUomId)   delete payload.salesUomId;
      if (!payload.abcClass)     delete payload.abcClass;
      if (!payload.criticalityLevel) delete payload.criticalityLevel;

      const { data } = await api.post('/items', payload);
      router.push(`/inventory/items/${data.id}`);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create item');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <AppLayout>
      <PageHeader title="New Item" subtitle="Add item to master catalog" />
      <div className="max-w-4xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Basic Info */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Basic Information</h3>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className={labelClass}>Item Code <span className="text-red-500">*</span></label>
              <input type="text" name="itemCode" value={form.itemCode} onChange={handleChange}
                placeholder="RM-PCB-001" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Item Name <span className="text-red-500">*</span></label>
              <input type="text" name="itemName" value={form.itemName} onChange={handleChange}
                placeholder="FR4 PCB Board 100x80mm" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Short Name</label>
              <input type="text" name="shortName" value={form.shortName} onChange={handleChange}
                placeholder="PCB 100x80" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Item Type</label>
              <select name="itemType" value={form.itemType} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select name="categoryId" value={form.categoryId} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* UOM */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Unit of Measure</h3>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className={labelClass}>Primary UOM <span className="text-red-500">*</span></label>
              <select name="uomId" value={form.uomId} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select UOM</option>
                {uoms.map(u => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Purchase UOM</label>
              <select name="purchaseUomId" value={form.purchaseUomId} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Same as Primary</option>
                {uoms.map(u => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Sales UOM</label>
              <select name="salesUomId" value={form.salesUomId} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Same as Primary</option>
                {uoms.map(u => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
              </select>
            </div>
          </div>

          {/* GST & Pricing */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">GST & Pricing</h3>
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div>
              <label className={labelClass}>HSN Code</label>
              <input type="text" name="hsnCode" value={form.hsnCode} onChange={handleChange}
                placeholder="8534.10" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>GST Rate</label>
              <select name="gstRate" value={form.gstRate} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Purchase Rate (₹)</label>
              <input type="number" name="purchaseRate" value={form.purchaseRate} onChange={handleChange}
                placeholder="125.50" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Sales Rate (₹)</label>
              <input type="number" name="salesRate" value={form.salesRate} onChange={handleChange}
                placeholder="150.00" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          {/* Stock Control */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Stock Control</h3>
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div>
              <label className={labelClass}>Reorder Level</label>
              <input type="number" name="reorderLevel" value={form.reorderLevel} onChange={handleChange}
                placeholder="100" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Reorder Qty</label>
              <input type="number" name="reorderQty" value={form.reorderQty} onChange={handleChange}
                placeholder="500" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Min Order Qty</label>
              <input type="number" name="minOrderQty" value={form.minOrderQty} onChange={handleChange}
                placeholder="50" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Lead Time (days)</label>
              <input type="number" name="leadTimeDays" value={form.leadTimeDays} onChange={handleChange}
                placeholder="7" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          {/* Classification */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Classification & Tracking</h3>
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div>
              <label className={labelClass}>ABC Class</label>
              <select name="abcClass" value={form.abcClass} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select</option>
                {ABC_CLASS.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Criticality</label>
              <select name="criticalityLevel" value={form.criticalityLevel} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select</option>
                {CRITICALITY.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Barcode</label>
              <input type="text" name="barcode" value={form.barcode} onChange={handleChange}
                placeholder="1234567890123" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Drawing No</label>
              <input type="text" name="drawingNo" value={form.drawingNo} onChange={handleChange}
                placeholder="DRW-001" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-6 mb-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isBatchTracked" checked={form.isBatchTracked} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700 font-medium">Batch Tracked</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isSerialTracked" checked={form.isSerialTracked} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700 font-medium">Serial Tracked</span>
            </label>
          </div>

          <div className="flex gap-3 pt-5 border-t border-gray-100">
            <button onClick={handleSubmit} disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating...' : 'Create Item'}
            </button>
            <button onClick={() => router.push('/inventory/items')}
              className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
