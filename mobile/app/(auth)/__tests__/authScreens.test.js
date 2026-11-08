import React from 'react';
import { fireEvent, screen, waitFor } from '../../../test/test-utils';
import { mockRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { authAPI } from '../../../services/api';
import {
  openCommunityStandards,
  openPrivacyPolicy,
  openTerms,
} from '../../../utils/legalLinks';
import { renderWithProviders } from '../../../test/test-utils';
import LoginScreen from '../login';
import RegisterScreen from '../register';
import VerifyEmailScreen from '../verify-email';
import ForgotPasswordScreen from '../forgot-password';
import AcceptInviteScreen from '../accept-invite';

jest.mock('expo-router');
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../services/api', () => ({
  authAPI: { getInvitationDetails: jest.fn() },
}));
jest.mock('../../../utils/legalLinks', () => ({
  openCommunityStandards: jest.fn(),
  openPrivacyPolicy: jest.fn(),
  openTerms: jest.fn(),
}));

function change(label, value) {
  fireEvent.changeText(screen.getByLabelText(label), value);
}

describe('authentication screens', () => {
  let auth;

  beforeEach(() => {
    auth = {
      login: jest.fn(),
      loginWithApple: jest.fn(),
      completeConsent: jest.fn(),
      register: jest.fn(),
      checkEmailVerified: jest.fn(),
      resendVerification: jest.fn(),
      forgotPassword: jest.fn(),
      acceptInvitation: jest.fn(),
      isAuthenticated: false,
      loading: false,
      user: null,
    };
    useAuth.mockReturnValue(auth);
    useLocalSearchParams.mockReturnValue({});
    authAPI.getInvitationDetails.mockReset();
    Object.values(mockRouter).forEach((v) => v?.mockClear?.());
  });

  describe('LoginScreen', () => {
    it('validates required credentials before calling AuthContext', () => {
      renderWithProviders(<LoginScreen />);
      fireEvent.press(screen.getByText('Sign In'));
      expect(screen.getByText('Please fill in all fields')).toBeOnTheScreen();
      expect(auth.login).not.toHaveBeenCalled();
    });

    it('signs in and replaces the auth route', async () => {
      auth.login.mockResolvedValue({ success: true });
      renderWithProviders(<LoginScreen />);
      change('Email', 'member@example.com');
      change('Password', 'Password1!');
      fireEvent.press(screen.getByText('Sign In'));
      await waitFor(() => expect(auth.login).toHaveBeenCalledWith('member@example.com', 'Password1!'));
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });

    it('routes unverified accounts to email verification', async () => {
      auth.login.mockResolvedValue({ success: false, verificationRequired: true });
      renderWithProviders(<LoginScreen />);
      change('Email', 'verify@example.com');
      change('Password', 'Password1!');
      fireEvent.press(screen.getByText('Sign In'));
      await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/verify-email', params: { email: 'verify@example.com' },
      }));
    });

    it('shows normalized login errors', async () => {
      auth.login.mockResolvedValue({ success: false, error: 'Invalid credentials' });
      renderWithProviders(<LoginScreen />);
      change('Email', 'member@example.com');
      change('Password', 'wrong');
      fireEvent.press(screen.getByText('Sign In'));
      expect(await screen.findByText('Invalid credentials')).toBeOnTheScreen();
    });

    it('navigates to password recovery, registration, and the public home page', () => {
      renderWithProviders(<LoginScreen />);
      fireEvent.press(screen.getByText('Forgot Password?'));
      fireEvent.press(screen.getByText("Don't have an account? Sign Up"));
      fireEvent.press(screen.getByText('Back to Home'));
      expect(mockRouter.push).toHaveBeenNthCalledWith(1, '/forgot-password');
      expect(mockRouter.push).toHaveBeenNthCalledWith(2, '/register');
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });

  describe('AcceptInviteScreen', () => {
    it('shows invitation details and prompts a signed-out visitor to create an account', async () => {
      useLocalSearchParams.mockReturnValue({ token: 'secure-invite-token' });
      authAPI.getInvitationDetails.mockResolvedValue({
        firstName: 'Maya', lastName: 'Member', maskedEmail: 'm***@example.com',
      });
      renderWithProviders(<AcceptInviteScreen />);
      expect(await screen.findByText(/Welcome, Maya Member/)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeOnTheScreen();
      expect(auth.acceptInvitation).not.toHaveBeenCalled();
    });

    it('lets the signed-in user consent and accept', async () => {
      useLocalSearchParams.mockReturnValue({ token: 'secure-invite-token' });
      auth.isAuthenticated = true;
      auth.user = { email: 'maya@example.com' };
      auth.acceptInvitation.mockResolvedValue({ success: true });
      authAPI.getInvitationDetails.mockResolvedValue({
        firstName: 'Maya', lastName: 'Member', maskedEmail: 'm***@example.com',
      });
      renderWithProviders(<AcceptInviteScreen />);
      expect(await screen.findByText(/Welcome, Maya Member/)).toBeOnTheScreen();
      fireEvent.press(screen.getAllByRole('checkbox')[0]);
      fireEvent.press(screen.getByText('Accept invitation'));
      await waitFor(() => expect(auth.acceptInvitation).toHaveBeenCalledWith('secure-invite-token'));
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  describe('RegisterScreen', () => {
    function acceptTerms() { fireEvent.press(screen.getAllByRole('checkbox')[0]); }
    function fillValidRegistration() {
      change('First Name *', 'Maya'); change('Last Name *', 'Member');
      change('Email *', 'member@example.com');
      change('Password *', 'StrongPass1!'); change('Confirm Password *', 'StrongPass1!');
    }

    it('keeps submission disabled until age and terms are accepted', () => {
      renderWithProviders(<RegisterScreen />);
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeDisabled();
    });

    it('submits consent fields and opens verification when required', async () => {
      auth.register.mockResolvedValue({ success: true, email: 'member@example.com', verificationRequired: true });
      renderWithProviders(<RegisterScreen />);
      acceptTerms();
      fillValidRegistration();
      fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));
      await waitFor(() => expect(auth.register).toHaveBeenCalledWith(expect.objectContaining({
        email: 'member@example.com', firstName: 'Maya', ageConfirmed: true, acceptedTerms: true,
      })));
      expect(mockRouter.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/verify-email' }));
    });
  });

  describe('VerifyEmailScreen', () => {
    it('calls checkEmailVerified and navigates to tabs on success', async () => {
      useLocalSearchParams.mockReturnValue({ email: 'verify@example.com' });
      auth.checkEmailVerified.mockResolvedValue({ success: true });
      renderWithProviders(<VerifyEmailScreen />);
      fireEvent.press(screen.getByText("I've verified my email"));
      await waitFor(() => expect(auth.checkEmailVerified).toHaveBeenCalled());
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });

    it('shows a verification failure', async () => {
      useLocalSearchParams.mockReturnValue({ email: 'verify@example.com' });
      auth.checkEmailVerified.mockResolvedValue({ success: false, error: 'Not verified yet' });
      renderWithProviders(<VerifyEmailScreen />);
      fireEvent.press(screen.getByText("I've verified my email"));
      await waitFor(() => expect(screen.getAllByText('Not verified yet').length).toBeGreaterThan(0));
    });
  });

  describe('ForgotPasswordScreen', () => {
    it('validates email and submits via auth context', async () => {
      auth.forgotPassword.mockResolvedValue({ success: true, message: 'Link sent.' });
      renderWithProviders(<ForgotPasswordScreen />);
      fireEvent.press(screen.getByText('Send Reset Link'));
      expect(screen.getByText('Enter your email address.')).toBeOnTheScreen();
      change('Email', 'member@example.com');
      fireEvent.press(screen.getByText('Send Reset Link'));
      await waitFor(() => expect(auth.forgotPassword).toHaveBeenCalledWith('member@example.com'));
      expect(await screen.findByText('Link sent.')).toBeOnTheScreen();
    });
  });
});
