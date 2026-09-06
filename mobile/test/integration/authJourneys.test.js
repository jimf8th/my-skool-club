import React, { useState } from 'react';
import { Text } from 'react-native';
import { mockRouter, useLocalSearchParams } from 'expo-router';
import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { accountAPI, authAPI, setOnUnauthorized } from '../../services/api';
import { onAuthStateChanged, signInWithEmailAndPassword, sendEmailVerification } from '../../services/firebase';
import LoginScreen from '../../app/(auth)/login';
import RegisterScreen from '../../app/(auth)/register';
import VerifyEmailScreen from '../../app/(auth)/verify-email';

jest.mock('expo-router');
jest.mock('../../services/api', () => ({
  accountAPI: { deleteAccount: jest.fn(), getCurrentAccount: jest.fn() },
  authAPI: {
    syncSession: jest.fn(),
    acceptInvitation: jest.fn(),
  },
  setOnUnauthorized: jest.fn(),
}));

const member = {
  id: 101, email: 'member@example.com', firstName: 'Maya',
  lastName: 'Member', appRole: 'USER', emailVerified: true,
};

let journeyParams = {};

function SignedInDestination() {
  const { isAuthenticated, user } = useAuth();
  return <Text>{isAuthenticated ? `Signed in as ${user.email}` : 'Signed out'}</Text>;
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
    <AuthProvider><JourneyRoutes initialRoute={initialRoute} /></AuthProvider>
  );
}

describe('critical authentication journeys', () => {
  beforeEach(() => {
    journeyParams = {};
    useLocalSearchParams.mockImplementation(() => journeyParams);
    Object.values(mockRouter).forEach((v) => v?.mockReset?.());
    onAuthStateChanged.mockImplementation((_auth, cb) => { setTimeout(() => cb(null), 0); return () => {}; });
    authAPI.syncSession.mockReset();
    setOnUnauthorized.mockClear();
  });

  it('routes an unverified login into the verification screen', async () => {
    renderJourney('login');
    await screen.findByText('Welcome Back');

    signInWithEmailAndPassword.mockResolvedValue({ user: { emailVerified: false } });
    sendEmailVerification.mockResolvedValue(undefined);
    authAPI.syncSession.mockResolvedValue(member);

    fireEvent.changeText(screen.getByLabelText('Email'), 'member@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'Password1!');
    fireEvent.press(screen.getByText('Sign In'));

    await waitFor(() => expect(screen.queryByText("I've verified my email")).toBeOnTheScreen());
    expect(sendEmailVerification).toHaveBeenCalled();
  });

  it('takes a returning member from login into authenticated tabs', async () => {
    renderJourney('login');
    await screen.findByText('Welcome Back');

    signInWithEmailAndPassword.mockResolvedValue({ user: { emailVerified: true } });
    authAPI.syncSession.mockResolvedValue(member);

    fireEvent.changeText(screen.getByLabelText('Email'), 'member@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'Password1!');
    fireEvent.press(screen.getByText('Sign In'));

    await waitFor(() => expect(screen.getByText('Signed in as member@example.com')).toBeOnTheScreen());
  });
});
