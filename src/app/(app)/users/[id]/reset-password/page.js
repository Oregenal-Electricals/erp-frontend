'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { id } = useParams();
  const [user, setUser]       = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    api.get(`/users/${id}`)
      .then(({ data }) => setUser(data))
      .catch(() => setError('Failed to load user'));
  }, [id]);

  const handleSubmit = async () => {
    setError(''); setSuccess('');

    if (!password) { setError('Please enter a new password'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(password)) { setError('Password must contain at least one uppercase letter'); return; }
    if (!/[0-9]/.test(password)) { setError('Password must contain at least one number'); return; }

    setSaving(true);
    try {
      await api.patch(`/users/${id}/reset-password`, { newPassword: password });
      setSuccess('Password reset successfully! User must change password on next login.');
      setPassword(''); setConfirm('');
      setTimeout(() => router.push('/users'), 2000);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors";

  return (
    <AppLayout>
      <PageHeader
        title="Reset Password"
        subtitle={user ? `Reset password for ${user.firstName} ${user.lastName}` : 'Loading...'}
      />
      <div className="max-w-md">
        <div className="bg-white rounded-xl border border-gray-200 p-6">

          {/* User info */}
          {user && (
            <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-800">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
              <p className="text-xs text-blue-600 mt-0.5 font-medium">
                {user.role?.replace(/_/g, ' ')}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-green-700 text-sm font-medium">
              ✅ {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass}
              />
            </div>

            {/* Password rules */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-semibold text-yellow-800 mb-1">Password Rules:</p>
              <ul className="text-xs text-yellow-700 space-y-0.5">
                <li className={password.length >= 8 ? 'text-green-600' : ''}>
                  {password.length >= 8 ? '✅' : '○'} Minimum 8 characters
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                  {/[A-Z]/.test(password) ? '✅' : '○'} At least 1 uppercase letter
                </li>
                <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                  {/[0-9]/.test(password) ? '✅' : '○'} At least 1 number
                </li>
                <li className={password && password === confirm ? 'text-green-600' : ''}>
                  {password && password === confirm ? '✅' : '○'} Passwords match
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Resetting...' : 'Reset Password'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/users')}
              className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
