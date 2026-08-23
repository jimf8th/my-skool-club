import React, { useState } from 'react';
import Modal from './Modal';
import { invitationsService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteFriendModal({ onClose }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setError('');
    setMessage('');

    if (!firstName.trim() || !lastName.trim() || !normalizedEmail) {
      setError('Enter your friend’s first name, last name, and email address.');
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await invitationsService.inviteFriend({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
      });
      setMessage(response.message || 'Invitation sent.');
    } catch (requestError) {
      setError(getErrorMessage(
        requestError,
        'Could not send the invitation. Please try again.'
      ));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Invite a Friend" onClose={() => !submitting && onClose()} size="max-w-lg">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl" aria-hidden="true">
          👤+
        </div>
        <p className="text-sm leading-6 text-gray-600">
          We’ll email your friend a secure, 48-hour link to create their account.
        </p>
      </div>

      {message ? (
        <div className="space-y-5">
          <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
            {message}
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700">
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              First name
              <input
                aria-label="Friend first name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                maxLength={100}
                autoComplete="given-name"
                disabled={submitting}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Last name
              <input
                aria-label="Friend last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                maxLength={100}
                autoComplete="family-name"
                disabled={submitting}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700">
            Email address
            <input
              aria-label="Friend email address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={320}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" disabled={submitting} onClick={onClose} className="rounded-lg px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">
              Cancel
            </button>
            <button disabled={submitting} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Sending…' : 'Send Invitation'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
