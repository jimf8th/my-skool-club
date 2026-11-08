import React from 'react';
import { mockRouter } from 'expo-router';
import { fireEvent, renderWithProviders, screen } from '../../../test/test-utils';
import {
  openAbout,
  openCommunityStandards,
  openPrivacyPolicy,
  openTerms,
} from '../../../utils/legalLinks';
import PublicHomeScreen from '../index';

jest.mock('expo-router');
jest.mock('../../../utils/legalLinks', () => ({
  openAbout: jest.fn(),
  openCommunityStandards: jest.fn(),
  openPrivacyPolicy: jest.fn(),
  openTerms: jest.fn(),
}));

describe('PublicHomeScreen', () => {
  beforeEach(() => {
    Object.values(mockRouter).forEach((value) => value?.mockClear?.());
  });

  it('introduces the product and its core experiences', () => {
    renderWithProviders(<PublicHomeScreen />);

    expect(screen.getByText('School life,\nbeautifully organized.')).toBeOnTheScreen();
    expect(screen.getByText('Find your people')).toBeOnTheScreen();
    expect(screen.getByText('Never miss a moment')).toBeOnTheScreen();
    expect(screen.getByText('Run clubs with clarity')).toBeOnTheScreen();
    expect(screen.getByText('Your community is waiting.')).toBeOnTheScreen();
  });

  it('opens sign-in and registration from the hero actions', () => {
    renderWithProviders(<PublicHomeScreen />);

    fireEvent.press(screen.getByLabelText('Sign in to My Skool Club'));
    fireEvent.press(screen.getByLabelText('Create a My Skool Club account'));

    expect(mockRouter.push).toHaveBeenNthCalledWith(1, '/login');
    expect(mockRouter.push).toHaveBeenNthCalledWith(2, '/register');
  });

  it('opens the public school request form', () => {
    renderWithProviders(<PublicHomeScreen />);

    fireEvent.press(screen.getByText('Request Your School'));

    expect(mockRouter.push).toHaveBeenCalledWith('/request-school');
  });

  it('offers registration and sign-in again at the final call to action', () => {
    renderWithProviders(<PublicHomeScreen />);

    fireEvent.press(screen.getByLabelText('Get started with My Skool Club'));
    fireEvent.press(screen.getByLabelText('Already a member? Sign in'));

    expect(mockRouter.push).toHaveBeenNthCalledWith(1, '/register');
    expect(mockRouter.push).toHaveBeenNthCalledWith(2, '/login');
  });

  it('opens each public policy destination', () => {
    renderWithProviders(<PublicHomeScreen />);

    fireEvent.press(screen.getByText('Terms'));
    fireEvent.press(screen.getByText('Privacy'));
    fireEvent.press(screen.getByText('Community Standards'));

    expect(openTerms).toHaveBeenCalledTimes(1);
    expect(openPrivacyPolicy).toHaveBeenCalledTimes(1);
    expect(openCommunityStandards).toHaveBeenCalledTimes(1);
  });

  it('opens the website About page', () => {
    renderWithProviders(<PublicHomeScreen />);

    fireEvent.press(screen.getByLabelText('About My Skool Club'));

    expect(openAbout).toHaveBeenCalledTimes(1);
  });
});
