import { useCallback, useEffect, useState } from 'react';
import { schoolsService } from '../services/api';

/**
 * Resolves the approved school membership and school-scoped privileges for a
 * regular user. App administrators are global and intentionally do not resolve
 * to a single school.
 */
export function useMySchool(user) {
  const userId = user?.id;
  const appRole = user?.appRole;
  const [school, setSchool] = useState(null);
  const [privileges, setPrivileges] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId || appRole === 'APP_ADMIN') {
      setSchool(null);
      setPrivileges(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const schools = await schoolsService.getAll();

      for (const candidate of schools) {
        const membership = await schoolsService
          .getMyMembership(candidate.id)
          .catch(() => null);

        if (membership?.status !== 'APPROVED') continue;

        const privilegeNames = await schoolsService
          .getMyPrivileges(candidate.id)
          .catch(() => []);

        const privilegeSet = new Set(privilegeNames);
        setSchool({ ...candidate, isAdmin: privilegeSet.has('MANAGE_SCHOOL_MEMBERS') });
        setPrivileges(privilegeSet);
        return;
      }

      setSchool(null);
      setPrivileges(new Set());
    } catch {
      setSchool(null);
      setPrivileges(new Set());
    } finally {
      setLoading(false);
    }
  }, [appRole, userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { school, privileges, loading, reload };
}
