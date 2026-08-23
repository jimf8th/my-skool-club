import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import EventsManager from '../components/EventsManager';
import AnnouncementsManager from '../components/AnnouncementsManager';
import { schoolsService, usersService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

export default function Schools() {
  const { user, isAppAdmin } = useAuth();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeSchoolId, setActiveSchoolId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setSchools(await schoolsService.getAll()); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load schools.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleEnabled = async (school) => {
    const action = school.enabled ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} "${school.name}"?`)) return;
    try {
      await schoolsService.setEnabled(school.id, !school.enabled);
      setSchools((items) => items.map((item) => item.id === school.id ? { ...item, enabled: !item.enabled } : item));
    } catch (requestError) { setError(getErrorMessage(requestError, 'Failed to update school.')); }
  };

  const toggleTier = async (school) => {
    const nextTier = school.tier === 'PREMIUM' ? 'STANDARD' : 'PREMIUM';
    if (!window.confirm(`Change "${school.name}" to ${nextTier === 'PREMIUM' ? 'Premium' : 'Standard'}?`)) return;
    try {
      const updated = await schoolsService.setTier(school.id, nextTier);
      setSchools((items) => items.map((item) => item.id === school.id ? updated : item));
    } catch (requestError) { setError(getErrorMessage(requestError, 'Failed to update school tier.')); }
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Schools</h1>{isAppAdmin && <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white">+ Add School</button>}</div>
    {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {loading ? <p className="py-12 text-center text-gray-500">Loading schools…</p> : schools.length === 0 ? <div className="rounded-xl bg-white p-12 text-center"><div className="text-5xl">🏫</div><h2 className="mt-4 text-xl font-bold">No Schools Yet</h2></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{schools.map((school) => <article key={school.id} className={`rounded-xl border bg-white p-5 shadow-sm ${school.enabled ? '' : 'opacity-60'}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{school.name}</h2><TierBadge tier={school.tier} /></div><p className="mt-2 line-clamp-3 text-sm text-gray-600">{school.description || 'No description provided.'}</p></div>{!school.enabled && <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Disabled</span>}</div><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setActiveSchoolId(school.id)} className="flex-1 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">View Details</button>{isAppAdmin && <><button type="button" onClick={() => toggleTier(school)} className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{school.tier === 'PREMIUM' ? 'Set Standard' : 'Set Premium'}</button><button type="button" onClick={() => toggleEnabled(school)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${school.enabled ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{school.enabled ? 'Disable' : 'Enable'}</button></>}</div></article>)}</div>}
    {creating && <AddSchoolModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
    {activeSchoolId && <SchoolDetail schoolId={activeSchoolId} currentUser={user} onClose={() => { setActiveSchoolId(null); load(); }} />}
  </div>;
}

function SchoolDetail({ schoolId, currentUser, onClose }) {
  const [school, setSchool] = useState(null);
  const [membership, setMembership] = useState(null);
  const [privileges, setPrivileges] = useState(new Set());
  const [view, setView] = useState('detail');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState({ name: '', description: '', address: '', city: '', state: '', postalCode: '', website: '', phone: '' });
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [schoolData, membershipData, privilegeNames] = await Promise.all([
        schoolsService.getById(schoolId),
        schoolsService.getMyMembership(schoolId).catch(() => null),
        schoolsService.getMyPrivileges(schoolId).catch(() => []),
      ]);
      setSchool(schoolData); setMembership(membershipData); setPrivileges(new Set(privilegeNames));
      setEdit({ name: schoolData.name, description: schoolData.description || '', address: schoolData.address || '', city: schoolData.city || '', state: schoolData.state || '', postalCode: schoolData.postalCode || '', website: schoolData.website || '', phone: schoolData.phone || '' });
    } catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load school details.')); }
    finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const canEdit = privileges.has('MODIFY_SCHOOL');
  const canManageAdmins = privileges.has('MANAGE_SCHOOL_ADMINS');
  const canManageMembers = privileges.has('MANAGE_SCHOOL_MEMBERS');
  const isSchoolAdmin = canManageMembers;

  const saveEdit = async (event) => {
    event.preventDefault(); if (!edit.name.trim()) return setError('School name is required.');
    setSaving(true); setError('');
    try { await schoolsService.update(schoolId, Object.fromEntries(Object.entries(edit).map(([key, value]) => [key, value.trim()]))); await load(); setView('detail'); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to save school.')); }
    finally { setSaving(false); }
  };

  const requestMembership = async () => {
    setSaving(true); setError('');
    try { setMembership(await schoolsService.requestToJoin(schoolId)); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to send membership request.')); }
    finally { setSaving(false); }
  };

  const openPeople = async (nextView) => {
    setLoading(true); setError(''); setSearch('');
    try {
      if (nextView === 'admins') setUsers(await usersService.getAll());
      else setMembers(nextView === 'pending' ? await schoolsService.getPendingRequests(schoolId) : await schoolsService.getMembers(schoolId));
      setView(nextView);
    } catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load people.')); }
    finally { setLoading(false); }
  };

  const addAdmin = async (person) => {
    setSaving(true);
    try { await schoolsService.addAdmin(schoolId, person.id); await load(); setView('detail'); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to add administrator.')); }
    finally { setSaving(false); }
  };

  const removeAdmin = async (admin) => {
    if ((school.admins || []).length <= 1) return setError('Assign another administrator before removing the final administrator.');
    if (!window.confirm(`Remove ${admin.userFirstName} ${admin.userLastName} as school administrator?`)) return;
    try { await schoolsService.removeAdmin(schoolId, admin.userId); await load(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to remove administrator.')); }
  };

  const decideMember = async (person, action) => {
    if ((action === 'reject' || action === 'revoke') && !window.confirm(`${action === 'reject' ? 'Reject' : 'Remove'} ${person.userFirstName} ${person.userLastName}?`)) return;
    try {
      if (action === 'approve') await schoolsService.approveMember(schoolId, person.userId);
      if (action === 'reject') await schoolsService.rejectMember(schoolId, person.userId);
      if (action === 'revoke') await schoolsService.revokeMember(schoolId, person.userId);
      setMembers((items) => items.filter((item) => item.userId !== person.userId));
    } catch (requestError) { setError(getErrorMessage(requestError, 'Membership action failed.')); }
  };

  const query = search.toLowerCase();
  const visiblePeople = (view === 'admins' ? users : members).filter((person) => {
    const first = person.firstName ?? person.userFirstName ?? '';
    const last = person.lastName ?? person.userLastName ?? '';
    const email = person.email ?? person.userEmail ?? '';
    if (view === 'admins' && (school?.admins || []).some((admin) => admin.userId === person.id)) return false;
    return `${first} ${last} ${email}`.toLowerCase().includes(query);
  });

  return <>
    <Modal title={school?.name || 'School'} onClose={onClose} size="max-w-3xl">
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && !school ? <p className="py-10 text-center text-gray-500">Loading…</p> : view === 'edit' ? <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2"><button type="button" onClick={() => setView('detail')} className="col-span-full text-left text-sm font-semibold text-indigo-700">← Back</button><input value={edit.name} onChange={(event) => setEdit((value) => ({ ...value, name: event.target.value }))} className="col-span-full w-full rounded-lg border px-4 py-3" placeholder="School name" /><textarea rows={4} value={edit.description} onChange={(event) => setEdit((value) => ({ ...value, description: event.target.value }))} className="col-span-full w-full rounded-lg border px-4 py-3" placeholder="Description" /><input value={edit.address} onChange={(event) => setEdit((value) => ({ ...value, address: event.target.value }))} className="col-span-full rounded-lg border px-4 py-3" placeholder="Street address" /><input value={edit.city} onChange={(event) => setEdit((value) => ({ ...value, city: event.target.value }))} className="rounded-lg border px-4 py-3" placeholder="City" /><input value={edit.state} onChange={(event) => setEdit((value) => ({ ...value, state: event.target.value }))} className="rounded-lg border px-4 py-3" placeholder="State or region" /><input value={edit.postalCode} onChange={(event) => setEdit((value) => ({ ...value, postalCode: event.target.value }))} className="rounded-lg border px-4 py-3" placeholder="ZIP or postal code" /><input value={edit.phone} onChange={(event) => setEdit((value) => ({ ...value, phone: event.target.value }))} className="rounded-lg border px-4 py-3" placeholder="Main school phone" /><input type="url" value={edit.website} onChange={(event) => setEdit((value) => ({ ...value, website: event.target.value }))} className="col-span-full rounded-lg border px-4 py-3" placeholder="https://school.example" /><button disabled={saving} className="col-span-full rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white">{saving ? 'Saving…' : 'Save Changes'}</button></form> : ['admins', 'pending', 'members'].includes(view) ? <div><button type="button" onClick={() => setView('detail')} className="mb-4 text-sm font-semibold text-indigo-700">← Back to school</button><h3 className="text-lg font-bold">{view === 'admins' ? 'Add School Administrator' : view === 'pending' ? 'Pending Requests' : 'Approved Members'}</h3><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" className="my-4 w-full rounded-lg border px-4 py-3" />{loading ? <p className="py-8 text-center text-gray-500">Loading…</p> : visiblePeople.length === 0 ? <p className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">No matching people.</p> : <div className="divide-y rounded-xl border">{visiblePeople.map((person) => { const id = person.id ?? person.userId; const first = person.firstName ?? person.userFirstName; const last = person.lastName ?? person.userLastName; const email = person.email ?? person.userEmail; return <div key={id} className="flex items-center gap-3 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">{first?.[0]}{last?.[0]}</div><div className="min-w-0 flex-1"><p className="font-semibold">{first} {last}</p><p className="truncate text-xs text-gray-500">{email}</p></div>{view === 'admins' ? <button disabled={saving} onClick={() => addAdmin(person)} className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">Add</button> : view === 'pending' ? <><button onClick={() => decideMember(person, 'approve')} className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">Approve</button><button onClick={() => decideMember(person, 'reject')} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Reject</button></> : <button onClick={() => decideMember(person, 'revoke')} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Remove</button>}</div>; })}</div>}</div> : school && <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${school.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{school.enabled ? 'Active' : 'Disabled'}</span><TierBadge tier={school.tier} /></div>{canEdit && <button type="button" onClick={() => setView('edit')} className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">Edit Details</button>}</div>
        {school.description && <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">About</p><p className="mt-2 text-gray-700">{school.description}</p></div>}
        {(school.address || school.website || school.phone) && <div className="rounded-xl border p-4"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Contact</p>{school.address && <p className="mt-2 text-sm">{school.address}<br />{school.city}, {school.state} {school.postalCode}</p>}{school.phone && <a className="mt-2 block text-sm text-indigo-700 underline" href={`tel:${school.phone}`}>{school.phone}</a>}{school.website && <a className="mt-1 block break-all text-sm text-indigo-700 underline" href={school.website} target="_blank" rel="noreferrer">{school.website}</a>}</div>}
        <section><div className="mb-2 flex items-center justify-between"><h3 className="font-bold">School Administrators ({(school.admins || []).length})</h3>{canManageAdmins && <button type="button" onClick={() => openPeople('admins')} className="text-sm font-semibold text-indigo-700">+ Add</button>}</div><div className="divide-y rounded-xl border">{(school.admins || []).map((admin) => <div key={admin.userId} className="flex items-center gap-3 p-3"><div className="flex-1"><p className="font-semibold">{admin.userFirstName} {admin.userLastName}{admin.userId === currentUser?.id ? ' (you)' : ''}</p><p className="text-xs text-gray-500">{admin.userEmail}</p></div>{canManageAdmins && (school.admins || []).length > 1 && <button type="button" onClick={() => removeAdmin(admin)} className="text-sm font-semibold text-red-700">Remove</button>}</div>)}</div></section>
        {canManageMembers ? <section><h3 className="mb-2 font-bold">Membership</h3><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => openPeople('pending')} className="rounded-xl border p-4 text-left font-semibold hover:bg-gray-50">Review Pending Requests →</button><button type="button" onClick={() => openPeople('members')} className="rounded-xl border p-4 text-left font-semibold hover:bg-gray-50">View Approved Members →</button></div></section> : <section className="rounded-xl border p-4"><h3 className="font-bold">Your Membership</h3><div className="mt-2">{membership?.status === 'APPROVED' ? <span className="font-semibold text-green-700">✓ Active Member</span> : membership?.status === 'PENDING' ? <span className="font-semibold text-amber-700">◷ Pending Approval</span> : membership?.status === 'REJECTED' ? <div><p className="font-semibold text-red-700">Request Rejected</p><button type="button" disabled={saving} onClick={requestMembership} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Request Again</button></div> : currentUser?.emailVerified === false ? <span className="font-semibold text-amber-700">Verify your email to join.</span> : <button type="button" disabled={saving} onClick={requestMembership} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">{saving ? 'Requesting…' : 'Request to Join'}</button>}</div></section>}
        {(privileges.has('VIEW_EVENTS') || privileges.has('VIEW_ANNOUNCEMENTS')) && <section><h3 className="mb-2 font-bold">School Community</h3><div className="grid gap-2 sm:grid-cols-2">{privileges.has('VIEW_EVENTS') && <button type="button" onClick={() => setShowEvents(true)} className="rounded-xl border p-4 text-left font-semibold hover:bg-gray-50">📅 View Events & RSVP →</button>}{privileges.has('VIEW_ANNOUNCEMENTS') && <button type="button" onClick={() => setShowAnnouncements(true)} className="rounded-xl border p-4 text-left font-semibold hover:bg-gray-50">📢 View Announcements →</button>}</div></section>}
      </div>}
    </Modal>
    {showEvents && <EventsManager schoolId={schoolId} currentUser={currentUser} canCreate={privileges.has('CREATE_EVENT')} isSchoolAdmin={isSchoolAdmin} onClose={() => setShowEvents(false)} />}
    {showAnnouncements && <AnnouncementsManager schoolId={schoolId} currentUser={currentUser} canCreate={privileges.has('CREATE_ANNOUNCEMENT')} isSchoolAdmin={isSchoolAdmin} onClose={() => setShowAnnouncements(false)} />}
  </>;
}

function TierBadge({ tier }) {
  const premium = tier === 'PREMIUM';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${premium ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>{premium ? 'Premium' : 'Standard'}</span>;
}

function AddSchoolModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [users, setUsers] = useState([]);
  const [adminId, setAdminId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { usersService.getAll().then(setUsers).catch((requestError) => setError(getErrorMessage(requestError, 'Could not load users.'))); }, []);
  const filtered = useMemo(() => users.filter((person) => `${person.firstName} ${person.lastName} ${person.email}`.toLowerCase().includes(search.toLowerCase())), [search, users]);
  const submit = async (event) => {
    event.preventDefault(); if (!form.name.trim() || !adminId) return setError('School name and administrator are required.');
    setSaving(true); setError('');
    try { await schoolsService.create({ name: form.name.trim(), description: form.description.trim(), adminUserId: Number(adminId) }); onCreated(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to create school.')); }
    finally { setSaving(false); }
  };
  return <Modal title="Add School" onClose={onClose}><form onSubmit={submit} className="space-y-4"><input autoFocus value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="School name" className="w-full rounded-lg border px-4 py-3" /><textarea rows={3} value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} placeholder="Description (optional)" className="w-full rounded-lg border px-4 py-3" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search administrator candidates" className="w-full rounded-lg border px-4 py-3" /><select value={adminId} onChange={(event) => setAdminId(event.target.value)} className="w-full rounded-lg border bg-white px-4 py-3"><option value="">Select school administrator</option>{filtered.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName} ({person.email})</option>)}</select>{error && <p className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-gray-700">Cancel</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Creating…' : 'Create School'}</button></div></form></Modal>;
}
