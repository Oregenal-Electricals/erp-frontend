'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { clsx } from 'clsx';
import { Send, CheckCircle, XCircle, Ban, MessageSquare } from 'lucide-react';

const STATUS_STYLES = {
  DRAFT:        'bg-gray-100 text-gray-600',
  SUBMITTED:    'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED:     'bg-green-100 text-green-700',
  REJECTED:     'bg-red-100 text-red-700',
  CANCELLED:    'bg-gray-100 text-gray-400',
};

const PRIORITY_STYLES = {
  LOW:    'bg-gray-100 text-gray-500',
  NORMAL: 'bg-blue-50 text-blue-600',
  HIGH:   'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-600',
};

export default function ChangeRequestDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [cr, setCr]             = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [comment, setComment]   = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [showReview, setShowReview] = useState('');
  const [saving, setSaving]     = useState(false);

  const fetchCR = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/change-requests/${id}`);
      setCr(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCR(); }, [id]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.patch(`/change-requests/${id}/submit`);
      fetchCR();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleReview = async (action) => {
    if (!reviewComment.trim()) { setError('Review comment is required'); return; }
    setSaving(true); setError('');
    try {
      await api.patch(`/change-requests/${id}/${action}`, { reviewComment });
      setShowReview(''); setReviewComment('');
      fetchCR();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this change request?')) return;
    setSaving(true);
    try {
      await api.patch(`/change-requests/${id}/cancel`);
      fetchCR();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await api.post(`/change-requests/${id}/comments`, { comment });
      setComment(''); fetchCR();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const formatDate = (d) => d
    ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  if (error && !cr) return (
    <AppLayout>
      <div className="p-8 text-center text-red-600">{error}</div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <PageHeader
        title={cr?.requestNumber || 'Change Request'}
        subtitle={cr?.title}
        action={
          <button onClick={() => router.push('/change-requests')}
            className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            ← Back
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-4">

          {/* Description Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {cr?.description}
            </p>
          </div>

          {/* Review Result */}
          {(cr?.status === 'APPROVED' || cr?.status === 'REJECTED') && cr?.reviewComment && (
            <div className={clsx(
              'rounded-xl border-2 p-5',
              cr.status === 'APPROVED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            )}>
              <h3 className={clsx('text-sm font-bold mb-2', cr.status === 'APPROVED' ? 'text-green-700' : 'text-red-700')}>
                {cr.status === 'APPROVED' ? '✅ Approved' : '❌ Rejected'} by {cr.reviewedBy?.firstName} {cr.reviewedBy?.lastName}
              </h3>
              <p className="text-sm text-gray-700">{cr.reviewComment}</p>
              <p className="text-xs text-gray-400 mt-2">{formatDate(cr.reviewedAt)}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Actions</h3>
            <div className="flex flex-wrap gap-2">
              {cr?.status === 'DRAFT' && (
                <button onClick={handleSubmit} disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  <Send size={14} /> Submit for Approval
                </button>
              )}

              {['SUBMITTED', 'UNDER_REVIEW'].includes(cr?.status) && (
                <>
                  <button onClick={() => setShowReview(showReview === 'approve' ? '' : 'approve')}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button onClick={() => setShowReview(showReview === 'reject' ? '' : 'reject')}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                    <XCircle size={14} /> Reject
                  </button>
                </>
              )}

              {!['APPROVED', 'REJECTED', 'CANCELLED'].includes(cr?.status) && (
                <button onClick={handleCancel} disabled={saving}
                  className="flex items-center gap-2 border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  <Ban size={14} /> Cancel Request
                </button>
              )}
            </div>

            {/* Review Comment Box */}
            {showReview && (
              <div className={clsx(
                'mt-4 p-4 rounded-lg border-2',
                showReview === 'approve' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              )}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {showReview === 'approve' ? 'Approval' : 'Rejection'} Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Provide your review comment..."
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleReview(showReview)} disabled={saving}
                    className={clsx(
                      'px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-colors',
                      showReview === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    )}>
                    {saving ? 'Saving...' : showReview === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                  </button>
                  <button onClick={() => { setShowReview(''); setReviewComment(''); }}
                    className="px-4 py-2 rounded-lg text-sm border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Comments Thread */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <MessageSquare size={15} /> Comments ({cr?.comments?.length || 0})
            </h3>

            <div className="space-y-3 mb-4">
              {cr?.comments?.length === 0 && (
                <p className="text-sm text-gray-400">No comments yet.</p>
              )}
              {cr?.comments?.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-600">
                      {c.commenter?.firstName?.[0]}{c.commenter?.lastName?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-800">
                        {c.commenter?.firstName} {c.commenter?.lastName}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{c.comment}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Comment */}
            {!['APPROVED', 'REJECTED', 'CANCELLED'].includes(cr?.status) && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  placeholder="Add a comment..."
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button onClick={handleComment} disabled={saving || !comment.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  <Send size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400 font-medium">Status</dt>
                <dd className="mt-0.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[cr?.status] || ''}`}>
                    {cr?.status?.replace(/_/g, ' ')}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 font-medium">Priority</dt>
                <dd className="mt-0.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_STYLES[cr?.priority] || ''}`}>
                    {cr?.priority}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 font-medium">Type</dt>
                <dd className="text-sm text-gray-800 mt-0.5">{cr?.type?.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 font-medium">Requested By</dt>
                <dd className="text-sm text-gray-800 mt-0.5">
                  {cr?.requestedBy?.firstName} {cr?.requestedBy?.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 font-medium">Company</dt>
                <dd className="text-sm text-gray-800 mt-0.5">{cr?.company?.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 font-medium">Created</dt>
                <dd className="text-sm text-gray-800 mt-0.5">{formatDate(cr?.createdAt)}</dd>
              </div>
              {cr?.submittedAt && (
                <div>
                  <dt className="text-xs text-gray-400 font-medium">Submitted</dt>
                  <dd className="text-sm text-gray-800 mt-0.5">{formatDate(cr?.submittedAt)}</dd>
                </div>
              )}
              {cr?.dueDate && (
                <div>
                  <dt className="text-xs text-gray-400 font-medium">Due Date</dt>
                  <dd className="text-sm text-gray-800 mt-0.5">{formatDate(cr?.dueDate)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
