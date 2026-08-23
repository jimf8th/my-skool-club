import React, { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import ReportContentModal from './ReportContentModal';
import { eventsService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

const RSVP_LABELS = { YES: 'Going', MAYBE: 'Maybe', NO: 'Not Going' };

export default function EventsManager({ schoolId, currentUser, canCreate, isSchoolAdmin, onClose, initialCreate = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(initialCreate ? 'create' : 'list');
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ title: '', location: '', eventTime: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setEvents(await eventsService.list(schoolId)); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load events.')); }
    finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const openEvent = async (eventId) => {
    setLoading(true); setError(''); setView('detail');
    try { setActive(await eventsService.get(schoolId, eventId)); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load event.')); }
    finally { setLoading(false); }
  };

  const createEvent = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.location.trim() || !form.eventTime) return setError('Title, location, and date/time are required.');
    if (new Date(form.eventTime) <= new Date()) return setError('Event time must be in the future.');
    setSaving(true); setError('');
    try {
      await eventsService.create(schoolId, { title: form.title.trim(), location: form.location.trim(), eventTime: form.eventTime });
      setForm({ title: '', location: '', eventTime: '' }); setView('list'); await load();
    } catch (requestError) { setError(getErrorMessage(requestError, 'Failed to create event.')); }
    finally { setSaving(false); }
  };

  const rsvp = async (response) => {
    if (!active) return;
    setSaving(true); setError('');
    try {
      const updated = await eventsService.rsvp(schoolId, active.id, response);
      setActive(updated);
      setEvents((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError) { setError(getErrorMessage(requestError, 'Failed to save your RSVP.')); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!active || !window.confirm('Delete this event? This cannot be undone.')) return;
    try { await eventsService.remove(schoolId, active.id); setActive(null); setView('list'); await load(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to delete event.')); }
  };

  const title = view === 'create' ? 'New Event' : view === 'detail' ? active?.title || 'Event' : 'Events';
  return <>
    <Modal title={title} onClose={onClose}>
      {notice && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {view === 'create' ? (
        <form onSubmit={createEvent} className="space-y-4">
          <input autoFocus value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="Event title" className="w-full rounded-lg border px-4 py-3" />
          <input value={form.location} onChange={(event) => setForm((value) => ({ ...value, location: event.target.value }))} placeholder="Location" className="w-full rounded-lg border px-4 py-3" />
          <input type="datetime-local" value={form.eventTime} onChange={(event) => setForm((value) => ({ ...value, eventTime: event.target.value }))} className="w-full rounded-lg border px-4 py-3" />
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setView('list')} className="rounded-lg px-4 py-2 font-semibold text-gray-700">Cancel</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Creating…' : 'Create Event'}</button></div>
        </form>
      ) : view === 'detail' ? (
        loading || !active ? <p className="py-8 text-center text-gray-500">Loading…</p> : <div>
          <button type="button" onClick={() => { setView('list'); setActive(null); }} className="mb-4 text-sm font-semibold text-indigo-700">← All events</button>
          <div className="rounded-xl bg-gray-50 p-4"><p className="font-semibold text-gray-900">{new Date(active.eventTime).toLocaleString()}</p><p className="mt-1 text-sm text-gray-600">📍 {active.location}</p><p className="mt-2 text-xs text-gray-500">Created by {active.createdByName}</p></div>
          <h3 className="mt-5 font-bold">Your RSVP</h3><div className="mt-2 grid grid-cols-3 gap-2">{Object.entries(RSVP_LABELS).map(([value, label]) => <button type="button" key={value} disabled={saving} onClick={() => rsvp(value)} className={`rounded-lg border px-2 py-2 text-sm font-semibold ${active.myResponse === value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}>{label}</button>)}</div>
          <h3 className="mt-6 font-bold">Responses ({(active.rsvps || []).length})</h3><div className="mt-2 divide-y rounded-xl border">{(active.rsvps || []).length === 0 ? <p className="p-4 text-sm text-gray-500">No responses yet.</p> : active.rsvps.map((item) => <div key={item.userId} className="flex justify-between p-3 text-sm"><span>{item.userFirstName} {item.userLastName}</span><span className="font-semibold">{RSVP_LABELS[item.response]}</span></div>)}</div>
          <div className="mt-5 flex justify-end">{isSchoolAdmin || active.createdByUserId === currentUser?.id ? <button type="button" onClick={remove} className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700">Delete Event</button> : <button type="button" onClick={() => setReportTarget(active)} className="rounded-lg border px-4 py-2 font-semibold text-gray-700">Report Event</button>}</div>
        </div>
      ) : (
        <>
          {canCreate && <button type="button" onClick={() => setView('create')} className="mb-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">+ New Event</button>}
          {loading ? <p className="py-8 text-center text-gray-500">Loading…</p> : events.length === 0 ? <p className="rounded-xl bg-gray-50 p-8 text-center text-gray-500">No events yet.</p> : <div className="divide-y rounded-xl border">{events.map((item) => <button type="button" key={item.id} onClick={() => openEvent(item.id)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-gray-50"><div><p className="font-bold text-gray-900">{item.title}</p><p className="mt-1 text-sm text-gray-500">{new Date(item.eventTime).toLocaleString()} · {item.location}</p><p className="mt-1 text-xs text-gray-400">{item.yesCount} going · {item.maybeCount} maybe · {item.noCount} not going</p></div><span className="text-gray-400">›</span></button>)}</div>}
        </>
      )}
    </Modal>
    {reportTarget && <ReportContentModal contentType="EVENT" contentId={reportTarget.id} onClose={() => setReportTarget(null)} onSubmitted={() => setNotice('Report submitted for administrator review.')} />}
  </>;
}
