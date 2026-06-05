'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Database, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

export default function DummyDataPage() {
  const [status, setStatus]       = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [seeding, setSeeding]     = useState('');
  const [purging, setPurging]     = useState('');
  const [message, setMessage]     = useState('');
  const [error, setError]         = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, companiesRes] = await Promise.all([
        api.get('/dummy-data/status'),
        api.get('/masters/companies'),
      ]);
      setStatus(statusRes.data);
      setCompanies(companiesRes.data);
    } catch (err) {
      setError('Failed to load data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeed = async (companyId, companyName) => {
    if (!confirm(`Seed test data for "${companyName}"?\n\nThis will create test plants, users, departments and more.`)) return;
    setSeeding(companyId); setMessage(''); setError('');
    try {
      const { data } = await api.post(`/dummy-data/seed/${companyId}`);
      setMessage(`✅ ${data.message}. Test user password: Test@1234`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Seed failed');
    } finally { setSeeding(''); }
  };

  const handlePurge = async (companyId, companyName) => {
    if (!confirm(`⚠️ PURGE test data for "${companyName}"?\n\nThis will DELETE all isTestData=true records.\nReal data will NOT be affected.`)) return;
    setPurging(companyId); setMessage(''); setError('');
    try {
      const { data } = await api.delete(`/dummy-data/purge/${companyId}`);
      setMessage(`🗑️ ${data.message}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Purge failed');
    } finally { setPurging(''); }
  };

  const handlePurgeAll = async () => {
    if (!confirm('⚠️ PURGE ALL test data from the entire system?\n\nThis cannot be undone. Real data will NOT be affected.')) return;
    setPurging('all'); setMessage(''); setError('');
    try {
      const { data } = await api.delete('/dummy-data/purge-all');
      setMessage(`🗑️ ${data.message}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Purge all failed');
    } finally { setPurging(''); }
  };

  const ENTITY_COLORS = {
    companies:     'bg-blue-100 text-blue-700',
    plants:        'bg-green-100 text-green-700',
    units:         'bg-teal-100 text-teal-700',
    departments:   'bg-purple-100 text-purple-700',
    branches:      'bg-orange-100 text-orange-700',
    financialYears:'bg-yellow-100 text-yellow-700',
    users:         'bg-red-100 text-red-700',
    changeRequests:'bg-gray-100 text-gray-700',
  };

  return (
    <AppLayout>
      <PageHeader
        title="Dummy Data Management"
        subtitle="Seed and purge test data for development and demonstration"
        action={
          <button onClick={handlePurgeAll} disabled={!!purging}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            <Trash2 size={16} />
            {purging === 'all' ? 'Purging...' : 'Purge All Test Data'}
          </button>
        }
      />

      {/* Warning Banner */}
      <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-start gap-3">
        <AlertTriangle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-yellow-800">Safety Notice</p>
          <p className="text-xs text-yellow-700 mt-0.5">
            Only records with <code className="bg-yellow-100 px-1 rounded">isTestData=true</code> are affected.
            Real data (isTestData=false) is never touched. Admin and core seed data are always protected.
          </p>
        </div>
      </div>

      {message && <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-green-700 text-sm font-medium">{message}</div>}
      {error   && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}

      {/* Test Data Status */}
      {status && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            Current Test Data — Total: <span className="text-blue-600">{status.total}</span> records
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(status).filter(([k]) => k !== 'total').map(([key, val]) => (
              <div key={key} className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className={`text-lg font-bold mt-0.5 ${val > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Company Actions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">Company-wise Test Data</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {companies.map((company) => (
              <div key={company.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{company.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{company.code} · {company.city}, {company.state}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSeed(company.id, company.name)}
                    disabled={!!seeding || !!purging}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {seeding === company.id
                      ? <><RefreshCw size={14} className="animate-spin" /> Seeding...</>
                      : <><Database size={14} /> Seed Test Data</>
                    }
                  </button>
                  <button
                    onClick={() => handlePurge(company.id, company.name)}
                    disabled={!!seeding || !!purging}
                    className="flex items-center gap-2 border-2 border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {purging === company.id
                      ? <><RefreshCw size={14} className="animate-spin" /> Purging...</>
                      : <><Trash2 size={14} /> Purge</>
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test User Credentials */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-blue-800 mb-3">Test User Credentials (after seeding)</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { role: 'PLANT HEAD',       email: 'plnt.{code}@test.com'  },
            { role: 'PURCHASE MANAGER', email: 'pur.{code}@test.com'   },
            { role: 'STORE MANAGER',    email: 'str.{code}@test.com'   },
            { role: 'QC MANAGER',       email: 'qc.{code}@test.com'    },
            { role: 'VIEWER',           email: 'vwr.{code}@test.com'   },
          ].map((u) => (
            <div key={u.role} className="flex justify-between bg-white rounded p-2 border border-blue-100">
              <span className="font-semibold text-blue-700">{u.role}</span>
              <span className="text-gray-500">{u.email} / Test@1234</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-2 font-medium">Replace {'{code}'} with company code in lowercase (e.g. acme001)</p>
      </div>
    </AppLayout>
  );
}
