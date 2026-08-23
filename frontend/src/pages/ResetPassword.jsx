import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';
import { AuthCard } from './ForgotPassword';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try { const data = await authService.resetPassword(email, code, password); setMessage(data.message); window.setTimeout(() => navigate('/login', { replace: true }), 800); }
    catch (e) { setError(e.response?.data?.message || 'Could not reset password.'); }
    finally { setLoading(false); }
  };

  return <AuthCard title="Enter your reset code" subtitle="Codes expire after 15 minutes and can be used only once.">
    {message && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form onSubmit={submit} className="space-y-4">
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border px-4 py-3" />
      <input inputMode="numeric" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code" className="w-full rounded-lg border px-4 py-3" />
      <input type="password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="w-full rounded-lg border px-4 py-3" />
      <button disabled={loading || code.length !== 6} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? 'Updating…' : 'Update password'}</button>
    </form>
    <Link to="/login" className="mt-5 block text-center text-sm font-medium text-blue-700">Back to sign in</Link>
  </AuthCard>;
}
