'use client';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

export default function DeleteRequestModal({ tableName, recordId, recordLabel, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (reason.trim().length < 5) {
      setError('Give a real reason (at least 5 characters) - this is what the approver sees');
      return;
    }
    setSaving(true); setError('');
    const res = await fetch(`${API}/delete-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ tableName, recordId, reason: reason.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      onDone(data);
    } else {
      setError(data.message || 'Failed to submit delete request');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">Request Delete</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
          <p className="text-sm text-gray-600">
            Deleting: <span className="font-semibold">{recordLabel}</span>
          </p>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Reason *</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="Why does this need to be deleted? Wrong entry, duplicate, created by mistake, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-400">
            If you have approval authority, this executes immediately. Otherwise it goes to your Plant Head
            for review - the record stays exactly as it is until approved.
          </p>
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || reason.trim().length < 5}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Submitting...' : 'Request Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
