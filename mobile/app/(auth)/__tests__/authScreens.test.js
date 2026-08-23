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
import ResetPasswordScreen from '../reset-password';
import AcceptInviteScreen from '../accept-invite';

jest.mock('expo-router');
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../services/api', () => ({
  authAPI: {
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    getInvitationDetails: jest.fn(),
    sendInvitationCode: jest.fn(),
  },
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
      register: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerification: jest.fn(),
      acceptInvitation: jest.fn(),
    };
    useAuth.mockReturnValue(auth);
    useLocalSearchParams.mockReturnValue({});
    authAPI.forgotPassword.mockReset();
    authAPI.resetPassword.mockReset();
    authAPI.getInvitationDetails.mockReset();
    authAPI.sendInvitationCode.mockReset();
    Object.values(mockRouter).forEach((value) => value?.mockClear?.());
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
        pathname: '/verify-email',
        params: { email: 'verify@example.com' },
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
    it('requires the separately emailed code before creating an invited account', async () => {
      useLocalSearchParams.mockReturnValue({ token: 'secure-invite-token' });
      authAPI.getInvitationDetails.mockResolvedValue({
        firstName: 'Maya', lastName: 'Member', maskedEmail: 'm***@example.com',
      });
      authAPI.sendInvitationCode.mockResolvedValue({ message: 'Verification code sent.' });
      auth.acceptInvitation.mockResolvedValue({ success: true });
      renderWithProviders(<AcceptInviteScreen />);

      expect(await screen.findByText(/Welcome, Maya Member/)).toBeOnTheScreen();
      fireEvent.press(screen.getByText('Email My Verification Code'));
      expect(await screen.findByText('Verification code sent.')).toBeOnTheScreen();

      change('Invitation verification code', '123456');
      change('Invitation password', 'StrongPassword1!');
      change('Confirm invitation password', 'StrongPassword1!');
      fireEvent.press(screen.getAllByRole('checkbox')[0]);
      fireEvent.press(screen.getByText('Create Account'));

      await waitFor(() => expect(auth.acceptInvitation).toHaveBeenCalledWith({
        token: 'secure-invite-token',
        code: '123456',
        password: 'StrongPassword1!',
        ageConfirmed: true,
        acceptedTerms: true,
      }));
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  describe('RegisterScreen', () => {
    function acceptTerms() {
      fireEvent.press(screen.getAllByRole('checkbox')[0]);
    }

    function fillValidRegistration() {
      change('First Name *', 'Maya');
      change('Last Name *', 'Member');
      change('Email *', 'member@example.com');
      change('Password *', 'StrongPass1!');
      change('Confirm Password *', 'StrongPass1!');
    }

    it('keeps submission disabled until age and terms are accepted', () => {
      renderWithProviders(<RegisterScreen />);
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeDisabled();
    });

    it('validates required fields after terms acceptance', () => {
      renderWithProviders(<RegisterScreen />);
      acceptTerms();

      fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));

      expect(screen.getByText('Please fill in all fields')).toBeOnTheScreen();
    });

    it('displays password strength rules and rejects weak passwords', () => {
      renderWithProviders(<RegisterScreen />);
      acceptTerms();
      change('First Name *', 'Maya');
      change('Last Name *', 'Member');
      change('Email *', 'member@example.com');
      change('Password *', 'weak');
      change('Confirm Password *', 'weak');

      expect(screen.getByText('Weak')).toBeOnTheScreen();
      expect(screen.getByText('At least 8 characters')).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));
      expect(screen.getByText('Please choose a stronger password')).toBeOnTheScreen();
    });

    it('rejects mismatched passwords', () => {
      renderWithProviders(<RegisterScreen />);
      acceptTerms();
      fillValidRegistration();
      change('Confirm Password *', 'DifferentPass1!');

      expect(screen.getByText('Passwords do not match')).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));
      expect(auth.register).not.toHaveBeenCalled();
    });

    it('submits consent fields and opens verification when required', async () => {
      auth.register.mockResolvedValue({ success: true, email: 'member@example.com', verificationRequired: true });
      renderWithProviders(<RegisterScreen />);
      acceptTerms();
      fillValidRegistration();

      fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => expect(auth.register).toHaveBeenCalledWith({
        email: 'member@example.com',
        password: 'StrongPass1!',
        firstName: 'Maya',
        lastName: 'Member',
        ageConfirmed: true,
        acceptedTerms: true,
      }));
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/verify-email',
        params: { email: 'member@example.com', codeJustSent: 'true' },
      });
    });

    it('opens tabs for immediately authenticated registrations', async () => {
      auth.register.mockResolvedValue({ success: true, email: 'member@example.com', verificationRequired: false });
      renderWithProviders(<RegisterScreen />);
      acceptTerms();
      fillValidRegistration();

      fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    });

    it('shows registration failures and provides all legal links', async () => {
      auth.register.mockResolvedValue({ success: false, error: 'Email already exists' });
      renderWithProviders(<RegisterScreen />);
      acceptTerms();
      fillValidRegistration();

      fireEvent.press(screen.getByText('Terms'));
      fireEvent.press(screen.getByText('Privacy'));
      fireEvent.press(screen.getByText('Standards'));
      fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));

      expect(openTerms).toHaveBeenCalled();
      expect(openPrivacyPolicy).toHaveBeenCalled();
      expect(openCommunityStandards).toHaveBeenCalled();
      expect(await screen.findByText('Email already exists')).toBeOnTheScreen();
    });
  });

  describe('VerifyEmailScreen', () => {
    it('prefills route email, sanitizes the code, and verifies successfully', async () => {
      useLocalSearchParams.mockReturnValue({ email: 'verify@example.com' });
      auth.verifyEmail.mockResolvedValue({ success: true });
      renderWithProviders(<VerifyEmailScreen />);

      change('Six-digit code', '12a34-567');
      expect(screen.getByLabelText('Six-digit code').props.value).toBe('123456');
      fireEvent.press(screen.getByText('Verify and sign in'));

      await waitFor(() => expect(auth.verifyEmail).toHaveBeenCalledWith('verify@example.com', '123456'));
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });

    it('requires an email even with a complete code', () => {
      renderWithProviders(<VerifyEmailScreen />);
      change('Six-digit code', '123456');
      fireEvent.press(screen.getByText('Verify and sign in'));

      expect(screen.getByText('Enter your email and the six-digit verification code.')).toBeOnTheScreen();
    });

    it('shows verification failures', async () => {
      auth.verifyEmail.mockResolvedValue({ success: false, error: 'Code expired' });
      renderWithProviders(<VerifyEmailScreen />);
      change('Email', 'verify@example.com');
      change('Six-digit code', '123456');
      fireEvent.press(screen.getByText('Verify and sign in'));

      expect(await screen.findByText('Code expired')).toBeOnTheScreen();
    });

    it('requires an email before resending and displays resend success', async () => {
      auth.resendVerification.mockResolvedValue({ success: true, message: 'A new code was sent' });
      renderWithProviders(<VerifyEmailScreen />);

      fireEvent.press(screen.getByText('Send another code'));
      expect(screen.getByText('Enter your email address first.')).toBeOnTheScreen();

      change('Email', 'verify@example.com');
      fireEvent.press(screen.getByText('Send another code'));
      expect(await screen.findByText('A new code was sent')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Send another code in 60s' })).toBeDisabled();
    });

    it('starts the resend cooldown when registration just sent a code', () => {
      useLocalSearchParams.mockReturnValue({ email: 'verify@example.com', codeJustSent: 'true' });
      renderWithProviders(<VerifyEmailScreen />);

      expect(screen.getByText('We sent a six-digit code to your email.')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Send another code in 60s' })).toBeDisabled();
    });
  });

  describe('ForgotPasswordScreen', () => {
    it('validates email and submits a trimmed address', async () => {
      authAPI.forgotPassword.mockResolvedValue({});
      renderWithProviders(<ForgotPasswordScreen />);
      fireEvent.press(screen.getByText('Send Reset Code'));
      expect(screen.getByText('Enter your email address.')).toBeOnTheScreen();

      change('Email', '  member@example.com  ');
      fireEvent.press(screen.getByText('Send Reset Code'));

      await waitFor(() => expect(authAPI.forgotPassword).toHaveBeenCalledWith('member@example.com'));
      expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reset-password', params: { email: 'member@example.com' } });
    });

    it('shows server failures and supports back navigation', async () => {
      authAPI.forgotPassword.mockRejectedValue({ response: { data: { message: 'Try later' } } });
      renderWithProviders(<ForgotPasswordScreen />);
      change('Email', 'member@example.com');
      fireEvent.press(screen.getByText('Send Reset Code'));
      expect(await screen.findByText('Try later')).toBeOnTheScreen();

      fireEvent.press(screen.getByText('Back to Sign In'));
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('ResetPasswordScreen', () => {
    it('prefills email, sanitizes code, validates password, and submits', async () => {
      useLocalSearchParams.mockReturnValue({ email: 'member@example.com' });
      authAPI.resetPassword.mockResolvedValue({});
      renderWithProviders(<ResetPasswordScreen />);
      change('6-digit code', '12a34567');
      expect(screen.getByLabelText('6-digit code').props.value).toBe('123456');

      change('New password', 'short');
      fireEvent.press(screen.getByText('Update Password'));
      expect(screen.getByText('Enter your email, six-digit code, and a password of at least 8 characters.')).toBeOnTheScreen();

      change('New password', 'NewPassword1!');
      fireEvent.press(screen.getByText('Update Password'));
      await waitFor(() => expect(authAPI.resetPassword).toHaveBeenCalledWith('member@example.com', '123456', 'NewPassword1!'));
      expect(mockRouter.replace).toHaveBeenCalledWith('/login');
    });

    it('shows reset errors and returns to sign in', async () => {
      authAPI.resetPassword.mockRejectedValue({ response: { data: { message: 'Code expired' } } });
      renderWithProviders(<ResetPasswordScreen />);
      change('Email', 'member@example.com');
      change('6-digit code', '123456');
      change('New password', 'NewPassword1!');
      fireEvent.press(screen.getByText('Update Password'));
      expect(await screen.findByText('Code expired')).toBeOnTheScreen();

      fireEvent.press(screen.getByText('Back to Sign In'));
      expect(mockRouter.replace).toHaveBeenCalledWith('/login');
    });
  });
});
