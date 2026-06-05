'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const TYPES = [
  { value: 'MASTER_DATA',   label: 'Master Data Change'   },
  { value: 'USER_ACCESS',   label: 'User Access Change'   },
  { value: 'PRICE_CHANGE',  label: 'Price Change'         },
  { value: 'CONFIG_CHANGE', label: 'Configuration Change' },
  { value: 'OTHER',         label: 'Other'                },
];

const PRIORITIES = [
  { value: 'LOW',    label: 'Low'    },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH',   label: 'High'   },
  { value: 'URGENT', label: 'Urgent' },
];

export default function CreateChangeRequestPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '', description: '', type: 'MASTER_DATA',
    priority: 'NORMAL', dueDate: '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const [submitAfter, setSubmitAfter] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async (andSubmit = false) => {
    if (!form.title || !form.description || !form.type) {
      setError('Title, description and type are required');
      return;
    }
    setError(''); setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.dueDate) delete payload.dueDate;
      const { data } = await api.post('/change-requests', payload);

      if (andSubmit) {
        await api.patch(`/change-requests/${data.id}/submit`);
      }
      router.push('/change-requests');
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <AppLayout>
      <PageHeader title="New Change Request" subtitle="Raise a change request for approval" />
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Title <span className="text-red-500">*</span></label>
              <input type="text" name="title" value={form.title} onChange={handleChange}
                placeholder="Brief title of the change required"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Description <span className="text-red-500">*</span></label>
              <textarea name="description" value={form.description} onChange={handleChange}
                placeholder="Detailed description of what needs to be changed and why..."
                rows={5}
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass + ' resize-none'} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Type <span className="text-red-500">*</span></label>
                <select name="type" value={form.type} onChange={handleChange}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  className={inputClass}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  className={inputClass}>
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Due Date (Optional)</label>
              <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">
                ℹ️ Save as Draft to review later, or Save & Submit to send for approval immediately.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <button type="button" onClick={() => handleSave(false)} disabled={saving}
              className="border-2 border-blue-600 text-blue-600 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-50 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button type="button" onClick={() => handleSave(true)} disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save & Submit'}
            </button>
            <button type="button" onClick={() => router.push('/change-requests')}
              className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
