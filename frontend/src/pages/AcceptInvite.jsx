import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from './ForgotPassword';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PASSWORD_RULES = [
  value => value.length >= 8,
  value => /[A-Z]/.test(value),
  value => /[a-z]/.test(value),
  value => /\d/.test(value),
  value => /[^A-Za-z0-9]/.test(value),
];

function invitationTokenFromFragment() {
  return new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || '';
}

export default function AcceptInvite() {
  const token = useMemo(invitationTokenFromFragment, []);
  const navigate = useNavigate();
  const { acceptInvitation } = useAuth();
  const [details, setDetails] = useState(null);
  const [checking, setChecking] = useState(true);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const passwordStrong = PASSWORD_RULES.every(rule => rule(password));

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!token) {
        setError('This invitation link is incomplete.');
        setChecking(false);
        return;
      }
      try {
        const response = await authService.getInvitationDetails(token);
        if (active) setDetails(response);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'This invitation is invalid or expired.');
      } finally {
        if (active) setChecking(false);
      }
    };
    load();
    return () => { active = false; };
  }, [token]);

  const sendCode = async () => {
    setLoading(true); setError('');
    try {
      const response = await authService.sendInvitationCode(token);
      setMessage(response.message);
      setCodeSent(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not send the verification code.');
    } finally { setLoading(false); }
  };

  const submit = async event => {
    event.preventDefault(); setError('');
    if (!/^\d{6}$/.test(code)) { setError('Enter the six-digit code sent to your email.'); return; }
    if (!passwordStrong) { setError('Use 8+ characters with uppercase, lowercase, number, and symbol.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!acceptedTerms) { setError('Confirm that you are at least 13 and accept the policies.'); return; }

    setLoading(true);
    const result = await acceptInvitation({ token, code, password, ageConfirmed: true, acceptedTerms: true });
    if (result.success) navigate('/', { replace: true });
    else { setError(result.error); setLoading(false); }
  };

  return <AuthCard
    title="Accept your invitation"
    subtitle={details
      ? `Welcome, ${details.firstName} ${details.lastName}. Confirm access to ${details.maskedEmail} to continue.`
      : 'Checking your secure invitation…'}
  >
    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    {!checking && details && !codeSent && (
      <button onClick={sendCode} disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
        {loading ? 'Sending…' : 'Email my verification code'}
      </button>
    )}
    {details && codeSent && <form onSubmit={submit} className="space-y-4">
      <input aria-label="Six-digit code" inputMode="numeric" required pattern="[0-9]{6}" maxLength={6} value={code}
        onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="Six-digit code" className="w-full rounded-lg border px-4 py-3" />
      <input aria-label="Password" type="password" required minLength={8} maxLength={128} value={password}
        onChange={event => setPassword(event.target.value)} placeholder="Create password"
        autoComplete="new-password" className="w-full rounded-lg border px-4 py-3" />
      <p className="text-xs text-gray-500">Use 8+ characters with uppercase, lowercase, number, and symbol.</p>
      <input aria-label="Confirm password" type="password" required value={confirmPassword}
        onChange={event => setConfirmPassword(event.target.value)} placeholder="Confirm password"
        autoComplete="new-password" className="w-full rounded-lg border px-4 py-3" />
      <label className="flex items-start gap-2 rounded-lg border p-3 text-sm text-gray-700">
        <input type="checkbox" checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)} className="mt-1" />
        <span>I confirm I am at least 13 and accept the <a className="text-blue-700" href="/terms" target="_blank" rel="noreferrer">Terms</a>, <a className="text-blue-700" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>, and <a className="text-blue-700" href="/community-standards" target="_blank" rel="noreferrer">Community Standards</a>.</span>
      </label>
      <button disabled={loading || code.length !== 6 || !acceptedTerms} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
        {loading ? 'Creating…' : 'Create account'}
      </button>
      <button type="button" onClick={sendCode} disabled={loading} className="w-full text-sm font-medium text-blue-700 disabled:opacity-50">Send another code</button>
    </form>}
    {!checking && !details && <Link to="/login" className="block text-center text-sm font-medium text-blue-700">Go to sign in</Link>}
  </AuthCard>;
}
