import React, { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import ReportContentModal from './ReportContentModal';
import { announcementsService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

export default function AnnouncementsManager({ schoolId, currentUser, canCreate, isSchoolAdmin, onClose }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAnnouncements(await announcementsService.list(schoolId));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to load announcements.'));
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const createAnnouncement = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return setError('Title and message are required.');
    setSaving(true);
    setError('');
    try {
      await announcementsService.create(schoolId, { title: form.title.trim(), body: form.body.trim() });
      setForm({ title: '', body: '' });
      setCreating(false);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to post announcement.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (announcement) => {
    if (!window.confirm(`Delete "${announcement.title}"? This cannot be undone.`)) return;
    try {
      await announcementsService.remove(schoolId, announcement.id);
      setAnnouncements((items) => items.filter((item) => item.id !== announcement.id));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to delete announcement.'));
    }
  };

  return (
    <>
      <Modal title={creating ? 'New Announcement' : 'Announcements'} onClose={onClose}>
        {notice && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {creating ? (
          <form onSubmit={createAnnouncement} className="space-y-4">
            <input autoFocus value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="Announcement title" className="w-full rounded-lg border border-gray-300 px-4 py-3" />
            <textarea rows={6} value={form.body} onChange={(event) => setForm((value) => ({ ...value, body: event.target.value }))} placeholder="Write your announcement…" className="w-full rounded-lg border border-gray-300 px-4 py-3" />
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setCreating(false)} className="rounded-lg px-4 py-2 font-semibold text-gray-700">Cancel</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Posting…' : 'Post Announcement'}</button></div>
          </form>
        ) : (
          <>
            {canCreate && <button type="button" onClick={() => setCreating(true)} className="mb-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">+ New Announcement</button>}
            {loading ? <p className="py-8 text-center text-gray-500">Loading…</p> : announcements.length === 0 ? <p className="rounded-xl bg-gray-50 p-8 text-center text-gray-500">No announcements yet.</p> : (
              <div className="divide-y rounded-xl border">
                {announcements.map((item) => {
                  const canDelete = isSchoolAdmin || item.createdByUserId === currentUser?.id;
                  return <article key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-4"><div><h3 className="font-bold text-gray-900">{item.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{item.body}</p><p className="mt-3 text-xs text-gray-500">{item.createdByName} · {new Date(item.createdAt).toLocaleString()}</p></div><button type="button" onClick={() => canDelete ? remove(item) : setReportTarget(item)} className={`text-sm font-semibold ${canDelete ? 'text-red-700' : 'text-gray-600'}`}>{canDelete ? 'Delete' : 'Report'}</button></div>
                  </article>;
                })}
              </div>
            )}
          </>
        )}
      </Modal>
      {reportTarget && <ReportContentModal contentType="ANNOUNCEMENT" contentId={reportTarget.id} onClose={() => setReportTarget(null)} onSubmitted={() => setNotice('Report submitted for administrator review.')} />}
    </>
  );
}
