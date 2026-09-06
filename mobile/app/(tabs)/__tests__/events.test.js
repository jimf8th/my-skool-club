import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../../test/test-utils';
import { useAuth } from '../../../context/AuthContext';
import { eventsAPI, schoolsAPI } from '../../../services/api';
import EventsModal from '../../../components/EventsModal';
import ReportContentModal from '../../../components/ReportContentModal';
import EventsScreen from '../events';

jest.mock('expo-router');
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../services/api', () => ({
  schoolsAPI: { getAll: jest.fn(), getMyMembership: jest.fn(), getMyPrivileges: jest.fn() },
  eventsAPI: { list: jest.fn(), rsvp: jest.fn() },
}));
jest.mock('../../../components/EventsModal', () => jest.fn(() => null));
jest.mock('../../../components/ReportContentModal', () => jest.fn(() => null));

const user = { id: 101, firstName: 'Maya', appRole: 'USER' };
const schools = [{ id: 10, name: 'North Valley' }, { id: 11, name: 'South Valley' }];
const upcoming = {
  id: 40, schoolId: 10, title: 'Future Fair', location: 'Gym', eventTime: '2099-01-10T18:00:00',
  createdByUserId: 202, yesCount: 2, maybeCount: 1, noCount: 0, myResponse: null,
};
const past = { ...upcoming, id: 41, title: 'Past Fair', eventTime: '2000-01-10T18:00:00' };

describe('EventsScreen', () => {
  let alertSpy;

  beforeEach(() => {
    useAuth.mockReturnValue({ user });
    schoolsAPI.getAll.mockReset().mockResolvedValue(schools);
    schoolsAPI.getMyMembership.mockReset().mockResolvedValue({ status: 'APPROVED' });
    schoolsAPI.getMyPrivileges.mockReset().mockResolvedValue(['VIEW_EVENTS']);
    eventsAPI.list.mockReset().mockResolvedValue([]);
    eventsAPI.rsvp.mockReset();
    EventsModal.mockClear();
    ReportContentModal.mockClear();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('shows the membership empty state and does not request events for unapproved schools', async () => {
    schoolsAPI.getMyMembership.mockResolvedValue(null);
    renderWithProviders(<EventsScreen />);

    expect(await screen.findByText('No school memberships yet')).toBeOnTheScreen();
    expect(eventsAPI.list).not.toHaveBeenCalled();
  });

  it('aggregates approved-school events into upcoming and past sections', async () => {
    schoolsAPI.getMyMembership
      .mockResolvedValueOnce({ status: 'APPROVED' })
      .mockResolvedValueOnce({ status: 'PENDING' });
    eventsAPI.list.mockResolvedValue([past, upcoming]);
    renderWithProviders(<EventsScreen />);

    expect(await screen.findByText('Future Fair')).toBeOnTheScreen();
    expect(screen.getByText('Past Fair')).toBeOnTheScreen();
    expect(screen.getByText('Upcoming')).toBeOnTheScreen();
    expect(screen.getByText('Past')).toBeOnTheScreen();
    expect(eventsAPI.list).toHaveBeenCalledTimes(1);
    expect(eventsAPI.list).toHaveBeenCalledWith(10);
  });

  it('updates RSVP state and counts inline', async () => {
    schoolsAPI.getAll.mockResolvedValue([schools[0]]);
    eventsAPI.list.mockResolvedValue([upcoming]);
    eventsAPI.rsvp.mockResolvedValue({ myResponse: 'YES', yesCount: 3, maybeCount: 1, noCount: 0 });
    renderWithProviders(<EventsScreen />);
    await screen.findByText('Future Fair');

    fireEvent.press(screen.getByText('Going'));

    await waitFor(() => expect(eventsAPI.rsvp).toHaveBeenCalledWith(10, 40, 'YES'));
    expect(screen.getByText('3 going')).toBeOnTheScreen();
  });

  it('explains missing creation privileges when the FAB is pressed', async () => {
    renderWithProviders(<EventsScreen />);
    await screen.findByText('No upcoming events');

    fireEvent.press(screen.getByTestId('icon-plus'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Cannot Create Events',
      'You need to be an approved member with event-creation permission in a school to create events.'
    );
  });

  it('opens the creation form directly for one eligible school', async () => {
    schoolsAPI.getAll.mockResolvedValue([schools[0]]);
    schoolsAPI.getMyPrivileges.mockResolvedValue(['CREATE_EVENT', 'MANAGE_SCHOOL_MEMBERS']);
    renderWithProviders(<EventsScreen />);
    await screen.findByText('No upcoming events');

    fireEvent.press(screen.getByTestId('icon-plus'));

    expect(EventsModal).toHaveBeenCalledWith(expect.objectContaining({
      schoolId: 10, canCreate: true, isSchoolAdmin: true, initialView: 'form',
    }), undefined);
  });

  it('asks app administrators to choose among multiple eligible schools', async () => {
    useAuth.mockReturnValue({ user: { ...user, appRole: 'APP_ADMIN' } });
    schoolsAPI.getMyPrivileges.mockResolvedValue(['CREATE_EVENT']);
    renderWithProviders(<EventsScreen />);
    await screen.findByText('No upcoming events');
    fireEvent.press(screen.getByTestId('icon-plus'));

    expect(screen.getByText('Create Event For…')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('South Valley'));
    expect(EventsModal).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 11, initialView: 'form' }), undefined);
  });

  it('offers reporting only for events owned by someone else', async () => {
    schoolsAPI.getAll.mockResolvedValue([schools[0]]);
    eventsAPI.list.mockResolvedValue([upcoming, { ...upcoming, id: 42, title: 'My Event', createdByUserId: user.id }]);
    renderWithProviders(<EventsScreen />);
    await screen.findByText('Future Fair');

    expect(screen.getByLabelText('Report Future Fair')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Report My Event')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Report Future Fair'));
    expect(ReportContentModal).toHaveBeenCalledWith(expect.objectContaining({ visible: true, contentType: 'EVENT', contentId: 40 }), undefined);
  });
});
