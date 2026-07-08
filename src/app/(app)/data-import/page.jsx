'use client';
import { useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const IMPORT_TYPES = [
  {
    key: 'raw-materials',
    label: 'Raw Materials',
    icon: '🔩',
    color: 'bg-blue-50 border-blue-200',
    fields: ['code','name','materialType','hsnCode','gstRate','minStockLevel','maxStockLevel'],
    sample: 'code,name,materialType,hsnCode,gstRate,minStockLevel,maxStockLevel\nRM-031,Copper Rod 8mm,WIRE,7408,18,25,250\nRM-032,PVC Pipe 25mm,INSULATION,3917,18,50,500',
  },
  {
    key: 'vendors',
    label: 'Vendors',
    icon: '🤝',
    color: 'bg-green-50 border-green-200',
    fields: ['code','name','gstin','pan','city','state','phone','email','paymentTerms','creditLimit'],
    sample: 'code,name,gstin,pan,city,state,phone,email,paymentTerms,creditLimit\nVND-011,ABC Electricals,29XXXXX1234X1ZX,XXXXX1234X,Mumbai,Maharashtra,9999999999,abc@abc.com,NET_30,200000',
  },
  {
    key: 'opening-stock',
    label: 'Opening Stock',
    icon: '📦',
    color: 'bg-orange-50 border-orange-200',
    fields: ['itemCode','itemName','quantity','unitCost'],
    sample: 'itemCode,itemName,quantity,unitCost\nRM-001,Copper Wire 1.5mm,150,850\nFG-001,Distribution Board 4 Way,25,2500',
  },
  {
    key: 'employees',
    label: 'Employees',
    icon: '👥',
    color: 'bg-purple-50 border-purple-200',
    fields: ['employeeNumber','firstName','lastName','email','phone','gender','dateOfJoining','basicSalary','department','designation'],
    sample: 'employeeNumber,firstName,lastName,email,phone,gender,dateOfJoining,basicSalary,department,designation\nEMP-021,Ravi,Kumar,ravi@oregenalelectrical.com,9876543210,MALE,2024-01-01,25000,Production,Operator',
  },
  {
    key: 'attendance',
    label: 'Daily Attendance',
    icon: '📅',
    color: 'bg-yellow-50 border-yellow-200',
    fields: ['employeeNumber','date','status','inTime','outTime','remarks'],
    sample: 'employeeNumber,date,status,inTime,outTime,remarks\nEMP-001,2026-07-01,PRESENT,09:00,18:00,\nEMP-002,2026-07-01,PRESENT,09:15,18:00,Late by 15 min\nEMP-003,2026-07-01,ABSENT,,,Leave',
  },
  {
    key: 'hsn-sac',
    label: 'HSN/SAC Codes',
    icon: '🏷️',
    color: 'bg-indigo-50 border-indigo-200',
    fields: ['code','description','gstRate','type'],
    sample: 'code,description,gstRate,type\n8537,Boards panels for electric control,18,GOODS\n9983,Software services,18,SERVICE',
  },
];

export default function DataImportPage() {
  const [selected, setSelected] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  function handleTypeSelect(type) {
    setSelected(type);
    setCsvText('');
    setPreview([]);
    setHeaders([]);
    setResults(null);
    setError('');
  }

  function downloadTemplate(type) {
    const blob = new Blob([type.sample], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${type.key}-template.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l=>l.trim());
    if (lines.length < 2) return {headers:[], rows:[]};
    const headers = lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
    const rows = lines.slice(1).map(l=>{
      const vals = l.split(',').map(v=>v.trim().replace(/^"|"$/g,''));
      const obj = {};
      headers.forEach((h,i)=>{ obj[h] = vals[i]||''; });
      return obj;
    });
    return {headers, rows};
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setResults(null); setError('');
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target.result;
      setCsvText(text);
      const {headers, rows} = parseCSV(text);
      setHeaders(headers);
      setPreview(rows.slice(0,10));
    };
    reader.readAsText(file);
  }

  function handlePaste(text) {
    setCsvText(text);
    const {headers, rows} = parseCSV(text);
    setHeaders(headers);
    setPreview(rows.slice(0,10));
  }

  async function handleImport() {
    if (!preview.length || !selected) return;
    setImporting(true); setError(''); setResults(null);
    const {rows} = parseCSV(csvText);
    let success=0, failed=0, errors=[];

    if (selected.key === 'attendance') {
      // Get employees first
      const empRes = await fetch(`${API}/employees?limit=200`,{headers:{Authorization:`Bearer ${getToken()}`}});
      const empData = await empRes.json();
      const empMap = {};
      (empData.data||[]).forEach(e=>{ empMap[e.employeeNumber] = e.id; });

      for (const row of rows) {
        try {
          const empId = empMap[row.employeeNumber];
          if (!empId) { failed++; errors.push(`${row.employeeNumber}: Employee not found`); continue; }
          const body = {
            employeeId: empId,
            date: row.date,
            status: row.status || 'PRESENT',
            inTime: row.inTime || undefined,
            outTime: row.outTime || undefined,
            remarks: row.remarks || undefined,
          };
          const res = await fetch(`${API}/attendance`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
          if (res.ok) success++;
          else { const d=await res.json(); failed++; errors.push(`${row.employeeNumber} ${row.date}: ${d.message}`); }
        } catch(e) { failed++; errors.push(`${row.employeeNumber}: ${e.message}`); }
      }
    } else if (selected.key === 'raw-materials') {
      const uomRes = await fetch(`${API}/raw-materials?limit=1`,{headers:{Authorization:`Bearer ${getToken()}`}});
      for (const row of rows) {
        try {
          const body = {
            code: row.code, name: row.name,
            materialType: row.materialType || 'GENERAL',
            hsnCode: row.hsnCode || undefined,
            gstRate: parseFloat(row.gstRate) || 18,
            minStockLevel: parseFloat(row.minStockLevel) || 0,
            maxStockLevel: parseFloat(row.maxStockLevel) || 0,
          };
          const res = await fetch(`${API}/raw-materials`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
          if (res.ok) success++;
          else { const d=await res.json(); failed++; errors.push(`${row.code}: ${d.message}`); }
        } catch(e) { failed++; errors.push(`${row.code}: ${e.message}`); }
      }
    } else if (selected.key === 'vendors') {
      for (const row of rows) {
        try {
          const body = {
            code: row.code, name: row.name, gstin: row.gstin||undefined,
            pan: row.pan||undefined, city: row.city||undefined,
            state: row.state||undefined, phone: row.phone||undefined,
            email: row.email||undefined, paymentTerms: row.paymentTerms||'NET_30',
            creditLimit: parseFloat(row.creditLimit)||0,
            vendorType: 'SUPPLIER', country: 'India',
          };
          const res = await fetch(`${API}/vendors`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
          if (res.ok) success++;
          else { const d=await res.json(); failed++; errors.push(`${row.code}: ${d.message}`); }
        } catch(e) { failed++; errors.push(`${row.code}: ${e.message}`); }
      }
    } else if (selected.key === 'opening-stock') {
      const wh = await fetch(`${API}/warehouse?limit=1`,{headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>r.ok?r.json():null);
      const warehouseId = wh?.data?.[0]?.id || wh?.[0]?.id;
      for (const row of rows) {
        try {
          const body = {
            companyId: undefined,
            itemCode: row.itemCode, itemName: row.itemName,
            warehouseId: warehouseId,
            availableQty: parseFloat(row.quantity)||0,
            unitCost: parseFloat(row.unitCost)||0,
            totalValue: (parseFloat(row.quantity)||0)*(parseFloat(row.unitCost)||0),
          };
          const res = await fetch(`${API}/stock-balance`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
          if (res.ok) success++;
          else { const d=await res.json(); failed++; errors.push(`${row.itemCode}: ${d.message}`); }
        } catch(e) { failed++; errors.push(`${row.itemCode}: ${e.message}`); }
      }
    } else if (selected.key === 'hsn-sac') {
      for (const row of rows) {
        try {
          const body = { code: row.code, description: row.description, gstRate: parseFloat(row.gstRate)||18, type: row.type||'GOODS' };
          const res = await fetch(`${API}/hsn-sac`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
          if (res.ok) success++;
          else { const d=await res.json(); failed++; errors.push(`${row.code}: ${d.message}`); }
        } catch(e) { failed++; errors.push(`${row.code}: ${e.message}`); }
      }
    } else {
      setError('Import not yet supported for this type. Contact admin.');
      setImporting(false); return;
    }

    setResults({total:rows.length, success, failed, errors});
    setImporting(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📥 Data Import Center</h1>
          <p className="text-gray-500 text-sm mt-1">Upload CSV files or paste data to bulk import records</p>
        </div>

        {/* Import Type Selection */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {IMPORT_TYPES.map(type=>(
            <div key={type.key} onClick={()=>handleTypeSelect(type)}
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${selected?.key===type.key?'border-indigo-600 bg-indigo-50':'border-gray-200 hover:border-indigo-300 '+type.color}`}>
              <div className="text-3xl mb-2">{type.icon}</div>
              <div className="font-bold text-gray-800">{type.label}</div>
              <div className="text-xs text-gray-500 mt-1">{type.fields.length} fields</div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="space-y-6">
            {/* Template Download */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-800">{selected.icon} {selected.label} Import</h2>
                  <p className="text-xs text-gray-500 mt-1">Fields: <span className="font-mono">{selected.fields.join(', ')}</span></p>
                </div>
                <button onClick={()=>downloadTemplate(selected)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
                  ⬇ Download Template CSV
                </button>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">Upload Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* File Upload */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Option 1: Upload CSV File</label>
                  <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                    <div className="text-4xl mb-2">📁</div>
                    <div className="text-sm font-medium text-gray-700">Click to upload CSV</div>
                    <div className="text-xs text-gray-400 mt-1">Supports .csv files</div>
                    <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileChange} />
                  </div>
                </div>

                {/* Paste CSV */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Option 2: Paste CSV Data</label>
                  <textarea
                    className="w-full border rounded-xl px-3 py-2 text-xs font-mono h-40"
                    placeholder={selected.sample}
                    onChange={e=>handlePaste(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            {preview.length>0 && (
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="font-bold text-gray-700">Preview ({preview.length} rows shown)</h3>
                  <button onClick={handleImport} disabled={importing} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    {importing?'Importing...':'🚀 Import All'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase">
                      <tr>{headers.map(h=><th key={h} className="px-3 py-2 text-left font-mono">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.map((row,i)=>(
                        <tr key={i} className="hover:bg-gray-50">
                          {headers.map(h=><td key={h} className="px-3 py-2">{row[h]||'—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className={`rounded-xl border p-5 ${results.failed===0?'bg-green-50 border-green-200':'bg-yellow-50 border-yellow-200'}`}>
                <h3 className="font-bold text-gray-800 mb-3">Import Results</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center"><div className="text-2xl font-bold text-gray-800">{results.total}</div><div className="text-xs text-gray-500">Total</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-green-600">{results.success}</div><div className="text-xs text-gray-500">Success</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-red-600">{results.failed}</div><div className="text-xs text-gray-500">Failed</div></div>
                </div>
                {results.errors.length>0&&(
                  <div className="bg-red-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="text-xs font-bold text-red-600 mb-2">Errors:</div>
                    {results.errors.map((e,i)=><div key={i} className="text-xs text-red-600 py-0.5">{i+1}. {e}</div>)}
                  </div>
                )}
                {results.failed===0&&<div className="text-green-600 font-bold text-center">✅ All records imported successfully!</div>}
              </div>
            )}

            {error&&<div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}
          </div>
        )}

        {!selected && (
          <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
            <div className="text-5xl mb-4">📥</div>
            <div className="text-gray-400 text-lg">Select an import type above to get started</div>
            <div className="text-gray-300 text-sm mt-2">Download template → Fill data → Upload CSV → Import</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
