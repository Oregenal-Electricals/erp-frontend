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
    const [sessionMessageType, setSessionMessageType] = useState('info');
    const [loading, setLoading] = useState(true);

  // Full wipe (except master data) - separate from the Test Mode purge above.
  // This deletes EVERY row outside KEEP_MODEL_NAMES, real or test-tagged,
  // so it needs its own explicit preview + typed confirmation phrase.
  const [wipePreview, setWipePreview] = useState(null);
    const [wipePreviewLoading, setWipePreviewLoading] = useState(false);
    const [wipeConfirmText, setWipeConfirmText] = useState('');
    const [wiping, setWiping] = useState(false);
    const [wipeMessage, setWipeMessage] = useState('');
    const [wipeMessageType, setWipeMessageType] = useState('info');

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

  const handlePreviewFullWipe = async () => {
        setWipePreviewLoading(true); setWipeMessage(''); setError('');
        try {
                const { data } = await api.get('/dummy-data/full-wipe-preview');
                setWipePreview(data);
                if (!data.safeToProceed) {
                          setWipeMessageType('warning');
                          setWipeMessage(`Not safe to proceed - unmatched keep names: ${data.unmatchedKeepNames.join(', ')}. Fix the backend code before wiping.`);
                }
        } catch (err) {
                setError(err.response?.data?.message || 'Preview failed');
        } finally {
                setWipePreviewLoading(false);
        }
  };

  const handleFullWipe = async () => {
        if (wipeConfirmText !== 'DELETE ALL TRANSACTIONAL DATA') return;
        if (!confirm('This permanently deletes ALL data except master data (Company, Plant, Warehouse, Users/Roles, Numbering Series, System Settings, UOM, HSN/SAC codes, UI Control, Audit Log) - including real data, not just Test Mode records. This cannot be undone. Proceed?')) return;
        setWiping(true); setWipeMessage(''); setError('');
        try {
                const { data } = await api.delete('/dummy-data/full-wipe', { data: { confirmationPhrase: wipeConfirmText } });
                setWipeMessageType('success');
                setWipeMessage(
                          `🗑️ ${data.message}` +
                          (data.blockedTables?.length ? ` — ${data.blockedTables.length} table(s) still blocked: ${data.blockedTables.join(', ')}` : '')
                        );
                setWipeConfirmText('');
                setWipePreview(null);
                fetchData();
        } catch (err) {
                setError(err.response?.data?.message || 'Full wipe failed');
        } finally {
                setWiping(false);
        }
  };

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
            subtitle="Delete everything created by a Test Account or during a Preview session, across every module"
          />

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

        <div className="mb-6 bg-white rounded-xl border-2 border-red-300 overflow-hidden">
                          <div className="px-5 py-4">
                            <h3 className="text-sm font-bold text-gray-800">Full Wipe (except master data)</h3>
            <p className="text-xs text-gray-500 mt-0.5">
                              Deletes every row in every module except Company, Plant, Warehouse, Units, Departments, Branches,
                              Financial Years, Users/Roles/Permissions, Numbering Series, System Settings, Unit of Measure,
                              HSN/SAC Codes, UI Control, and Audit Log. This includes Products, Raw Materials, Customers,
                              Vendors, Employees, and everything downstream of them - not just Test Mode records. Use this to
              start a module from a completely clean slate. SUPER_ADMIN only.
                </p>
                </div>
          <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
                            <button
              onClick={handlePreviewFullWipe}
              disabled={wipePreviewLoading}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              {wipePreviewLoading ? 'Checking...' : 'Preview what would be wiped'}
</button>
  </div>
{wipePreview && (
              <div className="px-5 pb-4">
                <p className="text-xs text-gray-600 mb-2">
                  <span className="font-bold">{wipePreview.totalRowsToWipe}</span> rows across{' '}
                 <span className="font-bold">{wipePreview.totalTablesAffected}</span> tables would be deleted.
                 Kept tables and their current row counts are listed below.
                   </p>
               <div className="grid grid-cols-4 gap-2 mb-3">
                 {Object.entries(wipePreview.keptTables || {}).map(([table, count]) => (
                                     <div key={table} className="bg-green-50 rounded-lg border border-green-100 px-3 py-2">
                                       <p className="text-xs text-gray-500 truncate" title={table}>{table} (kept)</p>
                                                                                       <p className="text-base font-bold text-green-700">{count}</p>
                   </div>
                                                                                   ))}
</div>
{wipePreview.safeToProceed && (
                  <div className="mt-2 p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                    <p className="text-xs text-red-800 font-medium mb-2">
                      Type <code className="bg-red-100 px-1 rounded">DELETE ALL TRANSACTIONAL DATA</code> exactly to enable the button below.
  </p>
                   <div className="flex gap-2">
                      <input
                       value={wipeConfirmText}
                       onChange={e => setWipeConfirmText(e.target.value)}
                                               placeholder="DELETE ALL TRANSACTIONAL DATA"
                       className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
                     />
                                             <button
                       onClick={handleFullWipe}
                       disabled={wiping || wipeConfirmText !== 'DELETE ALL TRANSACTIONAL DATA'}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shrink-0"
                    >
                                              <Trash2 size={16} />
                      {wiping ? 'Wiping...' : 'Delete ALL transactional data'}
                        </button>
                        </div>
                        </div>
              )}
</div>
          )}
{wipeMessage && (
              <div className={`mx-5 mb-4 p-3 rounded-lg text-sm font-medium border-2 ${
                wipeMessageType === 'success' ? 'bg-green-50 border-green-300 text-green-700' :
                wipeMessageType === 'warning' ? 'bg-orange-50 border-orange-300 text-orange-700' :
                'bg-gray-50 border-gray-200 text-gray-600'
}`}>
{wipeMessage}
</div>
          )}
</div>

{error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}
  </div>
  </AppLayout>
   );
}
