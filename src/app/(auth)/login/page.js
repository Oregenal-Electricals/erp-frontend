'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuth } from '@/lib/auth';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.accessToken, data.user);
      router.push('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message;
      const errorText = Array.isArray(msg)
        ? msg[0]
        : msg || 'Login failed. Please try again.';
      setError(errorText);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  const fillDemo = () => {
    setEmail('admin@acmeelectronics.com');
    setPassword('Admin@1234');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Smart Manufacturing ERP</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
          </div>

          {/* Error — stays permanently */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 border-2 border-red-400 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700 font-bold">{error}</p>
            </div>
          )}

          {/* Inputs — NO form tag */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="admin@acmeelectronics.com"
                autoComplete="email"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 bg-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 bg-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400 mb-2">
              Demo credentials — click to auto-fill
            </p>
            <button
              type="button"
              onClick={fillDemo}
              className="w-full bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-200 rounded-xl p-3 text-left transition-colors"
            >
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Email:</span>
                <span className="font-mono text-gray-900 font-bold">admin@acmeelectronics.com</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-500">Password:</span>
                <span className="font-mono text-gray-900 font-bold">Admin@1234</span>
              </div>
              <p className="text-xs text-blue-500 text-center mt-2 font-semibold">↑ Click to auto-fill</p>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
