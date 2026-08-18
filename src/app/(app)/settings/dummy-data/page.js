'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Trash2, AlertTriangle } from 'lucide-react';

export default function DummyDataPage() {
  const [error, setError] = useState('');

  const [sessionSummary, setSessionSummary] = useState(null);
  const [sessionPurging, setSessionPurging] = useState(false);
  const [sessionMessage, setSessionMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/dummy-data/test-session-summary');
      setSessionSummary(data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePurgeSessionData = async () => {
    if (!confirm(`⚠️ Delete all ${sessionSummary?.total || 0} Test Mode records (Work Orders, Stock Adjustments, BOMs, Sales Orders, etc.)?\n\nThis deletes everything tagged isTestData=true across every module. Real data will NOT be affected.`)) return;
    setSessionPurging(true); setSessionMessage(''); setError('');
    try {
      const { data } = await api.delete('/dummy-data/purge-test-session');
      if (data.totalDeleted > 0) {
        setSessionMessageType('success');
        setSessionMessage(
          `🗑️ ${data.message}` +
          (data.blockedTables?.length ? ` — ${data.blockedTables.length} table(s) still blocked: ${data.blockedTables.join(', ')}` : '')
        );
      } else if (data.blockedTables?.length > 0) {
        setSessionMessageType('warning');
        setSessionMessage(
          `⚠️ Nothing was deleted. ${data.blockedTables.length} table(s) are blocked: ${data.blockedTables.join(', ')}. ` +
          (data.note || 'A real (non-test) record depends on test-tagged rows in these tables.')
        );
      } else {
        setSessionMessageType('info');
        setSessionMessage('Nothing to purge — no Test Mode data found.');
      }
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Purge failed');
    } finally {
      setSessionPurging(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Test Mode Data Management"
          subtitle="Delete everything created while Test Mode was on, across every module"
        />

        {/* Test Mode Data (X-Test-Session header / Test Mode toggle) - the
            real, comprehensive purge tool, computed live from the schema
            rather than a fixed list. This is the only purge tool on this
            page now - the old per-company Seed/Purge buttons and the
            org-structure-only "Purge All Test Data" predate the Test Mode
            feature and only ever touched a fixed set of 8 demo tables
            (Plant/Unit/Department/Branch/FinancialYear/User/ChangeRequest),
            not the 150+ modules Test Mode can actually create data in -
            removed to avoid confusion with this one. */}
        <div className="mb-6 bg-white rounded-xl border-2 border-orange-200 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Test Mode Data</h3>
              <p className="text-xs text-gray-500 mt-0.5">Everything created while Test Mode was on (Work Orders, Stock Adjustments, BOMs, Customer POs, Sales Orders, and 150+ other modules) — computed live, not a fixed list.</p>
            </div>
            <button
              onClick={handlePurgeSessionData}
              disabled={sessionPurging || !sessionSummary?.total}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors shrink-0"
            >
              <Trash2 size={16} />
              {sessionPurging ? 'Purging...' : `Delete All Test Mode Data${sessionSummary?.total ? ` (${sessionSummary.total})` : ''}`}
            </button>
          </div>
          {sessionMessage && (
            <div className={`mx-5 mb-4 p-3 rounded-lg text-sm font-medium border-2 ${
              sessionMessageType === 'success' ? 'bg-green-50 border-green-300 text-green-700' :
              sessionMessageType === 'warning' ? 'bg-orange-50 border-orange-300 text-orange-700' :
              'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
              {sessionMessage}
            </div>
          )}
          {loading && (
            <div className="px-5 pb-4">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && sessionSummary?.total > 0 && (
            <div className="px-5 pb-4 grid grid-cols-4 gap-2">
              {Object.entries(sessionSummary.byTable).map(([table, count]) => (
                <div key={table} className="bg-orange-50 rounded-lg border border-orange-100 px-3 py-2">
                  <p className="text-xs text-gray-500 truncate" title={table}>{table}</p>
                  <p className="text-base font-bold text-orange-700">{count}</p>
                </div>
              ))}
            </div>
          )}
          {!loading && sessionSummary?.total === 0 && (
            <p className="px-5 pb-4 text-sm text-gray-400">No Test Mode data right now.</p>
          )}
        </div>

        {/* Safety Notice */}
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-yellow-800">Safety Notice</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              Only records with <code className="bg-yellow-100 px-1 rounded">isTestData=true</code> are affected.
              Real data (isTestData=false) is never touched.
            </p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}
      </div>
    </AppLayout>
  );
}
