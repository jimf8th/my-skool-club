import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, CheckCircle2, Clock, ChevronRight, ArrowLeft, Receipt, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMySchool } from '../hooks/useMySchool';
import Modal from '../components/Modal';
import InvoicesManager from '../components/InvoicesManager';
import InventoryManager from '../components/InventoryManager';
import { clubsService, invoicesService, schoolsService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

const invoiceStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELLED'];
const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function Clubs() {
  const { user, isAppAdmin } = useAuth();
  const mySchool = useMySchool(user);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [privileges, setPrivileges] = useState(new Set());
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeClubId, setActiveClubId] = useState(null);

  useEffect(() => {
    if (!isAppAdmin) return;
    schoolsService.getAll().then(setSchools).catch((requestError) => setError(getErrorMessage(requestError, 'Failed to load schools.'))).finally(() => setLoading(false));
  }, [isAppAdmin]);

  const schoolId = isAppAdmin ? Number(selectedSchoolId) || null : mySchool.school?.id || null;

  const loadClubs = useCallback(async () => {
    if (!schoolId) { setClubs([]); setPrivileges(new Set()); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const privilegeNames = isAppAdmin ? await schoolsService.getMyPrivileges(schoolId) : [...mySchool.privileges];
      const privilegeSet = new Set(privilegeNames);
      setPrivileges(privilegeSet);
      setClubs(privilegeSet.has('VIEW_ALL_CLUBS') ? await clubsService.getBySchool(schoolId) : []);
    } catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load clubs.')); setClubs([]); }
    finally { setLoading(false); }
  }, [isAppAdmin, mySchool.privileges, schoolId]);

  useEffect(() => { if (!mySchool.loading || isAppAdmin) loadClubs(); }, [isAppAdmin, loadClubs, mySchool.loading]);

  const removeClub = async (club) => {
    if (!window.confirm(`Delete "${club.name}"? All club memberships will be removed.`)) return;
    try { await clubsService.remove(club.schoolId, club.id); setClubs((items) => items.filter((item) => item.id !== club.id)); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to delete club.')); }
  };

  const selectedSchool = isAppAdmin ? schools.find((school) => school.id === schoolId) : mySchool.school;
  const initialLoading = isAppAdmin ? loading : mySchool.loading;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Clubs</h1>{schoolId && privileges.has('ADD_CLUB') && <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-purple-600 px-5 py-2.5 font-semibold text-white">+ Add Club</button>}</div>
    {isAppAdmin && <div><label className="mb-1 block text-sm font-semibold text-gray-700">School</label><select value={selectedSchoolId} onChange={(event) => setSelectedSchoolId(event.target.value)} className="w-full max-w-md rounded-lg border bg-white px-4 py-3"><option value="">Select a school</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></div>}
    {!isAppAdmin && selectedSchool && <p className="text-sm font-semibold text-indigo-700">{selectedSchool.name}</p>}
    {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {initialLoading || loading ? <p className="py-12 text-center text-gray-500">Loading clubs…</p> : !schoolId ? <Empty title={isAppAdmin ? 'Select a School' : 'Join a School'} text={isAppAdmin ? 'Choose a school to manage its clubs.' : 'Join a school and get approved to browse its clubs.'} /> : !privileges.has('VIEW_ALL_CLUBS') ? <Empty title="Members Only" text={`Join ${selectedSchool?.name || 'this school'} to browse its clubs.`} /> : clubs.length === 0 ? <Empty title="No Clubs Yet" text={privileges.has('ADD_CLUB') ? 'Create the first club for this school.' : 'No clubs have been created yet.'} /> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{clubs.map((club) => <article key={club.id} className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">{club.name}</h2><p className="mt-2 line-clamp-3 text-sm text-gray-600">{club.description || 'No description provided.'}</p><div className="mt-5 flex gap-2"><button type="button" onClick={() => setActiveClubId(club.id)} className="flex-1 rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700">View Details</button>{privileges.has('DELETE_CLUB') && <button type="button" onClick={() => removeClub(club)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">Delete</button>}</div></article>)}</div>}
    {creating && <AddClubModal schoolId={schoolId} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); loadClubs(); }} />}
    {activeClubId && <ClubDetail clubId={activeClubId} currentUser={user} schoolPrivileges={privileges} onClose={() => { setActiveClubId(null); loadClubs(); }} />}
  </div>;
}

function Empty({ title, text }) { return <div className="rounded-xl bg-white p-12 text-center"><Users className="mx-auto h-10 w-10 text-gray-300" strokeWidth={2} aria-hidden="true" /><h2 className="mt-4 text-xl font-bold">{title}</h2><p className="mt-2 text-gray-600">{text}</p></div>; }

function ClubDetail({ clubId, currentUser, schoolPrivileges, onClose }) {
  const [club, setClub] = useState(null);
  const [membership, setMembership] = useState(null);
  const [privileges, setPrivileges] = useState(new Set());
  const [view, setView] = useState('detail');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState({ name: '', description: '' });
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState('');
  const [dashboard, setDashboard] = useState({ members: [], invoices: [] });
  const [showInvoices, setShowInvoices] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [clubData, membershipData, privilegeNames] = await Promise.all([
        clubsService.getById(clubId), clubsService.getMyMembership(clubId).catch(() => null), clubsService.getMyPrivileges(clubId).catch(() => []),
      ]);
      setClub(clubData); setMembership(membershipData); setPrivileges(new Set(privilegeNames)); setEdit({ name: clubData.name, description: clubData.description || '' });
    } catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load club details.')); }
    finally { setLoading(false); }
  }, [clubId]);
  useEffect(() => { load(); }, [load]);

  const canEdit = schoolPrivileges.has('MODIFY_CLUB');
  const canDelete = schoolPrivileges.has('DELETE_CLUB');
  const canManageMembers = privileges.has('ADD_CLUB_MEMBER');
  const canManageAdmins = privileges.has('MANAGE_CLUB_ADMINS');
  const canViewMembers = privileges.has('VIEW_CLUB_MEMBERS');
  const canViewInvoices = privileges.has('VIEW_INVOICES');
  const canCreateInvoice = privileges.has('CREATE_INVOICE');
  const canApproveInvoice = privileges.has('APPROVE_INVOICE');
  const canViewInventory = privileges.has('VIEW_INVENTORY');
  const canCheckoutInventory = privileges.has('CHECKOUT_INVENTORY');
  const canManageInventory = privileges.has('MANAGE_INVENTORY');

  const saveEdit = async (event) => {
    event.preventDefault(); if (!edit.name.trim()) return setError('Club name is required.');
    setSaving(true); setError('');
    try { await clubsService.update(club.schoolId, clubId, { name: edit.name.trim(), description: edit.description.trim() || null }); await load(); setView('detail'); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to save club.')); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${club.name}"? This cannot be undone.`)) return;
    try { await clubsService.remove(club.schoolId, clubId); onClose(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to delete club.')); }
  };

  const requestJoin = async () => {
    setSaving(true); setError('');
    try { setMembership(await clubsService.requestToJoin(clubId)); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to send membership request.')); }
    finally { setSaving(false); }
  };

  const openPeople = async (nextView) => {
    setLoading(true); setError(''); setSearch('');
    try { setPeople(nextView === 'pending' ? await clubsService.getPendingRequests(clubId) : await clubsService.getMembers(clubId)); setView(nextView); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load club members.')); }
    finally { setLoading(false); }
  };

  const openDashboard = async () => {
    setLoading(true); setError('');
    try {
      const [membersResult, invoicesResult] = await Promise.allSettled([clubsService.getMembers(clubId), invoicesService.list(clubId)]);
      setDashboard({ members: membersResult.status === 'fulfilled' ? membersResult.value : [], invoices: invoicesResult.status === 'fulfilled' ? invoicesResult.value : [] }); setView('dashboard');
    } finally { setLoading(false); }
  };

  const decide = async (person, action) => {
    if (action !== 'approve' && !window.confirm(`${action === 'reject' ? 'Reject' : 'Remove'} ${person.userFirstName} ${person.userLastName}?`)) return;
    try {
      if (action === 'approve') await clubsService.approveMember(clubId, person.userId);
      if (action === 'reject') await clubsService.rejectMember(clubId, person.userId);
      if (action === 'revoke') await clubsService.revokeMember(clubId, person.userId);
      setPeople((items) => items.filter((item) => item.userId !== person.userId));
    } catch (requestError) { setError(getErrorMessage(requestError, 'Membership action failed.')); }
  };

  const addAdmin = async (person) => {
    setSaving(true);
    try { await clubsService.addAdmin(clubId, person.userId); await load(); setView('detail'); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to add club administrator.')); }
    finally { setSaving(false); }
  };

  const removeAdmin = async (admin) => {
    if ((club.admins || []).length <= 1) return setError('Assign another administrator before removing the final administrator.');
    if (!window.confirm(`Remove ${admin.userFirstName} ${admin.userLastName} as club administrator?`)) return;
    try { await clubsService.removeAdmin(clubId, admin.userId); await load(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to remove club administrator.')); }
  };

  const visiblePeople = people.filter((person) => `${person.userFirstName} ${person.userLastName} ${person.userEmail}`.toLowerCase().includes(search.toLowerCase()));
  const adminCandidates = visiblePeople.filter((person) => !(club?.admins || []).some((admin) => admin.userId === person.userId));
  const totalPaid = dashboard.invoices.filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
  const outstanding = dashboard.invoices.filter((invoice) => invoice.status === 'APPROVED').reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);

  return <><Modal title={club?.name || 'Club'} onClose={onClose} size="max-w-3xl">
    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading && !club ? <p className="py-10 text-center text-gray-500">Loading…</p> : view === 'edit' ? <form onSubmit={saveEdit} className="space-y-4"><Back onClick={() => setView('detail')} /><input value={edit.name} onChange={(event) => setEdit((value) => ({ ...value, name: event.target.value }))} className="w-full rounded-lg border px-4 py-3" /><textarea rows={4} value={edit.description} onChange={(event) => setEdit((value) => ({ ...value, description: event.target.value }))} className="w-full rounded-lg border px-4 py-3" /><button disabled={saving} className="rounded-lg bg-purple-600 px-5 py-2.5 font-semibold text-white">Save Changes</button></form> : ['pending', 'members', 'admins'].includes(view) ? <div><Back onClick={() => setView('detail')} /><h3 className="mt-4 text-lg font-semibold">{view === 'pending' ? 'Pending Requests' : view === 'admins' ? 'Add Club Administrator' : 'Club Members'}</h3><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" className="my-4 w-full rounded-lg border px-4 py-3" />{loading ? <p className="py-8 text-center">Loading…</p> : (view === 'admins' ? adminCandidates : visiblePeople).length === 0 ? <p className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">No matching members.</p> : <div className="divide-y rounded-xl border">{(view === 'admins' ? adminCandidates : visiblePeople).map((person) => <div key={person.userId} className="flex items-center gap-3 p-3"><div className="min-w-0 flex-1"><p className="font-semibold">{person.userFirstName} {person.userLastName} {person.role === 'ADMIN' && <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">Admin</span>}</p><p className="truncate text-xs text-gray-500">{person.userEmail}</p></div>{view === 'pending' ? <><button onClick={() => decide(person, 'approve')} className="rounded bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">Approve</button><button onClick={() => decide(person, 'reject')} className="rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Reject</button></> : view === 'admins' ? <button disabled={saving} onClick={() => addAdmin(person)} className="rounded bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700">Add</button> : canManageMembers && person.userId !== currentUser?.id && <button onClick={() => decide(person, 'revoke')} className="rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Remove</button>}</div>)}</div>}</div> : view === 'dashboard' ? <div><Back onClick={() => setView('detail')} /><h3 className="mt-4 text-lg font-bold">Club Dashboard</h3>{loading ? <p className="py-8 text-center">Loading…</p> : <><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Members" value={dashboard.members.length} /><Stat label="Invoices" value={dashboard.invoices.length} /><Stat label="Paid" value={money(totalPaid)} /><Stat label="Outstanding" value={money(outstanding)} /></div><div className="mt-4 flex flex-wrap gap-2">{invoiceStatuses.map((status) => <span key={status} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{status}: {dashboard.invoices.filter((invoice) => invoice.status === status).length}</span>)}</div><h4 className="mt-6 font-bold">Members</h4><div className="mt-2 divide-y rounded-xl border">{dashboard.members.map((person) => <div key={person.userId} className="p-3"><p className="font-semibold">{person.userFirstName} {person.userLastName}</p><p className="text-xs text-gray-500">{person.userEmail}</p></div>)}</div></>}</div> : club && <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">{club.schoolName}</span><div className="flex gap-2">{canEdit && <button type="button" onClick={() => setView('edit')} className="rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700">Edit</button>}{canDelete && <button type="button" onClick={remove} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">Delete</button>}</div></div>
      {club.description && <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs font-bold uppercase text-gray-500">About</p><p className="mt-2">{club.description}</p></div>}
      <section><div className="mb-2 flex justify-between"><h3 className="font-semibold">Club Administrators ({(club.admins || []).length})</h3>{canManageAdmins && <button type="button" onClick={() => openPeople('admins')} className="text-sm font-medium text-purple-700">+ Add</button>}</div><div className="divide-y rounded-xl border">{(club.admins || []).map((admin) => <div key={admin.userId} className="flex items-center p-3"><div className="flex-1"><p className="font-semibold">{admin.userFirstName} {admin.userLastName}{admin.userId === currentUser?.id ? ' (you)' : ''}</p><p className="text-xs text-gray-500">{admin.userEmail}</p></div>{canManageAdmins && (club.admins || []).length > 1 && <button onClick={() => removeAdmin(admin)} className="text-sm font-medium text-red-700">Remove</button>}</div>)}</div></section>
      <section className="rounded-xl border p-4"><h3 className="font-semibold">Your Membership</h3><div className="mt-2">{membership?.status === 'APPROVED' ? <span className="inline-flex items-center gap-1 font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> {membership.role === 'ADMIN' ? 'Club Administrator' : 'Club Member'}</span> : membership?.status === 'PENDING' ? <span className="inline-flex items-center gap-1 font-semibold text-amber-700"><Clock className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> Awaiting Approval</span> : membership?.status === 'REJECTED' ? <div><p className="font-semibold text-red-700">Request Rejected</p><button onClick={requestJoin} className="mt-3 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white">Request Again</button></div> : (canEdit || canDelete) ? <span className="font-semibold text-purple-700">Managing via school role</span> : <button disabled={saving} onClick={requestJoin} className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white">Request to Join</button>}</div></section>
      {(canViewMembers || canViewInvoices || canViewInventory) && <section><h3 className="mb-2 font-semibold">Club Management</h3><div className="grid gap-2 sm:grid-cols-2">{canManageMembers && <button type="button" onClick={() => openPeople('pending')} className="flex items-center justify-between gap-2 rounded-xl border p-4 text-left font-medium">Review Pending Requests <ChevronRight className="h-4 w-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" /></button>}{canViewMembers && <button type="button" onClick={() => openPeople('members')} className="flex items-center justify-between gap-2 rounded-xl border p-4 text-left font-medium">View Club Members <ChevronRight className="h-4 w-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" /></button>}{canViewMembers && canViewInvoices && <button type="button" onClick={openDashboard} className="flex items-center justify-between gap-2 rounded-xl border p-4 text-left font-medium">Club Dashboard <ChevronRight className="h-4 w-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" /></button>}{canViewInvoices && <button type="button" onClick={() => setShowInvoices(true)} className="flex items-center justify-between gap-2 rounded-xl border p-4 text-left font-medium"><span className="inline-flex items-center gap-2"><Receipt className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> Invoices</span><ChevronRight className="h-4 w-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" /></button>}{canViewInventory && <button type="button" onClick={() => setShowInventory(true)} className="flex items-center justify-between gap-2 rounded-xl border p-4 text-left font-medium"><span className="inline-flex items-center gap-2"><Package className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> Inventory</span><ChevronRight className="h-4 w-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" /></button>}</div></section>}
    </div>}
  </Modal>{showInvoices && <InvoicesManager clubId={clubId} schoolTier={club?.schoolTier} currentUser={currentUser} canCreate={canCreateInvoice} canApprove={canApproveInvoice} onClose={() => setShowInvoices(false)} />}{showInventory && <InventoryManager clubId={clubId} currentUser={currentUser} canCheckout={canCheckoutInventory} canManage={canManageInventory} onClose={() => setShowInventory(false)} />}</>;
}

function Back({ onClick }) { return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-sm font-medium text-purple-700"><ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> Back</button>; }
function Stat({ label, value }) { return <div className="rounded-xl bg-gray-50 p-4 text-center"><p className="text-xl font-bold">{value}</p><p className="text-xs text-gray-500">{label}</p></div>; }

function AddClubModal({ schoolId, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [members, setMembers] = useState([]);
  const [adminId, setAdminId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { schoolsService.getMembers(schoolId).then(setMembers).catch((requestError) => setError(getErrorMessage(requestError, 'Could not load school members.'))); }, [schoolId]);
  const filtered = useMemo(() => members.filter((person) => `${person.userFirstName} ${person.userLastName} ${person.userEmail}`.toLowerCase().includes(search.toLowerCase())), [members, search]);
  const submit = async (event) => {
    event.preventDefault(); if (!form.name.trim() || !adminId) return setError('Club name and first administrator are required.');
    setSaving(true); setError('');
    try { await clubsService.create(schoolId, { name: form.name.trim(), description: form.description.trim() || null, firstAdminUserId: Number(adminId) }); onCreated(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to create club.')); }
    finally { setSaving(false); }
  };
  return <Modal title="Add Club" onClose={onClose}><form onSubmit={submit} className="space-y-4"><input autoFocus value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="Club name" className="w-full rounded-lg border px-4 py-3" /><textarea rows={3} value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} placeholder="Description (optional)" className="w-full rounded-lg border px-4 py-3" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search approved school members" className="w-full rounded-lg border px-4 py-3" /><select value={adminId} onChange={(event) => setAdminId(event.target.value)} className="w-full rounded-lg border bg-white px-4 py-3"><option value="">Select first club administrator</option>{filtered.map((person) => <option key={person.userId} value={person.userId}>{person.userFirstName} {person.userLastName} ({person.userEmail})</option>)}</select>{error && <p className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white">{saving ? 'Creating…' : 'Create Club'}</button></div></form></Modal>;
}
