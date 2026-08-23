import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { accountAPI, authAPI, setOnUnauthorized } from '../../services/api';
import {
  clearAuthSession,
  getAuthToken,
  getCachedUser,
  setAuthSession,
  setCachedUser,
} from '../../utils/authStorage';

jest.mock('../../services/api', () => ({
  accountAPI: {
    getCurrentAccount: jest.fn(),
    deleteAccount: jest.fn(),
  },
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    acceptInvitation: jest.fn(),
  },
  setOnUnauthorized: jest.fn(),
}));

jest.mock('../../utils/authStorage', () => ({
  clearAuthSession: jest.fn(),
  getAuthToken: jest.fn(),
  getCachedUser: jest.fn(),
  setAuthSession: jest.fn(),
  setCachedUser: jest.fn(),
}));

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
const currentUser = {
  id: 101,
  email: 'member@example.com',
  firstName: 'Maya',
  lastName: 'Member',
  appRole: 'USER',
};

function apiError(status, message) {
  return { response: status ? { status, data: message ? { message } : undefined } : undefined };
}

describe('AuthContext', () => {
  let consoleError;

  beforeEach(() => {
    getAuthToken.mockReset().mockResolvedValue(null);
    getCachedUser.mockReset().mockResolvedValue(null);
    setAuthSession.mockReset().mockResolvedValue(undefined);
    setCachedUser.mockReset().mockResolvedValue(undefined);
    clearAuthSession.mockReset().mockResolvedValue(undefined);
    accountAPI.getCurrentAccount.mockReset();
    accountAPI.deleteAccount.mockReset().mockResolvedValue(undefined);
    authAPI.login.mockReset();
    authAPI.register.mockReset();
    authAPI.verifyEmail.mockReset();
    authAPI.resendVerification.mockReset();
    authAPI.acceptInvitation.mockReset();
    setOnUnauthorized.mockClear();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('requires useAuth consumers to be wrapped by AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
  });

  it('finishes unauthenticated when no stored token exists', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(accountAPI.getCurrentAccount).not.toHaveBeenCalled();
  });

  it('validates a stored token with the backend before restoring the session', async () => {
    getAuthToken.mockResolvedValue('stored-jwt');
    getCachedUser.mockResolvedValue({ ...currentUser, firstName: 'Stale' });
    accountAPI.getCurrentAccount.mockResolvedValue(currentUser);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(accountAPI.getCurrentAccount).toHaveBeenCalledTimes(1);
    expect(setCachedUser).toHaveBeenCalledWith(currentUser);
    expect(result.current.token).toBe('stored-jwt');
    expect(result.current.user).toEqual(currentUser);
  });

  it('does not restore an expired token after a 401 validation response', async () => {
    getAuthToken.mockResolvedValue('expired-jwt');
    getCachedUser.mockResolvedValue(currentUser);
    accountAPI.getCurrentAccount.mockRejectedValue(apiError(401, 'Expired'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('uses the cached user during a temporary validation outage', async () => {
    getAuthToken.mockResolvedValue('offline-jwt');
    getCachedUser.mockResolvedValue(currentUser);
    accountAPI.getCurrentAccount.mockRejectedValue(new Error('Network unavailable'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.token).toBe('offline-jwt');
    expect(result.current.user).toEqual(currentUser);
  });

  it('does not restore a token during an outage when no user is cached', async () => {
    getAuthToken.mockResolvedValue('offline-jwt');
    accountAPI.getCurrentAccount.mockRejectedValue(new Error('Network unavailable'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('suppresses storage initialization details and always ends loading', async () => {
    getAuthToken.mockRejectedValue(new Error('SecureStore unavailable'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(consoleError).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('registers a 401 callback that clears in-memory authentication', async () => {
    getAuthToken.mockResolvedValue('stored-jwt');
    accountAPI.getCurrentAccount.mockResolvedValue(currentUser);
    const { result, unmount } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    const unauthorizedHandler = setOnUnauthorized.mock.calls[0][0];

    act(() => unauthorizedHandler());

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    unmount();
    expect(setOnUnauthorized).toHaveBeenLastCalledWith(null);
  });

  it('logs in, persists the response, and exposes the authenticated user', async () => {
    authAPI.login.mockResolvedValue({ token: 'new-jwt', ...currentUser });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response;
    await act(async () => { response = await result.current.login('member@example.com', 'Password1!'); });

    expect(authAPI.login).toHaveBeenCalledWith('member@example.com', 'Password1!');
    expect(setAuthSession).toHaveBeenCalledWith('new-jwt', currentUser);
    expect(response).toEqual({ success: true });
    expect(result.current.user).toEqual(currentUser);
    expect(result.current.token).toBe('new-jwt');
  });

  it.each([
    [403, 'Verify your email', true],
    [401, undefined, false],
  ])('normalizes login failure status %s', async (status, message, verificationRequired) => {
    authAPI.login.mockRejectedValue(apiError(status, message));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response;
    await act(async () => { response = await result.current.login('member@example.com', 'bad'); });

    expect(response).toEqual({
      success: false,
      error: message || 'Login failed. Please try again.',
      status,
      verificationRequired,
    });
  });

  it('returns a verification-required registration without signing in', async () => {
    authAPI.register.mockResolvedValue({ email: currentUser.email, verificationRequired: true });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response;
    await act(async () => { response = await result.current.register({ ...currentUser, password: 'Password1!' }); });

    expect(response).toEqual({ success: true, email: currentUser.email, verificationRequired: true });
    expect(authAPI.login).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('automatically signs in registrations that do not require verification', async () => {
    authAPI.register.mockResolvedValue({ email: currentUser.email, verificationRequired: false });
    authAPI.login.mockResolvedValue({ token: 'registered-jwt', ...currentUser });
    const registration = { ...currentUser, password: 'Password1!' };
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response;
    await act(async () => { response = await result.current.register(registration); });

    expect(authAPI.login).toHaveBeenCalledWith(currentUser.email, registration.password);
    expect(setAuthSession).toHaveBeenCalledWith('registered-jwt', currentUser);
    expect(response.verificationRequired).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns registration failures without changing authentication', async () => {
    authAPI.register.mockRejectedValue(apiError(409, 'Email already exists'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response;
    await act(async () => { response = await result.current.register({ email: currentUser.email }); });

    expect(response).toEqual({ success: false, error: 'Email already exists' });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('verifies an email and persists the authenticated session', async () => {
    authAPI.verifyEmail.mockResolvedValue({ token: 'verified-jwt', ...currentUser });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response;
    await act(async () => { response = await result.current.verifyEmail(currentUser.email, '123456'); });

    expect(response).toEqual({ success: true });
    expect(setAuthSession).toHaveBeenCalledWith('verified-jwt', currentUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('normalizes email verification failures', async () => {
    authAPI.verifyEmail.mockRejectedValue(apiError(400));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.verifyEmail(currentUser.email, '000000')).resolves.toEqual({
      success: false,
      error: 'Verification failed. Please try again.',
    });
  });

  it('returns resend success messages and normalized failures', async () => {
    authAPI.resendVerification.mockResolvedValueOnce({ message: 'Code sent' });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.resendVerification(currentUser.email)).resolves.toEqual({ success: true, message: 'Code sent' });

    authAPI.resendVerification.mockRejectedValueOnce(apiError(429, 'Wait before retrying'));
    await expect(result.current.resendVerification(currentUser.email)).resolves.toEqual({ success: false, error: 'Wait before retrying' });
  });

  it('accepts an invitation and persists the authenticated session', async () => {
    authAPI.acceptInvitation.mockResolvedValue({ token: 'invited-jwt', ...currentUser });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const invitation = { token: 'invite', code: '123456', password: 'StrongPassword1!' };

    let response;
    await act(async () => { response = await result.current.acceptInvitation(invitation); });

    expect(authAPI.acceptInvitation).toHaveBeenCalledWith(invitation);
    expect(setAuthSession).toHaveBeenCalledWith('invited-jwt', currentUser);
    expect(response).toEqual({ success: true });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logs out by clearing persistence and in-memory state', async () => {
    authAPI.login.mockResolvedValue({ token: 'jwt', ...currentUser });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.login(currentUser.email, 'Password1!'); });

    await act(async () => { await result.current.logout(); });

    expect(clearAuthSession).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('suppresses logout cleanup details without crashing', async () => {
    clearAuthSession.mockRejectedValue(new Error('Storage error'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.logout(); });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('does not clear authentication when server-side account deletion fails', async () => {
    accountAPI.deleteAccount.mockRejectedValue({
      response: { status: 403, data: { message: 'Password is incorrect' } },
      config: { method: 'delete', url: '/account' },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.deleteAccount('wrong')).resolves.toEqual({
      success: false,
      error: 'Password is incorrect. Please try again.',
    });
    expect(clearAuthSession).not.toHaveBeenCalled();
  });

  it('clears authentication after successful account deletion even if local cleanup fails', async () => {
    authAPI.login.mockResolvedValue({ token: 'jwt', ...currentUser });
    clearAuthSession.mockRejectedValue(new Error('Storage error'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.login(currentUser.email, 'Password1!'); });

    let response;
    await act(async () => { response = await result.current.deleteAccount('Password1!'); });

    expect(accountAPI.deleteAccount).toHaveBeenCalledWith('Password1!');
    expect(response).toEqual({ success: true });
    expect(result.current.isAuthenticated).toBe(false);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
