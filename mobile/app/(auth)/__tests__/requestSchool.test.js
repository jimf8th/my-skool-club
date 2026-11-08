import React from 'react';
import { mockRouter } from 'expo-router';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../../test/test-utils';
import { schoolRequestsAPI } from '../../../services/api';
import RequestSchoolScreen from '../request-school';

jest.mock('expo-router');
jest.mock('../../../services/api', () => ({
  schoolRequestsAPI: { submit: jest.fn() },
}));

const values = {
  'First name': '  Maya  ',
  'Last name': '  Member  ',
  'Contact phone number': '  602-555-0101  ',
  'Administrator email': '  maya@example.com  ',
  'School name': '  Desert View School  ',
  'School description': '  A neighborhood public school.  ',
  'Street address': '  100 Main Street  ',
  City: '  Phoenix  ',
  'State or region': '  Arizona  ',
  'ZIP or postal code': '  85001  ',
  'Main school phone': '  602-555-0102  ',
  'School website': '  https://desertview.example  ',
};

describe('RequestSchoolScreen', () => {
  beforeEach(() => {
    schoolRequestsAPI.submit.mockReset();
    Object.values(mockRouter).forEach((value) => value?.mockClear?.());
  });

  it('requires all school information before submission', () => {
    renderWithProviders(<RequestSchoolScreen />);

    fireEvent.press(screen.getByText('Submit for approval'));

    expect(screen.getByText('Complete every field before submitting.')).toBeOnTheScreen();
    expect(schoolRequestsAPI.submit).not.toHaveBeenCalled();
  });

  it('submits trimmed data and explains that approval is required', async () => {
    schoolRequestsAPI.submit.mockResolvedValue({ id: 42, status: 'PENDING' });
    renderWithProviders(<RequestSchoolScreen />);

    for (const [label, value] of Object.entries(values)) {
      fireEvent.changeText(screen.getByLabelText(label), value);
    }
    fireEvent.press(screen.getByText('Submit for approval'));

    await waitFor(() => expect(schoolRequestsAPI.submit).toHaveBeenCalledWith({
      firstName: 'Maya',
      lastName: 'Member',
      contactPhone: '602-555-0101',
      adminEmail: 'maya@example.com',
      schoolName: 'Desert View School',
      description: 'A neighborhood public school.',
      address: '100 Main Street',
      city: 'Phoenix',
      state: 'Arizona',
      postalCode: '85001',
      schoolPhone: '602-555-0102',
      website: 'https://desertview.example',
    }));
    expect(await screen.findByText('Request submitted')).toBeOnTheScreen();
    expect(screen.getByText(/must approve your request before the school is created and becomes active/i)).toBeOnTheScreen();
  }, 15000);
});
