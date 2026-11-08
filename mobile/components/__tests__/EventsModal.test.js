import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '../../test/test-utils';
import { eventsAPI } from '../../services/api';
import ReportContentModal from '../ReportContentModal';
import EventsModal from '../EventsModal';

jest.mock('../../services/api', () => ({
  eventsAPI: { create: jest.fn(), get: jest.fn(), list: jest.fn(), remove: jest.fn(), rsvp: jest.fn() },
}));
jest.mock('../ReportContentModal', () => jest.fn(() => null));

const user = { id: 101, firstName: 'Maya', lastName: 'Member' };
const event = {
  id: 40, schoolId: 10, title: 'Fall Fundraiser', location: 'School Gym', eventTime: '2099-01-10T18:00:00',
  createdByUserId: 202, createdByName: 'Avery Admin', myResponse: null,
  yesCount: 1, noCount: 0, maybeCount: 0,
  rsvps: [{ userId: 202, userFirstName: 'Avery', userLastName: 'Admin', response: 'YES' }],
};

describe('EventsModal', () => {
  let alertSpy;

  beforeEach(() => {
    eventsAPI.list.mockReset().mockResolvedValue([]);
    eventsAPI.get.mockReset().mockResolvedValue(event);
    eventsAPI.create.mockReset().mockResolvedValue(event);
    eventsAPI.remove.mockReset().mockResolvedValue(undefined);
    eventsAPI.rsvp.mockReset().mockResolvedValue({ ...event, myResponse: 'MAYBE', maybeCount: 1 });
    ReportContentModal.mockClear();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('loads empty state and respects creation permission', async () => {
    renderWithProviders(<EventsModal schoolId={10} currentUser={user} canCreate={false} isSchoolAdmin={false} onClose={jest.fn()} />);
    expect(await screen.findByText('No events yet.')).toBeOnTheScreen();
    expect(screen.queryByText('New Event')).not.toBeOnTheScreen();
  });

  it('opens event details, lists attendees, and updates RSVP', async () => {
    eventsAPI.list.mockResolvedValue([event]);
    renderWithProviders(<EventsModal schoolId={10} currentUser={user} canCreate isSchoolAdmin={false} onClose={jest.fn()} />);
    fireEvent.press(await screen.findByText('Fall Fundraiser'));

    expect(await screen.findByText('Avery Admin')).toBeOnTheScreen();
    expect(screen.getByText('Responses (1)')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Maybe'));
    await waitFor(() => expect(eventsAPI.rsvp).toHaveBeenCalledWith(10, 40, 'MAYBE'));
    expect(screen.getByText('Responses (2)')).toBeOnTheScreen();
  });

  it('allows a school admin to delete an event after confirmation', async () => {
    eventsAPI.list.mockResolvedValue([event]);
    renderWithProviders(<EventsModal schoolId={10} currentUser={user} canCreate isSchoolAdmin onClose={jest.fn()} />);
    fireEvent.press(await screen.findByText('Fall Fundraiser'));
    await screen.findByText('Delete Event');
    fireEvent.press(screen.getByText('Delete Event'));
    const confirm = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Delete');
    await act(async () => confirm.onPress());
    expect(eventsAPI.remove).toHaveBeenCalledWith(10, 40);
  });

  it('allows owners to delete and non-owners to report', async () => {
    eventsAPI.list.mockResolvedValue([{ ...event, createdByUserId: user.id }]);
    eventsAPI.get.mockResolvedValue({ ...event, createdByUserId: user.id });
    const ownerView = renderWithProviders(<EventsModal schoolId={10} currentUser={user} canCreate={false} isSchoolAdmin={false} onClose={jest.fn()} />);
    fireEvent.press(await screen.findByText('Fall Fundraiser'));
    expect(await screen.findByText('Delete Event')).toBeOnTheScreen();
    ownerView.unmount();

    eventsAPI.list.mockResolvedValue([event]);
    eventsAPI.get.mockResolvedValue(event);
    renderWithProviders(<EventsModal schoolId={10} currentUser={user} canCreate={false} isSchoolAdmin={false} onClose={jest.fn()} />);
    fireEvent.press(await screen.findByText('Fall Fundraiser'));
    fireEvent.press(await screen.findByText('Report Event'));
    expect(ReportContentModal).toHaveBeenCalledWith(expect.objectContaining({ visible: true, contentType: 'EVENT', contentId: 40 }), undefined);
  });

  it('validates required event form fields', async () => {
    renderWithProviders(<EventsModal schoolId={10} currentUser={user} canCreate isSchoolAdmin initialView="form" onClose={jest.fn()} />);
    fireEvent.press(screen.getByText('Create Event'));
    expect(screen.getByText('Title is required.')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Fall Fundraiser'), 'Fundraiser');
    fireEvent.press(screen.getByText('Create Event'));
    expect(screen.getByText('Location is required.')).toBeOnTheScreen();
  });

  it('selects a future date/time and creates a trimmed event', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2030, 0, 10, 10, 7));
    renderWithProviders(<EventsModal schoolId={10} currentUser={user} canCreate isSchoolAdmin initialView="form" onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Fall Fundraiser'), '  Fundraiser  ');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. School Gymnasium'), '  Gym  ');

    fireEvent.press(screen.getByTestId('icon-calendar'));
    fireEvent.press(screen.getByText('11'));
    fireEvent.press(screen.getByTestId('icon-clock-outline'));
    fireEvent.press(screen.getByText('11:00 AM'));
    eventsAPI.list.mockResolvedValue([event]);
    fireEvent.press(screen.getByText('Create Event'));

    await waitFor(() => expect(eventsAPI.create).toHaveBeenCalledWith(10, {
      title: 'Fundraiser',
      location: 'Gym',
      eventTime: expect.stringMatching(/^2030-01-11T18:00:00\.000$/),
    }));
  });

  it('keeps the form open and reports creation failures', async () => {
    eventsAPI.create.mockRejectedValue({ response: { data: { message: 'Event rejected' } } });
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2030, 0, 10, 10, 0));
    renderWithProviders(<EventsModal schoolId={10} currentUser={user} canCreate isSchoolAdmin initialView="form" onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Fall Fundraiser'), 'Fundraiser');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. School Gymnasium'), 'Gym');
    fireEvent.press(screen.getByTestId('icon-calendar'));
    fireEvent.press(screen.getByText('11'));
    fireEvent.press(screen.getByText('Create Event'));
    expect(await screen.findByText('Event rejected')).toBeOnTheScreen();
  });
});
