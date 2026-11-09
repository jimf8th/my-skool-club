import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  firebaseAuth: {},
  syncSession: vi.fn(),
  getUser: vi.fn(),
  updateStoredUser: vi.fn(),
  acceptInvitation: vi.fn(),
  deleteAccount: vi.fn(),
  logout: vi.fn(),
  setOnUnauthorized: vi.fn(),
  authStateHandler: { current: null },
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('../services/api', () => ({
  accountService: {
    deleteAccount: mocks.deleteAccount,
  },
  authService: {
    syncSession: mocks.syncSession,
    getUser: mocks.getUser,
    updateStoredUser: mocks.updateStoredUser,
    acceptInvitation: mocks.acceptInvitation,
    logout: mocks.logout,
  },
  setOnUnauthorized: mocks.setOnUnauthorized,
}));

vi.mock('../services/firebase', () => ({
  firebaseAuth: mocks.firebaseAuth,
  googleProvider: {},
  appleProvider: {},
  onAuthStateChanged: (_auth, handler) => {
    mocks.authStateHandler.current = handler;
    return () => {};
  },
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  signInWithPopup: vi.fn(),
  sendEmailVerification: mocks.sendEmailVerification,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  signOut: mocks.signOut,
  updateProfile: vi.fn(),
}));

import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { loading, isAuthenticated, isAppAdmin, user } = useAuth();
  if (loading) return <span>loading</span>;
  return <span>{isAuthenticated ? `${user.firstName}:${isAppAdmin}` : 'signed-out'}</span>;
}

function AuthMethodsProbe({ onReady }) {
  const auth = useAuth();
  onReady(auth);
  return null;
}

describe('AuthProvider session restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.firebaseAuth.currentUser = null;
    mocks.sendEmailVerification.mockResolvedValue();
    mocks.sendPasswordResetEmail.mockResolvedValue();
    mocks.signOut.mockResolvedValue();
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

  it('returns verificationRequired when login email is unverified', async () => {
    let auth;
    mocks.signInWithEmailAndPassword.mockResolvedValue({
      user: { emailVerified: false },
    });
    mocks.sendEmailVerification.mockResolvedValue();

    render(<AuthProvider><AuthMethodsProbe onReady={(value) => { auth = value; }} /></AuthProvider>);
    mocks.authStateHandler.current(null);
    await waitFor(() => expect(auth?.loading).toBe(false));

    const result = await auth.login('user@example.com', 'password');

    expect(result).toEqual({ success: false, verificationRequired: true });
    expect(mocks.sendEmailVerification).toHaveBeenCalledOnce();
    expect(mocks.syncSession).not.toHaveBeenCalled();
  });

  it('returns generic success for forgot password when account does not exist', async () => {
    let auth;
    mocks.sendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' });

    render(<AuthProvider><AuthMethodsProbe onReady={(value) => { auth = value; }} /></AuthProvider>);
    mocks.authStateHandler.current(null);
    await waitFor(() => expect(auth?.loading).toBe(false));

    const result = await auth.forgotPassword('unknown@example.com');

    expect(result).toEqual({
      success: true,
      message: 'If an eligible account exists, a password reset link has been sent.',
    });
  });

  it('fails checkEmailVerified when no firebase user is present', async () => {
    let auth;
    render(<AuthProvider><AuthMethodsProbe onReady={(value) => { auth = value; }} /></AuthProvider>);
    mocks.authStateHandler.current(null);
    await waitFor(() => expect(auth?.loading).toBe(false));

    const result = await auth.checkEmailVerified();

    expect(result).toEqual({
      success: false,
      error: 'Sign in first, then verify your email.',
    });
  });

  it('supports verified email checks and session establishment', async () => {
    let auth;
    const firebaseUser = {
      emailVerified: false,
      reload: vi.fn(async () => {
        firebaseUser.emailVerified = true;
      }),
      getIdToken: vi.fn().mockResolvedValue('token'),
    };
    mocks.firebaseAuth.currentUser = firebaseUser;
    mocks.syncSession.mockResolvedValue({
      id: 2, firstName: 'Sam', appRole: 'MEMBER', emailVerified: true,
    });

    render(<AuthProvider><AuthMethodsProbe onReady={(value) => { auth = value; }} /></AuthProvider>);
    mocks.authStateHandler.current(null);
    await waitFor(() => expect(auth?.loading).toBe(false));

    const result = await auth.checkEmailVerified();

    expect(firebaseUser.reload).toHaveBeenCalledOnce();
    expect(firebaseUser.getIdToken).toHaveBeenCalledWith(true);
    expect(result).toEqual({ success: true });
  });

  it('returns validation-safe errors for resendVerification and forgotPassword failures', async () => {
    let auth;
    render(<AuthProvider><AuthMethodsProbe onReady={(value) => { auth = value; }} /></AuthProvider>);
    mocks.authStateHandler.current(null);
    await waitFor(() => expect(auth?.loading).toBe(false));

    const noUserResult = await auth.resendVerification();
    expect(noUserResult).toEqual({
      success: false,
      error: 'Sign in first to request a new link.',
    });

    const firebaseUser = { uid: 'x' };
    mocks.firebaseAuth.currentUser = firebaseUser;
    mocks.sendEmailVerification.mockRejectedValueOnce({
      code: 'auth/network-request-failed',
    });
    const resendResult = await auth.resendVerification();
    expect(resendResult).toEqual({
      success: false,
      error: 'Network error. Check your connection and try again.',
    });

    mocks.sendPasswordResetEmail.mockRejectedValueOnce({
      code: 'auth/network-request-failed',
    });
    const forgotPasswordResult = await auth.forgotPassword('user@example.com');
    expect(forgotPasswordResult).toEqual({
      success: false,
      error: 'Network error. Check your connection and try again.',
    });
  });

  it('handles account deletion success and API errors', async () => {
    let auth;
    render(<AuthProvider><AuthMethodsProbe onReady={(value) => { auth = value; }} /></AuthProvider>);
    mocks.authStateHandler.current(null);
    await waitFor(() => expect(auth?.loading).toBe(false));

    mocks.deleteAccount.mockResolvedValueOnce();
    const success = await auth.deleteAccount();
    expect(success).toEqual({ success: true });
    expect(mocks.signOut).toHaveBeenCalled();
    expect(mocks.logout).toHaveBeenCalled();

    mocks.deleteAccount.mockRejectedValueOnce({
      response: { data: { message: 'Delete denied' } },
    });
    const failure = await auth.deleteAccount();
    expect(failure).toEqual({
      success: false,
      error: 'Delete denied',
    });
  });

  it('supports invitation acceptance success and failure flows', async () => {
    let auth;
    render(<AuthProvider><AuthMethodsProbe onReady={(value) => { auth = value; }} /></AuthProvider>);
    mocks.authStateHandler.current(null);
    await waitFor(() => expect(auth?.loading).toBe(false));

    mocks.acceptInvitation.mockResolvedValueOnce({
      id: 42,
      firstName: 'Kai',
      appRole: 'MEMBER',
      emailVerified: true,
    });
    const success = await auth.acceptInvitation('token-1');
    expect(success).toEqual({ success: true });
    await waitFor(() => expect(auth.user?.firstName).toBe('Kai'));

    mocks.acceptInvitation.mockRejectedValueOnce(new Error('nope'));
    const failure = await auth.acceptInvitation('token-2');
    expect(failure).toEqual({
      success: false,
      error: 'Could not accept the invitation.',
    });
  });

  it('surfaces consentRequired when completing consent still gets 428', async () => {
    let auth;
    mocks.syncSession.mockRejectedValueOnce({
      response: { status: 428, data: { message: 'Consent required' } },
    });

    render(<AuthProvider><AuthMethodsProbe onReady={(value) => { auth = value; }} /></AuthProvider>);
    mocks.authStateHandler.current(null);
    await waitFor(() => expect(auth?.loading).toBe(false));

    const result = await auth.completeConsent();

    expect(result).toEqual({
      success: false,
      consentRequired: true,
      error: 'Consent required',
    });
    expect(mocks.syncSession).toHaveBeenCalledWith({ ageConfirmed: true, acceptedTerms: true });
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const renderOutsideProvider = () => render(<AuthMethodsProbe onReady={() => {}} />);
    expect(renderOutsideProvider).toThrow('useAuth must be used within AuthProvider');
  });
});
