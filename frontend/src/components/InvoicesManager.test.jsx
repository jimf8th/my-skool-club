import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const list = vi.hoisted(() => vi.fn());
vi.mock('../services/api', () => ({
  invoicesService: {
    list,
  },
}));

import InvoicesManager from './InvoicesManager';

describe('InvoicesManager school tier', () => {
  beforeEach(() => list.mockReset().mockResolvedValue([]));

  async function openNewInvoice(schoolTier) {
    render(<InvoicesManager
      clubId={20}
      schoolTier={schoolTier}
      currentUser={{ id: 101 }}
      canCreate
      canApprove={false}
      onClose={vi.fn()}
    />);
    fireEvent.click(await screen.findByRole('button', { name: '+ New Invoice' }));
  }

  it('disables AI receipt scanning and identifies it as Premium for Standard schools', async () => {
    await openNewInvoice('STANDARD');

    expect(screen.getByRole('button', { name: '🔒 Scan Receipt · Premium' })).toBeDisabled();
    expect(screen.getByText(/AI receipt scanning comes with Premium/)).toBeInTheDocument();
  });

  it('enables AI receipt scanning for Premium schools', async () => {
    await openNewInvoice('PREMIUM');

    expect(screen.getByRole('button', { name: '📷 Scan Receipt · Premium' })).toBeEnabled();
    expect(screen.queryByText(/AI receipt scanning comes with Premium/)).not.toBeInTheDocument();
  });
});
