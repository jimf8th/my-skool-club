import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const submit = vi.hoisted(() => vi.fn());
vi.mock('../services/api', () => ({ schoolRequestsService: { submit } }));

import RequestSchool from './RequestSchool';

describe('RequestSchool', () => {
  beforeEach(() => submit.mockReset());

  it('submits the complete public request and explains the approval gate', async () => {
    submit.mockResolvedValue({ id: 42, status: 'PENDING' });
    render(<MemoryRouter><RequestSchool /></MemoryRouter>);

    const values = {
      'First name': ' Maya ', 'Last name': ' Member ',
      'Contact phone number': ' 602-555-0101 ', 'Administrator email': ' maya@example.com ',
      'School name': ' Desert View School ', 'School description': ' A public school. ',
      'Street address': ' 100 Main Street ', City: ' Phoenix ',
      'State or region': ' Arizona ', 'ZIP or postal code': ' 85001 ',
      'Main school phone': ' 602-555-0102 ', 'School website': ' https://desertview.example ',
    };
    for (const [label, value] of Object.entries(values)) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Submit for approval' }));

    await waitFor(() => expect(submit).toHaveBeenCalledWith({
      firstName: 'Maya', lastName: 'Member', contactPhone: '602-555-0101',
      adminEmail: 'maya@example.com', schoolName: 'Desert View School',
      description: 'A public school.', address: '100 Main Street', city: 'Phoenix',
      state: 'Arizona', postalCode: '85001', website: 'https://desertview.example',
      schoolPhone: '602-555-0102',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'must review and approve your request before the school is created and becomes active'
    );
  });
});
