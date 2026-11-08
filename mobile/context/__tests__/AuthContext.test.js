import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { accountAPI, authAPI, setOnUnauthorized } from '../../services/api';
import { clearAuthSession, getCachedUser, setCachedUser } from '../../utils/authStorage';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from '../../services/firebase';

jest.mock('../../services/api', () => ({
  accountAPI: { deleteAccount: jest.fn() },
  authAPI: { syncSession: jest.fn(), acceptInvitation: jest.fn() },
  setOnUnauthorized: jest.fn(),
}));
jest.mock('../../utils/authStorage', () => ({
  clearAuthSession: jest.fn().mockResolvedValue(undefined),
  getCachedUser: jest.fn().mockResolvedValue(null),
  setCachedUser: jest.fn().mockResolvedValue(undefined),
}));

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

const profile = {
  id: 101, email: 'member@example.com', firstName: 'Maya',
  lastName: 'Member', appRole: 'USER', emailVerified: true,
};

function triggerFirebaseState(user) {
  const handler = onAuthStateChanged.mock.calls.at(-1)?.[1];
  if (!handler) throw new Error('No onAuthStateChanged handler registered');
  return act(async () => { await handler(user); });
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAuthSession.mockResolvedValue(undefined);
    getCachedUser.mockResolvedValue(null);
    setCachedUser.mockResolvedValue(undefined);
    onAuthStateChanged.mockImplementation((_auth, cb) => { setTimeout(() => cb(null), 0); return () => {}; });
  });

  it('requires useAuth consumers to be wrapped by AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
  });

  it('finishes unauthenticated when Firebase reports no user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(clearAuthSession).toHaveBeenCalled();
  });

  it('establishes a session for a verified Firebase user', async () => {
    onAuthStateChanged.mockImplementation((_auth, cb) => {
      setTimeout(() => cb({ uid: 'uid-1' }), 0);
      return () => {};
    });
    authAPI.syncSession.mockResolvedValue(profile);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(authAPI.syncSession).toHaveBeenCalled();
    expect(setCachedUser).toHaveBeenCalledWith(profile);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(profile);
  });

  it('keeps the cached user during a network outage', async () => {
    onAuthStateChanged.mockImplementation((_auth, cb) => {
      setTimeout(() => cb({ uid: 'uid-1' }), 0);
      return () => {};
    });
    getCachedUser.mockResolvedValue(profile);
    authAPI.syncSession.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(profile);
  });

  it('registers the 401 callback and clears auth on trigger', async () => {
    onAuthStateChanged.mockImplementation((_auth, cb) => {
      setTimeout(() => cb({ uid: 'uid-1' }), 0);
      return () => {};
    });
    authAPI.syncSession.mockResolvedValue(profile);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    const unauthorizedHandler = setOnUnauthorized.mock.calls[0][0];
    act(() => unauthorizedHandler());

    expect(result.current.user).toBeNull();
  });

  it('signs out and clears session', async () => {
    onAuthStateChanged.mockImplementation((_auth, cb) => {
      setTimeout(() => cb({ uid: 'uid-1' }), 0);
      return () => {};
    });
    authAPI.syncSession.mockResolvedValue(profile);
    signOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await act(async () => { await result.current.logout(); });

    expect(signOut).toHaveBeenCalled();
    expect(clearAuthSession).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles email/password login including the unverified path', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    signInWithEmailAndPassword.mockResolvedValue({ user: { emailVerified: false } });
    sendEmailVerification.mockResolvedValue(undefined);
    authAPI.syncSession.mockResolvedValue(profile);

    let response;
    await act(async () => { response = await result.current.login('member@example.com', 'Password1!'); });
    expect(response).toEqual({ success: false, verificationRequired: true });
    expect(sendEmailVerification).toHaveBeenCalled();
  });

  it('fires sendPasswordResetEmail for forgot-password', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    sendPasswordResetEmail.mockResolvedValue(undefined);

    let response;
    await act(async () => { response = await result.current.forgotPassword('member@example.com'); });
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'member@example.com');
    expect(response.success).toBe(true);
  });

  it('deletes the account and signs out', async () => {
    onAuthStateChanged.mockImplementation((_auth, cb) => {
      setTimeout(() => cb({ uid: 'uid-1' }), 0);
      return () => {};
    });
    authAPI.syncSession.mockResolvedValue(profile);
    accountAPI.deleteAccount.mockResolvedValue(undefined);
    signOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    let response;
    await act(async () => { response = await result.current.deleteAccount(); });

    expect(accountAPI.deleteAccount).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(response.success).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });
});
