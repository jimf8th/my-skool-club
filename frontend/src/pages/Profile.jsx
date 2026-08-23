import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import InviteFriendModal from '../components/InviteFriendModal';

export default function Profile() {
  const { user, logout, deleteAccount, isAppAdmin: isAdmin } = useAuth();
  const navigate = useNavigate();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Loading…';
  const confirmDelete = async (event) => {
    event.preventDefault();
    if (!deletePassword) return setDeleteError('Enter your current password.');
    if (deleteConfirmation !== 'DELETE') return setDeleteError('Type DELETE exactly to confirm.');
    setDeleting(true); setDeleteError('');
    const result = await deleteAccount(deletePassword);
    setDeleting(false);
    if (result.success) navigate('/login', { replace: true });
    else setDeleteError(result.error);
  };
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile</h1>

      {/* Profile Info Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center mb-6">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 ${isAdmin ? 'bg-purple-600' : 'bg-indigo-600'} rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold flex-shrink-0`}>
            {initials}
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
            <p className="text-gray-600">{user?.email ?? ''}</p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 mt-1.5 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                🛡️ App Administrator
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ProfileField label="First Name" value={user?.firstName ?? '—'} />
          <ProfileField label="Last Name"  value={user?.lastName  ?? '—'} />
          <ProfileField label="Email"      value={user?.email     ?? '—'} />
          <ProfileField label="Role"       value={isAdmin ? 'Administrator' : 'Member'} />
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Settings</h3>
        <div className="space-y-3">
          <SettingsButton
            icon="👤+"
            label="Invite a Friend"
            onClick={() => setInviteVisible(true)}
          />
          <SettingsButton
            icon="🔒"
            label="Privacy Policy"
            onClick={() => navigate('/privacy')}
          />
          <SettingsButton icon="📜" label="Terms of Service" onClick={() => navigate('/terms')} />
          <SettingsButton icon="🛡️" label="Community Standards" onClick={() => navigate('/community-standards')} />
          <SettingsButton icon="ℹ️" label="About My Skool Club" onClick={() => navigate('/about')} />
          <SettingsButton icon="💬" label="Help & Support" onClick={() => navigate('/support')} />
          <SettingsButton icon="✉️" label="Email Support" onClick={() => { window.location.href = 'mailto:support@myskoolclub.com?subject=My%20Skool%20Club%20Support'; }} />
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        Log Out
      </button>
      <button type="button" onClick={() => setDeleteVisible(true)} className="w-full rounded-lg px-4 py-3 font-semibold text-red-900 hover:bg-red-50">Delete Account</button>
      {inviteVisible && <InviteFriendModal onClose={() => setInviteVisible(false)} />}
      {deleteVisible && <Modal title="Delete your account?" onClose={() => !deleting && setDeleteVisible(false)} size="max-w-lg"><form onSubmit={confirmDelete} className="space-y-4"><div className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-900"><p>This permanently removes your profile, memberships, RSVPs, notifications, events, announcements, and draft invoices. Finalized accounting and asset history may be retained without your identity.</p><p className="mt-2 font-semibold">You must return any checked-out inventory before deletion.</p></div><input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder="Current password" autoComplete="current-password" className="w-full rounded-lg border px-4 py-3" /><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value.toUpperCase())} placeholder='Type "DELETE" to confirm' className="w-full rounded-lg border px-4 py-3" />{deleteError && <p className="text-sm text-red-700">{deleteError}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={deleting} onClick={() => setDeleteVisible(false)} className="px-4 py-2 font-semibold">Cancel</button><button disabled={deleting || !deletePassword || deleteConfirmation !== 'DELETE'} className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{deleting ? 'Deleting…' : 'Delete Account'}</button></div></form></Modal>}
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="pb-4 border-b border-gray-200 last:border-0">
      <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
      <p className="text-base text-gray-900">{value}</p>
    </div>
  );
}

function SettingsButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-default"
    >
      <div className="flex items-center">
        <span className="text-2xl mr-3">{icon}</span>
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <svg
        className="w-5 h-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
