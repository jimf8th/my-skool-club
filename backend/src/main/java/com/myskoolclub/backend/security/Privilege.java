package com.myskoolclub.backend.security;

/**
 * All privileges recognised by the application.
 *
 * Two scopes exist:
 *   SCHOOL-LEVEL  – actions on the school resource itself, or on clubs within it.
 *                   Checked with @sec.hasSchoolPrivilege(auth, #schoolId, '...')
 *   CLUB-LEVEL    – actions scoped to a specific club (membership management).
 *                   Checked with @sec.hasClubPrivilege(auth, #clubId, '...')
 *   APP-LEVEL     – global operations only APP_ADMIN can perform.
 *                   Checked with @sec.hasPrivilege(auth, '...')
 */
public enum Privilege {

    // ── App-level school privileges (APP_ADMIN only) ────────────────────────
    ADD_SCHOOL,
    REMOVE_SCHOOL,

    // ── School-level privileges (APP_ADMIN or SCHOOL_ADMIN of that school) ──
    VIEW_SCHOOL,
    MODIFY_SCHOOL,
    MANAGE_SCHOOL_MEMBERS,   // approve / reject / revoke school memberships
    MANAGE_SCHOOL_ADMINS,    // assign / revoke school-admin role

    // ── School-level club privileges (who may act on clubs within a school) ─
    VIEW_ALL_CLUBS,          // list all clubs in the school
    ADD_CLUB,                // create a new club in the school
    MODIFY_CLUB,             // edit club name / description
    DELETE_CLUB,             // remove a club from the school

    // ── School-level event privileges (who may act on events within a school) ─
    VIEW_EVENTS,             // view the school's events and RSVP counts/list
    CREATE_EVENT,            // create an event; delete your own (service-enforced)
    RSVP_EVENT,              // respond YES / NO / MAYBE to an event

    // ── School-level announcement privileges ─────────────────────────────────
    VIEW_ANNOUNCEMENTS,      // view the school's announcements
    CREATE_ANNOUNCEMENT,     // post/delete announcements (school/app admin only)

    // ── Club-level membership privileges (scoped to a specific club) ────────
    VIEW_CLUB_MEMBERS,       // list approved and pending members of the club
    ADD_CLUB_MEMBER,         // approve a membership request / add someone directly
    MODIFY_CLUB_MEMBER,      // reject or revoke an existing club membership
    MANAGE_CLUB_ADMINS,      // assign / revoke club-admin role

    // ── Club-level invoice privileges (scoped to a specific club) ────────
    VIEW_INVOICES,           // view the club's invoices and their audit trail
    CREATE_INVOICE,          // create/edit/submit/cancel your own draft invoices
    APPROVE_INVOICE,         // approve, send back, mark paid, or cancel any invoice

    // ── Club-level inventory privileges (scoped to a specific club) ──────
    VIEW_INVENTORY,          // view the club's inventory and checkout history
    CHECKOUT_INVENTORY,      // check items out and back in
    MANAGE_INVENTORY,        // add / edit / remove inventory items
}
