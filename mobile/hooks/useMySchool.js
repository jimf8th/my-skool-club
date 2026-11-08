import { useState, useCallback, useEffect } from 'react';
import { schoolsAPI } from '../services/api';

/**
 * Resolves the single school a regular member belongs to. A member can never
 * be part of more than one school, so once we find an approved membership we
 * can stop looking and treat it as "their" school — no picker needed.
 *
 * APP_ADMIN accounts aren't tied to a single school (they manage all of
 * them), so this always resolves `school: null` for admins; screens should
 * keep their existing multi-school picker for that role.
 *
 * Returns: { school, privileges, loading, reload }
 *   school:     { id, name, description, tier, isAdmin } | null
 *   privileges: Set<string> — the member's school-level privileges for `school`
 */
export function useMySchool(user) {
  const [school, setSchool] = useState(null);
  const [privileges, setPrivileges] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setSchool(null);
      setPrivileges(new Set());
      setLoading(false);
      return;
    }

    const isAppAdmin = user?.appRole === 'APP_ADMIN';
    if (isAppAdmin) {
      setSchool(null);
      setPrivileges(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const allSchools = await schoolsAPI.getAll();
      for (const s of allSchools) {
        const membership = await schoolsAPI.getMyMembership(s.id).catch(() => null);
        if (membership && membership.status === 'APPROVED') {
          const privs = await schoolsAPI.getMyPrivileges(s.id).catch(() => []);
          setSchool({
            id: s.id,
            name: s.name,
            description: s.description,
            tier: s.tier || 'STANDARD',
            isAdmin: privs.includes('MANAGE_SCHOOL_MEMBERS'),
          });
          setPrivileges(new Set(privs));
          return; // a member can only ever belong to one school
        }
      }
      setSchool(null);
      setPrivileges(new Set());
    } catch (e) {
      // The owning screen handles the empty state. Do not expose request
      // details through React Native's development error overlay.
      setSchool(null);
      setPrivileges(new Set());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  return { school, privileges, loading, reload };
}
