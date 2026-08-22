'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { getUser } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STAGE_LABELS = {
  IQC: 'IQC',
  QUALITY_MANAGER: 'Quality Manager',
  PLANT_HEAD: 'Plant Head',
  FINAL_AUTHORITY: 'Final Authority',
  CLOSED: 'Closed',
};
const CATEGORY_COLORS = {
  Critical: 'text-red-700',
  Major: 'text-amber-700',
  Minor: 'text-gray-600',
};

export default function IqcItemInspectionPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sampleSize, setSampleSize] = useState('');

  const [results, setResults] = useState({});
  const [outcome, setOutcome] = useState('PASS');
  const [decisionRemarks, setDecisionRemarks] = useState('');

  const currentUser = getUser();
  const currentUserName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : '';

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/iqc/items/${itemId}/escalation`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      setItem(data);
      setSampleSize(data.sampleSize != null ? String(data.sampleSize) : '');
      // No template attached yet - auto-search using this item's own
      // name, since templates are now named after the exact material
      // (matching the Excel sheet name), so the right one should
      // surface immediately without the person needing to type.
      if (!data.templateId && data.itemName) setTemplateSearch(data.itemName);
      const initResults = {};
      (data.template?.parameters || []).forEach(p => { initResults[p.id] = { s1: '', s2: '', s3: '', s4: '', s5: '', remark: '' }; });
      setResults(initResults);
    } else {
      setError('Could not load this inspection item');
    }
    setLoading(false);
  }, [itemId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!templateSearch) { setTemplates([]); return; }
    const t = setTimeout(() => {
      fetch(`${API}/iqc/templates?search=${encodeURIComponent(templateSearch)}`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.ok ? r.json() : [])
        .then(setTemplates)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [templateSearch]);

  async function attachTemplate() {
    if (!selectedTemplateId) { setError('Pick a template first'); return; }
    setSaving(true); setError('');
    const res = await fetch(`${API}/iqc/items/${itemId}/attach-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ templateId: selectedTemplateId, sampleSize: sampleSize ? parseInt(sampleSize, 10) : undefined }),
    });
    const data = await res.json();
    if (res.ok) { setItem(data); load(); }
    else setError(data.message || 'Failed to attach template');
    setSaving(false);
  }

  function updateResult(parameterId, field, value) {
    setResults(prev => ({ ...prev, [parameterId]: { ...prev[parameterId], [field]: value } }));
  }

  async function submit() {
    if (!decisionRemarks.trim()) { setError('A remark explaining this decision is required'); return; }
    setSaving(true); setError('');
    const parameterResults = Object.entries(results).map(([parameterId, r]) => ({ parameterId, ...r }));
    const res = await fetch(`${API}/iqc/items/${itemId}/stage-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ outcome, remarks: decisionRemarks, parameterResults }),
    });
    const data = await res.json();
    if (res.ok) { setItem(data); setDecisionRemarks(''); load(); }
    else setError(data.message || 'Failed to submit decision');
    setSaving(false);
  }

  if (loading) {
    return <AppLayout><div className="p-6 text-center text-gray-400">Loading...</div></AppLayout>;
  }
  if (!item) {
    return <AppLayout><div className="p-6 text-center text-red-500">{error || 'Not found'}</div></AppLayout>;
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const isClosed = item.currentStage === 'CLOSED';
  const parameters = item.template?.parameters || [];

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => router.push('/inventory/iqc')} className="text-sm text-gray-500 hover:underline">← Back to IQC</button>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${isClosed ? (item.finalOutcome === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-amber-100 text-amber-700'}`}>
            {isClosed ? `Final Status: ${item.finalOutcome === 'PASS' ? 'Passed' : 'Failed'}` : `Pending at: ${STAGE_LABELS[item.currentStage]}`}
          </span>
        </div>
        {error && <div className="mb-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm border border-red-200">{error}</div>}

        <div className="bg-white border-2 border-gray-400 shadow-sm font-mono text-xs">
          <div className="border-b-2 border-gray-400 p-3 bg-gray-50">
            <div className="text-sm font-bold text-gray-800 tracking-wide">OREGENAL ELECTRICALS INDIA PVT. LTD., MANESAR GURGAON</div>
            <div className="text-base font-bold text-gray-900 mt-1">IQC INSPECTION OF {item.itemName}</div>
            <div className="grid grid-cols-3 gap-x-6 gap-y-1 mt-2 text-gray-700">
              <div><span className="text-gray-500">Item Code:</span> {item.itemCode}</div>
              <div><span className="text-gray-500">Lot Quantity:</span> {item.receivedQty} {item.uom}</div>
              <div><span className="text-gray-500">Inspection Date:</span> {fmtDate(item.iqc?.inspectionDate)}</div>
              <div><span className="text-gray-500">MRIR No. (GRN):</span> {item.iqc?.grn?.grnNumber || '—'}</div>
              <div><span className="text-gray-500">Supplier:</span> {item.iqc?.grn?.po?.vendor?.name || '—'}</div>
              <div><span className="text-gray-500">Doc Code:</span> {item.template?.docCode || '—'}</div>
              <div className="col-span-2"><span className="text-gray-500">Sample Size:</span>{' '}
                {isClosed ? (item.sampleSize ?? '—') : (
                  <input type="number" min="0" className="w-24 border border-gray-300 px-1 py-0.5 bg-white" value={sampleSize} onChange={e => setSampleSize(e.target.value)} />
                )}
              </div>
            </div>
          </div>

          {!item.templateId ? (
            <div className="p-4 space-y-3">
              <div className="text-gray-600">No checklist template attached yet — search for one matching this material.</div>
              <input className="w-full border border-gray-300 px-2 py-1.5" placeholder="Search templates..." value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} />
              {templates.length > 0 && (
                <div className="border border-gray-300 max-h-48 overflow-y-auto">
                  {templates.map(t => (
                    <div key={t.id}
                      onClick={() => { setSelectedTemplateId(t.id); setTemplateSearch(t.name); setTemplates([]); }}
                      className={`px-2 py-1.5 cursor-pointer hover:bg-blue-50 ${selectedTemplateId === t.id ? 'bg-blue-100' : ''}`}>
                      {t.name} {t.docCode ? `(${t.docCode})` : ''}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={attachTemplate} disabled={saving || !selectedTemplateId} className="px-4 py-1.5 bg-blue-600 text-white disabled:opacity-50">
                {saving ? 'Attaching...' : 'Attach Template & Start'}
              </button>
            </div>
          ) : (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-400 px-2 py-1.5 text-gray-700 w-10">S.No</th>
                    <th className="border border-gray-400 px-2 py-1.5 text-gray-700 w-24">Category</th>
                    <th className="border border-gray-400 px-2 py-1.5 text-gray-700 w-40">Parameter</th>
                    <th className="border border-gray-400 px-2 py-1.5 text-gray-700 w-40">Specification</th>
                    {['S1', 'S2', 'S3', 'S4', 'S5'].map(s => <th key={s} className="border border-gray-400 px-1 py-1.5 text-gray-700 w-16">{s}</th>)}
                    <th className="border border-gray-400 px-2 py-1.5 text-gray-700 w-32">Remark (if any)</th>
                  </tr>
                </thead>
                <tbody>
                  {parameters.map((p, idx) => (
                    <tr key={p.id} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="border border-gray-300 text-center text-gray-500 py-1">{p.sNo}</td>
                      <td className={`border border-gray-300 text-center font-bold py-1 ${CATEGORY_COLORS[p.category]}`}>{p.category}</td>
                      <td className="border border-gray-300 px-2 py-1">{p.parameterName}</td>
                      <td className="border border-gray-300 px-2 py-1">{p.specification}</td>
                      {['s1', 's2', 's3', 's4', 's5'].map(field => (
                        <td key={field} className="border border-gray-300 p-0">
                          <input
                            className="w-full px-1 py-1.5 bg-transparent focus:outline-none focus:bg-blue-50 disabled:bg-gray-100"
                            disabled={isClosed}
                            value={results[p.id]?.[field] || ''}
                            onChange={e => updateResult(p.id, field, e.target.value)} />
                        </td>
                      ))}
                      <td className="border border-gray-300 p-0">
                        <input
                          className="w-full px-1 py-1.5 bg-transparent focus:outline-none focus:bg-blue-50 disabled:bg-gray-100"
                          disabled={isClosed}
                          value={results[p.id]?.remark || ''}
                          onChange={e => updateResult(p.id, 'remark', e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {item.stageResults?.length > 0 && (
                <div className="border-t-2 border-gray-400 p-3 bg-gray-50 space-y-2">
                  <div className="font-bold text-gray-800">Decision History</div>
                  {item.stageResults.map(sr => (
                    <div key={sr.id} className="border border-gray-300 bg-white p-2 flex items-start justify-between gap-3">
                      <div>
                        <span className={`font-bold ${sr.outcome === 'PASS' ? 'text-green-700' : 'text-red-700'}`}>{STAGE_LABELS[sr.stage]} — {sr.outcome}</span>
                        <div className="text-gray-600 mt-0.5">&ldquo;{sr.remarks}&rdquo;</div>
                        <div className="text-gray-400 mt-0.5">{fmtDate(sr.reviewedAt)}</div>
                      </div>
                      <a href={`${API}/pdf/iqc/${itemId}/stage/${sr.id}`} target="_blank" rel="noreferrer"
                        className="text-blue-600 hover:underline whitespace-nowrap"
                        onClick={(e) => { e.preventDefault(); fetch(`${API}/pdf/iqc/${itemId}/stage/${sr.id}`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.blob()).then(b => { const url = URL.createObjectURL(b); window.open(url); }); }}>
                        Download PDF
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {!isClosed && (
                <div className="border-t-2 border-gray-400 p-4 bg-gray-50 space-y-3">
                  <div className="font-bold text-gray-800">Record Decision — {STAGE_LABELS[item.currentStage]}</div>
                  <div className="flex gap-3">
                    <button onClick={() => setOutcome('PASS')} className={`px-4 py-1.5 border-2 ${outcome === 'PASS' ? 'border-green-600 bg-green-50 text-green-700 font-bold' : 'border-gray-300 text-gray-600'}`}>Pass</button>
                    <button onClick={() => setOutcome('FAIL')} className={`px-4 py-1.5 border-2 ${outcome === 'FAIL' ? 'border-red-600 bg-red-50 text-red-700 font-bold' : 'border-gray-300 text-gray-600'}`}>Fail</button>
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Remark (required — why this decision was made)</label>
                    <textarea className="w-full border border-gray-300 px-2 py-1.5" rows={2} value={decisionRemarks} onChange={e => setDecisionRemarks(e.target.value)} />
                  </div>
                  <div className="text-gray-500">Reviewed by: <span className="text-gray-800 font-bold">{currentUserName || 'You'}</span> (auto-filled from your login)</div>
                  <button onClick={submit} disabled={saving} className="px-5 py-2 bg-green-700 text-white font-bold disabled:opacity-50">
                    {saving ? 'Submitting...' : 'Submit Decision'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
