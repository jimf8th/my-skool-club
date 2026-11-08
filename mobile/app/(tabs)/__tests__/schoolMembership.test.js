import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '../../../test/test-utils';
import { useAuth } from '../../../context/AuthContext';
import { schoolsAPI } from '../../../services/api';
import EventsModal from '../../../components/EventsModal';
import AnnouncementsModal from '../../../components/AnnouncementsModal';
import SchoolsScreen from '../schools';

jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../services/api', () => ({
  schoolsAPI: {
    addAdmin: jest.fn(), approveMember: jest.fn(), create: jest.fn(), getAll: jest.fn(),
    getById: jest.fn(), getMembers: jest.fn(), getMyMembership: jest.fn(), getMyPrivileges: jest.fn(),
    getPendingRequests: jest.fn(), rejectMember: jest.fn(), removeAdmin: jest.fn(),
    requestToJoin: jest.fn(), revokeMember: jest.fn(), setEnabled: jest.fn(), update: jest.fn(),
  },
  usersAPI: { getAll: jest.fn() },
}));
jest.mock('../../../components/EventsModal', () => jest.fn(() => null));
jest.mock('../../../components/AnnouncementsModal', () => jest.fn(() => null));

const member = { id: 101, firstName: 'Maya', lastName: 'Member', email: 'member@example.com', emailVerified: true, appRole: 'USER' };
const admin = { id: 1, firstName: 'Avery', lastName: 'Admin', email: 'admin@example.com', appRole: 'APP_ADMIN' };
const school = { id: 10, name: 'North Valley High School', description: 'Falcons', enabled: true, admins: [] };
const pendingUser = { userId: 202, userFirstName: 'Priya', userLastName: 'Pending', userEmail: 'priya@example.com' };

describe('school membership workflows', () => {
  let alertSpy;

  beforeEach(() => {
    useAuth.mockReturnValue({ user: member });
    schoolsAPI.getAll.mockReset().mockResolvedValue([school]);
    schoolsAPI.getById.mockReset().mockResolvedValue(school);
    schoolsAPI.getMyMembership.mockReset().mockResolvedValue(null);
    schoolsAPI.getMyPrivileges.mockReset().mockResolvedValue([]);
    schoolsAPI.requestToJoin.mockReset().mockResolvedValue({ status: 'PENDING' });
    schoolsAPI.getPendingRequests.mockReset().mockResolvedValue([]);
    schoolsAPI.getMembers.mockReset().mockResolvedValue([]);
    schoolsAPI.approveMember.mockReset().mockResolvedValue(undefined);
    schoolsAPI.rejectMember.mockReset().mockResolvedValue(undefined);
    schoolsAPI.revokeMember.mockReset().mockResolvedValue(undefined);
    EventsModal.mockClear();
    AnnouncementsModal.mockClear();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  async function openDetail() {
    renderWithProviders(<SchoolsScreen />);
    await screen.findByText(school.name);
    fireEvent.press(screen.getByText('View'));
    await screen.findByText('Your Membership').catch(() => screen.findByText('Membership'));
  }

  it.each([
    ['APPROVED', 'Active Member'],
    ['PENDING', 'Pending Approval'],
  ])('presents the %s membership state', async (status, label) => {
    schoolsAPI.getMyMembership.mockResolvedValue({ status });
    await openDetail();
    expect(await screen.findByText(label)).toBeOnTheScreen();
  });

  it('allows a rejected member to request again', async () => {
    schoolsAPI.getMyMembership.mockResolvedValue({ status: 'REJECTED' });
    await openDetail();
    expect(await screen.findByText('Request Rejected')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Request Again'));

    await waitFor(() => expect(schoolsAPI.requestToJoin).toHaveBeenCalledWith(10));
    expect(screen.getByText('Pending Approval')).toBeOnTheScreen();
  });

  it('allows verified non-members to join and blocks unverified accounts', async () => {
    await openDetail();
    fireEvent.press(await screen.findByText('Request to Join'));
    await waitFor(() => expect(schoolsAPI.requestToJoin).toHaveBeenCalledWith(10));

    useAuth.mockReturnValue({ user: { ...member, emailVerified: false } });
    schoolsAPI.requestToJoin.mockClear();
    const view = renderWithProviders(<SchoolsScreen />);
    const viewButtons = await screen.findAllByText('View');
    fireEvent.press(viewButtons.at(-1));
    expect(await screen.findByText('Verify your email to join')).toBeOnTheScreen();
    expect(schoolsAPI.requestToJoin).not.toHaveBeenCalled();
    view.unmount();
  });

  it('approves and rejects pending requests', async () => {
    useAuth.mockReturnValue({ user: admin });
    schoolsAPI.getPendingRequests.mockResolvedValue([pendingUser]);
    await openDetail();
    fireEvent.press(screen.getByText('Review Pending Requests'));
    expect(await screen.findByText('Priya Pending')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('icon-check'));
    await waitFor(() => expect(schoolsAPI.approveMember).toHaveBeenCalledWith(10, 202));
    expect(screen.getByText('No pending membership requests.')).toBeOnTheScreen();

    schoolsAPI.getPendingRequests.mockResolvedValue([pendingUser]);
    fireEvent.press(screen.getByTestId('icon-arrow-left'));
    fireEvent.press(screen.getByText('Review Pending Requests'));
    await screen.findByText('Priya Pending');
    fireEvent.press(screen.getAllByTestId('icon-close').at(-1));
    const reject = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Reject');
    await act(async () => reject.onPress());
    expect(schoolsAPI.rejectMember).toHaveBeenCalledWith(10, 202);
  });

  it('fuzzy-filters approved members and confirms removal', async () => {
    useAuth.mockReturnValue({ user: admin });
    schoolsAPI.getMembers.mockResolvedValue([
      { userId: 301, userFirstName: 'James', userLastName: 'Rivera', userEmail: 'james@example.com' },
      { userId: 302, userFirstName: 'Priya', userLastName: 'Shah', userEmail: 'priya@example.com' },
    ]);
    await openDetail();
    fireEvent.press(screen.getByText('View Approved Members'));
    await screen.findByText('James Rivera');

    fireEvent.changeText(screen.getByPlaceholderText('Search by name…'), 'jmaes');
    expect(screen.getByText('James Rivera')).toBeOnTheScreen();
    expect(screen.queryByText('Priya Shah')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('icon-account-remove-outline'));
    const remove = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Remove');
    await act(async () => remove.onPress());
    expect(schoolsAPI.revokeMember).toHaveBeenCalledWith(10, 301);
  });

  it('opens privileged event and announcement flows with correct permissions', async () => {
    schoolsAPI.getMyPrivileges.mockResolvedValue([
      'VIEW_EVENTS', 'CREATE_EVENT', 'VIEW_ANNOUNCEMENTS', 'CREATE_ANNOUNCEMENT',
    ]);
    await openDetail();

    fireEvent.press(await screen.findByText('View Events & RSVP'));
    fireEvent.press(screen.getByText('View Announcements'));

    expect(EventsModal).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 10, canCreate: true, isSchoolAdmin: false }), undefined);
    expect(AnnouncementsModal).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 10, canCreate: true, isSchoolAdmin: false }), undefined);
  });
});
