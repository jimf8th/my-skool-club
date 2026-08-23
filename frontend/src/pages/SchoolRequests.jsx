import React, { useCallback, useEffect, useState } from 'react';
import { schoolRequestsService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

const statuses = ['PENDING', 'APPROVED', 'REJECTED', ''];

export default function SchoolRequests() {
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRequests(await schoolRequestsService.list(status || undefined)); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Could not load school requests.')); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const approve = async (request) => {
    if (!window.confirm(`Approve ${request.schoolName}, create the school, and assign or invite ${request.adminEmail} as administrator?`)) return;
    try { await schoolRequestsService.approve(request.id); await load(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Could not approve the school request.')); }
  };
  const reject = async (request) => {
    const reason = window.prompt(`Why is the request for ${request.schoolName} being rejected?`);
    if (!reason?.trim()) return;
    try { await schoolRequestsService.reject(request.id, reason.trim()); await load(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Could not reject the school request.')); }
  };

  return <div className="space-y-5">
    <div><h1 className="text-3xl font-black">School Requests</h1><p className="mt-1 text-sm text-gray-600">Review public requests before a school is created and activated.</p></div>
    <select aria-label="Request status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border bg-white px-3 py-2">{statuses.map((value) => <option key={value} value={value}>{value || 'ALL REQUESTS'}</option>)}</select>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {loading ? <p>Loading…</p> : requests.length === 0 ? <p className="rounded-xl bg-white p-6 text-gray-500">No school requests in this view.</p> : requests.map((request) => <article key={request.id} className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-xl font-bold">{request.schoolName}</h2><Status value={request.status} /></div><p className="mt-1 text-sm text-gray-500">Submitted {new Date(request.createdAt).toLocaleString()}</p></div>{request.status === 'PENDING' && <div className="flex gap-2"><button onClick={() => reject(request)} className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700">Reject</button><button onClick={() => approve(request)} className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white">Approve</button></div>}</div>
      <div className="mt-5 grid gap-5 md:grid-cols-2"><section><h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Administrator</h3><p className="mt-2 font-semibold">{request.firstName} {request.lastName}</p><a className="block text-sm text-indigo-700 underline" href={`mailto:${request.adminEmail}`}>{request.adminEmail}</a><a className="block text-sm text-indigo-700 underline" href={`tel:${request.contactPhone}`}>{request.contactPhone}</a></section><section><h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">School contact</h3><p className="mt-2">{request.address}<br />{request.city}, {request.state} {request.postalCode}</p><a className="block text-sm text-indigo-700 underline" href={`tel:${request.schoolPhone}`}>{request.schoolPhone}</a><a className="block break-all text-sm text-indigo-700 underline" href={request.website} target="_blank" rel="noreferrer">{request.website}</a></section></div>
      <p className="mt-5 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-gray-700">{request.description}</p>
      {request.rejectionReason && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"><b>Rejection reason:</b> {request.rejectionReason}</p>}
      {request.createdSchoolId && <p className="mt-3 text-sm font-semibold text-green-700">Created school #{request.createdSchoolId}</p>}
    </article>)}
  </div>;
}

function Status({ value }) {
  const colors = { PENDING: 'bg-amber-100 text-amber-800', APPROVED: 'bg-green-100 text-green-800', REJECTED: 'bg-red-100 text-red-800' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${colors[value]}`}>{value}</span>;
}
