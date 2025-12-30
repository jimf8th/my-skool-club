package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.model.UserClubRole;
import com.myskoolclub.backend.service.UserClubRoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user-club-roles")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class UserClubRoleController {
    
    @Autowired
    private UserClubRoleService userClubRoleService;
    
    @Autowired
    private com.myskoolclub.backend.security.JwtTokenUtil jwtTokenUtil;
    
    /**
     * Add a member to a club with a specific role
     */
    @PostMapping
    public ResponseEntity<?> addMemberToClub(@RequestBody Map<String, String> request) {
        try {
            // Check authentication
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            String memberId = request.get("memberId");
            String clubId = request.get("clubId");
            String clubRole = request.get("clubRole");
            
            if (memberId == null || clubId == null || clubRole == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Member ID, Club ID, and Club Role are required.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate club role
            if (!"CLUB_ADMIN".equals(clubRole) && !"CLUB_USER".equals(clubRole)) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Club role must be CLUB_ADMIN or CLUB_USER.");
                return ResponseEntity.badRequest().body(response);
            }
            
            UserClubRole userClubRole = userClubRoleService.addMemberToClub(memberId, clubId, clubRole);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Member added to club successfully.");
            response.put("data", userClubRole);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while adding member to club.");
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Update a member's role in a club
     */
    @PutMapping("/{memberId}/{clubId}")
    public ResponseEntity<?> updateMemberClubRole(@PathVariable String memberId, 
                                                 @PathVariable String clubId, 
                                                 @RequestBody Map<String, String> request) {
        try {
            // Check authentication
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            String newRole = request.get("clubRole");
            if (newRole == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Club role is required.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate club role
            if (!"CLUB_ADMIN".equals(newRole) && !"CLUB_USER".equals(newRole)) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Club role must be CLUB_ADMIN or CLUB_USER.");
                return ResponseEntity.badRequest().body(response);
            }
            
            UserClubRole updatedRole = userClubRoleService.updateMemberClubRole(memberId, clubId, newRole);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Member club role updated successfully.");
            response.put("data", updatedRole);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while updating member club role.");
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Remove a member from a club
     */
    @DeleteMapping("/{memberId}/{clubId}")
    public ResponseEntity<?> removeMemberFromClub(@PathVariable String memberId, @PathVariable String clubId) {
        try {
            // Check authentication
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            boolean removed = userClubRoleService.removeMemberFromClub(memberId, clubId);
            
            Map<String, Object> response = new HashMap<>();
            if (removed) {
                response.put("success", true);
                response.put("message", "Member removed from club successfully.");
            } else {
                response.put("success", false);
                response.put("message", "Member is not part of this club.");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while removing member from club.");
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Get all clubs for a member
     */
    @GetMapping("/member/{memberId}")
    public ResponseEntity<?> getMemberClubs(@PathVariable String memberId) {
        try {
            // Check authentication
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            List<UserClubRole> memberClubs = userClubRoleService.getMemberClubs(memberId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", memberClubs.size());
            response.put("data", memberClubs);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while fetching member clubs.");
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Get all members of a club with pagination
     */
    @GetMapping("/club/{clubId}")
    public ResponseEntity<?> getClubMembers(
            @PathVariable String clubId,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        try {
            // Check authentication
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            List<UserClubRole> clubMembers = userClubRoleService.getClubMembers(clubId);
            
            // Calculate pagination
            int totalCount = clubMembers.size();
            int totalPages = (int) Math.ceil((double) totalCount / size);
            int startIndex = page * size;
            int endIndex = Math.min(startIndex + size, totalCount);
            
            // Get paginated subset
            List<UserClubRole> paginatedMembers = startIndex < totalCount ? 
                clubMembers.subList(startIndex, endIndex) : new java.util.ArrayList<>();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", paginatedMembers.size());
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("size", size);
            response.put("totalPages", totalPages);
            response.put("data", paginatedMembers);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while fetching club members.");
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Get all clubs where a member is admin
     */
    @GetMapping("/member/{memberId}/admin-clubs")
    public ResponseEntity<?> getMemberAdminClubs(@PathVariable String memberId) {
        try {
            // Check authentication
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            List<UserClubRole> adminClubs = userClubRoleService.getMemberAdminClubs(memberId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", adminClubs.size());
            response.put("data", adminClubs);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while fetching member admin clubs.");
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Get all club admins for a specific club
     */
    @GetMapping("/club/{clubId}/admins")
    public ResponseEntity<?> getClubAdmins(@PathVariable String clubId) {
        try {
            // Check authentication
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            List<UserClubRole> clubAdmins = userClubRoleService.getClubAdmins(clubId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", clubAdmins.size());
            response.put("data", clubAdmins);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while fetching club admins.");
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Add a member to a club by email with a specific role
     */
    @PostMapping("/by-email")
    public ResponseEntity<?> addMemberToClubByEmail(@RequestBody Map<String, String> request) {
        try {
            // Check authentication
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            String email = request.get("email");
            String clubId = request.get("clubId");
            String role = request.get("role");
            
            if (email == null || clubId == null || role == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Email, Club ID, and Role are required.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate role
            if (!"CLUB_ADMIN".equals(role) && !"CLUB_USER".equals(role)) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Role must be CLUB_ADMIN or CLUB_USER.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Find member by email
            com.myskoolclub.backend.model.Member member = userClubRoleService.getMemberService()
                .findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Member with email " + email + " not found"));
            
            UserClubRole userClubRole = userClubRoleService.addMemberToClub(member.getId(), clubId, role);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Member added to club successfully.");
            response.put("data", userClubRole);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while adding member to club: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Remove a member from a club by email
     */
    @DeleteMapping("/club/{clubId}/email/{email}")
    public ResponseEntity<?> removeMemberFromClubByEmail(@PathVariable String clubId, @PathVariable String email) {
        try {
            // Check authentication
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Find member by email
            com.myskoolclub.backend.model.Member member = userClubRoleService.getMemberService()
                .findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Member with email " + email + " not found"));
            
            userClubRoleService.removeMemberFromClub(member.getId(), clubId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Member removed from club successfully.");
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while removing member from club: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Update a user-club role (e.g., demote admin to member)
     */
    @PutMapping("/{roleId}/role")
    public ResponseEntity<?> updateUserClubRole(@PathVariable String roleId, @RequestBody Map<String, String> request) {
        try {
            // Check authentication
            String currentUserEmail = getCurrentUserEmailFromToken();
            if (currentUserEmail == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            String newRole = request.get("role");
            
            if (newRole == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Role is required.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate role
            if (!"CLUB_ADMIN".equals(newRole) && !"CLUB_USER".equals(newRole)) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Role must be CLUB_ADMIN or CLUB_USER.");
                return ResponseEntity.badRequest().body(response);
            }
            
            UserClubRole updatedRole = userClubRoleService.updateUserClubRole(roleId, newRole);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User club role updated successfully.");
            response.put("data", updatedRole);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while updating user club role: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
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
}