package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.AssignClubAdminRequest;
import com.myskoolclub.backend.dto.ClubRequest;
import com.myskoolclub.backend.dto.ClubResponse;
import com.myskoolclub.backend.dto.MembershipResponse;
import com.myskoolclub.backend.dto.UpdateClubRequest;
import com.myskoolclub.backend.security.SchoolSecurityEvaluator;
import com.myskoolclub.backend.service.ClubService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequiredArgsConstructor
public class ClubController {

    private final ClubService clubService;
    private final SchoolSecurityEvaluator sec;

    // ── School-level club operations ─────────────────────────────────────────

    /** List all clubs in a school. Requires VIEW_ALL_CLUBS (school member or above). */
    @GetMapping("/api/schools/{schoolId}/clubs")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'VIEW_ALL_CLUBS')")
    public ResponseEntity<List<ClubResponse>> listClubs(
            @PathVariable Long schoolId, Authentication auth) {
        return ResponseEntity.ok(clubService.listClubs(schoolId, auth.getName()));
    }

    /** Create a club in a school. Requires ADD_CLUB (school admin or app admin). */
    @PostMapping("/api/schools/{schoolId}/clubs")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'ADD_CLUB')")
    public ResponseEntity<ClubResponse> createClub(
            @PathVariable Long schoolId,
            @Valid @RequestBody ClubRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(clubService.createClub(schoolId, request, auth.getName()));
    }

    /** Edit a club. Requires MODIFY_CLUB (school admin or app admin). */
    @PutMapping("/api/schools/{schoolId}/clubs/{clubId}")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'MODIFY_CLUB')")
    public ResponseEntity<ClubResponse> updateClub(
            @PathVariable Long schoolId,
            @PathVariable Long clubId,
            @Valid @RequestBody UpdateClubRequest request,
            Authentication auth) {
        return ResponseEntity.ok(clubService.updateClub(schoolId, clubId, request, auth.getName()));
    }

    /** Delete a club. Requires DELETE_CLUB (school admin or app admin). */
    @DeleteMapping("/api/schools/{schoolId}/clubs/{clubId}")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'DELETE_CLUB')")
    public ResponseEntity<Map<String, String>> deleteClub(
            @PathVariable Long schoolId,
            @PathVariable Long clubId,
            Authentication auth) {
        clubService.deleteClub(schoolId, clubId, auth.getName());
        return ResponseEntity.ok(Map.of("message", "Club deleted"));
    }

    // ── Single club ──────────────────────────────────────────────────────────

    /** Get a single club. Service enforces school membership. */
    @GetMapping("/api/clubs/{clubId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClubResponse> getClub(
            @PathVariable Long clubId, Authentication auth) {
        return ResponseEntity.ok(clubService.getClub(clubId, auth.getName()));
    }

    /** Returns the privilege names the current user holds for the given club. */
    @GetMapping("/api/clubs/{clubId}/my-privileges")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Set<String>> getMyClubPrivileges(
            @PathVariable Long clubId, Authentication auth) {
        return ResponseEntity.ok(sec.resolveClubPrivileges(auth, clubId));
    }

    /** Get the current user's own club membership (or 204 if not a member). */
    @GetMapping("/api/clubs/{clubId}/memberships/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MembershipResponse> getMyClubMembership(
            @PathVariable Long clubId, Authentication auth) {
        return clubService.getMyMembership(clubId, auth.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    // ── Club membership operations ───────────────────────────────────────────

    /** Any approved school member may request to join a club. */
    @PostMapping("/api/clubs/{clubId}/memberships/request")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MembershipResponse> requestMembership(
            @PathVariable Long clubId, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(clubService.requestMembership(clubId, auth.getName()));
    }

    /** View pending join requests. Requires VIEW_CLUB_MEMBERS. */
    @GetMapping("/api/clubs/{clubId}/memberships/pending")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'VIEW_CLUB_MEMBERS')")
    public ResponseEntity<List<MembershipResponse>> listPendingRequests(
            @PathVariable Long clubId, Authentication auth) {
        return ResponseEntity.ok(clubService.listMembershipRequests(clubId));
    }

    /** View all approved club members. Requires VIEW_CLUB_MEMBERS. */
    @GetMapping("/api/clubs/{clubId}/memberships")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'VIEW_CLUB_MEMBERS')")
    public ResponseEntity<List<MembershipResponse>> listMembers(
            @PathVariable Long clubId, Authentication auth) {
        return ResponseEntity.ok(clubService.listMembers(clubId));
    }

    /** Approve a membership request. Requires ADD_CLUB_MEMBER. */
    @PostMapping("/api/clubs/{clubId}/memberships/{userId}/approve")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'ADD_CLUB_MEMBER')")
    public ResponseEntity<MembershipResponse> approveMembership(
            @PathVariable Long clubId, @PathVariable Long userId, Authentication auth) {
        return ResponseEntity.ok(clubService.approveMembership(clubId, userId, auth.getName()));
    }

    /** Reject a membership request. Requires MODIFY_CLUB_MEMBER. */
    @PostMapping("/api/clubs/{clubId}/memberships/{userId}/reject")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'MODIFY_CLUB_MEMBER')")
    public ResponseEntity<MembershipResponse> rejectMembership(
            @PathVariable Long clubId, @PathVariable Long userId, Authentication auth) {
        return ResponseEntity.ok(clubService.rejectMembership(clubId, userId, auth.getName()));
    }

    /** Revoke an active membership. Requires MODIFY_CLUB_MEMBER. */
    @DeleteMapping("/api/clubs/{clubId}/memberships/{userId}")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'MODIFY_CLUB_MEMBER')")
    public ResponseEntity<Map<String, String>> revokeMembership(
            @PathVariable Long clubId, @PathVariable Long userId, Authentication auth) {
        clubService.revokeMembership(clubId, userId, auth.getName());
        return ResponseEntity.ok(Map.of("message", "Membership revoked"));
    }

    // ── Club admin management ──────────────────────────────────────────

    /** List current club admins. */
    @GetMapping("/api/clubs/{clubId}/admins")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MembershipResponse>> getClubAdmins(
            @PathVariable Long clubId, Authentication auth) {
        return ResponseEntity.ok(clubService.getClubAdmins(clubId));
    }

    /** Assign a user as club admin. Requires MANAGE_CLUB_ADMINS. */
    @PostMapping("/api/clubs/{clubId}/admins")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'MANAGE_CLUB_ADMINS')")
    public ResponseEntity<Map<String, String>> assignClubAdmin(
            @PathVariable Long clubId,
            @Valid @RequestBody AssignClubAdminRequest request,
            Authentication auth) {
        clubService.assignClubAdmin(clubId, request.userId(), auth.getName());
        return ResponseEntity.ok(Map.of("message", "Club admin assigned successfully"));
    }

    /** Remove a user's club admin role. Requires MANAGE_CLUB_ADMINS. */
    @DeleteMapping("/api/clubs/{clubId}/admins/{userId}")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'MANAGE_CLUB_ADMINS')")
    public ResponseEntity<Map<String, String>> revokeClubAdminRole(
            @PathVariable Long clubId,
            @PathVariable Long userId,
            Authentication auth) {
        clubService.revokeClubAdminRole(clubId, userId, auth.getName());
        return ResponseEntity.ok(Map.of("message", "Club admin role removed"));
    }
}
