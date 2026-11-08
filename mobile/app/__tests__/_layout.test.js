import React from 'react';
import { render } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import RootLayout from '../_layout';
import { useAuth } from '../../context/AuthContext';

jest.mock('expo-router');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
}));
jest.mock('react-native-paper', () => ({
  MD3DarkTheme: { colors: {} },
  MD3LightTheme: { colors: {} },
  PaperProvider: ({ children }) => children,
  configureFonts: (config) => config,
}));
jest.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: jest.fn(),
}));

describe('RootLayout protected routing', () => {
  beforeEach(() => {
    Stack.Protected.mockClear();
    Stack.Screen.mockClear();
  });

  it('mounts no route while the stored session is being checked', () => {
    useAuth.mockReturnValue({ loading: true, isAuthenticated: false });

    const tree = render(<RootLayout />);

    expect(tree.toJSON()).toBeNull();
    expect(Stack.Protected).not.toHaveBeenCalled();
  });

  it('guards authenticated routes for signed-out users', () => {
    useAuth.mockReturnValue({ loading: false, isAuthenticated: false });

    render(<RootLayout />);

    expect(Stack.Protected.mock.calls.map(([props]) => props.guard)).toEqual([true, false]);
  });

  it('guards authentication routes for signed-in users', () => {
    useAuth.mockReturnValue({ loading: false, isAuthenticated: true });

    render(<RootLayout />);

    expect(Stack.Protected.mock.calls.map(([props]) => props.guard)).toEqual([false, true]);
  });
});
