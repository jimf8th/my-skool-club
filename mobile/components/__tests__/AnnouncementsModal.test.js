import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '../../test/test-utils';
import { announcementsAPI } from '../../services/api';
import ReportContentModal from '../ReportContentModal';
import AnnouncementsModal from '../AnnouncementsModal';

jest.mock('../../services/api', () => ({
  announcementsAPI: {
    create: jest.fn(),
    list: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock('../ReportContentModal', () => jest.fn(() => null));

const currentUser = { id: 101, firstName: 'Maya', lastName: 'Member' };
const ownAnnouncement = {
  id: 60,
  title: 'Picture Day',
  body: 'Pictures are Friday.',
  createdByUserId: currentUser.id,
  createdByName: 'Maya Member',
  createdAt: '2030-01-02T15:30:00Z',
};
const otherAnnouncement = {
  ...ownAnnouncement,
  id: 61,
  title: 'Schedule Change',
  createdByUserId: 202,
  createdByName: 'Avery Admin',
};

describe('AnnouncementsModal', () => {
  let alertSpy;

  beforeEach(() => {
    announcementsAPI.list.mockReset().mockResolvedValue([]);
    announcementsAPI.create.mockReset().mockResolvedValue(ownAnnouncement);
    announcementsAPI.remove.mockReset().mockResolvedValue(undefined);
    ReportContentModal.mockClear();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('loads an empty list and hides creation without permission', async () => {
    renderWithProviders(<AnnouncementsModal schoolId={10} currentUser={currentUser} canCreate={false} isSchoolAdmin={false} onClose={jest.fn()} />);

    expect(await screen.findByText('No announcements yet.')).toBeOnTheScreen();
    expect(screen.queryByText('New Announcement')).not.toBeOnTheScreen();
  });

  it('shows load failures', async () => {
    announcementsAPI.list.mockRejectedValue({ response: { data: { message: 'Announcements unavailable' } } });
    renderWithProviders(<AnnouncementsModal schoolId={10} currentUser={currentUser} canCreate={false} isSchoolAdmin={false} onClose={jest.fn()} />);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'Announcements unavailable'));
  });

  it('validates, trims, creates, and reloads an announcement', async () => {
    renderWithProviders(<AnnouncementsModal schoolId={10} currentUser={currentUser} canCreate isSchoolAdmin onClose={jest.fn()} />);
    await screen.findByText('No announcements yet.');
    fireEvent.press(screen.getByText('New Announcement'));

    fireEvent.press(screen.getByText('Post Announcement'));
    expect(screen.getByText('Title is required.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Picture Day Reminder'), '  Welcome  ');
    fireEvent.press(screen.getByText('Post Announcement'));
    expect(screen.getByText('Message is required.')).toBeOnTheScreen();

    announcementsAPI.list.mockResolvedValue([ownAnnouncement]);
    fireEvent.changeText(screen.getByPlaceholderText('Write your announcement...'), '  Welcome back!  ');
    fireEvent.press(screen.getByText('Post Announcement'));

    await waitFor(() => expect(announcementsAPI.create).toHaveBeenCalledWith(10, { title: 'Welcome', body: 'Welcome back!' }));
    expect(await screen.findByText('Picture Day')).toBeOnTheScreen();
    expect(announcementsAPI.list).toHaveBeenCalledTimes(2);
  });

  it('keeps the form open on creation errors', async () => {
    announcementsAPI.create.mockRejectedValue({ response: { data: { message: 'Unsafe content' } } });
    renderWithProviders(<AnnouncementsModal schoolId={10} currentUser={currentUser} canCreate initialView="form" onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Picture Day Reminder'), 'Title');
    fireEvent.changeText(screen.getByPlaceholderText('Write your announcement...'), 'Body');
    fireEvent.press(screen.getByText('Post Announcement'));
    expect(await screen.findByText('Unsafe content')).toBeOnTheScreen();
  });

  it('lets owners delete their announcements after confirmation', async () => {
    announcementsAPI.list.mockResolvedValue([ownAnnouncement]);
    renderWithProviders(<AnnouncementsModal schoolId={10} currentUser={currentUser} canCreate={false} isSchoolAdmin={false} onClose={jest.fn()} />);
    await screen.findByText('Picture Day');

    fireEvent.press(screen.getByTestId('icon-trash-can-outline'));
    const confirm = alertSpy.mock.calls.at(-1)[2].find((button) => button.text === 'Delete');
    await act(async () => confirm.onPress());

    expect(announcementsAPI.remove).toHaveBeenCalledWith(10, 60);
    expect(screen.getByText('No announcements yet.')).toBeOnTheScreen();
  });

  it('lets school admins delete others’ announcements', async () => {
    announcementsAPI.list.mockResolvedValue([otherAnnouncement]);
    renderWithProviders(<AnnouncementsModal schoolId={10} currentUser={currentUser} canCreate={false} isSchoolAdmin onClose={jest.fn()} />);
    await screen.findByText('Schedule Change');
    expect(screen.getByTestId('icon-trash-can-outline')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Report Schedule Change')).not.toBeOnTheScreen();
  });

  it('opens confidential reporting for announcements the member does not own', async () => {
    announcementsAPI.list.mockResolvedValue([otherAnnouncement]);
    renderWithProviders(<AnnouncementsModal schoolId={10} currentUser={currentUser} canCreate={false} isSchoolAdmin={false} onClose={jest.fn()} />);
    await screen.findByText('Schedule Change');

    fireEvent.press(screen.getByLabelText('Report Schedule Change'));

    expect(ReportContentModal).toHaveBeenLastCalledWith(expect.objectContaining({
      visible: true,
      contentType: 'ANNOUNCEMENT',
      contentId: 61,
    }), undefined);
  });
});
