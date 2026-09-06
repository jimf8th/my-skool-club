package com.myskoolclub.backend.security;

import com.myskoolclub.backend.model.AppRole;
import com.myskoolclub.backend.model.MembershipRole;
import com.myskoolclub.backend.model.MembershipStatus;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.ClubMembershipRepository;
import com.myskoolclub.backend.repository.ClubRepository;
import com.myskoolclub.backend.repository.SchoolMembershipRepository;
import com.myskoolclub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Spring Security SpEL evaluator for privilege-based access control.
 *
 * Use in @PreAuthorize annotations as:
 *
 *   // App-level (no resource context) — ADD_SCHOOL, REMOVE_SCHOOL
 *   @PreAuthorize("@sec.hasPrivilege(authentication, 'ADD_SCHOOL')")
 *
 *   // School-scoped — VIEW_SCHOOL, MODIFY_SCHOOL, ADD_CLUB, DELETE_CLUB, …
 *   @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'ADD_CLUB')")
 *
 *   // Club-scoped — VIEW_CLUB_MEMBERS, ADD_CLUB_MEMBER, MODIFY_CLUB_MEMBER
 *   @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'ADD_CLUB_MEMBER')")
 *
 * {@link RolePrivilegeMap} is the single source of truth for the role→privilege mapping.
 */
@Component("sec")
@RequiredArgsConstructor
public class SchoolSecurityEvaluator {

    private final UserRepository userRepository;
    private final SchoolMembershipRepository schoolMembershipRepository;
    private final ClubMembershipRepository clubMembershipRepository;
    private final ClubRepository clubRepository;

    // ── App-level check ──────────────────────────────────────────────────────

    /**
     * App-level privilege check (no school/club context).
     * Only APP_ADMIN holds app-level privileges.
     */
    public boolean hasPrivilege(Authentication auth, String privilegeName) {
        if (auth == null || !auth.isAuthenticated()) return false;
        Privilege privilege = Privilege.valueOf(privilegeName);
        User user = loadUser(auth);
        if (user == null) return false;
        return user.getAppRole() == AppRole.APP_ADMIN
                && RolePrivilegeMap.APP_ADMIN_PRIVILEGES.contains(privilege);
    }

    // ── School-level check ───────────────────────────────────────────────────

    /**
     * School-scoped privilege check.
     *
     * Resolution order:
     *  1. APP_ADMIN  → APP_ADMIN_SCHOOL_PRIVILEGES
     *  2. SCHOOL_ADMIN of this school → SCHOOL_ADMIN_PRIVILEGES
     *  3. Approved SCHOOL_MEMBER of this school → SCHOOL_MEMBER_PRIVILEGES
     *  4. Any authenticated user → AUTHENTICATED_SCHOOL_PRIVILEGES
     */
    public boolean hasSchoolPrivilege(Authentication auth, Long schoolId, String privilegeName) {
        if (auth == null || !auth.isAuthenticated()) return false;
        Privilege privilege = Privilege.valueOf(privilegeName);
        User user = loadUser(auth);
        if (user == null) return false;

        if (user.getAppRole() == AppRole.APP_ADMIN) {
            return RolePrivilegeMap.APP_ADMIN_SCHOOL_PRIVILEGES.contains(privilege);
        }

        var membership = schoolMembershipRepository
                .findByUserIdAndSchoolId(user.getId(), schoolId)
                .orElse(null);

        if (membership != null && membership.getStatus() == MembershipStatus.APPROVED) {
            if (membership.getRole() == MembershipRole.ADMIN) {
                return RolePrivilegeMap.SCHOOL_ADMIN_PRIVILEGES.contains(privilege);
            }
            if (membership.getRole() == MembershipRole.MEMBER) {
                return RolePrivilegeMap.SCHOOL_MEMBER_PRIVILEGES.contains(privilege);
            }
        }

        return RolePrivilegeMap.AUTHENTICATED_SCHOOL_PRIVILEGES.contains(privilege);
    }

    // ── Club-level check ─────────────────────────────────────────────────────

    /**
     * Club-scoped privilege check.
     *
     * Resolution order:
     *  1. APP_ADMIN  → APP_ADMIN_CLUB_PRIVILEGES
     *  2. SCHOOL_ADMIN of the club's parent school → SCHOOL_ADMIN_CLUB_PRIVILEGES
     *  3. CLUB_ADMIN of this club → CLUB_ADMIN_PRIVILEGES
     *  4. Approved CLUB_MEMBER of this club → CLUB_MEMBER_PRIVILEGES
     *  5. Otherwise denied
     */
    public boolean hasClubPrivilege(Authentication auth, Long clubId, String privilegeName) {
        if (auth == null || !auth.isAuthenticated()) return false;
        Privilege privilege = Privilege.valueOf(privilegeName);
        User user = loadUser(auth);
        if (user == null) return false;

        if (user.getAppRole() == AppRole.APP_ADMIN) {
            return RolePrivilegeMap.APP_ADMIN_CLUB_PRIVILEGES.contains(privilege);
        }

        // Resolve the parent schoolId from the club
        Long schoolId = clubRepository.findById(clubId)
                .map(c -> c.getSchool().getId())
                .orElse(null);

        if (schoolId != null) {
            var schoolMembership = schoolMembershipRepository
                    .findByUserIdAndSchoolId(user.getId(), schoolId)
                    .orElse(null);
            if (schoolMembership != null
                    && schoolMembership.getStatus() == MembershipStatus.APPROVED
                    && schoolMembership.getRole() == MembershipRole.ADMIN) {
                return RolePrivilegeMap.SCHOOL_ADMIN_CLUB_PRIVILEGES.contains(privilege);
            }
        }

        var clubMembership = clubMembershipRepository
                .findByUserIdAndClubId(user.getId(), clubId)
                .orElse(null);

        if (clubMembership != null && clubMembership.getStatus() == MembershipStatus.APPROVED) {
            if (clubMembership.getRole() == MembershipRole.ADMIN) {
                return RolePrivilegeMap.CLUB_ADMIN_PRIVILEGES.contains(privilege);
            }
            if (clubMembership.getRole() == MembershipRole.MEMBER) {
                return RolePrivilegeMap.CLUB_MEMBER_PRIVILEGES.contains(privilege);
            }
        }

        return false;
    }

    // ── Privilege resolution (returns full privilege set for the caller) ─────

    /**
     * Returns the privilege names the authenticated user holds for the given school.
     * Mirrors the resolution order in {@link #hasSchoolPrivilege} but returns the
     * full applicable set instead of checking a single entry.
     */
    public Set<String> resolveSchoolPrivileges(Authentication auth, Long schoolId) {
        if (auth == null || !auth.isAuthenticated()) return Set.of();
        User user = loadUser(auth);
        if (user == null) return Set.of();

        if (user.getAppRole() == AppRole.APP_ADMIN) {
            return toNames(RolePrivilegeMap.APP_ADMIN_SCHOOL_PRIVILEGES);
        }

        var membership = schoolMembershipRepository
                .findByUserIdAndSchoolId(user.getId(), schoolId)
                .orElse(null);

        if (membership != null && membership.getStatus() == MembershipStatus.APPROVED) {
            if (membership.getRole() == MembershipRole.ADMIN) {
                return toNames(RolePrivilegeMap.SCHOOL_ADMIN_PRIVILEGES);
            }
            if (membership.getRole() == MembershipRole.MEMBER) {
                return toNames(RolePrivilegeMap.SCHOOL_MEMBER_PRIVILEGES);
            }
        }
        return toNames(RolePrivilegeMap.AUTHENTICATED_SCHOOL_PRIVILEGES);
    }

    /**
     * Returns the privilege names the authenticated user holds for the given club.
     * Mirrors the resolution order in {@link #hasClubPrivilege}.
     */
    public Set<String> resolveClubPrivileges(Authentication auth, Long clubId) {
        if (auth == null || !auth.isAuthenticated()) return Set.of();
        User user = loadUser(auth);
        if (user == null) return Set.of();

        if (user.getAppRole() == AppRole.APP_ADMIN) {
            return toNames(RolePrivilegeMap.APP_ADMIN_CLUB_PRIVILEGES);
        }

        Long schoolId = clubRepository.findById(clubId)
                .map(c -> c.getSchool().getId())
                .orElse(null);

        if (schoolId != null) {
            var schoolMembership = schoolMembershipRepository
                    .findByUserIdAndSchoolId(user.getId(), schoolId)
                    .orElse(null);
            if (schoolMembership != null
                    && schoolMembership.getStatus() == MembershipStatus.APPROVED
                    && schoolMembership.getRole() == MembershipRole.ADMIN) {
                return toNames(RolePrivilegeMap.SCHOOL_ADMIN_CLUB_PRIVILEGES);
            }
        }

        var clubMembership = clubMembershipRepository
                .findByUserIdAndClubId(user.getId(), clubId)
                .orElse(null);

        if (clubMembership != null && clubMembership.getStatus() == MembershipStatus.APPROVED) {
            if (clubMembership.getRole() == MembershipRole.ADMIN) {
                return toNames(RolePrivilegeMap.CLUB_ADMIN_PRIVILEGES);
            }
            if (clubMembership.getRole() == MembershipRole.MEMBER) {
                return toNames(RolePrivilegeMap.CLUB_MEMBER_PRIVILEGES);
            }
        }
        return Set.of();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private User loadUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    private static Set<String> toNames(Set<Privilege> privileges) {
        return privileges.stream().map(Enum::name)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }
}
