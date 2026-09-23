'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const nameOf = (names, id) => { const u = names?.[id]; return u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : null; };

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', CANCELLED: 'bg-gray-100 text-gray-500',
};

/**
 * Reusable, complete approval history for any document already wired into
 * the generic workflow engine (BOM, Product, ...). Shows every level's
 * status - approved/rejected/pending/not-yet-reached - with who acted and
 * when, plus any queries raised on the document interleaved chronologically.
 * This is the single place a creator, an approver, Admin, or Super Admin
 * can see exactly where a document stands and what happened before.
 */
export default function ApprovalTimeline({ documentType, documentId, queries }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!documentId) return;
    (async () => {
      setLoading(true); setError('');
      const listRes = await fetch(`${API}/workflows/requests?documentType=${documentType}&documentId=${documentId}&limit=1`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!listRes.ok) { setError('Could not load approval history'); setLoading(false); return; }
      const listData = await listRes.json();
      const latest = listData.data?.[0];
      if (!latest) { setLoading(false); return; }
      const detailRes = await fetch(`${API}/workflows/requests/${latest.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (detailRes.ok) setRequest(await detailRes.json());
      setLoading(false);
    })();
  }, [documentType, documentId]);

  if (loading) return <div className="bg-white rounded-xl shadow-sm border p-5 mt-6 text-sm text-gray-400">Loading approval history...</div>;
  if (error) return <div className="bg-white rounded-xl shadow-sm border p-5 mt-6 text-sm text-red-600">{error}</div>;
  if (!request) return null;

  // Merge the step timeline with any queries into one chronologically-sorted feed.
  const events = [];
  events.push({ type: 'submitted', at: request.createdAt, by: nameOf(request.actorNames, request.requestedBy) });
  for (const step of request.workflow?.steps || []) {
    const action = request.actions?.find(a => a.level === step.level);
    if (action) {
      events.push({
        type: action.action === 'APPROVED' ? 'approved' : 'rejected',
        at: action.actionDate, by: nameOf(request.actorNames, action.actionBy),
        level: step.level, stepName: step.stepName, comments: action.comments,
      });
    }
  }
  for (const q of queries || []) {
    events.push({ type: 'query-raised', at: q.createdAt, message: q.message, status: q.status });
    if (q.response) events.push({ type: 'query-resolved', at: q.updatedAt || q.createdAt, message: q.response });
  }
  events.sort((a, b) => new Date(a.at) - new Date(b.at));

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Approval Timeline</h3>
          <p className="text-xs text-gray-400">{request.workflow?.name || 'Approval workflow'}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-600'}`}>
          {request.status}{request.status === 'PENDING' && ` — level ${request.currentLevel}/${request.totalLevels}`}
        </span>
      </div>

      <div className="mb-4">
        <div className="font-medium text-xs text-gray-500 mb-2 uppercase tracking-wide">Approval Steps</div>
        {request.workflow?.steps?.map(step => {
          const action = request.actions?.find(a => a.level === step.level);
          const isCurrent = request.currentLevel === step.level && request.status === 'PENDING';
          return (
            <div key={step.id || step.level} className={`flex items-center gap-3 py-2.5 border-b last:border-0 ${isCurrent ? 'bg-yellow-50 -mx-2 px-2 rounded' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                action?.action === 'APPROVED' ? 'bg-green-100 text-green-700' :
                action?.action === 'REJECTED' ? 'bg-red-100 text-red-700' :
                isCurrent ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400' : 'bg-gray-100 text-gray-400'
              }`}>{step.level}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{step.stepName}</div>
                {action && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {action.action} by {nameOf(request.actorNames, action.actionBy) || 'someone'} on {fmtDate(action.actionDate)}
                    {action.comments && <span> — {action.comments}</span>}
                  </div>
                )}
                {!action && isCurrent && (
                  <div className="text-xs text-yellow-600 mt-0.5">
                    ⏳ Awaiting {step.approverUserId ? (nameOf(request.actorNames, step.approverUserId) || 'assigned approver') : 'approval (unassigned - open to any approver)'}
                  </div>
                )}
                {!action && !isCurrent && step.level > request.currentLevel && <div className="text-xs text-gray-400 mt-0.5">Not yet reached</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div className="font-medium text-xs text-gray-500 mb-2 uppercase tracking-wide">Full History</div>
        <div className="space-y-2 text-sm">
          {events.map((e, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="text-gray-400 w-36 flex-shrink-0">{fmtDate(e.at)}</span>
              {e.type === 'submitted' && <span>Submitted for approval by <span className="font-medium">{e.by || 'someone'}</span></span>}
              {e.type === 'approved' && <span className="text-green-700">Level {e.level} ({e.stepName}) approved by <span className="font-medium">{e.by || 'someone'}</span>{e.comments && ` — ${e.comments}`}</span>}
              {e.type === 'rejected' && <span className="text-red-700">Level {e.level} ({e.stepName}) rejected by <span className="font-medium">{e.by || 'someone'}</span>{e.comments && ` — ${e.comments}`}</span>}
              {e.type === 'query-raised' && <span className="text-amber-700">Query raised: {e.message}</span>}
              {e.type === 'query-resolved' && <span className="text-blue-700">Query resolved: {e.message}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
