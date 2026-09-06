package com.myskoolclub.backend.security;

import java.util.EnumSet;
import java.util.Set;

/**
 * Single source of truth: which privileges each role holds.
 *
 * THREE evaluator methods consume these sets:
 *   hasPrivilege(auth, privilege)                  → app-level (APP_ADMIN only)
 *   hasSchoolPrivilege(auth, schoolId, privilege)  → school or club management within a school
 *   hasClubPrivilege(auth, clubId, privilege)      → membership actions on a specific club
 *
 * To add new privileges: add the constant to {@link Privilege} and then add it
 * to the appropriate set(s) below.
 */
public final class RolePrivilegeMap {

    private RolePrivilegeMap() {}

    // ── App-level (global, APP_ADMIN only) ───────────────────────────────────

    /** Privileges only APP_ADMIN can exercise globally, regardless of school. */
    public static final Set<Privilege> APP_ADMIN_PRIVILEGES = EnumSet.of(
            Privilege.ADD_SCHOOL,
            Privilege.REMOVE_SCHOOL
    );

    // ── School-level privilege sets ──────────────────────────────────────────

    /**
     * What APP_ADMIN can do in the context of any school
     * (passed to hasSchoolPrivilege).
     */
    public static final Set<Privilege> APP_ADMIN_SCHOOL_PRIVILEGES = EnumSet.of(
            Privilege.VIEW_SCHOOL,
            Privilege.MODIFY_SCHOOL,
            Privilege.MANAGE_SCHOOL_MEMBERS,
            Privilege.MANAGE_SCHOOL_ADMINS,
            Privilege.VIEW_ALL_CLUBS,
            Privilege.ADD_CLUB,
            Privilege.MODIFY_CLUB,
            Privilege.DELETE_CLUB,
            Privilege.VIEW_EVENTS,
            Privilege.CREATE_EVENT,
            Privilege.RSVP_EVENT,
            Privilege.VIEW_ANNOUNCEMENTS,
            Privilege.CREATE_ANNOUNCEMENT
    );

    /** What a SCHOOL_ADMIN can do within their school. */
    public static final Set<Privilege> SCHOOL_ADMIN_PRIVILEGES = EnumSet.of(
            Privilege.VIEW_SCHOOL,
            Privilege.MODIFY_SCHOOL,
            Privilege.MANAGE_SCHOOL_MEMBERS,
            Privilege.MANAGE_SCHOOL_ADMINS,
            Privilege.VIEW_ALL_CLUBS,
            Privilege.ADD_CLUB,
            Privilege.MODIFY_CLUB,
            Privilege.DELETE_CLUB,
            Privilege.VIEW_EVENTS,
            Privilege.CREATE_EVENT,
            Privilege.RSVP_EVENT,
            Privilege.VIEW_ANNOUNCEMENTS,
            Privilege.CREATE_ANNOUNCEMENT
    );

    /** What an approved SCHOOL_MEMBER can do within their school. */
    public static final Set<Privilege> SCHOOL_MEMBER_PRIVILEGES = EnumSet.of(
            Privilege.VIEW_SCHOOL,
            Privilege.VIEW_ALL_CLUBS,
            Privilege.VIEW_EVENTS,
            Privilege.CREATE_EVENT,
            Privilege.RSVP_EVENT,
            Privilege.VIEW_ANNOUNCEMENTS
    );

    /** What any authenticated user can do (no school membership required). */
    public static final Set<Privilege> AUTHENTICATED_SCHOOL_PRIVILEGES = EnumSet.of(
            Privilege.VIEW_SCHOOL
    );

    // ── Club-level privilege sets ────────────────────────────────────────────

    /**
     * What APP_ADMIN can do within any club
     * (passed to hasClubPrivilege).
     */
    public static final Set<Privilege> APP_ADMIN_CLUB_PRIVILEGES = EnumSet.of(
            Privilege.VIEW_CLUB_MEMBERS,
            Privilege.ADD_CLUB_MEMBER,
            Privilege.MODIFY_CLUB_MEMBER,
            Privilege.MANAGE_CLUB_ADMINS,
            Privilege.VIEW_INVOICES,
            Privilege.CREATE_INVOICE,
            Privilege.APPROVE_INVOICE,
            Privilege.VIEW_INVENTORY,
            Privilege.CHECKOUT_INVENTORY,
            Privilege.MANAGE_INVENTORY
    );

    /** What a CLUB_ADMIN (MembershipRole.ADMIN in that club) can do. */
    public static final Set<Privilege> CLUB_ADMIN_PRIVILEGES = EnumSet.of(
            Privilege.VIEW_CLUB_MEMBERS,
            Privilege.ADD_CLUB_MEMBER,
            Privilege.MODIFY_CLUB_MEMBER,
            Privilege.MANAGE_CLUB_ADMINS,
            Privilege.VIEW_INVOICES,
            Privilege.CREATE_INVOICE,
            Privilege.APPROVE_INVOICE,
            Privilege.VIEW_INVENTORY,
            Privilege.CHECKOUT_INVENTORY,
            Privilege.MANAGE_INVENTORY
    );

    /** What a SCHOOL_ADMIN can do within any club in their school. */
    public static final Set<Privilege> SCHOOL_ADMIN_CLUB_PRIVILEGES = EnumSet.of(
            Privilege.VIEW_CLUB_MEMBERS,
            Privilege.ADD_CLUB_MEMBER,
            Privilege.MODIFY_CLUB_MEMBER,
            Privilege.MANAGE_CLUB_ADMINS,
            Privilege.VIEW_INVOICES,
            Privilege.CREATE_INVOICE,
            Privilege.APPROVE_INVOICE,
            Privilege.VIEW_INVENTORY,
            Privilege.CHECKOUT_INVENTORY,
            Privilege.MANAGE_INVENTORY
    );

    /** What an approved CLUB_MEMBER can do within the club. */
    public static final Set<Privilege> CLUB_MEMBER_PRIVILEGES = EnumSet.of(
            Privilege.VIEW_CLUB_MEMBERS,
            Privilege.VIEW_INVOICES,
            Privilege.CREATE_INVOICE,
            Privilege.VIEW_INVENTORY,
            Privilege.CHECKOUT_INVENTORY
    );
}
