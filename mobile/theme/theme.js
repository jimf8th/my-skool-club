import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563eb',
    primaryContainer: '#dbeafe',
    secondary: '#7c3aed',
    secondaryContainer: '#ede9fe',
    background: '#ffffff',
    surface: '#f9fafb',
    error: '#dc2626',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onBackground: '#111827',
    onSurface: '#111827',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#60a5fa',
    primaryContainer: '#1e40af',
    secondary: '#a78bfa',
    secondaryContainer: '#5b21b6',
    background: '#111827',
    surface: '#1f2937',
    error: '#ef4444',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onBackground: '#f9fafb',
    onSurface: '#f9fafb',
  },
};
