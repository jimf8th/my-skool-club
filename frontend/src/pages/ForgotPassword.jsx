import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await authService.forgotPassword(email);
      setMessage(data.message);
      setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email)}`), 800);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not request a reset code.');
    } finally { setLoading(false); }
  };

  return <AuthCard title="Reset your password" subtitle="We’ll email a six-digit code if an eligible account exists.">
    {message && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form onSubmit={submit} className="space-y-4">
      <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com" className="w-full rounded-lg border border-gray-300 px-4 py-3" />
      <button disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
        {loading ? 'Sending…' : 'Send reset code'}
      </button>
    </form>
    <Link to="/login" className="mt-5 block text-center text-sm font-medium text-blue-700">Back to sign in</Link>
  </AuthCard>;
}

export function AuthCard({ title, subtitle, children }) {
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mb-6 mt-2 text-sm text-gray-600">{subtitle}</p>
      {children}
    </div>
  </div>;
}
