import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { moderationService } from '../services/api';

const STATUSES = ['', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];

export default function Moderation() {
  const { isAppAdmin } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('OPEN');
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setReports(await moderationService.list(status || undefined)); }
    catch (e) { setError(e.response?.data?.message || 'Could not load moderation reports.'); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { if (!isAppAdmin) navigate('/'); else load(); }, [isAppAdmin, load, navigate]);

  const act = async (action) => {
    try { await action(); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Moderation action failed.'); }
  };

  if (!isAppAdmin) return null;
  return <div className="space-y-5">
    <div><h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1><p className="mt-1 text-sm text-gray-600">Only app administrators can access this queue.</p></div>
    <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border px-3 py-2">
      {STATUSES.map(s => <option key={s} value={s}>{s || 'ALL REPORTS'}</option>)}
    </select>
    {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {loading ? <p>Loading…</p> : reports.length === 0 ? <p className="rounded-xl bg-white p-6 text-gray-500">No reports in this view.</p> : reports.map(report => <article key={report.id} className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold"><span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">{report.contentType} #{report.contentId}</span><span className="rounded bg-amber-50 px-2 py-1 text-amber-800">{report.reason}</span><span>{report.status}</span></div>
      <pre className="my-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-sans text-sm text-gray-800">{report.contentSnapshot}</pre>
      <p className="text-sm"><b>Reporter:</b> {report.reporterName}</p>
      {report.contentAuthorName && <p className="text-sm"><b>Author:</b> {report.contentAuthorName}</p>}
      {report.details && <p className="mt-2 text-sm"><b>Details:</b> {report.details}</p>}
      {report.resolution && <p className="mt-2 text-sm"><b>Resolution:</b> {report.resolution}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => act(() => moderationService.decide(report.id, 'UNDER_REVIEW', 'Review started.'))} className="rounded-lg border px-3 py-2 text-sm font-semibold">Review</button>
        <button onClick={() => act(() => moderationService.decide(report.id, 'DISMISSED', 'No violation found.'))} className="rounded-lg border px-3 py-2 text-sm font-semibold">Dismiss</button>
        <button onClick={() => window.confirm('Remove or disable this content?') && act(() => moderationService.removeContent(report.id))} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">Remove content</button>
        {report.contentAuthorId && (report.contentAuthorSuspended
          ? <button onClick={() => window.confirm('Restore this user’s access?') && act(() => moderationService.restoreUser(report.contentAuthorId))} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white">Restore author</button>
          : <button onClick={() => { const reason = window.prompt('Reason for suspension:'); if (reason?.trim()) act(() => moderationService.suspendAuthor(report.id, reason)); }} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white">Suspend author</button>)}
      </div>
    </article>)}
  </div>;
}
