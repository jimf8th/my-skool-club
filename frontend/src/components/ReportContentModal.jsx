import React, { useState } from 'react';
import Modal from './Modal';
import { contentReportsService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

const REASONS = [
  ['HARASSMENT', 'Harassment or bullying'],
  ['HATE_SPEECH', 'Hate speech'],
  ['SEXUAL_CONTENT', 'Sexual content'],
  ['VIOLENCE', 'Violence or threat'],
  ['SELF_HARM', 'Self-harm'],
  ['SPAM', 'Spam or scam'],
  ['PERSONAL_INFORMATION', 'Personal information'],
  ['IMPERSONATION', 'Impersonation'],
  ['OTHER', 'Other'],
];

export default function ReportContentModal({ contentType, contentId, onClose, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason) return setError('Choose a reason.');
    setSaving(true);
    setError('');
    try {
      await contentReportsService.create(contentType, contentId, reason, details.trim() || null);
      onSubmitted?.();
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not submit this report.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Report content" onClose={onClose} size="max-w-lg">
      <p className="mb-4 text-sm text-gray-600">Reports are confidential and reviewed by My Skool Club app administrators.</p>
      <div className="flex flex-wrap gap-2">
        {REASONS.map(([value, label]) => (
          <button key={value} type="button" onClick={() => setReason(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${reason === value ? 'border-red-600 bg-red-50 text-red-800' : 'border-gray-300 text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>
      <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={4} placeholder="Optional details for the reviewer" className="mt-4 w-full rounded-xl border border-gray-300 p-3" />
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 font-semibold text-gray-700">Cancel</button>
        <button type="button" onClick={submit} disabled={saving || !reason} className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {saving ? 'Submitting…' : 'Submit Report'}
        </button>
      </div>
    </Modal>
  );
}
