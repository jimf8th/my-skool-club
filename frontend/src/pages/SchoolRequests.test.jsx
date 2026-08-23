import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ list: vi.fn(), approve: vi.fn(), reject: vi.fn() }));
vi.mock('../services/api', () => ({ schoolRequestsService: api }));

import SchoolRequests from './SchoolRequests';

const request = {
  id: 42, status: 'PENDING', firstName: 'Maya', lastName: 'Member',
  adminEmail: 'maya@example.com', contactPhone: '602-555-0101',
  schoolName: 'Desert View School', description: 'A public school.',
  address: '100 Main Street', city: 'Phoenix', state: 'Arizona', postalCode: '85001',
  schoolPhone: '602-555-0102', website: 'https://desertview.example',
  createdAt: '2026-08-22T12:00:00',
};

describe('SchoolRequests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    api.list.mockReset().mockResolvedValue([request]);
    api.approve.mockReset().mockResolvedValue({ ...request, status: 'APPROVED' });
    api.reject.mockReset().mockResolvedValue({ ...request, status: 'REJECTED' });
  });

  it('lists and approves a pending request after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SchoolRequests />);

    expect(await screen.findByText('Desert View School')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith('PENDING');
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(api.approve).toHaveBeenCalledWith(42));
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('sends the app administrator rejection reason', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue(' School information could not be verified. ');
    render(<SchoolRequests />);
    await screen.findByText('Desert View School');

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() => expect(api.reject).toHaveBeenCalledWith(
      42, 'School information could not be verified.'
    ));
  });
});
