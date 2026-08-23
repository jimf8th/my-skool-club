import React from 'react';
import { Text } from 'react-native-paper';
import { appAdminUser, buildFixture } from '../fixtures';
import { renderWithProviders, screen } from '../test-utils';

describe('mobile test harness', () => {
  it('renders components with the application providers', () => {
    const admin = buildFixture(appAdminUser, { firstName: 'Test' });

    renderWithProviders(<Text>Welcome, {admin.firstName}</Text>);

    expect(screen.getByText('Welcome, Test')).toBeOnTheScreen();
  });
});
