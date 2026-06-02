'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Plus, Lock, Unlock, Eye } from 'lucide-react';

const DOC_TYPES = ['PO','GRN','INV','WO','DC','QC','MR','SR','DN','CN','PR','RFQ'];

export default function NumberingSeriesPage() {
  const [series, setSeries]     = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [preview, setPreview]   = useState({});
  const [form, setForm] = useState({
    documentType: 'PO', prefix: 'PO', separator: '-',
    includeYear: true, yearFormat: 'YY-YY', padding: 4,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/masters/companies').then(({ data }) => {
      setCompanies(data);
      if (data.length > 0) setCompanyId(data[0].id);
    });
  }, []);

  const fetchSeries = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/settings/numbering?companyId=${companyId}`);
      setSeries(data);
    } finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  const initializeSeries = async () => {
    if (!confirm('Initialize default numbering series for this company?')) return;
    try {
      const { data } = await api.post(`/settings/numbering/initialize/${companyId}`);
      setSuccess(data.message);
      fetchSeries();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    }
  };

  const getPreview = async (cId, docType) => {
    try {
      const { data } = await api.get(`/settings/numbering/preview?companyId=${cId}&documentType=${docType}`);
      setPreview((prev) => ({ ...prev, [`${cId}_${docType}`]: data.preview }));
    } catch {}
  };

  const handleCreate = async () => {
    setError(''); setSaving(true);
    try {
      await api.post('/settings/numbering', { ...form, companyId });
      setSuccess(`Series for ${form.documentType} created`);
      setShowCreate(false);
      fetchSeries();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const inputClass = "border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";

  return (
    <AppLayout>
      <PageHeader
        title="Numbering Series"
        subtitle="Configure document numbering for PO, GRN, Invoice etc."
        action={
          <div className="flex gap-2">
            <button onClick={initializeSeries}
              className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Initialize Defaults
            </button>
            <button onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus size={16} /> Add Series
            </button>
          </div>
        }
      />

      {/* Company selector */}
      <div className="mb-4">
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-64">
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error   && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-green-700 text-sm font-medium">✅ {success}</div>}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 bg-white rounded-xl border-2 border-blue-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Create New Series</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Document Type</label>
              <select value={form.documentType}
                onChange={(e) => setForm((p) => ({ ...p, documentType: e.target.value, prefix: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Prefix</label>
              <input type="text" value={form.prefix} onChange={(e) => setForm((p) => ({ ...p, prefix: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Separator</label>
              <input type="text" value={form.separator} maxLength={2}
                onChange={(e) => setForm((p) => ({ ...p, separator: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Year Format</label>
              <select value={form.yearFormat} onChange={(e) => setForm((p) => ({ ...p, yearFormat: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`}>
                <option value="YY-YY">YY-YY (26-27)</option>
                <option value="YYYY">YYYY (2026)</option>
                <option value="YY">YY (26)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Padding (digits)</label>
              <input type="number" min={1} max={6} value={form.padding}
                onChange={(e) => setForm((p) => ({ ...p, padding: parseInt(e.target.value) }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`} />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2 cursor-pointer">
                <input type="checkbox" checked={form.includeYear}
                  onChange={(e) => setForm((p) => ({ ...p, includeYear: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600" />
                Include Year
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={saving}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating...' : 'Create Series'}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="border-2 border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Series table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Type','Prefix','Format','Padding','Current#','Last Generated','Status','Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {series.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No series found. Click "Initialize Defaults" to create standard series.
                  </td></tr>
                ) : series.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-900">{s.documentType}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-600">{s.prefix}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.includeYear ? s.yearFormat : 'No Year'}
                      <span className="text-gray-400 ml-1">sep: "{s.separator}"</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.padding} digits</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-gray-800">{s.currentNumber}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {s.lastGenerated || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {s.isLocked ? (
                        <span className="flex items-center gap-1 text-xs text-orange-600">
                          <Lock size={12} /> Locked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <Unlock size={12} /> Open
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => getPreview(s.companyId, s.documentType)}
                        title="Preview next number"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                      >
                        <Eye size={12} />
                        {preview[`${s.companyId}_${s.documentType}`] || 'Preview'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
