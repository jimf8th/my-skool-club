import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const inviteFriend = vi.hoisted(() => vi.fn());
vi.mock('../services/api', () => ({ invitationsService: { inviteFriend } }));

import InviteFriendModal from './InviteFriendModal';

describe('InviteFriendModal', () => {
  beforeEach(() => inviteFriend.mockReset());

  it('validates the email before calling the backend', () => {
    render(<InviteFriendModal onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Friend first name'), { target: { value: 'Maya' } });
    fireEvent.change(screen.getByLabelText('Friend last name'), { target: { value: 'Member' } });
    fireEvent.change(screen.getByLabelText('Friend email address'), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(inviteFriend).not.toHaveBeenCalled();
  });

  it('normalizes and submits an invitation, then confirms success', async () => {
    inviteFriend.mockResolvedValue({ message: 'If the email is eligible, an invitation has been sent.' });
    render(<InviteFriendModal onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Friend first name'), { target: { value: ' Maya ' } });
    fireEvent.change(screen.getByLabelText('Friend last name'), { target: { value: ' Member ' } });
    fireEvent.change(screen.getByLabelText('Friend email address'), { target: { value: ' Friend@Example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }));

    await waitFor(() => expect(inviteFriend).toHaveBeenCalledWith({
      firstName: 'Maya',
      lastName: 'Member',
      email: 'friend@example.com',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('invitation has been sent');
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
  });
});
