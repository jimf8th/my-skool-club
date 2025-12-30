package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.service.MemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/members")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class MemberController {

    @Autowired
    private MemberService memberService;
    
    @Autowired
    private com.myskoolclub.backend.security.SchoolSecurityHelper securityHelper;
    
    @Autowired
    private com.myskoolclub.backend.security.JwtTokenUtil jwtTokenUtil;

    /**
     * Create a new member (Member signup)
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createMember(@RequestBody Member member) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member createdMember = memberService.createMember(member);
            response.put("success", true);
            response.put("message", "Member registered successfully!");
            response.put("data", createdMember);
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while registering the member");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get all active members with pagination
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllActiveMembers(
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Get current user from JWT token manually
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            Optional<Member> currentMemberOpt = memberService.findByEmail(currentUserEmail);
            if (!currentMemberOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Current user not found.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            Member currentMember = currentMemberOpt.get();
            if (!"APP_ADMIN".equals(currentMember.getRole()) && !"SCHOOL_ADMIN".equals(currentMember.getRole())) {
                response.put("success", false);
                response.put("message", "Access denied. Insufficient permissions to view members.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            List<Member> members = memberService.getAllActiveMembers();
            
            // Filter members based on user role
            if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
                // SCHOOL_ADMIN can only see members from their school with roles SCHOOL_USER or SCHOOL_ADMIN
                members = members.stream()
                    .filter(member -> currentMember.getSchoolId().equals(member.getSchoolId()) &&
                                    ("SCHOOL_USER".equals(member.getRole()) || "SCHOOL_ADMIN".equals(member.getRole())))
                    .collect(java.util.stream.Collectors.toList());
            }
            
            // Calculate pagination
            int totalCount = members.size();
            int totalPages = (int) Math.ceil((double) totalCount / size);
            int startIndex = page * size;
            int endIndex = Math.min(startIndex + size, totalCount);
            
            // Get paginated subset
            List<Member> paginatedMembers = startIndex < totalCount ? 
                members.subList(startIndex, endIndex) : new java.util.ArrayList<>();
            
            response.put("success", true);
            response.put("data", paginatedMembers);
            response.put("count", paginatedMembers.size());
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("size", size);
            response.put("totalPages", totalPages);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching members");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get all members including inactive ones with pagination
     */
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllMembersIncludingInactive(
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size,
            @RequestParam(required = false) Boolean isActive) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check if user can manage members
            if (!securityHelper.canManageMembers()) {
                response.put("success", false);
                response.put("message", "Access denied. Insufficient permissions to view members.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            List<Member> members = memberService.getAllMembers();
            
            // Filter members based on user role
            Member currentMember = securityHelper.getCurrentMember();
            if (currentMember != null && "SCHOOL_ADMIN".equals(currentMember.getRole())) {
                // SCHOOL_ADMIN can only see members from their school with roles SCHOOL_USER or SCHOOL_ADMIN
                members = members.stream()
                    .filter(member -> currentMember.getSchoolId().equals(member.getSchoolId()) &&
                                    ("SCHOOL_USER".equals(member.getRole()) || "SCHOOL_ADMIN".equals(member.getRole())))
                    .collect(java.util.stream.Collectors.toList());
            }
            
            // Filter by isActive status if specified
            if (isActive != null) {
                members = members.stream()
                    .filter(member -> member.isActive() == isActive)
                    .collect(java.util.stream.Collectors.toList());
            }
            
            // Calculate pagination
            int totalCount = members.size();
            int totalPages = (int) Math.ceil((double) totalCount / size);
            int startIndex = page * size;
            int endIndex = Math.min(startIndex + size, totalCount);
            
            // Get paginated subset
            List<Member> paginatedMembers = startIndex < totalCount ? 
                members.subList(startIndex, endIndex) : new java.util.ArrayList<>();
            
            response.put("success", true);
            response.put("data", paginatedMembers);
            response.put("count", paginatedMembers.size());
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("size", size);
            response.put("totalPages", totalPages);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching all students");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get member by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getMemberById(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<Member> member = memberService.getMemberById(id);
            
            if (member.isPresent()) {
                response.put("success", true);
                response.put("data", member.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Member not found");
                return ResponseEntity.notFound().build();
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching the member");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get member by email
     */
    @GetMapping("/email/{email}")
    public ResponseEntity<Map<String, Object>> getMemberByEmail(@PathVariable String email) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<Member> member = memberService.getMemberByEmail(email);
            
            if (member.isPresent()) {
                response.put("success", true);
                response.put("data", member.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Member not found");
                return ResponseEntity.notFound().build();
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching the member");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get members by school
     */
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<Map<String, Object>> getMembersBySchool(@PathVariable String schoolId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Member> members = memberService.getMembersBySchool(schoolId);
            response.put("success", true);
            response.put("data", members);
            response.put("count", members.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching members");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get members by grade level (for students)
     */
    @GetMapping("/grade/{gradeLevel}")
    public ResponseEntity<Map<String, Object>> getMembersByGradeLevel(@PathVariable String gradeLevel) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Member> members = memberService.getMembersByGradeLevel(gradeLevel);
            response.put("success", true);
            response.put("data", members);
            response.put("count", members.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching members");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get members by type (student or teacher)
     */
    @GetMapping("/type/{memberType}")
    public ResponseEntity<Map<String, Object>> getMembersByType(@PathVariable String memberType) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Member> members = memberService.getMembersByType(memberType);
            response.put("success", true);
            response.put("data", members);
            response.put("count", members.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching members");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Search members
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchMembers(@RequestParam(required = false) String q) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Member> members = memberService.searchMembers(q);
            response.put("success", true);
            response.put("data", members);
            response.put("count", members.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while searching members");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Advanced search, filter, and sort members
     */
    @GetMapping("/advanced-search")
    public ResponseEntity<Map<String, Object>> advancedSearchMembers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String schoolId,
            @RequestParam(required = false) String memberType,
            @RequestParam(required = false) String gradeLevel,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(required = false, defaultValue = "lastName") String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String sortDirection,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check if user can manage members
            if (!securityHelper.canManageMembers()) {
                response.put("success", false);
                response.put("message", "Access denied. Insufficient permissions to search members.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            Member currentMember = securityHelper.getCurrentMember();
            
            // For SCHOOL_ADMIN users, override schoolId and memberType parameters
            if (currentMember != null && "SCHOOL_ADMIN".equals(currentMember.getRole())) {
                schoolId = currentMember.getSchoolId(); // Force to use their school
                // Allow searching for both SCHOOL_USER and SCHOOL_ADMIN, but we'll filter later
                if (memberType == null) {
                    memberType = null; // Allow all member types, will filter in results
                }
            }
            
            List<Member> members = memberService.advancedSearchMembers(
                search, schoolId, memberType, gradeLevel, department, 
                gender, city, state, sortBy, sortDirection
            );
            
            // Additional filtering for SCHOOL_ADMIN users
            if (currentMember != null && "SCHOOL_ADMIN".equals(currentMember.getRole())) {
                members = members.stream()
                    .filter(member -> currentMember.getSchoolId().equals(member.getSchoolId()) &&
                                    ("SCHOOL_USER".equals(member.getRole()) || "SCHOOL_ADMIN".equals(member.getRole())))
                    .collect(java.util.stream.Collectors.toList());
            }
            
            // Calculate pagination
            int totalCount = members.size();
            int totalPages = (int) Math.ceil((double) totalCount / size);
            int startIndex = page * size;
            int endIndex = Math.min(startIndex + size, totalCount);
            
            // Get paginated subset
            List<Member> paginatedMembers = startIndex < totalCount ? 
                members.subList(startIndex, endIndex) : new java.util.ArrayList<>();
            
            response.put("success", true);
            response.put("data", paginatedMembers);
            response.put("count", paginatedMembers.size());
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("size", size);
            response.put("totalPages", totalPages);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while searching members: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Update member
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateMember(@PathVariable String id, @RequestBody Member member) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check if user can manage members
            if (!securityHelper.canManageMembers()) {
                response.put("success", false);
                response.put("message", "Access denied. Insufficient permissions to update members.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Get the existing member to check permissions
            Optional<Member> existingMemberOpt = memberService.getMemberById(id);
            if (!existingMemberOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Member not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Member existingMember = existingMemberOpt.get();
            
            // Get current logged-in member
            Member currentMember = securityHelper.getCurrentMember();
            
            // Prevent APP_ADMIN from deactivating themselves
            if ("APP_ADMIN".equals(existingMember.getRole()) && 
                currentMember != null && 
                existingMember.getId().equals(currentMember.getId()) &&
                member.isActive() == false) {
                response.put("success", false);
                response.put("message", "APP_ADMIN users cannot deactivate their own account.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Check if current user can manage this specific member
            if (!securityHelper.canManageMember(existingMember)) {
                response.put("success", false);
                response.put("message", "Access denied. You can only update members from your school.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            Member updatedMember = memberService.updateMember(id, member);
            response.put("success", true);
            response.put("message", "Member updated successfully!");
            response.put("data", updatedMember);
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while updating the member");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Delete member (soft delete)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteMember(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check if user can manage members
            if (!securityHelper.canManageMembers()) {
                response.put("success", false);
                response.put("message", "Access denied. Insufficient permissions to delete members.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Get the member to be deleted
            Optional<Member> memberOpt = memberService.getMemberById(id);
            if (!memberOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Member not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Member memberToDelete = memberOpt.get();
            
            // Get current logged-in member
            Member currentMember = securityHelper.getCurrentMember();
            
            // Prevent APP_ADMIN from deleting themselves
            if ("APP_ADMIN".equals(memberToDelete.getRole()) && 
                currentMember != null && 
                memberToDelete.getId().equals(currentMember.getId())) {
                response.put("success", false);
                response.put("message", "APP_ADMIN users cannot delete their own account.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Check if current user can manage this specific member
            if (!securityHelper.canManageMember(memberToDelete)) {
                response.put("success", false);
                response.put("message", "Access denied. You can only delete members from your school.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            memberService.deleteMember(id);
            response.put("success", true);
            response.put("message", "Member deleted successfully!");
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while deleting the member");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Check if email exists
     */
    @GetMapping("/check-email/{email}")
    public ResponseEntity<Map<String, Object>> checkEmailExists(@PathVariable String email) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean exists = memberService.emailExists(email);
            response.put("success", true);
            response.put("exists", exists);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while checking email");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Search members by email within a school (for admin email selection)
     */
    @GetMapping("/search-by-school")
    public ResponseEntity<Map<String, Object>> searchMembersBySchool(
            @RequestParam String schoolId,
            @RequestParam(required = false, defaultValue = "") String query) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check permissions
            if (!securityHelper.canManageMembers()) {
                response.put("success", false);
                response.put("message", "Access denied. Insufficient permissions.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Get all active members for the school
            List<Member> members = memberService.getAllActiveMembers().stream()
                .filter(member -> schoolId.equals(member.getSchoolId()))
                .filter(member -> query.isEmpty() || 
                        member.getEmail().toLowerCase().contains(query.toLowerCase()) ||
                        (member.getFirstName() + " " + member.getLastName()).toLowerCase().contains(query.toLowerCase()))
                .limit(10) // Limit results for performance
                .collect(Collectors.toList());
            
            // Return simplified data for type-ahead
            List<Map<String, String>> results = members.stream()
                .map(member -> {
                    Map<String, String> m = new HashMap<>();
                    m.put("email", member.getEmail());
                    m.put("name", member.getFirstName() + " " + member.getLastName());
                    m.put("memberType", member.getMemberType());
                    return m;
                })
                .collect(Collectors.toList());
            
            response.put("success", true);
            response.put("data", results);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while searching members");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get member count by school
     */
    @GetMapping("/count/school/{schoolId}")
    public ResponseEntity<Map<String, Object>> getMemberCountBySchool(@PathVariable String schoolId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            long count = memberService.countMembersBySchool(schoolId);
            response.put("success", true);
            response.put("count", count);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while counting members");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get member count by type
     */
    @GetMapping("/count/type/{memberType}")
    public ResponseEntity<Map<String, Object>> getMemberCountByType(@PathVariable String memberType) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            long count = memberService.countMembersByType(memberType);
            response.put("success", true);
            response.put("count", count);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while counting members");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Debug endpoint to check current user authentication
     */
    @GetMapping("/debug/auth")
    public ResponseEntity<Map<String, Object>> debugAuth() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check raw authentication
            org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            
            // Test JWT token extraction
            String emailFromToken = getCurrentUserEmailFromToken();
            
            response.put("authExists", auth != null);
            response.put("isAuthenticated", auth != null ? auth.isAuthenticated() : false);
            response.put("principalType", auth != null && auth.getPrincipal() != null ? 
                auth.getPrincipal().getClass().getName() : "null");
            response.put("principalValue", auth != null ? auth.getPrincipal() : "null");
            response.put("emailFromToken", emailFromToken);
            
            Member currentMember = securityHelper.getCurrentMember();
            boolean canManage = securityHelper.canManageMembers();
            
            response.put("success", true);
            response.put("currentMember", currentMember != null ? currentMember.getEmail() : "null");
            response.put("currentMemberRole", currentMember != null ? currentMember.getRole() : "null");
            response.put("canManageMembers", canManage);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error checking auth: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Activate a member (set active status to true)
     */
    @PutMapping("/{id}/activate")
    public ResponseEntity<Map<String, Object>> activateMember(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check if user can manage members
            if (!securityHelper.canManageMembers()) {
                response.put("success", false);
                response.put("message", "Access denied. Insufficient permissions to activate members.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Get the member to be activated
            Optional<Member> memberOpt = memberService.getMemberById(id);
            if (!memberOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Member not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Member memberToActivate = memberOpt.get();
            
            // Check if current user can manage this specific member
            if (!securityHelper.canManageMember(memberToActivate)) {
                response.put("success", false);
                response.put("message", "Access denied. You can only activate members from your school.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Activate the member
            Member activatedMember = memberService.activateMember(id);
            response.put("success", true);
            response.put("message", "Member activated successfully!");
            response.put("data", activatedMember);
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while activating the member");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Simple JWT test endpoint
     */
    @GetMapping("/debug/jwt")
    public ResponseEntity<Map<String, Object>> debugJwt(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Map<String, Object> response = new HashMap<>();
        
        response.put("authHeaderReceived", authHeader != null);
        response.put("authHeaderValue", authHeader);
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            response.put("tokenExtracted", true);
            response.put("tokenLength", token.length());
            
            try {
                boolean isValid = jwtTokenUtil.validateToken(token);
                response.put("tokenValid", isValid);
                
                if (isValid) {
                    String username = jwtTokenUtil.getUsernameFromToken(token);
                    response.put("username", username);
                } else {
                    response.put("username", null);
                }
            } catch (Exception e) {
                response.put("tokenValid", false);
                response.put("error", e.getMessage());
            }
        } else {
            response.put("tokenExtracted", false);
        }
        
        response.put("success", true);
        return ResponseEntity.ok(response);
    }

    /**
     * Temporary endpoint to update member role for testing
     */
    @PutMapping("/{id}/role")
    public ResponseEntity<Map<String, Object>> updateMemberRole(@PathVariable String id, @RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Only allow APP_ADMIN to update roles
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            Optional<Member> currentMemberOpt = memberService.findByEmail(currentUserEmail);
            if (!currentMemberOpt.isPresent() || !"APP_ADMIN".equals(currentMemberOpt.get().getRole())) {
                response.put("success", false);
                response.put("message", "Only APP_ADMIN can update member roles.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            Optional<Member> memberOpt = memberService.getMemberById(id);
            if (!memberOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Member not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Member member = memberOpt.get();
            String newRole = request.get("role");
            member.setRole(newRole);
            member.setUpdatedAt(java.time.LocalDateTime.now());
            
            Member updatedMember = memberService.updateMember(id, member);
            response.put("success", true);
            response.put("message", "Member role updated successfully!");
            response.put("data", updatedMember);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error updating member role: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Helper method to extract current user email from JWT token
     */
    private String getCurrentUserEmailFromToken() {
        try {
            org.springframework.web.context.request.ServletRequestAttributes requestAttributes = 
                (org.springframework.web.context.request.ServletRequestAttributes) 
                org.springframework.web.context.request.RequestContextHolder.currentRequestAttributes();
            
            jakarta.servlet.http.HttpServletRequest request = requestAttributes.getRequest();
            String authHeader = request.getHeader("Authorization");
            
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                
                try {
                    boolean isValid = jwtTokenUtil.validateToken(token);
                    
                    if (isValid) {
                        String username = jwtTokenUtil.getUsernameFromToken(token);
                        return username;
                    }
                } catch (Exception tokenException) {
                    // Token validation failed
                }
            }
        } catch (Exception e) {
            // Error extracting token
        }
        return null;
    }
    
    /**
     * Get member suggestions for club admin emails based on school
     */
    @GetMapping("/club-admin-suggestions")
    public ResponseEntity<Map<String, Object>> getClubAdminSuggestions(
            @RequestParam String schoolId,
            @RequestParam(required = false, defaultValue = "") String query) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            Optional<Member> currentMemberOpt = memberService.findByEmail(currentUserEmail);
            if (!currentMemberOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "User not found.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            Member currentMember = currentMemberOpt.get();
            String role = currentMember.getRole();
            
            // Only allow SCHOOL_ADMIN and APP_ADMIN to get club admin suggestions
            if (!"APP_ADMIN".equals(role) && !"SCHOOL_ADMIN".equals(role)) {
                response.put("success", false);
                response.put("message", "Access denied. Only School Admins and App Admins can get club admin suggestions.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // For SCHOOL_ADMIN, ensure they can only get suggestions for their own school
            if ("SCHOOL_ADMIN".equals(role) && !currentMember.getSchoolId().equals(schoolId)) {
                response.put("success", false);
                response.put("message", "Access denied. You can only get member suggestions for your own school.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Search for members in the specified school
            List<Member> allMembers = memberService.advancedSearchMembers(
                query, schoolId, null, null, null, 
                null, null, null, "email", "asc"
            );
            
            // Filter to only include active SCHOOL_USER and SCHOOL_ADMIN members
            List<Member> suggestedMembers = allMembers.stream()
                .filter(member -> member.isActive() && 
                               schoolId.equals(member.getSchoolId()) &&
                               ("SCHOOL_USER".equals(member.getRole()) || "SCHOOL_ADMIN".equals(member.getRole())) &&
                               (query.isEmpty() || 
                                member.getEmail().toLowerCase().contains(query.toLowerCase()) ||
                                (member.getFirstName() + " " + member.getLastName()).toLowerCase().contains(query.toLowerCase())))
                .limit(10) // Limit to 10 suggestions
                .collect(Collectors.toList());
            
            // Create simplified response with just email, name, and role
            List<Map<String, String>> suggestions = suggestedMembers.stream()
                .map(member -> {
                    Map<String, String> suggestion = new HashMap<>();
                    suggestion.put("email", member.getEmail());
                    suggestion.put("name", member.getFirstName() + " " + member.getLastName());
                    suggestion.put("role", member.getRole());
                    return suggestion;
                })
                .collect(Collectors.toList());
            
            response.put("success", true);
            response.put("count", suggestions.size());
            response.put("data", suggestions);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching club admin suggestions: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}