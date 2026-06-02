'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Save, RefreshCw } from 'lucide-react';

const CATEGORY_LABELS = {
  GENERAL:  { label: 'General',  color: 'bg-blue-100 text-blue-700'   },
  FINANCE:  { label: 'Finance',  color: 'bg-green-100 text-green-700'  },
  APPROVAL: { label: 'Approval', color: 'bg-orange-100 text-orange-700' },
  SECURITY: { label: 'Security', color: 'bg-red-100 text-red-700'      },
};

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState({});
  const [edited, setEdited]     = useState({});
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings/system');
      setSettings(data);
      const vals = {};
      data.forEach((s) => { vals[s.key] = s.value; });
      setEdited(vals);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    setError(''); setSuccess('');
    try {
      await api.put(`/settings/system/${key}`, { value: edited[key] });
      setSuccess(`"${key}" saved successfully`);
      fetchSettings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveAll = async () => {
    setSaving({ all: true }); setError(''); setSuccess('');
    try {
      await api.put('/settings/system/bulk', { settings: edited });
      setSuccess('All settings saved successfully');
      fetchSettings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving({});
    }
  };

  // Group by category
  const grouped = settings.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <PageHeader
        title="System Settings"
        subtitle="Configure global application settings"
        action={
          <button onClick={handleSaveAll} disabled={saving.all}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Save size={16} />
            {saving.all ? 'Saving...' : 'Save All'}
          </button>
        }
      />

      {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-green-700 text-sm font-medium">✅ {success}</div>}

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, items]) => {
          const cat = CATEGORY_LABELS[category] || { label: category, color: 'bg-gray-100 text-gray-700' };
          return (
            <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cat.color}`}>
                  {cat.label}
                </span>
                <span className="text-xs text-gray-400">{items.length} settings</span>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map((setting) => (
                  <div key={setting.key} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-48 shrink-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {setting.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </p>
                      {setting.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{setting.description}</p>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={edited[setting.key] ?? setting.value}
                        onChange={(e) => setEdited((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                        style={{ color: '#111827', backgroundColor: '#ffffff' }}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => handleSave(setting.key)}
                      disabled={saving[setting.key]}
                      title="Save this setting"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      {saving[setting.key]
                        ? <RefreshCw size={15} className="animate-spin" />
                        : <Save size={15} />
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
