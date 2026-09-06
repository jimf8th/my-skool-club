import React from 'react';
import { Alert } from 'react-native';
import { Stack, Tabs, mockRouter } from 'expo-router';
import { fireEvent, renderWithProviders, screen } from '../../../test/test-utils';
import { useAuth } from '../../../context/AuthContext';
import { useMySchool } from '../../../hooks/useMySchool';
import AnnouncementsModal from '../../../components/AnnouncementsModal';
import AuthLayout from '../../(auth)/_layout';
import TabsLayout from '../_layout';
import HomeScreen from '../index';

jest.mock('expo-router');
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../hooks/useMySchool', () => ({ useMySchool: jest.fn() }));
jest.mock('../../../components/AnnouncementsModal', () => jest.fn(() => null));

const member = {
  id: 101,
  firstName: 'Maya',
  lastName: 'Member',
  email: 'member@example.com',
  appRole: 'USER',
};
const admin = { ...member, id: 1, firstName: 'Avery', appRole: 'APP_ADMIN' };
const school = { id: 10, name: 'North Valley High School', isAdmin: true };

describe('navigation layouts', () => {
  beforeEach(() => {
    Stack.mockClear();
    Tabs.mockClear();
    Stack.Screen.mockClear();
    Tabs.Screen.mockClear();
    useAuth.mockReturnValue({ user: member, logout: jest.fn() });
  });

  it('declares every authentication route', () => {
    renderWithProviders(<AuthLayout />);

    expect(Stack.Screen.mock.calls.map(([props]) => props.name)).toEqual([
      'index',
      'login',
      'register',
      'verify-email',
      'forgot-password',
      'reset-password',
      'request-school',
    ]);
  });

  it('declares the five primary tabs with user-facing titles', () => {
    renderWithProviders(<TabsLayout />);

    expect(Tabs.Screen.mock.calls.map(([props]) => [props.name, props.options.title])).toEqual([
      ['index', 'Home'],
      ['events', 'Events'],
      ['schools', 'Schools'],
      ['clubs', 'Clubs'],
      ['profile', 'Profile'],
      ['school-requests', 'School Requests'],
      ['accounts', 'Accounts'],
    ]);

    expect(Tabs).toHaveBeenCalledWith(expect.objectContaining({
      screenOptions: expect.objectContaining({
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: true,
      }),
    }), undefined);
  });

  it('renders the branded home header and all tab icons', () => {
    renderWithProviders(<TabsLayout />);
    const optionsByName = Object.fromEntries(
      Tabs.Screen.mock.calls.map(([props]) => [props.name, props.options])
    );

    renderWithProviders(optionsByName.index.headerTitle());
    expect(screen.getByText('My Skool Club')).toBeOnTheScreen();

    const expectedIcons = {
      index: 'home',
      events: 'calendar-star',
      schools: 'school',
      clubs: 'account-group',
      profile: 'account',
    };
    for (const [name, icon] of Object.entries(expectedIcons)) {
      renderWithProviders(optionsByName[name].tabBarIcon({ color: '#123456', size: 24 }));
      expect(screen.getByTestId(`icon-${icon}`)).toHaveProp('color', '#123456');
      expect(screen.getByTestId(`icon-${icon}`)).toHaveProp('size', 24);
    }
  });
});

describe('HomeScreen', () => {
  let alertSpy;

  beforeEach(() => {
    Object.values(mockRouter).forEach((value) => value?.mockClear?.());
    AnnouncementsModal.mockClear();
    useMySchool.mockReturnValue({ school: null, privileges: new Set(), loading: false, reload: jest.fn() });
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('renders the app-admin dashboard and routes every admin action', () => {
    useAuth.mockReturnValue({ user: admin });
    renderWithProviders(<HomeScreen />);

    expect(screen.getByText('App Administrator')).toBeOnTheScreen();
    expect(screen.getByText('Welcome back, Avery!')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Manage Schools'));
    fireEvent.press(screen.getByText('Manage Clubs'));
    fireEvent.press(screen.getByText('Members'));
    fireEvent.press(screen.getByText('Announcements'));
    fireEvent.press(screen.getByText('Events'));
    fireEvent.press(screen.getByText('Account'));

    expect(mockRouter.push.mock.calls.map(([route]) => route)).toEqual([
      '/schools', '/clubs', '/schools', '/schools', '/events', '/profile',
    ]);
  });

  it('routes app administrators to school request review', () => {
    useAuth.mockReturnValue({ user: admin });
    renderWithProviders(<HomeScreen />);

    fireEvent.press(screen.getByText('School Requests'));

    expect(mockRouter.push).toHaveBeenCalledWith('/school-requests');
  });

  it('routes app administrators to account management', () => {
    useAuth.mockReturnValue({ user: admin });
    renderWithProviders(<HomeScreen />);

    fireEvent.press(screen.getByText('Accounts'));

    expect(mockRouter.push).toHaveBeenCalledWith('/accounts');
  });

  it('renders a regular member greeting, school, admin badge, and empty activity', () => {
    useAuth.mockReturnValue({ user: member });
    useMySchool.mockReturnValue({
      school,
      privileges: new Set(['VIEW_ANNOUNCEMENTS']),
      loading: false,
      reload: jest.fn(),
    });

    renderWithProviders(<HomeScreen />);

    expect(screen.getByText('Welcome back, Maya!')).toBeOnTheScreen();
    expect(screen.getByText('North Valley High School')).toBeOnTheScreen();
    expect(screen.getByText('Admin')).toBeOnTheScreen();
    expect(screen.getByText('No recent activity yet. Start exploring!')).toBeOnTheScreen();
  });

  it('uses the generic greeting when a member has no first name', () => {
    useAuth.mockReturnValue({ user: { ...member, firstName: '' } });
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText('Welcome to My Skool Club!')).toBeOnTheScreen();
  });

  it('routes the member school, club, and event quick actions', () => {
    useAuth.mockReturnValue({ user: member });
    renderWithProviders(<HomeScreen />);

    fireEvent.press(screen.getByText('Browse Schools'));
    fireEvent.press(screen.getByText('Join Clubs'));
    fireEvent.press(screen.getByText('Events'));

    expect(mockRouter.push.mock.calls.map(([route]) => route)).toEqual(['/schools', '/clubs', '/events']);
  });

  it('explains that announcements require an approved school', () => {
    useAuth.mockReturnValue({ user: member });
    renderWithProviders(<HomeScreen />);

    fireEvent.press(screen.getByText('Announcements'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Join a School',
      'Join a school and get approved to view announcements.'
    );
    expect(AnnouncementsModal).not.toHaveBeenCalled();
  });

  it('opens announcements with the resolved school and creation privilege', () => {
    useAuth.mockReturnValue({ user: member });
    useMySchool.mockReturnValue({
      school,
      privileges: new Set(['CREATE_ANNOUNCEMENT']),
      loading: false,
      reload: jest.fn(),
    });
    renderWithProviders(<HomeScreen />);

    fireEvent.press(screen.getByText('Announcements'));

    expect(AnnouncementsModal).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 10,
        currentUser: member,
        canCreate: true,
        isSchoolAdmin: true,
      }),
      undefined
    );
  });

  it('does not render a school card while school resolution is loading', () => {
    useAuth.mockReturnValue({ user: member });
    useMySchool.mockReturnValue({ school, privileges: new Set(), loading: true, reload: jest.fn() });

    renderWithProviders(<HomeScreen />);

    expect(screen.queryByText('Your School')).not.toBeOnTheScreen();
  });
});
