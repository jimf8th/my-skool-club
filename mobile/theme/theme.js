import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

// Inter is the app-wide font. react-native-paper's typography scale is mapped
// onto the loaded Inter weights so buttons/labels (500) and titles (600/700)
// stay consistent with the rest of the app.
const baseFont = { fontFamily: 'Inter_400Regular' };
const fontConfig = {
  displayLarge: { ...baseFont, fontFamily: 'Inter_700Bold' },
  displayMedium: { ...baseFont, fontFamily: 'Inter_700Bold' },
  displaySmall: { ...baseFont, fontFamily: 'Inter_700Bold' },
  headlineLarge: { ...baseFont, fontFamily: 'Inter_700Bold' },
  headlineMedium: { ...baseFont, fontFamily: 'Inter_700Bold' },
  headlineSmall: { ...baseFont, fontFamily: 'Inter_700Bold' },
  titleLarge: { ...baseFont, fontFamily: 'Inter_600SemiBold' },
  titleMedium: { ...baseFont, fontFamily: 'Inter_600SemiBold' },
  titleSmall: { ...baseFont, fontFamily: 'Inter_600SemiBold' },
  labelLarge: { ...baseFont, fontFamily: 'Inter_500Medium' },
  labelMedium: { ...baseFont, fontFamily: 'Inter_500Medium' },
  labelSmall: { ...baseFont, fontFamily: 'Inter_500Medium' },
  bodyLarge: baseFont,
  bodyMedium: baseFont,
  bodySmall: baseFont,
};
const fonts = configureFonts({ config: fontConfig });

export const lightTheme = {
  ...MD3LightTheme,
  fonts,
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
  fonts,
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
