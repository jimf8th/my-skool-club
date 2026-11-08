import React from 'react';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../test/test-utils';
import { contentReportsAPI } from '../../services/api';
import ReportContentModal from '../ReportContentModal';

jest.mock('../../services/api', () => ({
  contentReportsAPI: { create: jest.fn() },
}));

const defaultProps = {
  visible: true,
  contentType: 'ANNOUNCEMENT',
  contentId: 42,
  onClose: jest.fn(),
  onSubmitted: jest.fn(),
};

function renderModal(props = {}) {
  return renderWithProviders(<ReportContentModal {...defaultProps} {...props} />);
}

describe('ReportContentModal', () => {
  beforeEach(() => {
    contentReportsAPI.create.mockReset().mockResolvedValue({ id: 1 });
    defaultProps.onClose.mockReset();
    defaultProps.onSubmitted.mockReset();
  });

  it('explains confidentiality, offers every reason, and starts disabled', () => {
    renderModal();
    expect(screen.getByText('Reports are confidential and reviewed by My Skool Club app administrators.')).toBeOnTheScreen();
    for (const label of [
      'Harassment or bullying', 'Hate speech', 'Sexual content', 'Violence or threat',
      'Self-harm', 'Spam or scam', 'Personal information', 'Impersonation', 'Other',
    ]) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
    fireEvent.press(screen.getByText('Submit Report'));
    expect(contentReportsAPI.create).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Optional details for the reviewer').props.maxLength).toBe(1000);
  });

  it.each([
    ['ANNOUNCEMENT', 42],
    ['EVENT', 73],
  ])('submits the selected reason for %s content', async (contentType, contentId) => {
    renderModal({ contentType, contentId });
    fireEvent.press(screen.getByText('Spam or scam'));
    fireEvent.changeText(screen.getByPlaceholderText('Optional details for the reviewer'), '  Repeated promotion  ');
    fireEvent.press(screen.getByText('Submit Report'));

    await waitFor(() => expect(contentReportsAPI.create).toHaveBeenCalledWith(
      contentType, contentId, 'SPAM', 'Repeated promotion'
    ));
    expect(defaultProps.onSubmitted).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('sends null when optional details contain only whitespace', async () => {
    renderModal();
    fireEvent.press(screen.getByText('Other'));
    fireEvent.changeText(screen.getByPlaceholderText('Optional details for the reviewer'), '   ');
    fireEvent.press(screen.getByText('Submit Report'));

    await waitFor(() => expect(contentReportsAPI.create).toHaveBeenCalledWith(
      'ANNOUNCEMENT', 42, 'OTHER', null
    ));
  });

  it('shows the server error, keeps the form open, and permits a retry', async () => {
    contentReportsAPI.create
      .mockRejectedValueOnce({ response: { data: { message: 'This report was already submitted.' } } })
      .mockResolvedValueOnce({ id: 2 });
    renderModal();
    fireEvent.press(screen.getByText('Hate speech'));
    fireEvent.press(screen.getByText('Submit Report'));

    expect(await screen.findByText('This report was already submitted.')).toBeOnTheScreen();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Submit Report'));
    await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalledTimes(1));
    expect(contentReportsAPI.create).toHaveBeenCalledTimes(2);
  });

  it('uses a safe fallback for an unexpected submission failure', async () => {
    contentReportsAPI.create.mockRejectedValueOnce(new Error('network down'));
    renderModal();
    fireEvent.press(screen.getByText('Violence or threat'));
    fireEvent.press(screen.getByText('Submit Report'));
    expect(await screen.findByText('Could not submit this report.')).toBeOnTheScreen();
  });

  it('clears the form and error when cancelled', async () => {
    contentReportsAPI.create.mockRejectedValueOnce(new Error('offline'));
    renderModal();
    fireEvent.press(screen.getByText('Impersonation'));
    fireEvent.changeText(screen.getByPlaceholderText('Optional details for the reviewer'), 'Fake account');
    fireEvent.press(screen.getByText('Submit Report'));
    await screen.findByText('Could not submit this report.');

    fireEvent.press(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText('Optional details for the reviewer').props.value).toBe('');
    expect(screen.queryByText('Could not submit this report.')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText('Submit Report'));
    expect(contentReportsAPI.create).toHaveBeenCalledTimes(1);
  });

  it('ignores close requests while the report is being saved', async () => {
    let resolveRequest;
    contentReportsAPI.create.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    renderModal();
    fireEvent.press(screen.getByText('Self-harm'));
    fireEvent.press(screen.getByText('Submit Report'));
    fireEvent.press(screen.getByLabelText('Close report form'));
    expect(defaultProps.onClose).not.toHaveBeenCalled();

    resolveRequest({ id: 3 });
    await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalledTimes(1));
  });
});
