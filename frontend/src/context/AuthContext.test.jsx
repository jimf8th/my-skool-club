import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentAccount: vi.fn(),
  isAuthenticated: vi.fn(),
  getUser: vi.fn(),
  updateStoredUser: vi.fn(),
  logout: vi.fn(),
  setOnUnauthorized: vi.fn(),
}));

vi.mock('../services/api', () => ({
  accountService: { getCurrentAccount: mocks.getCurrentAccount },
  authService: {
    isAuthenticated: mocks.isAuthenticated,
    getUser: mocks.getUser,
    updateStoredUser: mocks.updateStoredUser,
    logout: mocks.logout,
  },
  setOnUnauthorized: mocks.setOnUnauthorized,
}));

import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { loading, isAuthenticated, isAppAdmin, user } = useAuth();
  if (loading) return <span>loading</span>;
  return <span>{isAuthenticated ? `${user.firstName}:${isAppAdmin}` : 'signed-out'}</span>;
}

describe('AuthProvider session restoration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates a cached session and replaces cached account data', async () => {
    const current = { id: 1, firstName: 'Avery', appRole: 'APP_ADMIN' };
    mocks.isAuthenticated.mockReturnValue(true);
    mocks.getUser.mockReturnValue({ id: 1, firstName: 'Old', appRole: 'APP_USER' });
    mocks.getCurrentAccount.mockResolvedValue(current);

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Avery:true')).toBeInTheDocument());
    expect(mocks.getCurrentAccount).toHaveBeenCalledOnce();
    expect(mocks.updateStoredUser).toHaveBeenCalledWith(current);
  });

  it('does not authenticate when there is no stored token', async () => {
    mocks.isAuthenticated.mockReturnValue(false);
    mocks.getUser.mockReturnValue(null);

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument());
    expect(mocks.getCurrentAccount).not.toHaveBeenCalled();
  });
});
