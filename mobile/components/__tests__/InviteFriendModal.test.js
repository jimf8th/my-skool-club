import React from 'react';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../test/test-utils';
import InviteFriendModal from '../InviteFriendModal';
import { invitationsAPI } from '../../services/api';

jest.mock('../../services/api', () => ({
  invitationsAPI: { inviteFriend: jest.fn() },
}));

describe('InviteFriendModal', () => {
  beforeEach(() => invitationsAPI.inviteFriend.mockReset());

  it('validates the form and sends a normalized invitation', async () => {
    invitationsAPI.inviteFriend.mockResolvedValue({ message: 'Invitation sent.' });
    renderWithProviders(<InviteFriendModal visible onDismiss={jest.fn()} />);

    fireEvent.press(screen.getByText('Send Invitation'));
    expect(screen.getByText('Enter your friend’s first name, last name, and email address.')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByLabelText('Friend first name'), '  Maya ');
    fireEvent.changeText(screen.getByLabelText('Friend last name'), ' Member  ');
    fireEvent.changeText(screen.getByLabelText('Friend email address'), ' MAYA@EXAMPLE.COM ');
    fireEvent.press(screen.getByText('Send Invitation'));

    await waitFor(() => expect(invitationsAPI.inviteFriend).toHaveBeenCalledWith({
      firstName: 'Maya',
      lastName: 'Member',
      email: 'maya@example.com',
    }));
    expect(await screen.findByText('Invitation sent.')).toBeOnTheScreen();
  });

  it('rejects malformed email addresses before calling the API', () => {
    renderWithProviders(<InviteFriendModal visible onDismiss={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText('Friend first name'), 'Maya');
    fireEvent.changeText(screen.getByLabelText('Friend last name'), 'Member');
    fireEvent.changeText(screen.getByLabelText('Friend email address'), 'not-an-email');
    fireEvent.press(screen.getByText('Send Invitation'));

    expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen();
    expect(invitationsAPI.inviteFriend).not.toHaveBeenCalled();
  });
});
