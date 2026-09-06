import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const create = vi.hoisted(() => vi.fn());
vi.mock('../services/api', () => ({ contentReportsService: { create } }));

import ReportContentModal from './ReportContentModal';

describe('ReportContentModal', () => {
  it('submits the selected reason and optional details', async () => {
    create.mockResolvedValue({ id: 9 });
    const onClose = vi.fn();
    const onSubmitted = vi.fn();
    render(<ReportContentModal contentType="EVENT" contentId={42} onClose={onClose} onSubmitted={onSubmitted} />);

    fireEvent.click(screen.getByRole('button', { name: 'Spam or scam' }));
    fireEvent.change(screen.getByPlaceholderText('Optional details for the reviewer'), { target: { value: 'Repeated promotion' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith('EVENT', 42, 'SPAM', 'Repeated promotion'));
    expect(onSubmitted).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
