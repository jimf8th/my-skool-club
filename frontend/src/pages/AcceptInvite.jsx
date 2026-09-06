import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from './ForgotPassword';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

function invitationTokenFromFragment() {
  return new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || '';
}

export default function AcceptInvite() {
  const token = useMemo(invitationTokenFromFragment, []);
  const navigate = useNavigate();
  const { acceptInvitation, isAuthenticated, user, loading: authLoading } = useAuth();
  const [details, setDetails] = useState(null);
  const [checking, setChecking] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!acceptedTerms) {
      setError('Confirm that you are at least 13 and accept the policies.');
      return;
    }
    setLoading(true);
    const result = await acceptInvitation(token);
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
    {!checking && details && !authLoading && !isAuthenticated && (
      <div className="space-y-4 text-sm text-gray-700">
        <p>
          First create an account (or sign in) with the invited email address —
          you can use a password, Google, or Apple. Then reopen this invitation
          link to accept it.
        </p>
        <Link
          to="/register"
          className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white"
        >
          Create account
        </Link>
        <Link to="/login" className="block text-center text-sm font-medium text-blue-700">
          I already have an account
        </Link>
      </div>
    )}
    {!checking && details && isAuthenticated && (
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-700">
          You are signed in as <span className="font-medium">{user?.email}</span>.
        </p>
        <label className="flex items-start gap-2 rounded-lg border p-3 text-sm text-gray-700">
          <input type="checkbox" checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)} className="mt-1" />
          <span>I confirm I am at least 13 and accept the <a className="text-blue-700" href="/terms" target="_blank" rel="noreferrer">Terms</a>, <a className="text-blue-700" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>, and <a className="text-blue-700" href="/community-standards" target="_blank" rel="noreferrer">Community Standards</a>.</span>
        </label>
        <button disabled={loading || !acceptedTerms} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
          {loading ? 'Accepting…' : 'Accept invitation'}
        </button>
      </form>
    )}
    {!checking && !details && <Link to="/login" className="block text-center text-sm font-medium text-blue-700">Go to sign in</Link>}
  </AuthCard>;
}
