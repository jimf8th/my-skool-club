import React, { createContext, useState, useContext, useEffect } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { accountAPI, authAPI, setOnUnauthorized } from '../services/api';
import { clearAuthSession, getCachedUser, setCachedUser } from '../utils/authStorage';
import {
  firebaseAuth,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from '../services/firebase';
import { getFriendlyErrorMessage } from '../utils/errors';

const AuthContext = createContext(null);

// iOS client ID from Google Cloud Console.
const GOOGLE_IOS_CLIENT_ID = '1020171079797-d0opi02bv54l0fqjp8lab396sch1h6g2.apps.googleusercontent.com';

GoogleSignin.configure({ iosClientId: GOOGLE_IOS_CLIENT_ID });

const FIREBASE_ERROR_MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/email-already-in-use': 'Email already in use.',
  'auth/weak-password': 'Please choose a stronger password.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

function friendlyError(error, fallback) {
  return FIREBASE_ERROR_MESSAGES[error?.code]
    || getFriendlyErrorMessage(error, fallback);
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
        await clearAuthSession().catch(() => {});
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        const profile = await authAPI.syncSession();
        await setCachedUser(profile);
        if (active) setUser(profile.emailVerified ? profile : null);
      } catch (error) {
        // 428 = Firebase identity without an app account; explicit sign-in
        // flows collect consent. A network failure keeps the cached session
        // usable during a temporary outage.
        const cached = await getCachedUser().catch(() => null);
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
      const profile = await authAPI.syncSession(consent);
      if (!profile.emailVerified) {
        return { success: false, verificationRequired: true };
      }
      await setCachedUser(profile);
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
      return { success: false, error: friendlyError(error, 'Login failed. Please try again.') };
    }
  };

  const loginWithGoogleIdToken = async (idToken) => {
    try {
      await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(idToken));
      return await establishSession();
    } catch (error) {
      return { success: false, error: friendlyError(error, 'Google sign-in failed. Please try again.') };
    }
  };

  const loginWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false }).catch(() => {});
      const { data } = await GoogleSignin.signIn();
      return await loginWithGoogleIdToken(data.idToken);
    } catch (error) {
      if (error?.code === 12 /* SIGN_IN_CANCELLED */) {
        return { success: false, error: 'Sign-in was cancelled.' };
      }
      return { success: false, error: friendlyError(error, 'Google sign-in failed. Please try again.') };
    }
  };

  const loginWithApple = async () => {
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      const provider = new OAuthProvider('apple.com');
      await signInWithCredential(firebaseAuth, provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce,
      }));
      return await establishSession();
    } catch (error) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return { success: false, error: 'Sign-in was cancelled.' };
      }
      return { success: false, error: friendlyError(error, 'Apple sign-in failed. Please try again.') };
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
      await authAPI.syncSession({
        ageConfirmed: userData.ageConfirmed,
        acceptedTerms: userData.acceptedTerms,
        firstName: userData.firstName,
        lastName: userData.lastName,
        graduationYear: userData.graduationYear,
      });
      await sendEmailVerification(credential.user).catch(() => {});
      return { success: true, email: userData.email, verificationRequired: true };
    } catch (error) {
      return { success: false, error: friendlyError(error, 'Registration failed. Please try again.') };
    }
  };

  // Called from the verification screen after the user opens the email link.
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
      const profile = await authAPI.acceptInvitation(
        token, { ageConfirmed: true, acceptedTerms: true });
      await setCachedUser(profile);
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
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      // Keep the failure out of the in-app error overlay.
    }
    await clearAuthSession().catch(() => {});
    setUser(null);
  };

  const deleteAccount = async () => {
    try {
      await accountAPI.deleteAccount();
    } catch (error) {
      return {
        success: false,
        error: friendlyError(error, 'Could not delete your account. Please try again.'),
      };
    }
    await logout();
    return { success: true };
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    loginWithGoogleIdToken,
    loginWithApple,
    completeConsent,
    register,
    checkEmailVerified,
    resendVerification,
    forgotPassword,
    acceptInvitation,
    logout,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
