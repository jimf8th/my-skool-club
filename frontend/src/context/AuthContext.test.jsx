import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  syncSession: vi.fn(),
  getUser: vi.fn(),
  updateStoredUser: vi.fn(),
  logout: vi.fn(),
  setOnUnauthorized: vi.fn(),
  authStateHandler: { current: null },
}));

vi.mock('../services/api', () => ({
  accountService: {},
  authService: {
    syncSession: mocks.syncSession,
    getUser: mocks.getUser,
    updateStoredUser: mocks.updateStoredUser,
    logout: mocks.logout,
  },
  setOnUnauthorized: mocks.setOnUnauthorized,
}));

vi.mock('../services/firebase', () => ({
  firebaseAuth: {},
  googleProvider: {},
  appleProvider: {},
  onAuthStateChanged: (_auth, handler) => {
    mocks.authStateHandler.current = handler;
    return () => {};
  },
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { loading, isAuthenticated, isAppAdmin, user } = useAuth();
  if (loading) return <span>loading</span>;
  return <span>{isAuthenticated ? `${user.firstName}:${isAppAdmin}` : 'signed-out'}</span>;
}

describe('AuthProvider session restoration', () => {
  beforeEach(() => vi.clearAllMocks());

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
});
