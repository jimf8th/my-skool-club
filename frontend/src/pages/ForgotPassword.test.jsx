import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    forgotPassword: mocks.forgotPassword,
  }),
}));

import ForgotPassword from './ForgotPassword';

describe('ForgotPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows success message from forgotPassword response', async () => {
    mocks.forgotPassword.mockResolvedValue({
      success: true,
      message: 'If an eligible account exists, a password reset link has been sent.',
    });

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => expect(mocks.forgotPassword).toHaveBeenCalledWith('user@example.com'));
    expect(await screen.findByText('If an eligible account exists, a password reset link has been sent.')).toBeInTheDocument();
    expect(screen.queryByText('Network error.')).not.toBeInTheDocument();
  });

  it('shows error message when forgotPassword fails', async () => {
    mocks.forgotPassword.mockResolvedValue({
      success: false,
      error: 'Network error.',
    });

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('Network error.')).toBeInTheDocument();
  });
});
