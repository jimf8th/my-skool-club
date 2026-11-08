import React, { useCallback, useEffect, useState } from 'react';
import { Clock, MapPin, Flag, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EventsManager from '../components/EventsManager';
import ReportContentModal from '../components/ReportContentModal';
import { eventsService, schoolsService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

const responses = [['YES', 'Going'], ['MAYBE', 'Maybe'], ['NO', 'Not Going']];

export default function Events() {
  const { user, isAppAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [manageSchool, setManageSchool] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const allSchools = await schoolsService.getAll();
      const results = await Promise.all(allSchools.map(async (school) => {
        if (!isAppAdmin) {
          const membership = await schoolsService.getMyMembership(school.id).catch(() => null);
          if (membership?.status !== 'APPROVED') return null;
        }
        const [privilegeNames, schoolEvents] = await Promise.all([
          schoolsService.getMyPrivileges(school.id).catch(() => []),
          eventsService.list(school.id).catch(() => []),
        ]);
        const privileges = new Set(privilegeNames);
        return {
          school: { ...school, privileges, isSchoolAdmin: privileges.has('MANAGE_SCHOOL_MEMBERS'), canCreate: privileges.has('CREATE_EVENT') },
          events: schoolEvents.map((item) => ({ ...item, schoolName: school.name })),
        };
      }));
      setSchools(results.filter(Boolean).map((result) => result.school));
      setEvents(results.filter(Boolean).flatMap((result) => result.events).sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime)));
    } catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load events.')); }
    finally { setLoading(false); }
  }, [isAppAdmin]);
  useEffect(() => { load(); }, [load]);

  const rsvp = async (event, response) => {
    setBusyId(event.id); setError('');
    try {
      const updated = await eventsService.rsvp(event.schoolId, event.id, response);
      setEvents((items) => items.map((item) => item.id === event.id && item.schoolId === event.schoolId ? { ...item, ...updated, schoolName: item.schoolName } : item));
    } catch (requestError) { setError(getErrorMessage(requestError, 'Failed to save RSVP.')); }
    finally { setBusyId(null); }
  };

  const creatable = schools.filter((school) => school.canCreate);
  const createEvent = () => {
    if (creatable.length === 0) return setError('You need event-creation permission in an approved school.');
    if (creatable.length === 1) return setManageSchool(creatable[0]);
    const selected = window.prompt(`Enter a school number:\n${creatable.map((school, index) => `${index + 1}. ${school.name}`).join('\n')}`);
    const school = creatable[Number(selected) - 1];
    if (school) setManageSchool(school);
  };

  const now = new Date();
  const upcoming = events.filter((event) => new Date(event.eventTime) >= now);
  const past = events.filter((event) => new Date(event.eventTime) < now);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Events</h1><p className="mt-1 text-sm text-gray-600">Events across your approved school communities.</p></div><div className="flex gap-2"><button type="button" onClick={load} className="rounded-lg border px-4 py-2 font-semibold text-gray-700">Refresh</button><button type="button" onClick={createEvent} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">+ New Event</button></div></div>
    {notice && <p className="rounded-lg bg-green-50 p-3 text-green-800">{notice}</p>}{error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {loading ? <p className="py-12 text-center text-gray-500">Loading events…</p> : schools.length === 0 ? <Empty title="No school memberships yet" text="Join a school and get approved to see and create events." /> : events.length === 0 ? <Empty title="No events yet" text="Check back later or create the first event if you have permission." /> : <><EventSection title="Upcoming" items={upcoming} user={user} busyId={busyId} onRsvp={rsvp} onReport={setReportTarget} /><EventSection title="Past" items={past} user={user} busyId={busyId} onRsvp={rsvp} onReport={setReportTarget} past /></>}
    {manageSchool && <EventsManager schoolId={manageSchool.id} currentUser={user} canCreate={manageSchool.canCreate} isSchoolAdmin={manageSchool.isSchoolAdmin} initialCreate onClose={() => { setManageSchool(null); load(); }} />}
    {reportTarget && <ReportContentModal contentType="EVENT" contentId={reportTarget.id} onClose={() => setReportTarget(null)} onSubmitted={() => setNotice('Report submitted for administrator review.')} />}
  </div>;
}

function EventSection({ title, items, user, busyId, onRsvp, onReport, past = false }) {
  if (!items.length) return null;
  return <section><h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">{title}</h2><div className="grid gap-4 lg:grid-cols-2">{items.map((event) => <article key={`${event.schoolId}-${event.id}`} className={`rounded-xl border bg-white p-5 shadow-sm ${past ? 'opacity-60' : ''}`}><h3 className="text-lg font-semibold">{event.title}</h3><p className="mt-2 flex items-center gap-1 text-sm text-gray-600"><Clock className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> {new Date(event.eventTime).toLocaleString()}</p><p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><MapPin className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> {event.location}</p><p className="mt-2 text-xs font-bold text-indigo-700">{event.schoolName}</p><p className="mt-4 text-xs text-gray-500">{event.yesCount} going · {event.maybeCount} maybe · {event.noCount} not going</p>{!past && <div className="mt-3 grid grid-cols-3 gap-2">{responses.map(([value, label]) => <button type="button" key={value} disabled={busyId === event.id} onClick={() => onRsvp(event, value)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${event.myResponse === value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}>{label}</button>)}</div>}{event.createdByUserId !== user?.id && <button type="button" onClick={() => onReport(event)} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-600"><Flag className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" /> Report</button>}</article>)}</div></section>;
}

function Empty({ title, text }) { return <div className="rounded-xl bg-white p-12 text-center"><Calendar className="mx-auto h-10 w-10 text-gray-300" strokeWidth={2} aria-hidden="true" /><h2 className="mt-4 text-xl font-bold">{title}</h2><p className="mt-2 text-gray-600">{text}</p></div>; }
