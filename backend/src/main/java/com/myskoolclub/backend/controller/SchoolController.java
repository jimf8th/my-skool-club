package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.model.School;
import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.service.SchoolService;
import com.myskoolclub.backend.service.MemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/schools")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class SchoolController {

    @Autowired
    private SchoolService schoolService;
    
    @Autowired
    private MemberService memberService;
    
    @Autowired
    private com.myskoolclub.backend.security.JwtTokenUtil jwtTokenUtil;

    // Create a new school
    @PostMapping
    public ResponseEntity<?> createSchool(@RequestBody School school) {
        // Only APP_ADMIN can create schools
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        if (!"APP_ADMIN".equals(currentMember.getRole())) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Access denied. Only App Admins can create schools.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            // Validate admin emails before creating school
            if (school.getAdminEmails() != null && !school.getAdminEmails().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Cannot add admin emails when creating a new school. Add members first, then assign them as admins.");
                return ResponseEntity.badRequest().body(response);
            }
            
            School createdSchool = schoolService.createSchool(school);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "School created successfully");
            response.put("school", createdSchool);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while creating the school");
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Get school by ID
    @GetMapping("/{schoolId}")
    public ResponseEntity<?> getSchool(@PathVariable String schoolId) {
        // Check if user has school admin access
        ResponseEntity<?> accessCheck = checkSchoolAdminAccess();
        if (accessCheck != null) {
            return accessCheck;
        }
        
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "User not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        try {
            School school = schoolService.getSchoolById(schoolId)
                .orElseThrow(() -> new RuntimeException("School not found"));
                
            // Check if user can access this specific school
            if (!canAccessSchool(school, currentMember)) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Access denied. You can only view schools you administer.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            return ResponseEntity.ok(school);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // Get all schools for public access (used during member signup)
    @GetMapping("/public")
    public ResponseEntity<?> getAllSchoolsPublic() {
        try {
            List<School> allSchools = schoolService.getAllSchools();
            
            // Return only basic school information for public access
            List<Map<String, Object>> publicSchools = allSchools.stream()
                .filter(school -> school.isActive()) // Only return active schools
                .map(school -> {
                    Map<String, Object> publicSchool = new HashMap<>();
                    publicSchool.put("id", school.getId());
                    publicSchool.put("name", school.getName());
                    publicSchool.put("address", school.getAddress());
                    publicSchool.put("city", school.getCity());
                    publicSchool.put("state", school.getState());
                    publicSchool.put("type", school.getType());
                    return publicSchool;
                })
                .collect(Collectors.toList());
                
            return ResponseEntity.ok(publicSchools);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while fetching schools");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Get all schools (protected endpoint for admin users)
    @GetMapping
    public ResponseEntity<?> getAllSchools() {
        // Check if user has school admin access
        ResponseEntity<?> accessCheck = checkSchoolAdminAccess();
        if (accessCheck != null) {
            return accessCheck;
        }
        
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "User not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        List<School> allSchools = schoolService.getAllSchools();
        
        // Filter schools based on user role
        if ("APP_ADMIN".equals(currentMember.getRole())) {
            // APP_ADMIN can see all schools
            return ResponseEntity.ok(allSchools);
        } else if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
            // SCHOOL_ADMIN can only see schools they admin
            List<School> accessibleSchools = allSchools.stream()
                .filter(school -> canAccessSchool(school, currentMember))
                .collect(Collectors.toList());
            return ResponseEntity.ok(accessibleSchools);
        }
        
        // This shouldn't happen due to checkSchoolAdminAccess, but just in case
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Access denied.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    // Get active schools
    @GetMapping("/active")
    public ResponseEntity<?> getActiveSchools() {
        // Check if user has school admin access
        ResponseEntity<?> accessCheck = checkSchoolAdminAccess();
        if (accessCheck != null) {
            return accessCheck;
        }
        
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "User not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        List<School> allActiveSchools = schoolService.getActiveSchools();
        
        // Filter schools based on user role
        if ("APP_ADMIN".equals(currentMember.getRole())) {
            // APP_ADMIN can see all active schools
            return ResponseEntity.ok(allActiveSchools);
        } else if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
            // SCHOOL_ADMIN can only see active schools they admin
            List<School> accessibleSchools = allActiveSchools.stream()
                .filter(school -> canAccessSchool(school, currentMember))
                .collect(Collectors.toList());
            return ResponseEntity.ok(accessibleSchools);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Access denied.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    // Search schools by name
    @GetMapping("/search")
    public ResponseEntity<?> searchSchools(@RequestParam String name) {
        // Check if user has school admin access
        ResponseEntity<?> accessCheck = checkSchoolAdminAccess();
        if (accessCheck != null) {
            return accessCheck;
        }
        
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "User not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        List<School> allSchools = schoolService.searchSchoolsByName(name);
        
        // Filter schools based on user role
        if ("APP_ADMIN".equals(currentMember.getRole())) {
            return ResponseEntity.ok(allSchools);
        } else if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
            List<School> accessibleSchools = allSchools.stream()
                .filter(school -> canAccessSchool(school, currentMember))
                .collect(Collectors.toList());
            return ResponseEntity.ok(accessibleSchools);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Access denied.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    // Get schools by city
    @GetMapping("/city/{city}")
    public ResponseEntity<?> getSchoolsByCity(@PathVariable String city) {
        // Check if user has school admin access
        ResponseEntity<?> accessCheck = checkSchoolAdminAccess();
        if (accessCheck != null) {
            return accessCheck;
        }
        
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "User not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        List<School> allSchools = schoolService.getSchoolsByCity(city);
        
        // Filter schools based on user role
        if ("APP_ADMIN".equals(currentMember.getRole())) {
            return ResponseEntity.ok(allSchools);
        } else if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
            List<School> accessibleSchools = allSchools.stream()
                .filter(school -> canAccessSchool(school, currentMember))
                .collect(Collectors.toList());
            return ResponseEntity.ok(accessibleSchools);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Access denied.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    // Get schools by state
    @GetMapping("/state/{state}")
    public ResponseEntity<?> getSchoolsByState(@PathVariable String state) {
        // Check if user has school admin access
        ResponseEntity<?> accessCheck = checkSchoolAdminAccess();
        if (accessCheck != null) {
            return accessCheck;
        }
        
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "User not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        List<School> allSchools = schoolService.getSchoolsByState(state);
        
        // Filter schools based on user role
        if ("APP_ADMIN".equals(currentMember.getRole())) {
            return ResponseEntity.ok(allSchools);
        } else if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
            List<School> accessibleSchools = allSchools.stream()
                .filter(school -> canAccessSchool(school, currentMember))
                .collect(Collectors.toList());
            return ResponseEntity.ok(accessibleSchools);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Access denied.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    // Get schools by type
    @GetMapping("/type/{type}")
    public ResponseEntity<?> getSchoolsByType(@PathVariable String type) {
        // Check if user has school admin access
        ResponseEntity<?> accessCheck = checkSchoolAdminAccess();
        if (accessCheck != null) {
            return accessCheck;
        }
        
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "User not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        List<School> allSchools = schoolService.getSchoolsByType(type);
        
        // Filter schools based on user role
        if ("APP_ADMIN".equals(currentMember.getRole())) {
            return ResponseEntity.ok(allSchools);
        } else if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
            List<School> accessibleSchools = allSchools.stream()
                .filter(school -> canAccessSchool(school, currentMember))
                .collect(Collectors.toList());
            return ResponseEntity.ok(accessibleSchools);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Access denied.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    // Update school
    @PutMapping("/{schoolId}")
    public ResponseEntity<?> updateSchool(@PathVariable String schoolId, @RequestBody School school) {
        try {
            // Get the current school data to compare adminEmails
            Optional<School> currentSchoolOpt = schoolService.getSchoolById(schoolId);
            if (!currentSchoolOpt.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "School not found");
                return ResponseEntity.notFound().build();
            }
            
            School currentSchool = currentSchoolOpt.get();
            
            // Check if user can access this specific school
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not found.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            if (!canAccessSchool(currentSchool, currentMember)) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Access denied. You can only modify schools you administer.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            List<String> currentAdminEmails = currentSchool.getAdminEmails() != null ? 
                currentSchool.getAdminEmails() : new java.util.ArrayList<>();
            List<String> newAdminEmails = school.getAdminEmails() != null ? 
                school.getAdminEmails() : new java.util.ArrayList<>();
            
            // Validate that all new admin emails belong to this school
            for (String adminEmail : newAdminEmails) {
                if (adminEmail != null && !adminEmail.trim().isEmpty()) {
                    Optional<Member> memberOpt = memberService.findByEmail(adminEmail.trim());
                    if (!memberOpt.isPresent()) {
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", false);
                        response.put("message", "Email '" + adminEmail + "' is not registered as a member.");
                        return ResponseEntity.badRequest().body(response);
                    }
                    Member member = memberOpt.get();
                    if (!schoolId.equals(member.getSchoolId())) {
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", false);
                        response.put("message", "Email '" + adminEmail + "' does not belong to this school.");
                        return ResponseEntity.badRequest().body(response);
                    }
                }
            }
            
            // Find newly added admin emails
            Set<String> currentAdminSet = new HashSet<>(currentAdminEmails);
            Set<String> newAdminSet = new HashSet<>(newAdminEmails);
            Set<String> addedAdmins = new HashSet<>(newAdminSet);
            addedAdmins.removeAll(currentAdminSet);
            
            // Find removed admin emails
            Set<String> removedAdmins = new HashSet<>(currentAdminSet);
            removedAdmins.removeAll(newAdminSet);
            
            // Update the school first
            school.setId(schoolId);
            School updatedSchool = schoolService.updateSchool(school);
            
            // Promote newly added admins to SCHOOL_ADMIN role
            for (String adminEmail : addedAdmins) {
                try {
                    Optional<Member> memberOpt = memberService.findByEmail(adminEmail);
                    if (memberOpt.isPresent()) {
                        Member member = memberOpt.get();
                        // Only promote if they're not already APP_ADMIN
                        if (!"APP_ADMIN".equals(member.getRole())) {
                            member.setRole("SCHOOL_ADMIN");
                            member.setUpdatedAt(LocalDateTime.now());
                            memberService.updateMember(member.getId(), member);
                            System.out.println("Promoted member " + adminEmail + " to SCHOOL_ADMIN role");
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Error promoting admin " + adminEmail + ": " + e.getMessage());
                    // Continue processing other admins even if one fails
                }
            }
            
            // For removed admins, check if they should be demoted
            for (String removedAdminEmail : removedAdmins) {
                try {
                    Optional<Member> memberOpt = memberService.findByEmail(removedAdminEmail);
                    if (memberOpt.isPresent()) {
                        Member member = memberOpt.get();
                        // Only demote if they're currently SCHOOL_ADMIN and not admin of other schools
                        if ("SCHOOL_ADMIN".equals(member.getRole()) && !isAdminOfOtherSchools(removedAdminEmail, schoolId)) {
                            member.setRole("SCHOOL_USER");
                            member.setUpdatedAt(LocalDateTime.now());
                            memberService.updateMember(member.getId(), member);
                            System.out.println("Demoted member " + removedAdminEmail + " to SCHOOL_USER role");
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Error demoting admin " + removedAdminEmail + ": " + e.getMessage());
                    // Continue processing other admins even if one fails
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "School updated successfully");
            response.put("school", updatedSchool);
            
            if (!addedAdmins.isEmpty()) {
                response.put("promotedAdmins", addedAdmins);
            }
            if (!removedAdmins.isEmpty()) {
                response.put("demotedAdmins", removedAdmins);
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Check if school name exists
    @GetMapping("/exists/name/{name}")
    public ResponseEntity<?> checkSchoolNameExists(@PathVariable String name) {
        // Only APP_ADMIN can check if school names exist (used for creating schools)
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        if (!"APP_ADMIN".equals(currentMember.getRole())) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Access denied. Only App Admins can check school name availability.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        boolean exists = schoolService.schoolNameExists(name);
        Map<String, Boolean> response = new HashMap<>();
        response.put("exists", exists);
        return ResponseEntity.ok(response);
    }

    // Get school statistics
    @GetMapping("/stats")
    public ResponseEntity<?> getSchoolStats() {
        // Only APP_ADMIN can view system-wide school statistics
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        if (!"APP_ADMIN".equals(currentMember.getRole())) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Access denied. Only App Admins can view system statistics.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        Map<String, Long> stats = new HashMap<>();
        stats.put("totalSchools", schoolService.getTotalSchoolCount());
        stats.put("activeSchools", schoolService.getActiveSchoolCount());
        return ResponseEntity.ok(stats);
    }
    
    /**
     * Helper method to check if a member is admin of other schools
     * @param adminEmail The email of the admin to check
     * @param excludeSchoolId The school ID to exclude from the check (current school being updated)
     * @return true if the member is admin of other schools, false otherwise
     */
    private boolean isAdminOfOtherSchools(String adminEmail, String excludeSchoolId) {
        try {
            List<School> allSchools = schoolService.getAllSchools();
            for (School school : allSchools) {
                // Skip the current school being updated
                if (school.getId().equals(excludeSchoolId)) {
                    continue;
                }
                
                // Check if the admin email is in this school's admin list
                if (school.getAdminEmails() != null && school.getAdminEmails().contains(adminEmail)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            System.err.println("Error checking if member is admin of other schools: " + e.getMessage());
            // In case of error, don't demote to be safe
            return true;
        }
    }

    // Delete school by ID
    @DeleteMapping("/{schoolId}")
    public ResponseEntity<?> deleteSchool(@PathVariable String schoolId) {
        // Only APP_ADMIN can delete schools
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        if (!"APP_ADMIN".equals(currentMember.getRole())) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Access denied. Only App Admins can delete schools.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            boolean deleted = schoolService.deleteSchool(schoolId);
            
            Map<String, Object> response = new HashMap<>();
            if (deleted) {
                response.put("success", true);
                response.put("message", "School deleted successfully");
            } else {
                response.put("success", false);
                response.put("message", "School not found");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while deleting the school: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Soft delete school (mark as inactive)
    @PutMapping("/{schoolId}/deactivate")
    public ResponseEntity<?> deactivateSchool(@PathVariable String schoolId) {
        // Check if user has school admin access
        ResponseEntity<?> accessCheck = checkSchoolAdminAccess();
        if (accessCheck != null) {
            return accessCheck;
        }
        
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "User not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // Get the school first to check access
        Optional<School> schoolOpt = schoolService.getSchoolById(schoolId);
        if (!schoolOpt.isPresent()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "School not found");
            return ResponseEntity.notFound().build();
        }
        
        School school = schoolOpt.get();
        if (!canAccessSchool(school, currentMember)) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Access denied. You can only deactivate schools you administer.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            boolean deactivated = schoolService.softDeleteSchool(schoolId);
            
            Map<String, Object> response = new HashMap<>();
            if (deactivated) {
                response.put("success", true);
                response.put("message", "School deactivated successfully");
            } else {
                response.put("success", false);
                response.put("message", "School not found");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while deactivating the school: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Activate school (mark as active)
    @PutMapping("/{schoolId}/activate")
    public ResponseEntity<?> activateSchool(@PathVariable String schoolId) {
        // Check if user has school admin access
        ResponseEntity<?> accessCheck = checkSchoolAdminAccess();
        if (accessCheck != null) {
            return accessCheck;
        }
        
        Member currentMember = getCurrentMember();
        if (currentMember == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "User not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // Get the school first to check access
        Optional<School> schoolOpt = schoolService.getSchoolById(schoolId);
        if (!schoolOpt.isPresent()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "School not found");
            return ResponseEntity.notFound().build();
        }
        
        School school = schoolOpt.get();
        if (!canAccessSchool(school, currentMember)) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Access denied. You can only activate schools you administer.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            boolean activated = schoolService.activateSchool(schoolId);
            
            Map<String, Object> response = new HashMap<>();
            if (activated) {
                response.put("success", true);
                response.put("message", "School activated successfully");
            } else {
                response.put("success", false);
                response.put("message", "School not found");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "An error occurred while activating the school: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Helper method to check if current user can access a specific school
     * APP_ADMIN can access any school, SCHOOL_ADMIN can only access schools they admin
     */
    private boolean canAccessSchool(School school, Member currentMember) {
        if ("APP_ADMIN".equals(currentMember.getRole())) {
            return true; // APP_ADMIN can access any school
        }
        
        if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
            // SCHOOL_ADMIN can only access schools where they are listed as admin
            return school.getAdminEmails() != null && 
                   school.getAdminEmails().contains(currentMember.getEmail());
        }
        
        return false; // Other roles cannot access
    }
    
    /**
     * Helper method to get current member object
     */
    private Member getCurrentMember() {
        String currentUserEmail = getCurrentUserEmailFromToken();
        if (currentUserEmail == null) {
            return null;
        }
        
        Optional<Member> currentMemberOpt = memberService.findByEmail(currentUserEmail);
        return currentMemberOpt.orElse(null);
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
     * Helper method to check if current user has school admin or app admin privileges
     */
    private ResponseEntity<?> checkSchoolAdminAccess() {
        String currentUserEmail = getCurrentUserEmailFromToken();
        if (currentUserEmail == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        Optional<Member> currentMemberOpt = memberService.findByEmail(currentUserEmail);
        if (!currentMemberOpt.isPresent()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "User not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        Member currentMember = currentMemberOpt.get();
        String role = currentMember.getRole();
        
        if (!"APP_ADMIN".equals(role) && !"SCHOOL_ADMIN".equals(role)) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Access denied. Only School Admins and App Admins can access school management.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        return null; // No error, access is allowed
    }
}