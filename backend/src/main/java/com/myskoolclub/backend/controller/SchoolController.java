package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.AssignSchoolAdminRequest;
import com.myskoolclub.backend.dto.MembershipResponse;
import com.myskoolclub.backend.dto.SchoolRequest;
import com.myskoolclub.backend.dto.SchoolResponse;
import com.myskoolclub.backend.dto.UpdateSchoolRequest;
import com.myskoolclub.backend.dto.UpdateSchoolTierRequest;
import com.myskoolclub.backend.security.SchoolSecurityEvaluator;
import com.myskoolclub.backend.service.SchoolService;
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
@RequestMapping("/api/schools")
@RequiredArgsConstructor
public class SchoolController {

    private final SchoolService schoolService;
    private final SchoolSecurityEvaluator sec;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SchoolResponse>> listSchools(Authentication auth) {
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_APP_ADMIN"));
        return ResponseEntity.ok(schoolService.listSchools(isAdmin));
    }

    @GetMapping("/{schoolId}")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'VIEW_SCHOOL')")
    public ResponseEntity<SchoolResponse> getSchool(@PathVariable Long schoolId) {
        return ResponseEntity.ok(schoolService.getSchool(schoolId));
    }

    @PostMapping
    @PreAuthorize("@sec.hasPrivilege(authentication, 'ADD_SCHOOL')")
    public ResponseEntity<SchoolResponse> createSchool(
            @Valid @RequestBody SchoolRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(schoolService.createSchool(request, auth.getName()));
    }

    @PutMapping("/{schoolId}")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'MODIFY_SCHOOL')")
    public ResponseEntity<SchoolResponse> updateSchool(
            @PathVariable Long schoolId,
            @Valid @RequestBody UpdateSchoolRequest request,
            Authentication auth) {
        return ResponseEntity.ok(schoolService.updateSchool(schoolId, request, auth.getName()));
    }

    @PatchMapping("/{schoolId}/enabled")
    @PreAuthorize("@sec.hasPrivilege(authentication, 'REMOVE_SCHOOL')")
    public ResponseEntity<Map<String, String>> setSchoolEnabled(
            @PathVariable Long schoolId,
            @RequestParam boolean value,
            Authentication auth) {
        schoolService.setSchoolEnabled(schoolId, value, auth.getName());
        return ResponseEntity.ok(Map.of("message", value ? "School enabled" : "School disabled"));
    }

    @PatchMapping("/{schoolId}/tier")
    @PreAuthorize("hasRole('APP_ADMIN')")
    public ResponseEntity<SchoolResponse> setSchoolTier(
            @PathVariable Long schoolId,
            @Valid @RequestBody UpdateSchoolTierRequest request,
            Authentication auth) {
        return ResponseEntity.ok(schoolService.setSchoolTier(schoolId, request.tier(), auth.getName()));
    }

    // APP_ADMIN or SCHOOL_ADMIN assigns or promotes a user to school admin
    @PostMapping("/{schoolId}/admins")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'MANAGE_SCHOOL_ADMINS')")
    public ResponseEntity<Map<String, String>> assignSchoolAdmin(
            @PathVariable Long schoolId,
            @Valid @RequestBody AssignSchoolAdminRequest request,
            Authentication auth) {
        schoolService.assignSchoolAdmin(schoolId, request.userId(), auth.getName());
        return ResponseEntity.ok(Map.of("message", "School admin assigned successfully"));
    }

    // APP_ADMIN or SCHOOL_ADMIN removes school admin role (demotes to member, cascades club admin)
    @DeleteMapping("/{schoolId}/admins/{userId}")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'MANAGE_SCHOOL_ADMINS')")
    public ResponseEntity<Map<String, String>> revokeSchoolAdminRole(
            @PathVariable Long schoolId,
            @PathVariable Long userId,
            Authentication auth) {
        schoolService.revokeSchoolAdminRole(schoolId, userId, auth.getName());
        return ResponseEntity.ok(Map.of("message", "School admin role removed"));
    }

    // Current user requests to join a school
    @PostMapping("/{schoolId}/memberships/request")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MembershipResponse> requestMembership(
            @PathVariable Long schoolId, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(schoolService.requestMembership(schoolId, auth.getName()));
    }

    // Current user's privileges in a school (used by mobile to drive UI)
    @GetMapping("/{schoolId}/my-privileges")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Set<String>> getMySchoolPrivileges(
            @PathVariable Long schoolId, Authentication auth) {
        return ResponseEntity.ok(sec.resolveSchoolPrivileges(auth, schoolId));
    }

    // Current user's own membership in a school
    @GetMapping("/{schoolId}/memberships/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MembershipResponse> getMyMembership(
            @PathVariable Long schoolId, Authentication auth) {
        return schoolService.getMyMembership(schoolId, auth.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/{schoolId}/memberships/pending")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'MANAGE_SCHOOL_MEMBERS')")
    public ResponseEntity<List<MembershipResponse>> listPendingRequests(
            @PathVariable Long schoolId, Authentication auth) {
        return ResponseEntity.ok(schoolService.listMembershipRequests(schoolId));
    }

    // School admin views approved members
    @GetMapping("/{schoolId}/memberships")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'MANAGE_SCHOOL_MEMBERS')")
    public ResponseEntity<List<MembershipResponse>> listMembers(
            @PathVariable Long schoolId, Authentication auth) {
        return ResponseEntity.ok(schoolService.listMembers(schoolId));
    }

    @PostMapping("/{schoolId}/memberships/{userId}/approve")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'MANAGE_SCHOOL_MEMBERS')")
    public ResponseEntity<MembershipResponse> approveMembership(
            @PathVariable Long schoolId, @PathVariable Long userId, Authentication auth) {
        return ResponseEntity.ok(schoolService.approveMembership(schoolId, userId, auth.getName()));
    }

    @PostMapping("/{schoolId}/memberships/{userId}/reject")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'MANAGE_SCHOOL_MEMBERS')")
    public ResponseEntity<MembershipResponse> rejectMembership(
            @PathVariable Long schoolId, @PathVariable Long userId, Authentication auth) {
        return ResponseEntity.ok(schoolService.rejectMembership(schoolId, userId, auth.getName()));
    }

    @DeleteMapping("/{schoolId}/memberships/{userId}")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'MANAGE_SCHOOL_MEMBERS')")
    public ResponseEntity<Map<String, String>> revokeMembership(
            @PathVariable Long schoolId, @PathVariable Long userId, Authentication auth) {
        schoolService.revokeMembership(schoolId, userId, auth.getName());
        return ResponseEntity.ok(Map.of("message", "Membership revoked"));
    }
}
