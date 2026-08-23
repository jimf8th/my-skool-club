import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getInvitationDetails: vi.fn(),
  sendInvitationCode: vi.fn(),
  acceptInvitation: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../services/api', () => ({
  authService: {
    getInvitationDetails: mocks.getInvitationDetails,
    sendInvitationCode: mocks.sendInvitationCode,
  },
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ acceptInvitation: mocks.acceptInvitation }),
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
    mocks.sendInvitationCode.mockResolvedValue({
      message: 'A six-digit verification code was sent to the invited email.',
    });
    mocks.acceptInvitation.mockResolvedValue({ success: true });
  });

  it('requires the separately emailed code and creates the invited account', async () => {
    render(<AcceptInvite />);

    expect(await screen.findByText(/Welcome, Maya Member/)).toBeInTheDocument();
    expect(mocks.getInvitationDetails).toHaveBeenCalledWith('secure-invitation-token');

    fireEvent.click(screen.getByRole('button', { name: /Email my verification code/i }));
    expect(await screen.findByText(/six-digit verification code was sent/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Six-digit code'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPassword1!' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'StrongPassword1!' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(mocks.acceptInvitation).toHaveBeenCalledWith({
      token: 'secure-invitation-token',
      code: '123456',
      password: 'StrongPassword1!',
      ageConfirmed: true,
      acceptedTerms: true,
    }));
    expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
