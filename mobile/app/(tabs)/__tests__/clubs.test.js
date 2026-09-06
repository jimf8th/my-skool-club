import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '../../../test/test-utils';
import { useAuth } from '../../../context/AuthContext';
import { useMySchool } from '../../../hooks/useMySchool';
import { clubsAPI, invoicesAPI, schoolsAPI } from '../../../services/api';
import InvoicesModal from '../../../components/InvoicesModal';
import InventoryModal from '../../../components/InventoryModal';
import ClubsScreen from '../clubs';

jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../hooks/useMySchool', () => ({ useMySchool: jest.fn() }));
jest.mock('../../../services/api', () => ({
  schoolsAPI: { getAll: jest.fn(), getMembers: jest.fn(), getMyPrivileges: jest.fn() },
  clubsAPI: {
    addAdmin: jest.fn(), approveMember: jest.fn(), createClub: jest.fn(), deleteClub: jest.fn(),
    getAdmins: jest.fn(), getClub: jest.fn(), getMembers: jest.fn(), getMyMembership: jest.fn(),
    getMyPrivileges: jest.fn(), getPendingRequests: jest.fn(), listClubs: jest.fn(),
    rejectMember: jest.fn(), removeAdmin: jest.fn(), requestToJoin: jest.fn(),
    revokeMember: jest.fn(), updateClub: jest.fn(),
  },
  invoicesAPI: { list: jest.fn() },
}));
jest.mock('../../../components/InvoicesModal', () => jest.fn(() => null));
jest.mock('../../../components/InventoryModal', () => jest.fn(() => null));

const user = { id: 101, firstName: 'Maya', lastName: 'Member', email: 'maya@example.com', appRole: 'USER' };
const appAdmin = { ...user, id: 1, firstName: 'Avery', appRole: 'APP_ADMIN' };
const school = { id: 10, name: 'North Valley', description: 'Falcons' };
const clubAdmin = { userId: 201, userFirstName: 'Sam', userLastName: 'Staff', userEmail: 'sam@example.com' };
const club = { id: 20, schoolId: 10, schoolName: 'North Valley', name: 'Robotics Club', description: 'Build things', admins: [clubAdmin] };
const memberRow = { userId: user.id, userFirstName: 'Maya', userLastName: 'Member', userEmail: user.email, role: 'MEMBER' };

describe('ClubsScreen', () => {
  let alertSpy;
  const reloadMySchool = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    useAuth.mockReturnValue({ user });
    useMySchool.mockReturnValue({
      school,
      privileges: new Set(['VIEW_ALL_CLUBS']),
      loading: false,
      reload: reloadMySchool,
    });
    schoolsAPI.getAll.mockReset().mockResolvedValue([school]);
    schoolsAPI.getMyPrivileges.mockReset().mockResolvedValue(['VIEW_ALL_CLUBS']);
    schoolsAPI.getMembers.mockReset().mockResolvedValue([memberRow]);
    clubsAPI.listClubs.mockReset().mockResolvedValue([club]);
    clubsAPI.getClub.mockReset().mockResolvedValue(club);
    clubsAPI.getMyMembership.mockReset().mockResolvedValue(null);
    clubsAPI.getMyPrivileges.mockReset().mockResolvedValue([]);
    clubsAPI.requestToJoin.mockReset().mockResolvedValue({ status: 'PENDING' });
    clubsAPI.createClub.mockReset().mockResolvedValue(club);
    clubsAPI.updateClub.mockReset().mockResolvedValue(club);
    clubsAPI.deleteClub.mockReset().mockResolvedValue(undefined);
    clubsAPI.getPendingRequests.mockReset().mockResolvedValue([]);
    clubsAPI.getMembers.mockReset().mockResolvedValue([]);
    clubsAPI.approveMember.mockReset().mockResolvedValue(undefined);
    clubsAPI.rejectMember.mockReset().mockResolvedValue(undefined);
    clubsAPI.revokeMember.mockReset().mockResolvedValue(undefined);
    clubsAPI.addAdmin.mockReset().mockResolvedValue(undefined);
    clubsAPI.removeAdmin.mockReset().mockResolvedValue(undefined);
    invoicesAPI.list.mockReset().mockResolvedValue([]);
    InvoicesModal.mockClear();
    InventoryModal.mockClear();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  async function openClub() {
    renderWithProviders(<ClubsScreen />);
    await screen.findByText('Robotics Club');
    fireEvent.press(screen.getByText('View'));
    await screen.findByText('Your Membership');
  }

  it('shows join-school and members-only states', async () => {
    useMySchool.mockReturnValue({ school: null, privileges: new Set(), loading: false, reload: reloadMySchool });
    const view = renderWithProviders(<ClubsScreen />);
    expect(await screen.findByText('Join a School')).toBeOnTheScreen();
    view.unmount();

    useMySchool.mockReturnValue({ school, privileges: new Set(), loading: false, reload: reloadMySchool });
    renderWithProviders(<ClubsScreen />);
    expect(await screen.findByText('Members Only')).toBeOnTheScreen();
  });

  it('lets app admins choose a school before loading its clubs', async () => {
    useAuth.mockReturnValue({ user: appAdmin });
    useMySchool.mockReturnValue({ school: null, privileges: new Set(), loading: false, reload: reloadMySchool });
    renderWithProviders(<ClubsScreen />);
    expect(await screen.findByText('Select a School')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('North Valley'));
    expect(await screen.findByText('Robotics Club')).toBeOnTheScreen();
    expect(schoolsAPI.getMyPrivileges).toHaveBeenCalledWith(10);
    expect(clubsAPI.listClubs).toHaveBeenCalledWith(10);
  });

  it('confirms and removes clubs when permitted', async () => {
    useMySchool.mockReturnValue({ school, privileges: new Set(['VIEW_ALL_CLUBS', 'DELETE_CLUB']), loading: false, reload: reloadMySchool });
    renderWithProviders(<ClubsScreen />);
    await screen.findByText('Robotics Club');
    fireEvent.press(screen.getByTestId('icon-trash-can-outline'));
    const confirm = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Delete');
    await act(async () => confirm.onPress());
    expect(clubsAPI.deleteClub).toHaveBeenCalledWith(10, 20);
    expect(screen.getByText('No Clubs Yet')).toBeOnTheScreen();
  });

  it('creates a club with a required first administrator', async () => {
    useMySchool.mockReturnValue({ school, privileges: new Set(['VIEW_ALL_CLUBS', 'ADD_CLUB']), loading: false, reload: reloadMySchool });
    clubsAPI.listClubs.mockResolvedValue([]);
    renderWithProviders(<ClubsScreen />);
    await screen.findByText('No Clubs Yet');
    fireEvent.press(screen.getByText('Add Club'));
    await waitFor(() => expect(schoolsAPI.getMembers).toHaveBeenCalledWith(10));

    fireEvent.press(screen.getByText('Create Club'));
    expect(screen.getByText('Club name is required.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Chess Club'), '  Robotics Club  ');
    fireEvent.press(screen.getByText('Create Club'));
    expect(screen.getByText('Please select a first club admin.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Select a school member…'));
    fireEvent.changeText(screen.getByPlaceholderText('Search by name or email…'), 'maya');
    fireEvent.press(screen.getByText('Maya Member'));
    fireEvent.press(screen.getByText('Create Club'));

    await waitFor(() => expect(clubsAPI.createClub).toHaveBeenCalledWith(10, {
      name: 'Robotics Club', description: null, firstAdminUserId: 101,
    }));
    expect(await screen.findByText('Robotics Club')).toBeOnTheScreen();
  });

  it.each([
    [{ status: 'APPROVED', role: 'MEMBER' }, 'Club Member'],
    [{ status: 'APPROVED', role: 'ADMIN' }, 'Club Admin'],
    [{ status: 'PENDING' }, 'Awaiting Approval'],
  ])('presents club membership state %#', async (membership, label) => {
    clubsAPI.getMyMembership.mockResolvedValue(membership);
    await openClub();
    expect(await screen.findByText(label)).toBeOnTheScreen();
  });

  it('submits new and repeated club membership requests', async () => {
    await openClub();
    fireEvent.press(await screen.findByText('Request to Join'));
    await waitFor(() => expect(clubsAPI.requestToJoin).toHaveBeenCalledWith(20));
    expect(screen.getByText('Awaiting Approval')).toBeOnTheScreen();
  });

  it('shows school-role management without requiring club membership', async () => {
    useMySchool.mockReturnValue({ school, privileges: new Set(['VIEW_ALL_CLUBS', 'MODIFY_CLUB']), loading: false, reload: reloadMySchool });
    await openClub();
    expect(await screen.findByText('Managing via school role')).toBeOnTheScreen();
    expect(screen.getByText('Edit')).toBeOnTheScreen();
  });

  it('validates and saves trimmed club edits', async () => {
    const updated = { ...club, name: 'Engineering Club', description: 'Design together' };
    useMySchool.mockReturnValue({ school, privileges: new Set(['VIEW_ALL_CLUBS', 'MODIFY_CLUB']), loading: false, reload: reloadMySchool });
    clubsAPI.updateClub.mockResolvedValue(updated);
    await openClub();
    fireEvent.press(screen.getByText('Edit'));

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Chess Club'), '   ');
    fireEvent.press(screen.getByText('Save Changes'));
    expect(screen.getByText('Club name is required.')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Chess Club'), '  Engineering Club  ');
    fireEvent.changeText(screen.getByPlaceholderText('Brief description…'), '  Design together  ');
    fireEvent.press(screen.getByText('Save Changes'));
    await waitFor(() => expect(clubsAPI.updateClub).toHaveBeenCalledWith(10, 20, {
      name: 'Engineering Club', description: 'Design together',
    }));
    expect(await screen.findAllByText('Engineering Club')).toHaveLength(2);
  });

  it('assigns eligible club members as administrators', async () => {
    clubsAPI.getMyPrivileges.mockResolvedValue(['MANAGE_CLUB_ADMINS']);
    clubsAPI.getMembers.mockResolvedValue([memberRow]);
    const updated = { ...club, admins: [clubAdmin, { userId: 101, userFirstName: 'Maya', userLastName: 'Member', userEmail: user.email }] };
    clubsAPI.getClub.mockResolvedValueOnce(club).mockResolvedValueOnce(updated);
    await openClub();

    fireEvent.press(screen.getByText('Add'));
    expect(await screen.findByText('Add Club Admin')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('Search members…'), 'maya');
    fireEvent.press(screen.getByText('Maya Member'));

    await waitFor(() => expect(clubsAPI.addAdmin).toHaveBeenCalledWith(20, 101));
    expect(await screen.findByText('Club Admins (2)')).toBeOnTheScreen();
  });

  it('opens invoice and inventory tools with backend privileges', async () => {
    clubsAPI.getMyPrivileges.mockResolvedValue([
      'VIEW_INVOICES', 'CREATE_INVOICE', 'APPROVE_INVOICE',
      'VIEW_INVENTORY', 'CHECKOUT_INVENTORY', 'MANAGE_INVENTORY',
    ]);
    await openClub();
    fireEvent.press(await screen.findByText('Invoices'));
    fireEvent.press(screen.getByText('Inventory'));

    expect(InvoicesModal).toHaveBeenCalledWith(expect.objectContaining({ clubId: 20, canCreate: true, canApprove: true }), undefined);
    expect(InventoryModal).toHaveBeenCalledWith(expect.objectContaining({ clubId: 20, canCheckout: true, canManage: true }), undefined);
  });

  it('calculates dashboard membership and invoice summaries', async () => {
    clubsAPI.getMyPrivileges.mockResolvedValue(['VIEW_CLUB_MEMBERS', 'VIEW_INVOICES']);
    clubsAPI.getMembers.mockResolvedValue([memberRow, { ...memberRow, userId: 202, userFirstName: 'Priya' }]);
    invoicesAPI.list.mockResolvedValue([
      { id: 1, status: 'PAID', totalAmount: 10 },
      { id: 2, status: 'APPROVED', totalAmount: 20 },
      { id: 3, status: 'DRAFT', totalAmount: 5 },
    ]);
    await openClub();
    fireEvent.press(await screen.findByText('Club Dashboard'));

    expect(await screen.findByText('2')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByText('$10.00')).toBeOnTheScreen();
    expect(screen.getByText('$20.00')).toBeOnTheScreen();
  });

  it('moderates pending members and fuzzy-filters the member list', async () => {
    const pending = { userId: 202, userFirstName: 'Priya', userLastName: 'Pending', userEmail: 'priya@example.com' };
    clubsAPI.getMyPrivileges.mockResolvedValue(['VIEW_CLUB_MEMBERS', 'ADD_CLUB_MEMBER']);
    clubsAPI.getPendingRequests.mockResolvedValue([pending]);
    clubsAPI.getMembers.mockResolvedValue([memberRow, pending]);
    await openClub();
    fireEvent.press(await screen.findByText('Review Pending Requests'));
    fireEvent.press(await screen.findByTestId('icon-check'));
    expect(clubsAPI.approveMember).toHaveBeenCalledWith(20, 202);

    fireEvent.press(screen.getByTestId('icon-arrow-left'));
    fireEvent.press(screen.getByText('View Club Members'));
    await screen.findByText('Maya Member');
    fireEvent.changeText(screen.getByPlaceholderText('Search by name…'), 'prya');
    expect(screen.getByText('Priya Pending')).toBeOnTheScreen();
    expect(screen.queryByText('Maya Member')).not.toBeOnTheScreen();
  });
});
