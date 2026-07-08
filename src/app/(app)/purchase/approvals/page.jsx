'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

export default function PoApprovalsPage() {
  const [pending, setPending] = useState([]);
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [showApproveModal, setShowApproveModal] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [settingForm, setSettingForm] = useState({ level: '', levelName: '', minAmount: 0, maxAmount: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pendingRes, statsRes, settingsRes] = await Promise.all([
      fetch(`${API}/po-approvals/pending`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/po-approvals/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/po-approvals/settings`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (pendingRes.ok) setPending(await pendingRes.json());
    if (statsRes.ok) setStats(await statsRes.json());
    if (settingsRes.ok) setSettings(await settingsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleApprove() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/po-approvals/${showApproveModal}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ remarks }),
    });
    const data = await res.json();
    if (res.ok) {
      setShowApproveModal(null); setRemarks('');
      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchAll();
    } else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleReject() {
    if (!remarks.trim()) { setError('Rejection reason required'); return; }
    setSaving(true); setError('');
    const res = await fetch(`${API}/po-approvals/${showRejectModal}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ remarks }),
    });
    const data = await res.json();
    if (res.ok) { setShowRejectModal(null); setRemarks(''); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleCreateSetting() {
    setSaving(true); setError('');
    const body = { ...settingForm, level: parseInt(settingForm.level), minAmount: parseFloat(settingForm.minAmount) || 0 };
    if (settingForm.maxAmount) body.maxAmount = parseFloat(settingForm.maxAmount);
    else delete body.maxAmount;
    const res = await fetch(`${API}/po-approvals/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowSettingModal(false); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PO Approval Workflow</h1>
            <p className="text-gray-500 text-sm mt-1">Multi-level purchase order approval management</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Pending POs', value: stats.pendingPos, color: 'bg-yellow-50', text: 'text-yellow-700' },
              { label: 'Total Actions', value: stats.total, color: 'bg-gray-50', text: 'text-gray-700' },
              { label: 'Approved', value: stats.approved, color: 'bg-green-50', text: 'text-green-700' },
              { label: 'Rejected', value: stats.rejected, color: 'bg-red-50', text: 'text-red-700' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {successMsg && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">✅ {successMsg}</div>}

        <div className="flex gap-2 mb-6">
          {['pending', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
              {tab === 'pending' ? `Pending Approvals (${pending.length})` : 'Approval Settings'}
            </button>
          ))}
        </div>

        {activeTab === 'pending' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-700">Purchase Orders Awaiting Approval</h2>
            </div>
            {loading ? (
              <div className="p-10 text-center text-gray-400">Loading...</div>
            ) : pending.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No POs pending approval</div>
            ) : (
              <div className="divide-y">
                {pending.map(po => (
                  <div key={po.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono font-bold text-blue-600">{po.poNumber}</span>
                        <span className="text-gray-400 text-sm">·</span>
                        <span className="text-gray-700 font-medium">{po.vendor?.name}</span>
                        <span className="text-gray-400 text-sm">·</span>
                        <span className="text-gray-500 text-sm">{po._count?.items} items</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Subtotal: <span className="font-medium text-gray-800">₹{po.subtotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></span>
                        <span>Tax: <span className="text-gray-600">₹{po.totalTax?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></span>
                        <span className="font-semibold text-gray-900">Total: ₹{po.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        <span>Delivery: {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : '—'}</span>
                      </div>
                      {po.lastApprovalAction && (
                        <div className={`mt-1 text-xs ${po.lastApprovalAction === 'REJECTED' ? 'text-red-500' : 'text-green-600'}`}>
                          Last action: {po.lastApprovalAction} · {po.lastRemarks}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Link href={`/purchase/orders/${po.id}`} className="px-3 py-1.5 border rounded-lg text-xs text-gray-600 hover:bg-gray-50">View</Link>
                      <button onClick={() => { setShowApproveModal(po.id); setRemarks(''); setError(''); }} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">Approve</button>
                      <button onClick={() => { setShowRejectModal(po.id); setRemarks(''); setError(''); }} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-gray-700">Approval Level Settings</h2>
                <p className="text-xs text-gray-400 mt-0.5">Configure approval levels based on PO value</p>
              </div>
              <button onClick={() => { setSettingForm({ level: '', levelName: '', minAmount: 0, maxAmount: '' }); setError(''); setShowSettingModal(true); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">+ Add Level</button>
            </div>
            {settings.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-gray-400 mb-2">No approval levels configured</div>
                <div className="text-xs text-gray-400">All POs will be approved with single click without multi-level workflow</div>
              </div>
            ) : (
              <div className="divide-y">
                {settings.map(s => (
                  <div key={s.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">L{s.level}</div>
                      <div>
                        <div className="font-medium text-gray-800">{s.levelName}</div>
                        <div className="text-xs text-gray-500">
                          ₹{s.minAmount?.toLocaleString('en-IN')} — {s.maxAmount ? `₹${s.maxAmount?.toLocaleString('en-IN')}` : 'Unlimited'}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <div className="text-xs text-gray-500">
                <strong>How it works:</strong> When a PO is submitted for approval, the system checks its total amount against these levels. 
                All matching levels must approve before the PO status changes to APPROVED.
              </div>
            </div>
          </div>
        )}

        {showApproveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold text-green-700">Approve Purchase Order</h2>
                <p className="text-xs text-gray-500 mt-1">This will record your approval. All required levels must approve for PO to be finalized.</p>
              </div>
              <div className="p-6">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-3">{error}</div>}
                <label className="block text-sm text-gray-600 mb-2">Remarks (optional)</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Add approval remarks..." value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowApproveModal(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleApprove} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">{saving ? 'Approving...' : 'Confirm Approval'}</button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold text-red-600">Reject Purchase Order</h2>
              </div>
              <div className="p-6">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-3">{error}</div>}
                <label className="block text-sm text-gray-600 mb-2">Rejection Reason *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Enter reason for rejection..." value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowRejectModal(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleReject} disabled={saving} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">{saving ? 'Rejecting...' : 'Confirm Rejection'}</button>
              </div>
            </div>
          </div>
        )}

        {showSettingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">Add Approval Level</h2>
                <button onClick={() => setShowSettingModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Level Number *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={settingForm.level} onChange={e => setSettingForm(f => ({ ...f, level: e.target.value }))}>
                      <option value="">— Select —</option>
                      {[1,2,3].map(l => <option key={l} value={l}>L{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Level Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Purchase Manager" value={settingForm.levelName} onChange={e => setSettingForm(f => ({ ...f, levelName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Min Amount (₹)</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={settingForm.minAmount} onChange={e => setSettingForm(f => ({ ...f, minAmount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Max Amount (₹)</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Blank = unlimited" value={settingForm.maxAmount} onChange={e => setSettingForm(f => ({ ...f, maxAmount: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowSettingModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreateSetting} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Level'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
