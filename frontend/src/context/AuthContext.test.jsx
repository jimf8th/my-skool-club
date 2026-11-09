import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authContextResult = vi.hoisted(() => ({ current: null }));
const firebaseAuthState = vi.hoisted(() => ({ currentUser: null }));

const mocks = vi.hoisted(() => ({
  syncSession: vi.fn(),
  getUser: vi.fn(),
  logout: vi.fn(),
  setOnUnauthorized: vi.fn(),
  deleteAccount: vi.fn(),
  authStateHandler: { current: null },
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('../services/api', () => ({
  accountService: { deleteAccount: mocks.deleteAccount },
  authService: {
    syncSession: mocks.syncSession,
    getUser: mocks.getUser,
    logout: mocks.logout,
  },
  setOnUnauthorized: mocks.setOnUnauthorized,
}));

vi.mock('../services/firebase', () => ({
  firebaseAuth: firebaseAuthState,
  googleProvider: {},
  appleProvider: {},
  onAuthStateChanged: (_auth, handler) => {
    mocks.authStateHandler.current = handler;
    return () => {};
  },
  createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  signInWithPopup: mocks.signInWithPopup,
  sendEmailVerification: mocks.sendEmailVerification,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  signOut: mocks.signOut,
  updateProfile: mocks.updateProfile,
}));

import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const auth = useAuth();
  authContextResult.current = auth;
  const { loading, isAuthenticated, isAppAdmin, user } = auth;
  if (loading) return <span>loading</span>;
  return <span>{isAuthenticated ? `${user.firstName}:${isAppAdmin}` : 'signed-out'}</span>;
}

async function renderAuthContext() {
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(authContextResult.current).not.toBeNull());
  return authContextResult.current;
}

describe('AuthProvider session restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebaseAuthState.currentUser = null;
    mocks.authStateHandler.current = null;
  });

  it('establishes the app session for a verified Firebase user', async () => {
    const profile = { id: 1, firstName: 'Avery', appRole: 'APP_ADMIN', emailVerified: true };
    mocks.syncSession.mockResolvedValue(profile);

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(screen.getByText('loading')).toBeInTheDocument();
    mocks.authStateHandler.current({ uid: 'uid-1', emailVerified: true });
    await waitFor(() => expect(screen.getByText('Avery:true')).toBeInTheDocument());
    expect(mocks.syncSession).toHaveBeenCalledOnce();
  });

  it('does not authenticate when Firebase reports no user', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);

    mocks.authStateHandler.current(null);
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument());
    expect(mocks.syncSession).not.toHaveBeenCalled();
    expect(mocks.logout).toHaveBeenCalled();
  });

  it('falls back to cached data when a temporary outage hits', async () => {
    const profile = { id: 5, firstName: 'Jamie', appRole: 'APP_USER', emailVerified: true };
    mocks.getUser.mockReturnValue(profile);
    mocks.syncSession.mockRejectedValue({ message: 'offline' });

    render(<AuthProvider><Probe /></AuthProvider>);
    mocks.authStateHandler.current({ uid: 'uid-5', emailVerified: true });

    await waitFor(() => expect(screen.getByText('Jamie:false')).toBeInTheDocument());
  });

  it('requires verification before sign-in can finish', async () => {
    const auth = await renderAuthContext();
    mocks.signInWithEmailAndPassword.mockResolvedValue({ user: { emailVerified: false } });
    mocks.sendEmailVerification.mockResolvedValue();

    await expect(auth.login('user@example.com', 'secret')).resolves.toMatchObject({
      success: false,
      verificationRequired: true,
    });
    expect(mocks.sendEmailVerification).toHaveBeenCalledTimes(1);
  });

  it('shows friendly messages for invalid Firebase credentials', async () => {
    const auth = await renderAuthContext();
    mocks.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' });

    await expect(auth.login('user@example.com', 'secret')).resolves.toMatchObject({
      success: false,
      error: 'Incorrect email or password.',
    });
  });

  it('requests consent when the backend says the user must agree before signup', async () => {
    const auth = await renderAuthContext();
    mocks.signInWithPopup.mockResolvedValue();
    mocks.syncSession.mockRejectedValue({ response: { status: 428 } });

    await expect(auth.loginWithGoogle()).resolves.toMatchObject({
      success: false,
      consentRequired: true,
    });
  });

  it('returns a privacy-safe message for unknown-password-reset accounts', async () => {
    const auth = await renderAuthContext();
    mocks.sendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' });

    await expect(auth.forgotPassword('nope@example.com')).resolves.toMatchObject({
      success: true,
      message: 'If an eligible account exists, a password reset link has been sent.',
    });
  });

  it('returns a helpful error when no user is available to verify email', async () => {
    const auth = await renderAuthContext();

    await expect(auth.checkEmailVerified()).resolves.toMatchObject({
      success: false,
      error: 'Sign in first, then verify your email.',
    });
  });

  it('surfaces the unverified-email warning when the link has not been confirmed yet', async () => {
    const auth = await renderAuthContext();
    firebaseAuthState.currentUser = { reload: vi.fn().mockResolvedValue(), emailVerified: false };

    await expect(auth.checkEmailVerified()).resolves.toMatchObject({
      success: false,
      error: 'This email is not verified yet. Use the link we sent you.',
    });
  });

  it('deletes the account and logs the user out', async () => {
    const auth = await renderAuthContext();
    mocks.deleteAccount.mockResolvedValue();
    mocks.signOut.mockResolvedValue();

    await expect(auth.deleteAccount()).resolves.toMatchObject({ success: true });
    expect(mocks.signOut).toHaveBeenCalled();
  });
});
