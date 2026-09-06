import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '../../../test/test-utils';
import { useAuth } from '../../../context/AuthContext';
import { schoolRequestsAPI } from '../../../services/api';
import SchoolRequestsScreen from '../school-requests';

jest.mock('expo-router');
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../services/api', () => ({
  schoolRequestsAPI: { list: jest.fn(), approve: jest.fn(), reject: jest.fn() },
}));

const request = {
  id: 42, status: 'PENDING', firstName: 'Maya', lastName: 'Member',
  adminEmail: 'maya@example.com', contactPhone: '602-555-0101',
  schoolName: 'Desert View School', description: 'A public school.',
  address: '100 Main Street', city: 'Phoenix', state: 'Arizona', postalCode: '85001',
  schoolPhone: '602-555-0102', website: 'https://desertview.example',
  createdAt: '2026-08-22T12:00:00',
};

describe('SchoolRequestsScreen', () => {
  let alertSpy;

  beforeEach(() => {
    useAuth.mockReturnValue({ user: { appRole: 'APP_ADMIN' } });
    schoolRequestsAPI.list.mockReset().mockResolvedValue([request]);
    schoolRequestsAPI.approve.mockReset().mockResolvedValue({ ...request, status: 'APPROVED' });
    schoolRequestsAPI.reject.mockReset().mockResolvedValue({ ...request, status: 'REJECTED' });
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('loads pending requests and approves only after confirmation', async () => {
    renderWithProviders(<SchoolRequestsScreen />);

    expect(await screen.findByText('Desert View School')).toBeOnTheScreen();
    expect(schoolRequestsAPI.list).toHaveBeenCalledWith('PENDING');
    fireEvent.press(screen.getByText('Approve'));
    const confirm = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Approve');
    await act(async () => confirm.onPress());

    await waitFor(() => expect(schoolRequestsAPI.approve).toHaveBeenCalledWith(42));
    expect(schoolRequestsAPI.list).toHaveBeenCalledTimes(2);
  });

  it('requires and sends a rejection reason', async () => {
    renderWithProviders(<SchoolRequestsScreen />);
    await screen.findByText('Desert View School');
    fireEvent.press(screen.getByText('Reject'));
    fireEvent.press(screen.getByText('Reject request'));
    expect(alertSpy).toHaveBeenCalledWith('Reason required', expect.any(String));

    fireEvent.changeText(screen.getByPlaceholderText('Reason for rejection'), 'School details could not be verified.');
    fireEvent.press(screen.getByText('Reject request'));

    await waitFor(() => expect(schoolRequestsAPI.reject).toHaveBeenCalledWith(
      42, 'School details could not be verified.'
    ));
  });
});
