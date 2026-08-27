'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { ShieldAlert, ShieldCheck, UserPlus } from 'lucide-react';

const STATUS_STYLES = {
  CHECKED_IN: 'bg-green-100 text-green-700',
  CHECKED_OUT: 'bg-gray-100 text-gray-600',
};

export default function VisitorDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const warning = searchParams.get('warning');

  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');

  const fetchVisitor = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/visitors/${id}`);
      setVisitor(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load visitor');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchVisitor(); }, [fetchVisitor]);

  const toggleBlacklist = async () => {
    setSaving(true);
    try {
      await api.patch(`/visitors/${id}/blacklist`, { reason: blacklistReason || undefined });
      setShowBlacklist(false);
      setBlacklistReason('');
      fetchVisitor();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update blacklist status');
    } finally { setSaving(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto"><div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title={visitor ? `${visitor.firstName} ${visitor.lastName}` : 'Visitor'}
          subtitle={visitor?.visitorCompany || visitor?.mobile}
          action={<button onClick={() => router.push('/gate/visitors')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">← Back</button>}
        />

        {warning && <div className="mb-4 p-3 bg-amber-50 border-2 border-amber-300 rounded-lg text-amber-700 text-sm">{warning}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm">{error}</div>}

        <div className="grid grid-cols-3 gap-6">
          {/* Main - visit history */}
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700">Visit History</h3>
                <button onClick={() => router.push(`/gate/check-in?visitorId=${id}`)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700">
                  <UserPlus size={13} /> New Check-In
                </button>
              </div>
              {!visitor?.logs || visitor.logs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No visits recorded yet</div>
              ) : (
                <div className="divide-y">
                  {visitor.logs.map(log => (
                    <div key={log.id} className="py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">{log.purpose}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[log.status] || 'bg-gray-100 text-gray-600'}`}>
                          {log.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.plant?.name} {log.hostEmployee && `— Met ${log.hostEmployee.firstName} ${log.hostEmployee.lastName}`}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        In: {formatDate(log.checkInTime)}{log.checkOutTime && ` · Out: ${formatDate(log.checkOutTime)}`}
                      </div>
                      {log.vehicleNumber && <div className="text-xs text-gray-400 mt-0.5 font-mono">Vehicle: {log.vehicleNumber}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - visitor details */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-400">Status</dt>
                  <dd className="mt-0.5">
                    {visitor?.isBlacklisted ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700">Blacklisted</span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">Active</span>
                    )}
                  </dd>
                </div>
                <div><dt className="text-xs text-gray-400">Mobile</dt><dd className="text-sm text-gray-800 mt-0.5">{visitor?.mobile}</dd></div>
                {visitor?.email && <div><dt className="text-xs text-gray-400">Email</dt><dd className="text-sm text-gray-800 mt-0.5">{visitor.email}</dd></div>}
                {visitor?.visitorCompany && <div><dt className="text-xs text-gray-400">Company</dt><dd className="text-sm text-gray-800 mt-0.5">{visitor.visitorCompany}</dd></div>}
                {visitor?.designation && <div><dt className="text-xs text-gray-400">Designation</dt><dd className="text-sm text-gray-800 mt-0.5">{visitor.designation}</dd></div>}
                <div><dt className="text-xs text-gray-400">ID Proof</dt><dd className="text-sm text-gray-800 mt-0.5">{visitor?.idProofType?.replace(/_/g, ' ')} — {visitor?.idProofNumber}</dd></div>
                <div><dt className="text-xs text-gray-400">Total Visits</dt><dd className="text-sm text-gray-800 mt-0.5">{visitor?.logs?.length || 0}</dd></div>
                {visitor?.isBlacklisted && visitor?.blacklistReason && (
                  <div><dt className="text-xs text-gray-400">Blacklist Reason</dt><dd className="text-sm text-red-600 mt-0.5">{visitor.blacklistReason}</dd></div>
                )}
              </dl>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Actions</h3>
              {!showBlacklist ? (
                visitor?.isBlacklisted ? (
                  <button onClick={() => toggleBlacklist()} disabled={saving}
                    className="flex items-center gap-2 w-full justify-center border-2 border-green-300 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 disabled:opacity-50">
                    <ShieldCheck size={14} /> {saving ? 'Updating...' : 'Remove from Blacklist'}
                  </button>
                ) : (
                  <button onClick={() => setShowBlacklist(true)}
                    className="flex items-center gap-2 w-full justify-center border-2 border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50">
                    <ShieldAlert size={14} /> Blacklist Visitor
                  </button>
                )
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Reason</label>
                  <input type="text" value={blacklistReason} onChange={e => setBlacklistReason(e.target.value)}
                    placeholder="Reason for blacklisting..."
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="flex gap-2">
                    <button onClick={toggleBlacklist} disabled={saving}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                      Confirm
                    </button>
                    <button onClick={() => setShowBlacklist(false)}
                      className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
