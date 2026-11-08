import React from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '../../test/test-utils';
import { invoicesAPI } from '../../services/api';
import { openPrivacyPolicy } from '../../utils/legalLinks';
import InvoicesModal from '../InvoicesModal';

jest.mock('../../services/api', () => ({
  invoicesAPI: {
    approve: jest.fn(), cancel: jest.fn(), create: jest.fn(), get: jest.fn(), list: jest.fn(),
    markPaid: jest.fn(), remove: jest.fn(), scanReceipt: jest.fn(), sendBack: jest.fn(),
    submit: jest.fn(), update: jest.fn(),
  },
}));
jest.mock('../../utils/legalLinks', () => ({ openPrivacyPolicy: jest.fn() }));

const user = { id: 101, firstName: 'Maya', lastName: 'Member' };
const draft = {
  id: 30, title: 'Craft Supplies', status: 'DRAFT', totalAmount: 21,
  createdByUserId: user.id, createdByName: 'Maya Member', createdAt: '2030-01-01T12:00:00Z',
  paymentRequired: true, payeeName: 'Craft Store', payeeEmail: 'payee@example.com', notes: 'For event',
  rejectionReason: null, cancellationReason: null,
  lineItems: [{ id: 1, description: 'Paper', quantity: 2, unitPrice: 10.5, totalPrice: 21 }],
  auditTrail: [{ id: 1, action: 'CREATED', performedByName: 'Maya Member', performedAt: '2030-01-01T12:00:00Z', note: null }],
};

describe('InvoicesModal', () => {
  let alertSpy;
  let promptSpy;

  beforeEach(() => {
    invoicesAPI.list.mockReset().mockResolvedValue([]);
    invoicesAPI.get.mockReset().mockResolvedValue(draft);
    for (const method of ['approve', 'cancel', 'create', 'markPaid', 'remove', 'sendBack', 'submit', 'update']) {
      invoicesAPI[method].mockReset().mockResolvedValue(draft);
    }
    invoicesAPI.scanReceipt.mockReset().mockResolvedValue({});
    ImagePicker.requestCameraPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
    ImagePicker.requestMediaLibraryPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
    ImagePicker.launchCameraAsync.mockReset().mockResolvedValue({ canceled: true, assets: [] });
    ImagePicker.launchImageLibraryAsync.mockReset().mockResolvedValue({ canceled: true, assets: [] });
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    promptSpy = jest.spyOn(Alert, 'prompt').mockImplementation(() => undefined);
  });

  async function openDetail(invoice = draft, canApprove = false) {
    invoicesAPI.list.mockResolvedValue([invoice]);
    invoicesAPI.get.mockResolvedValue(invoice);
    renderWithProviders(<InvoicesModal clubId={20} schoolTier="PREMIUM" currentUser={user} canCreate canApprove={canApprove} onClose={jest.fn()} />);
    fireEvent.press(await screen.findByText(invoice.title));
    await screen.findByText('Line Items');
  }

  function chooseScanSource(label = 'Choose from Library') {
    fireEvent.press(screen.getByText('Scan Receipt · Premium'));
    const source = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === label);
    let sourcePromise;
    act(() => { sourcePromise = source.onPress(); });
    return sourcePromise;
  }

  it('loads empty state and hides creation without permission', async () => {
    renderWithProviders(<InvoicesModal clubId={20} schoolTier="PREMIUM" currentUser={user} canCreate={false} canApprove={false} onClose={jest.fn()} />);
    expect(await screen.findByText('No invoices yet.')).toBeOnTheScreen();
    expect(screen.queryByText('New Invoice')).not.toBeOnTheScreen();
  });

  it('searches and filters invoice summaries', async () => {
    invoicesAPI.list.mockResolvedValue([
      draft,
      { ...draft, id: 31, title: 'Travel Costs', status: 'PAID', totalAmount: 50 },
    ]);
    renderWithProviders(<InvoicesModal clubId={20} schoolTier="PREMIUM" currentUser={user} canCreate canApprove={false} onClose={jest.fn()} />);
    await screen.findByText('Craft Supplies');

    fireEvent.changeText(screen.getByPlaceholderText('Search by description…'), 'travl');
    expect(screen.getByText('Travel Costs')).toBeOnTheScreen();
    expect(screen.queryByText('Craft Supplies')).not.toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('Search by description…'), '');
    fireEvent.press(screen.getAllByText('Draft')[0]);
    expect(screen.getByText('Craft Supplies')).toBeOnTheScreen();
    expect(screen.queryByText('Travel Costs')).not.toBeOnTheScreen();
  });

  it('shows invoice metadata, line items, totals, and audit history', async () => {
    await openDetail();
    expect(screen.getByText('Payment required')).toBeOnTheScreen();
    expect(screen.getByText('Payee: Craft Store')).toBeOnTheScreen();
    expect(screen.getByText('Paper')).toBeOnTheScreen();
    expect(screen.getAllByText('$21.00')).toHaveLength(3);
    expect(screen.getByText('Created — Maya Member')).toBeOnTheScreen();
  });

  it('lets a draft owner edit, submit, and delete the draft', async () => {
    await openDetail();
    fireEvent.press(screen.getByText('Edit Draft'));
    expect(screen.getByText('Edit Draft')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('e.g. Craft supplies for club event').props.value).toBe('Craft Supplies');
    fireEvent.press(screen.getByTestId('icon-arrow-left'));

    fireEvent.press(await screen.findByText('Submit for Approval'));
    const submit = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Submit');
    await act(async () => submit.onPress());
    expect(invoicesAPI.submit).toHaveBeenCalledWith(20, 30);

    fireEvent.press(await screen.findByText('Delete Draft'));
    const remove = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Delete');
    await act(async () => remove.onPress());
    expect(invoicesAPI.remove).toHaveBeenCalledWith(20, 30);
  });

  it('supports approval and send-back transitions for submitted invoices', async () => {
    const submitted = { ...draft, status: 'SUBMITTED' };
    await openDetail(submitted, true);
    fireEvent.press(screen.getByText('Approve'));
    const approve = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Approve');
    await act(async () => approve.onPress());
    expect(invoicesAPI.approve).toHaveBeenCalledWith(20, 30);

    fireEvent.press(screen.getByText('Send Back to Draft'));
    const confirm = promptSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Confirm');
    await act(async () => confirm.onPress('  Missing receipt  '));
    expect(invoicesAPI.sendBack).toHaveBeenCalledWith(20, 30, 'Missing receipt');
  });

  it('marks approved invoices paid and cancels with an optional reason', async () => {
    const approved = { ...draft, status: 'APPROVED' };
    await openDetail(approved, true);
    fireEvent.press(screen.getByText('Mark as Paid'));
    const paid = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Mark Paid');
    await act(async () => paid.onPress());
    expect(invoicesAPI.markPaid).toHaveBeenCalledWith(20, 30);

    fireEvent.press(screen.getByText('Cancel Invoice'));
    const confirm = promptSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Confirm');
    await act(async () => confirm.onPress('  Duplicate  '));
    expect(invoicesAPI.cancel).toHaveBeenCalledWith(20, 30, 'Duplicate');
  });

  it('validates line items and creates a normalized draft', async () => {
    renderWithProviders(<InvoicesModal clubId={20} schoolTier="PREMIUM" currentUser={user} canCreate canApprove={false} onClose={jest.fn()} />);
    await screen.findByText('No invoices yet.');
    fireEvent.press(screen.getByText('New Invoice'));
    fireEvent.press(screen.getByText('Save Draft'));
    expect(screen.getByText('Title is required.')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Craft supplies for club event'), '  Supplies  ');
    fireEvent.press(screen.getByText('Save Draft'));
    expect(screen.getByText('Add at least one line item.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('Description'), '  Paper  ');
    fireEvent.press(screen.getByText('Save Draft'));
    expect(screen.getByText('Each line item needs a unit price greater than 0.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('Qty'), '2');
    fireEvent.changeText(screen.getByPlaceholderText('Unit Price'), '10.50');
    fireEvent.changeText(screen.getByPlaceholderText('Additional context…'), '  Event supplies  ');
    fireEvent.changeText(screen.getByPlaceholderText('Who should be paid'), '  Craft Store  ');
    fireEvent.changeText(screen.getByPlaceholderText('payee@example.com'), '  payee@example.com  ');
    fireEvent.press(screen.getByText('Save Draft'));

    await waitFor(() => expect(invoicesAPI.create).toHaveBeenCalledWith(20, {
      title: 'Supplies', notes: 'Event supplies', paymentRequired: true,
      payeeName: 'Craft Store', payeeEmail: 'payee@example.com',
      lineItems: [{ description: 'Paper', quantity: 2, unitPrice: 10.5 }],
    }));
  });

  it('disables AI receipt scanning and identifies it as Premium for Standard schools', async () => {
    renderWithProviders(<InvoicesModal clubId={20} schoolTier="STANDARD" currentUser={user} canCreate canApprove={false} onClose={jest.fn()} />);
    await screen.findByText('No invoices yet.');
    fireEvent.press(screen.getByText('New Invoice'));

    const scanButtonLabel = screen.getByText('Scan Receipt · Premium');
    expect(scanButtonLabel).toBeOnTheScreen();
    expect(screen.getByText(/AI receipt scanning comes with Premium/)).toBeOnTheScreen();
    fireEvent.press(scanButtonLabel);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(invoicesAPI.scanReceipt).not.toHaveBeenCalled();
  });

  it('stops scanning when photo permission is denied', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    renderWithProviders(<InvoicesModal clubId={20} schoolTier="PREMIUM" currentUser={user} canCreate canApprove={false} onClose={jest.fn()} />);
    await screen.findByText('No invoices yet.');
    fireEvent.press(screen.getByText('New Invoice'));
    await act(async () => chooseScanSource());
    expect(alertSpy).toHaveBeenLastCalledWith('Permission needed', 'Please allow access to continue.');
    expect(invoicesAPI.scanReceipt).not.toHaveBeenCalled();
  });

  it('rejects oversized receipts before requesting AI consent', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ base64: 'x'.repeat(10_000_001) }] });
    renderWithProviders(<InvoicesModal clubId={20} schoolTier="PREMIUM" currentUser={user} canCreate canApprove={false} onClose={jest.fn()} />);
    await screen.findByText('No invoices yet.');
    fireEvent.press(screen.getByText('New Invoice'));
    await act(async () => chooseScanSource());
    expect(alertSpy).toHaveBeenLastCalledWith('Receipt Too Large', expect.stringContaining('7.5 MB'));
  });

  it('opens privacy information without sharing the selected receipt', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ base64: 'receipt' }] });
    renderWithProviders(<InvoicesModal clubId={20} schoolTier="PREMIUM" currentUser={user} canCreate canApprove={false} onClose={jest.fn()} />);
    await screen.findByText('No invoices yet.');
    fireEvent.press(screen.getByText('New Invoice'));
    const sourcePromise = chooseScanSource();
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Share receipt with OpenAI?', expect.any(String), expect.any(Array), expect.any(Object)));
    const privacy = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Privacy Policy');
    await act(async () => { privacy.onPress(); await sourcePromise; });
    expect(openPrivacyPolicy).toHaveBeenCalled();
    expect(invoicesAPI.scanReceipt).not.toHaveBeenCalled();
  });

  it('populates the form from an explicitly consented receipt scan', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ base64: 'receipt' }] });
    invoicesAPI.scanReceipt.mockResolvedValue({
      suggestedTitle: 'Store Receipt', suggestedPayeeName: 'Supply Shop',
      lineItems: [{ description: 'Markers', quantity: 3, unitPrice: 2.5 }],
    });
    renderWithProviders(<InvoicesModal clubId={20} schoolTier="PREMIUM" currentUser={user} canCreate canApprove={false} onClose={jest.fn()} />);
    await screen.findByText('No invoices yet.');
    fireEvent.press(screen.getByText('New Invoice'));
    const sourcePromise = chooseScanSource();
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Share receipt with OpenAI?', expect.any(String), expect.any(Array), expect.any(Object)));
    const agree = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Agree & Scan');
    await act(async () => { agree.onPress(); await sourcePromise; });

    expect(invoicesAPI.scanReceipt).toHaveBeenCalledWith(20, 'receipt');
    expect(screen.getByPlaceholderText('e.g. Craft supplies for club event').props.value).toBe('Store Receipt');
    expect(screen.getByPlaceholderText('Who should be paid').props.value).toBe('Supply Shop');
    expect(screen.getByPlaceholderText('Description').props.value).toBe('Markers');
    expect(screen.getByText('$7.50')).toBeOnTheScreen();
  });
});
