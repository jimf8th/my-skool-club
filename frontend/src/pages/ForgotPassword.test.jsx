import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const forgotPassword = vi.hoisted(() => vi.fn());

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ forgotPassword }),
}));

import ForgotPassword from './ForgotPassword';

describe('ForgotPassword', () => {
  it('shows a success message when a reset email has been queued', async () => {
    forgotPassword.mockResolvedValue({
      success: true,
      message: 'If an eligible account exists, a password reset link has been sent.',
    });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'member@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => expect(forgotPassword).toHaveBeenCalledWith('member@example.com'));
    expect(await screen.findByText('If an eligible account exists, a password reset link has been sent.')).toBeInTheDocument();
  });

  it('shows a friendly error when the reset request fails', async () => {
    forgotPassword.mockResolvedValue({
      success: false,
      error: 'Could not send the reset link.',
    });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'member@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('Could not send the reset link.')).toBeInTheDocument();
  });
});
