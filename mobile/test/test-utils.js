import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { lightTheme } from '../theme/theme';

const initialSafeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function TestProviders({ children }) {
  return (
    <SafeAreaProvider initialMetrics={initialSafeAreaMetrics}>
      <PaperProvider theme={lightTheme}>{children}</PaperProvider>
    </SafeAreaProvider>
  );
}

export function renderWithProviders(ui, options = {}) {
  const { wrapper: AdditionalWrapper, ...renderOptions } = options;

  const Wrapper = ({ children }) => (
    <TestProviders>
      {AdditionalWrapper ? <AdditionalWrapper>{children}</AdditionalWrapper> : children}
    </TestProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from '@testing-library/react-native';
