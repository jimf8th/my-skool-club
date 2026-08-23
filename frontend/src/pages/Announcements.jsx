import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMySchool } from '../hooks/useMySchool';
import AnnouncementsManager from '../components/AnnouncementsManager';
import { schoolsService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

export default function Announcements() {
  const { user, isAppAdmin } = useAuth();
  const mySchool = useMySchool(user);
  const [schools, setSchools] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [privileges, setPrivileges] = useState(new Set());
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAppAdmin) schoolsService.getAll().then(setSchools).catch((requestError) => setError(getErrorMessage(requestError, 'Failed to load schools.')));
  }, [isAppAdmin]);

  const school = isAppAdmin ? schools.find((item) => item.id === Number(selectedId)) : mySchool.school;

  useEffect(() => {
    if (!school) { setPrivileges(new Set()); return; }
    if (!isAppAdmin) { setPrivileges(new Set(mySchool.privileges)); return; }
    schoolsService.getMyPrivileges(school.id).then((items) => setPrivileges(new Set(items))).catch(() => setPrivileges(new Set()));
  }, [isAppAdmin, mySchool.privileges, school]);

  return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Announcements</h1><p className="mt-1 text-sm text-gray-600">News and updates from your school community.</p></div>{error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{isAppAdmin && <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full max-w-md rounded-lg border bg-white px-4 py-3"><option value="">Select a school</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}{mySchool.loading && !isAppAdmin ? <p className="py-10 text-center text-gray-500">Loading your school…</p> : !school ? <div className="rounded-xl bg-white p-12 text-center"><div className="text-5xl">📢</div><h2 className="mt-4 text-xl font-bold">{isAppAdmin ? 'Select a School' : 'Join a School'}</h2><p className="mt-2 text-gray-600">{isAppAdmin ? 'Choose a school to view its announcements.' : 'Join a school and get approved to view announcements.'}</p></div> : !privileges.has('VIEW_ANNOUNCEMENTS') ? <div className="rounded-xl bg-white p-12 text-center"><h2 className="text-xl font-bold">Members Only</h2><p className="mt-2 text-gray-600">You do not have announcement access for this school.</p></div> : <div className="rounded-xl border bg-white p-8 text-center shadow-sm"><div className="text-5xl">📢</div><h2 className="mt-4 text-2xl font-bold">{school.name}</h2><p className="mt-2 text-gray-600">Open the school noticeboard to read the latest updates.</p><button type="button" onClick={() => setOpen(true)} className="mt-6 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">View Announcements</button></div>}{open && school && <AnnouncementsManager schoolId={school.id} currentUser={user} canCreate={privileges.has('CREATE_ANNOUNCEMENT')} isSchoolAdmin={privileges.has('MANAGE_SCHOOL_MEMBERS')} onClose={() => setOpen(false)} />}</div>;
}
