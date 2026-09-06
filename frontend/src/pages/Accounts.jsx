import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAdminService } from '../services/api';

export default function Accounts() {
  const { isAppAdmin } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setAccounts(await accountsAdminService.search(query || undefined)); }
    catch (e) { setError(e.response?.data?.message || 'Could not load accounts.'); }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => { if (!isAppAdmin) navigate('/'); else load(); }, [isAppAdmin, load, navigate]);

  const resetSignIn = async (account) => {
    if (!window.confirm(`Clear the Firebase sign-in link for ${account.email}? They will need to sign in again to relink.`)) return;
    try { await accountsAdminService.resetSignIn(account.id); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Could not reset sign-in.'); }
  };

  if (!isAppAdmin) return null;
  return <div className="space-y-5">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
      <p className="mt-1 text-sm text-gray-600">Only app administrators can access this page.</p>
    </div>
    <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by email"
        className="w-full max-w-md rounded-lg border px-3 py-2"
      />
      <button type="submit" className="rounded-lg border px-4 py-2 text-sm font-semibold">Search</button>
    </form>
    {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {loading ? <p>Loading…</p> : accounts.length === 0 ? <p className="rounded-xl bg-white p-6 text-gray-500">No accounts found.</p> : accounts.map(account => (
      <article key={account.id} className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">{account.appRole}</span>
          {!account.enabled && <span className="rounded bg-red-50 px-2 py-1 text-red-700">SUSPENDED</span>}
          {!account.signInLinked && <span className="rounded bg-amber-50 px-2 py-1 text-amber-800">SIGN-IN NOT LINKED</span>}
        </div>
        <p className="mt-2 font-semibold text-gray-900">{account.firstName} {account.lastName}</p>
        <p className="text-sm text-gray-600">{account.email}</p>
        {account.suspensionReason && <p className="mt-2 text-sm"><b>Suspension reason:</b> {account.suspensionReason}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => resetSignIn(account)}
            disabled={!account.signInLinked}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset sign-in link
          </button>
        </div>
      </article>
    ))}
  </div>;
}
