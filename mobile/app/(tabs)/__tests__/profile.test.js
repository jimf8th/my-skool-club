import React from 'react';
import { mockRouter } from 'expo-router';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../../test/test-utils';
import { useAuth } from '../../../context/AuthContext';
import {
  emailSupport,
  openAbout,
  openCommunityStandards,
  openPrivacyPolicy,
  openSupport,
  openTerms,
} from '../../../utils/legalLinks';
import ProfileScreen from '../profile';

jest.mock('expo-router');
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../utils/legalLinks', () => ({
  emailSupport: jest.fn(),
  openAbout: jest.fn(),
  openCommunityStandards: jest.fn(),
  openPrivacyPolicy: jest.fn(),
  openSupport: jest.fn(),
  openTerms: jest.fn(),
}));

const member = {
  id: 101,
  firstName: 'Maya',
  lastName: 'Member',
  email: 'member@example.com',
  appRole: 'USER',
};

describe('ProfileScreen', () => {
  let logout;
  let deleteAccount;

  beforeEach(() => {
    logout = jest.fn().mockResolvedValue(undefined);
    deleteAccount = jest.fn();
    useAuth.mockReturnValue({ user: member, logout, deleteAccount });
    Object.values(mockRouter).forEach((value) => value?.mockClear?.());
  });

  it('presents member initials and account information', () => {
    renderWithProviders(<ProfileScreen />);

    expect(screen.getByText('MM')).toBeOnTheScreen();
    expect(screen.getByText('Maya Member')).toBeOnTheScreen();
    expect(screen.getAllByText('member@example.com')).toHaveLength(2);
    expect(screen.getAllByText('Member')).toHaveLength(2);
    expect(screen.queryByText('App Administrator')).not.toBeOnTheScreen();
  });

  it('presents app administrators with the correct role and badge', () => {
    useAuth.mockReturnValue({
      user: { ...member, firstName: 'Avery', lastName: 'Admin', appRole: 'APP_ADMIN' },
      logout,
      deleteAccount,
    });

    renderWithProviders(<ProfileScreen />);

    expect(screen.getByText('AA')).toBeOnTheScreen();
    expect(screen.getByText('Administrator')).toBeOnTheScreen();
    expect(screen.getByText('App Administrator')).toBeOnTheScreen();
  });

  it('renders safe placeholders before user data is available', () => {
    useAuth.mockReturnValue({ user: null, logout, deleteAccount });
    renderWithProviders(<ProfileScreen />);

    expect(screen.getByText('?')).toBeOnTheScreen();
    expect(screen.getByText('Loading…')).toBeOnTheScreen();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('opens every legal and support destination', () => {
    renderWithProviders(<ProfileScreen />);

    fireEvent.press(screen.getByLabelText('Privacy Policy'));
    fireEvent.press(screen.getByLabelText('Terms of Service'));
    fireEvent.press(screen.getByLabelText('Community Standards'));
    fireEvent.press(screen.getByLabelText('About My Skool Club'));
    fireEvent.press(screen.getByLabelText('Help & Support'));
    fireEvent.press(screen.getByLabelText('Email Support'));

    expect(openPrivacyPolicy).toHaveBeenCalledTimes(1);
    expect(openTerms).toHaveBeenCalledTimes(1);
    expect(openCommunityStandards).toHaveBeenCalledTimes(1);
    expect(openAbout).toHaveBeenCalledTimes(1);
    expect(openSupport).toHaveBeenCalledTimes(1);
    expect(emailSupport).toHaveBeenCalledTimes(1);
  });

  it('opens the invite-a-friend form', () => {
    renderWithProviders(<ProfileScreen />);

    fireEvent.press(screen.getByLabelText('Invite a Friend'));

    expect(screen.getAllByText('Invite a Friend')).toHaveLength(2);
    expect(screen.getByLabelText('Friend first name')).toBeOnTheScreen();
    expect(screen.getByLabelText('Friend last name')).toBeOnTheScreen();
    expect(screen.getByLabelText('Friend email address')).toBeOnTheScreen();
  });

  it('logs out before returning to the login route', async () => {
    renderWithProviders(<ProfileScreen />);

    fireEvent.press(screen.getByText('Log Out'));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(mockRouter.replace).toHaveBeenCalledWith('/login');
  });

  it('requires both a password and exact DELETE confirmation', () => {
    renderWithProviders(<ProfileScreen />);
    fireEvent.press(screen.getByLabelText('Delete account'));

    const deleteButton = screen.getByLabelText('Confirm account deletion');
    expect(deleteButton).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('Current password'), 'Password1!');
    fireEvent.changeText(screen.getByLabelText('Type "DELETE" to confirm'), 'delete');
    expect(screen.getByLabelText('Confirm account deletion')).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('Type "DELETE" to confirm'), 'DELETE');
    expect(screen.getByLabelText('Confirm account deletion')).toBeEnabled();
  });

  it('submits account deletion and returns to login on success', async () => {
    deleteAccount.mockResolvedValue({ success: true });
    renderWithProviders(<ProfileScreen />);
    fireEvent.press(screen.getByLabelText('Delete account'));
    fireEvent.changeText(screen.getByLabelText('Current password'), 'Password1!');
    fireEvent.changeText(screen.getByLabelText('Type "DELETE" to confirm'), 'DELETE');

    fireEvent.press(screen.getByLabelText('Confirm account deletion'));

    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith('Password1!'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Delete your account?')).not.toBeOnTheScreen();
  });

  it('keeps the dialog open and displays deletion failures', async () => {
    deleteAccount.mockResolvedValue({ success: false, error: 'Inventory must be returned' });
    renderWithProviders(<ProfileScreen />);
    fireEvent.press(screen.getByLabelText('Delete account'));
    fireEvent.changeText(screen.getByLabelText('Current password'), 'Password1!');
    fireEvent.changeText(screen.getByLabelText('Type "DELETE" to confirm'), 'DELETE');
    fireEvent.press(screen.getByLabelText('Confirm account deletion'));

    expect(await screen.findByText('Inventory must be returned')).toBeOnTheScreen();
    expect(screen.getByText('Delete your account?')).toBeOnTheScreen();
  });

  it('clears sensitive values when deletion is cancelled', () => {
    renderWithProviders(<ProfileScreen />);
    fireEvent.press(screen.getByLabelText('Delete account'));
    fireEvent.changeText(screen.getByLabelText('Current password'), 'Password1!');
    fireEvent.changeText(screen.getByLabelText('Type "DELETE" to confirm'), 'DELETE');

    fireEvent.press(screen.getByText('Cancel'));
    fireEvent.press(screen.getByLabelText('Delete account'));

    expect(screen.getByLabelText('Current password').props.value).toBe('');
    expect(screen.getByLabelText('Type "DELETE" to confirm').props.value).toBe('');
  });
});
