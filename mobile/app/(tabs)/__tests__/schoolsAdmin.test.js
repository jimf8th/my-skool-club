import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '../../../test/test-utils';
import { useAuth } from '../../../context/AuthContext';
import { schoolsAPI, usersAPI } from '../../../services/api';
import SchoolsScreen from '../schools';

jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../services/api', () => ({
  schoolsAPI: {
    addAdmin: jest.fn(),
    approveMember: jest.fn(),
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    getMembers: jest.fn(),
    getMyMembership: jest.fn(),
    getMyPrivileges: jest.fn(),
    getPendingRequests: jest.fn(),
    rejectMember: jest.fn(),
    removeAdmin: jest.fn(),
    requestToJoin: jest.fn(),
    revokeMember: jest.fn(),
    setEnabled: jest.fn(),
    setTier: jest.fn(),
    update: jest.fn(),
  },
  usersAPI: { getAll: jest.fn() },
}));
jest.mock('../../../components/EventsModal', () => jest.fn(() => null));
jest.mock('../../../components/AnnouncementsModal', () => jest.fn(() => null));

const adminUser = { id: 1, firstName: 'Avery', lastName: 'Admin', email: 'admin@example.com', appRole: 'APP_ADMIN' };
const memberUser = { id: 101, firstName: 'Maya', lastName: 'Member', email: 'member@example.com', appRole: 'USER' };
const primaryAdmin = {
  userId: adminUser.id,
  userFirstName: adminUser.firstName,
  userLastName: adminUser.lastName,
  userEmail: adminUser.email,
};
const secondAdmin = { userId: 2, userFirstName: 'Sam', userLastName: 'Staff', userEmail: 'sam@example.com' };
const school = {
  id: 10,
  name: 'North Valley High School',
  description: 'Home of the Falcons',
  enabled: true,
  tier: 'STANDARD',
  admins: [primaryAdmin],
};

describe('SchoolsScreen administration', () => {
  let alertSpy;
  let consoleError;

  beforeEach(() => {
    useAuth.mockReturnValue({ user: adminUser });
    schoolsAPI.getAll.mockReset().mockResolvedValue([school]);
    schoolsAPI.getById.mockReset().mockResolvedValue(school);
    schoolsAPI.getMyPrivileges.mockReset().mockResolvedValue([]);
    schoolsAPI.getMyMembership.mockReset().mockResolvedValue(null);
    schoolsAPI.setEnabled.mockReset().mockResolvedValue({ ...school, enabled: false });
    schoolsAPI.setTier.mockReset().mockResolvedValue({ ...school, tier: 'PREMIUM' });
    schoolsAPI.update.mockReset().mockResolvedValue(school);
    schoolsAPI.create.mockReset().mockResolvedValue(school);
    schoolsAPI.addAdmin.mockReset().mockResolvedValue(undefined);
    schoolsAPI.removeAdmin.mockReset().mockResolvedValue(undefined);
    usersAPI.getAll.mockReset().mockResolvedValue([
      adminUser,
      { id: 2, firstName: 'Sam', lastName: 'Staff', email: 'sam@example.com' },
    ]);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  async function openDetail() {
    renderWithProviders(<SchoolsScreen />);
    await screen.findByText(school.name);
    fireEvent.press(screen.getByText('View'));
    await screen.findByText('Active');
  }

  it('loads school cards and restricts administrative controls for regular users', async () => {
    useAuth.mockReturnValue({ user: memberUser });
    renderWithProviders(<SchoolsScreen />);

    expect(await screen.findByText(school.name)).toBeOnTheScreen();
    expect(screen.getByText(school.description)).toBeOnTheScreen();
    expect(screen.queryByText('Add School')).not.toBeOnTheScreen();
    expect(screen.queryByText('Disable')).not.toBeOnTheScreen();
  });

  it('renders role-specific empty states', async () => {
    schoolsAPI.getAll.mockResolvedValue([]);
    const view = renderWithProviders(<SchoolsScreen />);
    expect(await screen.findByText('Tap "Add School" to create the first one.')).toBeOnTheScreen();

    view.unmount();
    useAuth.mockReturnValue({ user: memberUser });
    renderWithProviders(<SchoolsScreen />);
    expect(await screen.findByText('Schools will appear here once they are created.')).toBeOnTheScreen();
  });

  it('confirms and applies school disablement', async () => {
    renderWithProviders(<SchoolsScreen />);
    await screen.findByText(school.name);

    fireEvent.press(screen.getByText('Disable'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Disable School',
      `Are you sure you want to disable "${school.name}"?`,
      expect.any(Array)
    );

    const confirm = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Disable');
    await act(async () => confirm.onPress());
    expect(schoolsAPI.setEnabled).toHaveBeenCalledWith(10, false);
    expect(screen.getByText('Disabled')).toBeOnTheScreen();
    expect(screen.getByText('Enable')).toBeOnTheScreen();
  });

  it('allows only the app admin UI to change a school tier', async () => {
    const adminView = renderWithProviders(<SchoolsScreen />);
    await screen.findByText(school.name);

    fireEvent.press(screen.getByText('Premium'));
    expect(alertSpy).toHaveBeenCalledWith('Set Premium', `Change "${school.name}" to Premium?`, expect.any(Array));
    const confirm = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Set Premium');
    await act(async () => confirm.onPress());

    expect(schoolsAPI.setTier).toHaveBeenCalledWith(10, 'PREMIUM');
    expect(screen.getByText('Standard')).toBeOnTheScreen();

    adminView.unmount();
    schoolsAPI.getAll.mockResolvedValue([school]);
    useAuth.mockReturnValue({ user: memberUser });
    const memberView = renderWithProviders(<SchoolsScreen />);
    expect(await screen.findAllByText('Standard')).not.toHaveLength(0);
    expect(screen.queryByText('Premium')).not.toBeOnTheScreen();
    memberView.unmount();
  });

  it('creates a school only after selecting its first administrator', async () => {
    schoolsAPI.getAll.mockResolvedValue([]);
    renderWithProviders(<SchoolsScreen />);
    await screen.findByText('No Schools Yet');
    fireEvent.press(screen.getByText('Add School'));
    await waitFor(() => expect(usersAPI.getAll).toHaveBeenCalled());

    fireEvent.press(screen.getByText('Create School'));
    expect(screen.getByText('School name is required.')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Lincoln High School'), '  Lincoln High  ');
    fireEvent.changeText(screen.getByPlaceholderText('Brief description of the school…'), '  New campus  ');
    fireEvent.press(screen.getByText('Create School'));
    expect(screen.getByText('A school admin must be selected.')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('— Tap to select a school admin —'));
    fireEvent.changeText(screen.getByPlaceholderText('Search by name or email…'), 'sam@');
    expect(screen.queryByText('Avery Admin')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText('Sam Staff'));
    fireEvent.press(screen.getByText('Create School'));

    await waitFor(() => expect(schoolsAPI.create).toHaveBeenCalledWith({
      name: 'Lincoln High',
      description: 'New campus',
      adminUserId: 2,
    }));
    expect(schoolsAPI.getAll).toHaveBeenCalledTimes(2);
  });

  it('loads school details and saves trimmed edits', async () => {
    const updated = { ...school, name: 'Updated School', description: 'Updated description' };
    schoolsAPI.getById.mockResolvedValueOnce(school).mockResolvedValueOnce(updated);
    schoolsAPI.update.mockResolvedValue(updated);
    await openDetail();

    expect(screen.getByText('School Admins (1)')).toBeOnTheScreen();
    expect(screen.getByText('Avery Admin (you)')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Edit Details'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Lincoln High School'), '   ');
    fireEvent.press(screen.getByText('Save Changes'));
    expect(screen.getByText('School name is required.')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Lincoln High School'), '  Updated School  ');
    fireEvent.changeText(screen.getByPlaceholderText('Brief description of the school…'), '  Updated description  ');
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(schoolsAPI.update).toHaveBeenCalledWith(10, {
      name: 'Updated School', description: 'Updated description', address: '', city: '',
      state: '', postalCode: '', website: '', phone: '',
    }));
    expect(await screen.findByText('Updated School')).toBeOnTheScreen();
  });

  it('filters eligible users and assigns a school administrator', async () => {
    const updated = { ...school, admins: [primaryAdmin, secondAdmin] };
    schoolsAPI.getById.mockResolvedValueOnce(school).mockResolvedValueOnce(updated);
    await openDetail();
    fireEvent.press(screen.getByText('Add'));
    await screen.findByText('Add School Admin');

    expect(screen.queryByText('Avery Admin')).not.toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('Search by name or email…'), 'sam');
    fireEvent.press(screen.getByText('Sam Staff'));

    await waitFor(() => expect(schoolsAPI.addAdmin).toHaveBeenCalledWith(10, 2));
    expect(await screen.findByText('School Admins (2)')).toBeOnTheScreen();
  });

  it('confirms administrator removal and reports API failures', async () => {
    const twoAdmins = { ...school, admins: [primaryAdmin, secondAdmin] };
    schoolsAPI.getById.mockResolvedValue(twoAdmins);
    schoolsAPI.removeAdmin.mockRejectedValue({ response: { data: { message: 'Cannot remove administrator' } } });
    await openDetail();

    fireEvent.press(screen.getAllByTestId('icon-account-minus-outline')[1]);
    expect(alertSpy).toHaveBeenCalledWith(
      'Remove Admin',
      'Remove Sam Staff as school admin?',
      expect.any(Array)
    );
    const remove = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Remove');
    await act(async () => remove.onPress());

    expect(schoolsAPI.removeAdmin).toHaveBeenCalledWith(10, 2);
    expect(alertSpy).toHaveBeenLastCalledWith('Error', 'Cannot remove administrator');
    expect(consoleError).not.toHaveBeenCalled();
  });
});
