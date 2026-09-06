/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { accountService, authService, setOnUnauthorized } from '../services/api';
import {
  firebaseAuth,
  googleProvider,
  appleProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from '../services/firebase';

const AuthContext = createContext(null);

const FIREBASE_ERROR_MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/email-already-in-use': 'Email already in use.',
  'auth/weak-password': 'Please choose a stronger password.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

function friendlyError(error, fallback) {
  return FIREBASE_ERROR_MESSAGES[error?.code]
    || error?.response?.data?.message
    || fallback;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setOnUnauthorized(() => {
      if (active) setUser(null);
    });

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        authService.logout();
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        const profile = await authService.syncSession();
        if (active) setUser(profile.emailVerified ? profile : null);
      } catch (error) {
        // 428 = signed into Firebase without an app account yet; the explicit
        // sign-in flows collect consent. A network failure keeps the cached
        // session usable during a temporary outage.
        const cached = authService.getUser();
        if (!error.response && cached && active) {
          setUser(cached);
        } else if (active) {
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
      setOnUnauthorized(null);
    };
  }, []);

  const establishSession = async (consent) => {
    try {
      const profile = await authService.syncSession(consent);
      if (!profile.emailVerified) {
        return { success: false, verificationRequired: true };
      }
      setUser(profile);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        consentRequired: error.response?.status === 428,
        error: friendlyError(error, 'Sign-in failed. Please try again.'),
      };
    }
  };

  const login = async (email, password) => {
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user).catch(() => {});
        return { success: false, verificationRequired: true };
      }
      return await establishSession();
    } catch (error) {
      return { success: false, error: friendlyError(error, 'Login failed') };
    }
  };

  const loginWithGoogle = () => socialLogin(googleProvider);
  const loginWithApple = () => socialLogin(appleProvider);

  const socialLogin = async (provider) => {
    try {
      await signInWithPopup(firebaseAuth, provider);
      return await establishSession();
    } catch (error) {
      return { success: false, error: friendlyError(error, 'Sign-in failed. Please try again.') };
    }
  };

  // Retries session creation with consent after a 428 response.
  const completeConsent = () =>
    establishSession({ ageConfirmed: true, acceptedTerms: true });

  const register = async (userData) => {
    try {
      const credential = await createUserWithEmailAndPassword(
        firebaseAuth, userData.email, userData.password);
      await updateProfile(credential.user, {
        displayName: `${userData.firstName} ${userData.lastName}`.trim(),
      }).catch(() => {});
      // Record consent and profile before verification completes.
      await authService.syncSession({
        ageConfirmed: userData.ageConfirmed,
        acceptedTerms: userData.acceptedTerms,
        firstName: userData.firstName,
        lastName: userData.lastName,
        graduationYear: userData.graduationYear,
      });
      await sendEmailVerification(credential.user).catch(() => {});
      return { success: true, email: userData.email, verificationRequired: true };
    } catch (error) {
      return { success: false, error: friendlyError(error, 'Registration failed') };
    }
  };

  // Called from the verification screen after the user clicks the email link.
  const checkEmailVerified = async () => {
    const firebaseUser = firebaseAuth.currentUser;
    if (!firebaseUser) {
      return { success: false, error: 'Sign in first, then verify your email.' };
    }
    await firebaseUser.reload();
    if (!firebaseUser.emailVerified) {
      return { success: false, error: 'This email is not verified yet. Use the link we sent you.' };
    }
    await firebaseUser.getIdToken(true);
    return establishSession();
  };

  const resendVerification = async () => {
    const firebaseUser = firebaseAuth.currentUser;
    if (!firebaseUser) {
      return { success: false, error: 'Sign in first to request a new link.' };
    }
    try {
      await sendEmailVerification(firebaseUser);
      return { success: true, message: 'Verification link sent. Check your inbox.' };
    } catch (error) {
      return { success: false, error: friendlyError(error, 'Could not send the link. Try again shortly.') };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      return { success: true, message: 'If an eligible account exists, a password reset link has been sent.' };
    } catch (error) {
      // Do not reveal whether the account exists.
      if (error?.code === 'auth/user-not-found') {
        return { success: true, message: 'If an eligible account exists, a password reset link has been sent.' };
      }
      return { success: false, error: friendlyError(error, 'Could not send the reset link.') };
    }
  };

  const acceptInvitation = async (token) => {
    try {
      const profile = await authService.acceptInvitation(
        token, { ageConfirmed: true, acceptedTerms: true });
      setUser(profile);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: friendlyError(error, 'Could not accept the invitation.'),
      };
    }
  };

  const logout = async () => {
    await signOut(firebaseAuth).catch(() => {});
    authService.logout();
    setUser(null);
  };

  const deleteAccount = async () => {
    try {
      await accountService.deleteAccount();
      await logout();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: friendlyError(error, 'Could not delete your account. Please try again.'),
      };
    }
  };

  const isAppAdmin = user?.appRole === 'APP_ADMIN';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      isAuthenticated, isAppAdmin, user, loading,
      login, loginWithGoogle, loginWithApple, completeConsent,
      register, checkEmailVerified, resendVerification, forgotPassword,
      acceptInvitation, logout, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
