import React, { createContext, useState, useContext, useEffect } from 'react';
import { accountAPI, authAPI, setOnUnauthorized } from '../services/api';
import { clearAuthSession, getAuthToken, getCachedUser, setAuthSession, setCachedUser } from '../utils/authStorage';
import { getFriendlyErrorMessage } from '../utils/errors';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Register the 401 handler before validating the stored session so an
    // expired token clears both persistent and in-memory authentication.
    setOnUnauthorized(() => {
      setToken(null);
      setUser(null);
    });

    checkAuth();

    return () => setOnUnauthorized(null);
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await getAuthToken();
      const storedUser = await getCachedUser();
      if (!storedToken) return;

      try {
        // Do not mount authenticated tabs based solely on cached credentials.
        // This catches expired tokens, server secret rotations, disabled users,
        // and accounts deleted from another device.
        const currentUser = await accountAPI.getCurrentAccount();
        await setCachedUser(currentUser);
        setToken(storedToken);
        setUser(currentUser);
      } catch (error) {
        if (error.response?.status === 401) {
          return;
        }

        // Preserve an existing session during a temporary network outage. API
        // requests can retry when connectivity returns.
        if (storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      }
    } catch (error) {
      // Leave the user signed out. Avoid sending storage internals to the
      // React Native error overlay.
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, ...userInfo } = response;
      await setAuthSession(token, userInfo);
      setToken(token);
      setUser(userInfo);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getFriendlyErrorMessage(error, 'Login failed. Please try again.'),
        status: error.response?.status,
        verificationRequired: error.response?.status === 403,
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      if (!response.verificationRequired) {
        const authResponse = await authAPI.login(userData.email, userData.password);
        const { token: registeredToken, ...userInfo } = authResponse;
        await setAuthSession(registeredToken, userInfo);
        setToken(registeredToken);
        setUser(userInfo);
      }
      return {
        success: true,
        email: response.email,
        verificationRequired: response.verificationRequired,
      };
    } catch (error) {
      return {
        success: false,
        error: getFriendlyErrorMessage(error, 'Registration failed. Please try again.')
      };
    }
  };

  const verifyEmail = async (email, code) => {
    try {
      const response = await authAPI.verifyEmail(email, code);
      const { token: verifiedToken, ...userInfo } = response;
      await setAuthSession(verifiedToken, userInfo);
      setToken(verifiedToken);
      setUser(userInfo);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getFriendlyErrorMessage(error, 'Verification failed. Please try again.'),
      };
    }
  };

  const resendVerification = async (email) => {
    try {
      const response = await authAPI.resendVerification(email);
      return { success: true, message: response.message };
    } catch (error) {
      return {
        success: false,
        error: getFriendlyErrorMessage(error, 'Could not resend the code. Please try again.'),
      };
    }
  };

  const acceptInvitation = async (invitationData) => {
    try {
      const response = await authAPI.acceptInvitation(invitationData);
      const { token: invitationToken, ...userInfo } = response;
      await setAuthSession(invitationToken, userInfo);
      setToken(invitationToken);
      setUser(userInfo);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getFriendlyErrorMessage(error, 'Could not create your account. Please try again.'),
      };
    }
  };

  const logout = async () => {
    try {
      await clearAuthSession();
      setToken(null);
      setUser(null);
    } catch (error) {
      // Keep the failure out of the in-app error overlay.
    }
  };

  const deleteAccount = async (password) => {
    try {
      await accountAPI.deleteAccount(password);
    } catch (error) {
      return {
        success: false,
        error: getFriendlyErrorMessage(error, 'Could not delete your account. Please try again.'),
      };
    }

    try {
      await clearAuthSession();
    } catch (error) {
      // The server has already deleted the account, so always clear in-memory
      // authentication even if local storage cleanup unexpectedly fails.
    } finally {
      setToken(null);
      setUser(null);
    }

    return { success: true };
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    verifyEmail,
    resendVerification,
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
