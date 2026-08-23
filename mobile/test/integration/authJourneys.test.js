import React, { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Text } from 'react-native';
import { mockRouter, useLocalSearchParams } from 'expo-router';
import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { accountAPI, authAPI, setOnUnauthorized } from '../../services/api';
import LoginScreen from '../../app/(auth)/login';
import RegisterScreen from '../../app/(auth)/register';
import VerifyEmailScreen from '../../app/(auth)/verify-email';

jest.mock('expo-router');
jest.mock('../../services/api', () => ({
  accountAPI: { deleteAccount: jest.fn(), getCurrentAccount: jest.fn() },
  authAPI: {
    login: jest.fn(), register: jest.fn(), resendVerification: jest.fn(), verifyEmail: jest.fn(),
  },
  setOnUnauthorized: jest.fn(),
}));

const member = {
  id: 101,
  email: 'member@example.com',
  firstName: 'Maya',
  lastName: 'Member',
  appRole: 'USER',
};

let journeyParams = {};

function SignedInDestination() {
  const { isAuthenticated, token, user } = useAuth();
  return <Text>{isAuthenticated ? `Signed in as ${user.email} with ${token}` : 'Signed out'}</Text>;
}

function JourneyRoutes({ initialRoute }) {
  const [route, setRoute] = useState(initialRoute);

  mockRouter.push.mockImplementation((destination) => {
    const pathname = typeof destination === 'string' ? destination : destination.pathname;
    journeyParams = typeof destination === 'string' ? {} : destination.params ?? {};
    if (pathname === '/verify-email') setRoute('verify');
  });
  mockRouter.replace.mockImplementation((destination) => {
    if (destination === '/(tabs)') setRoute('tabs');
    if (destination === '/login') setRoute('login');
  });

  if (route === 'register') return <RegisterScreen />;
  if (route === 'verify') return <VerifyEmailScreen />;
  if (route === 'tabs') return <SignedInDestination />;
  return <LoginScreen />;
}

function renderJourney(initialRoute) {
  return renderWithProviders(
    <AuthProvider>
      <JourneyRoutes initialRoute={initialRoute} />
    </AuthProvider>
  );
}

function change(label, value) {
  fireEvent.changeText(screen.getByLabelText(label), value);
}

describe('critical authentication journeys', () => {
  beforeEach(() => {
    journeyParams = {};
    useLocalSearchParams.mockImplementation(() => journeyParams);
    Object.values(mockRouter).forEach((value) => value?.mockReset?.());
    SecureStore.getItemAsync.mockReset().mockResolvedValue(null);
    SecureStore.setItemAsync.mockReset().mockResolvedValue(undefined);
    SecureStore.deleteItemAsync.mockReset().mockResolvedValue(undefined);
    accountAPI.getCurrentAccount.mockReset();
    authAPI.login.mockReset();
    authAPI.register.mockReset();
    authAPI.resendVerification.mockReset();
    authAPI.verifyEmail.mockReset();
    setOnUnauthorized.mockClear();
  });

  it('takes a new member from registration through verification into authenticated tabs', async () => {
    authAPI.register.mockResolvedValue({ email: member.email, verificationRequired: true });
    authAPI.verifyEmail.mockResolvedValue({ token: 'verified-jwt', ...member });
    renderJourney('register');

    change('First Name *', member.firstName);
    change('Last Name *', member.lastName);
    change('Email *', member.email);
    change('Password *', 'StrongPass1!');
    change('Confirm Password *', 'StrongPass1!');
    fireEvent.press(screen.getAllByRole('checkbox')[0]);
    fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Verify your email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email').props.value).toBe(member.email);
    change('Six-digit code', '123456');
    fireEvent.press(screen.getByText('Verify and sign in'));

    expect(await screen.findByText('Signed in as member@example.com with verified-jwt')).toBeOnTheScreen();
    expect(authAPI.register).toHaveBeenCalledWith({
      email: member.email,
      password: 'StrongPass1!',
      firstName: member.firstName,
      lastName: member.lastName,
      ageConfirmed: true,
      acceptedTerms: true,
    });
    expect(authAPI.verifyEmail).toHaveBeenCalledWith(member.email, '123456');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'authToken', 'verified-jwt', expect.objectContaining({ keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' })
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'authUser', JSON.stringify(member), expect.objectContaining({ keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' })
    );
  });

  it('takes a returning member from the login form into authenticated tabs with persisted state', async () => {
    authAPI.login.mockResolvedValue({ token: 'login-jwt', ...member });
    renderJourney('login');
    change('Email', member.email);
    change('Password', 'Password1!');
    fireEvent.press(screen.getByText('Sign In'));

    expect(await screen.findByText('Signed in as member@example.com with login-jwt')).toBeOnTheScreen();
    expect(authAPI.login).toHaveBeenCalledWith(member.email, 'Password1!');
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('routes an unverified login into verification and completes that session', async () => {
    authAPI.login.mockRejectedValue({ response: { status: 403, data: { message: 'Verify your email' } } });
    authAPI.verifyEmail.mockResolvedValue({ token: 'verified-after-login', ...member });
    renderJourney('login');
    change('Email', member.email);
    change('Password', 'Password1!');
    fireEvent.press(screen.getByText('Sign In'));

    expect(await screen.findByText('Verify your email')).toBeOnTheScreen();
    change('Six-digit code', '654321');
    fireEvent.press(screen.getByText('Verify and sign in'));

    await waitFor(() => expect(screen.getByText(
      'Signed in as member@example.com with verified-after-login'
    )).toBeOnTheScreen());
    expect(authAPI.verifyEmail).toHaveBeenCalledWith(member.email, '654321');
  });
});
