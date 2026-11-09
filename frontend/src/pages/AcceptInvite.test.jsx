import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getInvitationDetails: vi.fn(),
  acceptInvitation: vi.fn(),
  navigate: vi.fn(),
  auth: { current: null },
}));

vi.mock('../services/api', () => ({
  authService: {
    getInvitationDetails: mocks.getInvitationDetails,
  },
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mocks.auth.current,
}));
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mocks.navigate,
}));

import AcceptInvite from './AcceptInvite';

describe('AcceptInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '#token=secure-invitation-token';
    mocks.getInvitationDetails.mockResolvedValue({
      firstName: 'Maya',
      lastName: 'Member',
      maskedEmail: 'm***@example.com',
    });
    mocks.acceptInvitation.mockResolvedValue({ success: true });
  });

  it('sends a signed-out visitor to create an account first', async () => {
    mocks.auth.current = {
      acceptInvitation: mocks.acceptInvitation,
      isAuthenticated: false,
      loading: false,
      user: null,
    };
    render(<AcceptInvite />);

    expect(await screen.findByText(/Welcome, Maya Member/)).toBeInTheDocument();
    expect(mocks.getInvitationDetails).toHaveBeenCalledWith('secure-invitation-token');
    expect(screen.getByRole('link', { name: /Create account/i })).toBeInTheDocument();
    expect(mocks.acceptInvitation).not.toHaveBeenCalled();
  });

  it('lets the signed-in invited member consent and accept', async () => {
    mocks.auth.current = {
      acceptInvitation: mocks.acceptInvitation,
      isAuthenticated: true,
      loading: false,
      user: { email: 'maya@example.com' },
    };
    render(<AcceptInvite />);

    expect(await screen.findByText(/Welcome, Maya Member/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Accept invitation/i }));

    await waitFor(() => expect(mocks.acceptInvitation).toHaveBeenCalledWith('secure-invitation-token'));
    expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('shows an error when the invitation link is missing required data', async () => {
    window.location.hash = '';
    mocks.auth.current = {
      acceptInvitation: mocks.acceptInvitation,
      isAuthenticated: false,
      loading: false,
      user: null,
    };
    render(<AcceptInvite />);

    expect(await screen.findByText('This invitation link is incomplete.')).toBeInTheDocument();
  });

  it('blocks acceptance until the invited member confirms the policies', async () => {
    mocks.auth.current = {
      acceptInvitation: mocks.acceptInvitation,
      isAuthenticated: true,
      loading: false,
      user: { email: 'maya@example.com' },
    };
    render(<AcceptInvite />);

    const form = (await screen.findByRole('button', { name: /Accept invitation/i })).closest('form');
    fireEvent.submit(form);

    expect(await screen.findByText('Confirm that you are at least 13 and accept the policies.')).toBeInTheDocument();
  });
});
