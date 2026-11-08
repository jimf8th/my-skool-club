import { act, renderHook, waitFor } from '@testing-library/react-native';
import { schoolsAPI } from '../../services/api';
import { useMySchool } from '../useMySchool';

jest.mock('../../services/api', () => ({
  schoolsAPI: {
    getAll: jest.fn(),
    getMyMembership: jest.fn(),
    getMyPrivileges: jest.fn(),
  },
}));

const member = { id: 101, appRole: 'USER' };
const schools = [
  { id: 10, name: 'North Valley', description: 'First school' },
  { id: 11, name: 'South Ridge', description: 'Second school' },
];

describe('useMySchool', () => {
  let consoleError;

  beforeEach(() => {
    schoolsAPI.getAll.mockReset().mockResolvedValue(schools);
    schoolsAPI.getMyMembership.mockReset().mockResolvedValue(null);
    schoolsAPI.getMyPrivileges.mockReset().mockResolvedValue([]);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it.each([
    ['a signed-out user', null],
    ['an app administrator', { id: 1, appRole: 'APP_ADMIN' }],
  ])('resolves no single school for %s without querying the API', async (_label, user) => {
    const { result } = renderHook(() => useMySchool(user));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.school).toBeNull();
    expect([...result.current.privileges]).toEqual([]);
    expect(schoolsAPI.getAll).not.toHaveBeenCalled();
  });

  it('skips unavailable and unapproved memberships, then returns the approved school', async () => {
    schoolsAPI.getMyMembership
      .mockRejectedValueOnce(new Error('not visible'))
      .mockResolvedValueOnce({ status: 'APPROVED' });
    schoolsAPI.getMyPrivileges.mockResolvedValue(['VIEW_ANNOUNCEMENTS', 'MANAGE_SCHOOL_MEMBERS']);
    const { result } = renderHook(() => useMySchool(member));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.school).toEqual({
      id: 11,
      name: 'South Ridge',
      description: 'Second school',
      tier: 'STANDARD',
      isAdmin: true,
    });
    expect([...result.current.privileges]).toEqual(['VIEW_ANNOUNCEMENTS', 'MANAGE_SCHOOL_MEMBERS']);
    expect(schoolsAPI.getMyMembership.mock.calls.map(([id]) => id)).toEqual([10, 11]);
  });

  it('uses empty privileges when privilege lookup fails', async () => {
    schoolsAPI.getMyMembership.mockResolvedValueOnce({ status: 'APPROVED' });
    schoolsAPI.getMyPrivileges.mockRejectedValueOnce(new Error('forbidden'));
    const { result } = renderHook(() => useMySchool(member));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.school).toEqual(expect.objectContaining({ id: 10, isAdmin: false }));
    expect(result.current.privileges.size).toBe(0);
  });

  it('returns an empty result after checking every school without approval', async () => {
    schoolsAPI.getMyMembership
      .mockResolvedValueOnce({ status: 'PENDING' })
      .mockResolvedValueOnce({ status: 'REJECTED' });
    const { result } = renderHook(() => useMySchool(member));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.school).toBeNull();
    expect(schoolsAPI.getMyPrivileges).not.toHaveBeenCalled();
  });

  it('suppresses school-list details and safely clears the result', async () => {
    schoolsAPI.getAll.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useMySchool(member));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.school).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('exposes reload so membership changes are reflected', async () => {
    schoolsAPI.getMyMembership.mockResolvedValue({ status: 'PENDING' });
    const { result } = renderHook(() => useMySchool(member));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.school).toBeNull();

    schoolsAPI.getMyMembership.mockResolvedValueOnce({ status: 'APPROVED' });
    await act(async () => { await result.current.reload(); });
    expect(result.current.school).toEqual(expect.objectContaining({ id: 10 }));
  });
});
