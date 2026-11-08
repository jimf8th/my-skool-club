import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '../../test/test-utils';
import { inventoryAPI } from '../../services/api';
import InventoryModal from '../InventoryModal';

jest.mock('../../services/api', () => ({
  inventoryAPI: {
    checkIn: jest.fn(), checkOut: jest.fn(), create: jest.fn(), get: jest.fn(),
    list: jest.fn(), remove: jest.fn(), update: jest.fn(),
  },
}));

const user = { id: 101, firstName: 'Maya', lastName: 'Member' };
const checkedIn = {
  id: 50, name: 'Canon Camera', description: 'Includes case', category: 'Electronics', serialNumber: 'CAM-001',
  status: 'CHECKED_IN', createdByName: 'Avery Admin', createdAt: '2030-01-01T12:00:00Z',
  checkedOutByUserId: null, checkedOutByName: null, checkedOutAt: null, dueDate: null, checkoutNotes: null,
  checkoutHistory: [],
};
const checkedOut = {
  ...checkedIn, status: 'CHECKED_OUT', checkedOutByUserId: user.id, checkedOutByName: 'Maya Member',
  checkedOutAt: '2030-01-05T12:00:00Z', dueDate: '2030-01-20', checkoutNotes: 'For tournament',
  checkoutHistory: [{
    id: 1, checkedOutByUserId: user.id, checkedOutByName: 'Maya Member', checkedOutAt: '2030-01-05T12:00:00Z',
    dueDate: '2030-01-20', checkedInAt: null, checkedInByName: null, checkoutNotes: 'For tournament', checkinNotes: null,
  }],
};

describe('InventoryModal', () => {
  let alertSpy;

  beforeEach(() => {
    inventoryAPI.list.mockReset().mockResolvedValue([]);
    inventoryAPI.get.mockReset().mockResolvedValue(checkedIn);
    for (const method of ['checkIn', 'checkOut', 'create', 'remove', 'update']) {
      inventoryAPI[method].mockReset().mockResolvedValue(checkedIn);
    }
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  async function openDetail(item = checkedIn, props = {}) {
    inventoryAPI.list.mockResolvedValue([item]);
    inventoryAPI.get.mockResolvedValue(item);
    renderWithProviders(
      <InventoryModal clubId={20} currentUser={user} canCheckout canManage onClose={jest.fn()} {...props} />
    );
    fireEvent.press(await screen.findByText(item.name));
    await screen.findByText('Checkout History');
  }

  it('loads empty state and hides management actions without permission', async () => {
    renderWithProviders(<InventoryModal clubId={20} currentUser={user} canCheckout={false} canManage={false} onClose={jest.fn()} />);
    expect(await screen.findByText('No inventory items yet.')).toBeOnTheScreen();
    expect(screen.queryByText('Add Item')).not.toBeOnTheScreen();
  });

  it('fuzzy-searches and filters inventory summaries', async () => {
    const overdue = { ...checkedOut, id: 51, name: 'Soccer Balls', category: 'Sports', serialNumber: 'BALL-1', status: 'OVERDUE' };
    inventoryAPI.list.mockResolvedValue([checkedIn, overdue]);
    renderWithProviders(<InventoryModal clubId={20} currentUser={user} canCheckout canManage onClose={jest.fn()} />);
    await screen.findByText('Canon Camera');

    fireEvent.changeText(screen.getByPlaceholderText('Search by name, category or serial…'), 'canan');
    expect(screen.getByText('Canon Camera')).toBeOnTheScreen();
    expect(screen.queryByText('Soccer Balls')).not.toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('Search by name, category or serial…'), '');
    fireEvent.press(screen.getAllByText('Overdue')[0]);
    expect(screen.getByText('Soccer Balls')).toBeOnTheScreen();
    expect(screen.queryByText('Canon Camera')).not.toBeOnTheScreen();
  });

  it('shows metadata and an empty checkout history', async () => {
    await openDetail();
    expect(screen.getByText('Category: Electronics')).toBeOnTheScreen();
    expect(screen.getByText('Serial #: CAM-001')).toBeOnTheScreen();
    expect(screen.getByText('Includes case')).toBeOnTheScreen();
    expect(screen.getByText('This item has never been checked out.')).toBeOnTheScreen();
  });

  it('creates a normalized inventory item after validation', async () => {
    renderWithProviders(<InventoryModal clubId={20} currentUser={user} canCheckout canManage onClose={jest.fn()} />);
    await screen.findByText('No inventory items yet.');
    fireEvent.press(screen.getByText('Add Item'));
    fireEvent.press(screen.getAllByText('Add Item').at(-1));
    expect(screen.getByText('Name is required.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Canon EOS camera'), '  Camera  ');
    fireEvent.changeText(screen.getByPlaceholderText('Condition, accessories, storage location…'), '  Good condition  ');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Electronics, Sports, Costumes'), '  Electronics  ');
    fireEvent.changeText(screen.getByPlaceholderText('Serial or asset tag'), '  CAM-2  ');
    fireEvent.press(screen.getAllByText('Add Item').at(-1));

    await waitFor(() => expect(inventoryAPI.create).toHaveBeenCalledWith(20, {
      name: 'Camera', description: 'Good condition', category: 'Electronics', serialNumber: 'CAM-2',
    }));
  });

  it('edits an existing item', async () => {
    await openDetail();
    fireEvent.press(screen.getByText('Edit Item'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Canon EOS camera'), 'Updated Camera');
    fireEvent.press(screen.getByText('Save Changes'));
    await waitFor(() => expect(inventoryAPI.update).toHaveBeenCalledWith(20, 50, expect.objectContaining({ name: 'Updated Camera' })));
  });

  it('checks an item out with the default seven-day due date and notes', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2030, 0, 10, 9, 0));
    await openDetail();
    fireEvent.press(screen.getAllByText('Check Out').at(-1));
    fireEvent.changeText(screen.getByPlaceholderText("e.g. Needed for Saturday's game"), '  Tournament  ');
    fireEvent.press(screen.getAllByText('Check Out').at(-1));

    await waitFor(() => expect(inventoryAPI.checkOut).toHaveBeenCalledWith(20, 50, '2030-01-17', 'Tournament'));
  });

  it('supports checkout without a due date', async () => {
    await openDetail();
    fireEvent.press(screen.getByText('Check Out'));
    fireEvent.press(screen.getByText('Set a due date'));
    fireEvent.press(screen.getAllByText('Check Out').at(-1));
    await waitFor(() => expect(inventoryAPI.checkOut).toHaveBeenCalledWith(20, 50, null, null));
  });

  it('shows overdue checkout history and lets the borrower check in', async () => {
    const overdue = { ...checkedOut, status: 'OVERDUE' };
    inventoryAPI.checkIn.mockResolvedValue(checkedIn);
    await openDetail(overdue, { canManage: false });
    expect(screen.getByText('Overdue checkout')).toBeOnTheScreen();
    expect(screen.getByText(/Checked out by Maya Member \(you\)/)).toBeOnTheScreen();
    expect(screen.getByText('Still out')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Check In'));
    const confirm = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Check In');
    await act(async () => confirm.onPress());
    expect(inventoryAPI.checkIn).toHaveBeenCalledWith(20, 50, null);
  });

  it('does not let another ordinary member check in someone else’s item', async () => {
    await openDetail({ ...checkedOut, checkedOutByUserId: 999 }, { canManage: false });
    expect(screen.queryByText('Check In')).not.toBeOnTheScreen();
    expect(screen.queryByText('Edit Item')).not.toBeOnTheScreen();
  });

  it('confirms deletion only while an item is checked in', async () => {
    await openDetail();
    fireEvent.press(screen.getByText('Delete Item'));
    const confirm = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Delete');
    await act(async () => confirm.onPress());
    expect(inventoryAPI.remove).toHaveBeenCalledWith(20, 50);
  });
});
