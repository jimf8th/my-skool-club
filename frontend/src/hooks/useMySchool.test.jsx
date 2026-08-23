import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  getMyMembership: vi.fn(),
  getMyPrivileges: vi.fn(),
}));

vi.mock('../services/api', () => ({
  schoolsService: mocks,
}));

import { useMySchool } from './useMySchool';

describe('useMySchool', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves the approved school and backend privileges', async () => {
    mocks.getAll.mockResolvedValue([{ id: 10, name: 'Desert High' }]);
    mocks.getMyMembership.mockResolvedValue({ status: 'APPROVED' });
    mocks.getMyPrivileges.mockResolvedValue(['VIEW_ALL_CLUBS', 'MANAGE_SCHOOL_MEMBERS']);

    const { result } = renderHook(() => useMySchool({ id: 2, appRole: 'APP_USER' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.school).toEqual({ id: 10, name: 'Desert High', isAdmin: true });
    expect(result.current.privileges.has('VIEW_ALL_CLUBS')).toBe(true);
  });

  it('does not force an app administrator into a single school', async () => {
    const { result } = renderHook(() => useMySchool({ id: 1, appRole: 'APP_ADMIN' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.school).toBeNull();
    expect(mocks.getAll).not.toHaveBeenCalled();
  });
});
