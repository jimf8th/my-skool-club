/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { accountService, authService, setOnUnauthorized } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const clearAuthState = () => {
      if (!active) return;
      setIsAuthenticated(false);
      setUser(null);
    };

    setOnUnauthorized(clearAuthState);

    const restoreSession = async () => {
      const hasStoredSession = authService.isAuthenticated();
      const cachedUser = authService.getUser();

      if (!hasStoredSession) {
        if (active) setLoading(false);
        return;
      }

      try {
        const currentUser = await accountService.getCurrentAccount();
        authService.updateStoredUser(currentUser);
        if (active) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        if (error.response?.status !== 401 && cachedUser && active) {
          // Keep a previously valid session usable during a temporary outage.
          setUser(cachedUser);
          setIsAuthenticated(true);
        } else if (error.response?.status !== 401) {
          authService.logout();
          clearAuthState();
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      active = false;
      setOnUnauthorized(null);
    };
  }, []);

  const login = async (email, password) => {
    try {
      await authService.login(email, password);
      setIsAuthenticated(true);
      setUser(authService.getUser());
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
        status: error.response?.status,
        verificationRequired: error.response?.status === 403,
      };
    }
  };

  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      if (!data.verificationRequired) {
        await authService.login(userData.email, userData.password);
        setIsAuthenticated(true);
        setUser(authService.getUser());
      }
      return {
        success: true,
        email: data.email,
        verificationRequired: data.verificationRequired,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const verifyEmail = async (email, code) => {
    try {
      await authService.verifyEmail(email, code);
      setIsAuthenticated(true);
      setUser(authService.getUser());
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Verification failed',
      };
    }
  };

  const resendVerification = async (email) => {
    try {
      const data = await authService.resendVerification(email);
      return { success: true, message: data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Could not resend the code',
      };
    }
  };

  const acceptInvitation = async (invitationData) => {
    try {
      await authService.acceptInvitation(invitationData);
      setIsAuthenticated(true);
      setUser(authService.getUser());
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Could not create your account.',
      };
    }
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const deleteAccount = async (password) => {
    try {
      await accountService.deleteAccount(password);
      authService.logout();
      setIsAuthenticated(false);
      setUser(null);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Could not delete your account. Please try again.',
      };
    }
  };

  const isAppAdmin = user?.appRole === 'APP_ADMIN';

  return (
    <AuthContext.Provider value={{
      isAuthenticated, isAppAdmin, user, loading, login, register, verifyEmail, resendVerification, acceptInvitation, logout, deleteAccount,
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
