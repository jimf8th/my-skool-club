package com.myskoolclub.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myskoolclub.backend.model.Club;
import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.service.ClubService;
import com.myskoolclub.backend.service.MemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/clubs")
@CrossOrigin(origins = "*")
public class ClubController {
    
    @Autowired
    private ClubService clubService;
    
    @Autowired
    private MemberService memberService;
    
    @Autowired
    private com.myskoolclub.backend.service.UserClubRoleService userClubRoleService;
    
    @Autowired
    private com.myskoolclub.backend.security.JwtTokenUtil jwtTokenUtil;
    
    // Create club
    @PostMapping
    public ResponseEntity<Map<String, Object>> createClub(@RequestBody Map<String, Object> clubRequest) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication and authorization
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Only SCHOOL_ADMIN can create clubs
            if (!"SCHOOL_ADMIN".equals(currentMember.getRole())) {
                response.put("success", false);
                response.put("message", "Access denied. Only School Admins can create clubs.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Extract admin member IDs and emails from request
            @SuppressWarnings("unchecked")
            List<String> adminMemberIds = (List<String>) clubRequest.get("adminMemberIds");
            
            @SuppressWarnings("unchecked")
            List<String> adminEmails = (List<String>) clubRequest.get("adminEmails");
            
            // Validate at least one admin is provided
            if ((adminMemberIds == null || adminMemberIds.isEmpty()) && 
                (adminEmails == null || adminEmails.isEmpty())) {
                response.put("success", false);
                response.put("message", "At least one club admin email is required.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            // Remove adminMemberIds and adminEmails before converting to Club object
            clubRequest.remove("adminMemberIds");
            clubRequest.remove("adminEmails");
            
            // Convert map to Club object
            ObjectMapper mapper = new ObjectMapper();
            Club club = mapper.convertValue(clubRequest, Club.class);
            
            // SCHOOL_ADMIN can only create clubs in their own school
            if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
                if (club.getSchoolId() == null || !club.getSchoolId().equals(currentMember.getSchoolId())) {
                    response.put("success", false);
                    response.put("message", "School Admins can only create clubs in their own school.");
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
                }
            }
            
            
            Club createdClub = clubService.createClub(club);
            
            // Add CLUB_ADMIN roles for selected members by ID
            if (createdClub != null && adminMemberIds != null && !adminMemberIds.isEmpty()) {
                for (String memberId : adminMemberIds) {
                    try {
                        userClubRoleService.addMemberToClub(
                            memberId,
                            createdClub.getId(),
                            "CLUB_ADMIN"
                        );
                    } catch (Exception e) {
                        // Log error but don't fail the club creation
                        System.err.println("Warning: Failed to add club admin role for member " + memberId + ": " + e.getMessage());
                    }
                }
            }
            
            // Add CLUB_ADMIN roles for members by email
            if (createdClub != null && adminEmails != null && !adminEmails.isEmpty()) {
                for (String email : adminEmails) {
                    try {
                        String trimmedEmail = email.trim().toLowerCase();
                        Optional<Member> memberOpt = memberService.findByEmail(trimmedEmail);
                        
                        if (memberOpt.isPresent()) {
                            Member member = memberOpt.get();
                            
                            // Verify member belongs to the same school
                            if (createdClub.getSchoolId().equals(member.getSchoolId())) {
                                // Check if member is active
                                if (member.isActive()) {
                                    userClubRoleService.addMemberToClub(
                                        member.getId(),
                                        createdClub.getId(),
                                        "CLUB_ADMIN"
                                    );
                                } else {
                                    System.err.println("Warning: Member with email " + trimmedEmail + " is not active");
                                }
                            } else {
                                System.err.println("Warning: Member with email " + trimmedEmail + " does not belong to the club's school");
                            }
                        } else {
                            System.err.println("Warning: No member found with email " + trimmedEmail);
                            // Note: In the future, we could send an invitation email to non-members
                        }
                    } catch (Exception e) {
                        System.err.println("Warning: Failed to add club admin role for email " + email + ": " + e.getMessage());
                    }
                }
            }
            
            response.put("success", true);
            response.put("message", "Club created successfully");
            response.put("data", createdClub);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while creating the club");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get all clubs with pagination
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllClubs(
            @RequestParam(required = false) String schoolId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDirection) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Apply role-based filtering for schoolId parameter
            String effectiveSchoolId = schoolId;
            if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
                // SCHOOL_ADMIN can only see clubs from their own school
                effectiveSchoolId = currentMember.getSchoolId();
            }
            // Create sort object
            Sort sort = Sort.by(sortDirection.equalsIgnoreCase("desc") ? 
                               Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
            
            // Create pageable object
            Pageable pageable = PageRequest.of(page, size, sort);
            
            Page<Club> clubPage;
            
            if (search != null && !search.trim().isEmpty()) {
                if (effectiveSchoolId != null && !effectiveSchoolId.trim().isEmpty()) {
                    clubPage = clubService.searchClubsBySchoolAndKeyword(effectiveSchoolId, search.trim(), pageable);
                } else {
                    clubPage = clubService.searchClubsByKeyword(search.trim(), pageable);
                }
            } else if (effectiveSchoolId != null && !effectiveSchoolId.trim().isEmpty()) {
                if (category != null && !category.trim().isEmpty()) {
                    clubPage = clubService.getClubsByCategoryAndSchool(category, effectiveSchoolId, pageable);
                } else {
                    clubPage = activeOnly ? clubService.getActiveClubsBySchool(effectiveSchoolId, pageable) : 
                                          clubService.getClubsBySchool(effectiveSchoolId, pageable);
                }
            } else if (category != null && !category.trim().isEmpty()) {
                clubPage = clubService.getClubsByCategory(category, pageable);
            } else {
                // Only APP_ADMIN can see all clubs when no school filter is specified
                if ("APP_ADMIN".equals(currentMember.getRole())) {
                    clubPage = activeOnly ? clubService.getActiveClubs(pageable) : clubService.getAllClubs(pageable);
                } else {
                    // SCHOOL_ADMIN sees their school's clubs even without explicit school parameter
                    clubPage = activeOnly ? clubService.getActiveClubsBySchool(currentMember.getSchoolId(), pageable) : 
                                          clubService.getClubsBySchool(currentMember.getSchoolId(), pageable);
                }
            }
            
            response.put("success", true);
            response.put("message", "Clubs retrieved successfully");
            response.put("data", clubPage.getContent());
            response.put("currentPage", clubPage.getNumber());
            response.put("totalPages", clubPage.getTotalPages());
            response.put("totalElements", clubPage.getTotalElements());
            response.put("size", clubPage.getSize());
            response.put("hasNext", clubPage.hasNext());
            response.put("hasPrevious", clubPage.hasPrevious());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while retrieving clubs");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Advanced search clubs
    @GetMapping("/advanced-search")
    public ResponseEntity<Map<String, Object>> advancedSearchClubs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String schoolId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String meetingDay,
            @RequestParam(required = false) String advisorName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false, defaultValue = "name") String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String sortDirection,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Create sort object
            Sort sort = Sort.by(sortDirection.equalsIgnoreCase("desc") ? 
                               Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
            
            // Create pageable object
            Pageable pageable = PageRequest.of(page, size, sort);
            
            Page<Club> clubPage = clubService.advancedSearchClubs(
                search, schoolId, category, meetingDay, advisorName, status, pageable
            );
            
            response.put("success", true);
            response.put("message", "Clubs retrieved successfully");
            response.put("data", clubPage.getContent());
            response.put("currentPage", clubPage.getNumber());
            response.put("totalPages", clubPage.getTotalPages());
            response.put("totalElements", clubPage.getTotalElements());
            response.put("size", clubPage.getSize());
            response.put("hasNext", clubPage.hasNext());
            response.put("hasPrevious", clubPage.hasPrevious());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while searching clubs");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get club by ID
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getClubById(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<Club> clubOpt = clubService.getClubById(id);
            
            if (clubOpt.isPresent()) {
                response.put("success", true);
                response.put("message", "Club retrieved successfully");
                response.put("data", clubOpt.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Club not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while retrieving the club");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Update club
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateClub(@PathVariable String id, @RequestBody Club club) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication and authorization
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Get the existing club to check permissions
            Optional<Club> existingClubOpt = clubService.getClubById(id);
            if (!existingClubOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Club not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Club existingClub = existingClubOpt.get();
            if (!canEditClub(existingClub, currentMember)) {
                response.put("success", false);
                response.put("message", "Access denied. Only Club Admins can edit club details.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            Club updatedClub = clubService.updateClub(id, club);
            
            response.put("success", true);
            response.put("message", "Club updated successfully");
            response.put("data", updatedClub);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while updating the club");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Partial update club
    @PatchMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateClubPartial(@PathVariable String id, @RequestBody Club partialUpdate) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication and authorization
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Get the existing club to check permissions
            Optional<Club> existingClubOpt = clubService.getClubById(id);
            if (!existingClubOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Club not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Club existingClub = existingClubOpt.get();
            if (!canEditClub(existingClub, currentMember)) {
                response.put("success", false);
                response.put("message", "Access denied. Only Club Admins can edit club details.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            Club updatedClub = clubService.updateClubPartial(id, partialUpdate);
            
            response.put("success", true);
            response.put("message", "Club updated successfully");
            response.put("data", updatedClub);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while updating the club");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Delete club
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteClub(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication and authorization
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Get the existing club to check permissions
            Optional<Club> existingClubOpt = clubService.getClubById(id);
            if (!existingClubOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Club not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Club existingClub = existingClubOpt.get();
            if (!canDeleteClub(existingClub, currentMember)) {
                response.put("success", false);
                response.put("message", "Access denied. Only School Admins can delete clubs from their school.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Remove all user-club roles for this club before deleting
            try {
                userClubRoleService.removeAllMembersFromClub(id);
            } catch (Exception e) {
                // Log error but continue with club deletion
                System.err.println("Warning: Failed to remove all members from club before deletion: " + e.getMessage());
            }
            
            clubService.deleteClub(id);
            
            response.put("success", true);
            response.put("message", "Club deleted successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while deleting the club");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Enroll current member in a club
    @PostMapping("/{id}/enroll")
    public ResponseEntity<Map<String, Object>> enrollInClub(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Only SCHOOL_USER and SCHOOL_ADMIN can enroll
            if (!"SCHOOL_USER".equals(currentMember.getRole()) && !"SCHOOL_ADMIN".equals(currentMember.getRole())) {
                response.put("success", false);
                response.put("message", "Only school members can enroll in clubs.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Get the club
            Optional<Club> clubOpt = clubService.getClubById(id);
            if (!clubOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Club not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Club club = clubOpt.get();
            
            // Verify club is in the same school
            if (!club.getSchoolId().equals(currentMember.getSchoolId())) {
                response.put("success", false);
                response.put("message", "You can only enroll in clubs from your school.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Verify club is active
            if (!club.isActive()) {
                response.put("success", false);
                response.put("message", "This club is not currently active.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            // Check if already enrolled
            if (userClubRoleService.isMemberInClub(currentMember.getId(), id)) {
                response.put("success", false);
                response.put("message", "You are already enrolled in this club.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            // Enroll member as CLUB_USER
            com.myskoolclub.backend.model.UserClubRole userClubRole = userClubRoleService.addMemberToClub(
                currentMember.getId(),
                id,
                "CLUB_USER"
            );
            
            response.put("success", true);
            response.put("message", "Successfully enrolled in " + club.getName());
            response.put("data", userClubRole);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while enrolling in the club");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Deactivate club
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Map<String, Object>> deactivateClub(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Club deactivatedClub = clubService.deactivateClub(id);
            
            response.put("success", true);
            response.put("message", "Club deactivated successfully");
            response.put("data", deactivatedClub);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while deactivating the club");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Activate club
    @PutMapping("/{id}/activate")
    public ResponseEntity<Map<String, Object>> activateClub(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Club activatedClub = clubService.activateClub(id);
            
            response.put("success", true);
            response.put("message", "Club activated successfully");
            response.put("data", activatedClub);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while activating the club");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get clubs by school
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<Map<String, Object>> getClubsBySchool(
            @PathVariable String schoolId,
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Club> clubs = activeOnly ? clubService.getActiveClubsBySchool(schoolId) : 
                                          clubService.getClubsBySchool(schoolId);
            
            response.put("success", true);
            response.put("message", "Clubs retrieved successfully");
            response.put("data", clubs);
            response.put("count", clubs.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while retrieving clubs for the school");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Search clubs
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchClubs(
            @RequestParam String keyword,
            @RequestParam(required = false) String schoolId) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Club> clubs;
            
            if (schoolId != null && !schoolId.trim().isEmpty()) {
                clubs = clubService.searchClubsBySchoolAndKeyword(schoolId, keyword);
            } else {
                clubs = clubService.searchClubsByKeyword(keyword);
            }
            
            response.put("success", true);
            response.put("message", "Search completed successfully");
            response.put("data", clubs);
            response.put("count", clubs.size());
            response.put("keyword", keyword);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while searching for clubs");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get clubs by category
    @GetMapping("/category/{category}")
    public ResponseEntity<Map<String, Object>> getClubsByCategory(
            @PathVariable String category,
            @RequestParam(required = false) String schoolId) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Club> clubs;
            
            if (schoolId != null && !schoolId.trim().isEmpty()) {
                clubs = clubService.getClubsByCategoryAndSchool(category, schoolId);
            } else {
                clubs = clubService.getClubsByCategory(category);
            }
            
            response.put("success", true);
            response.put("message", "Clubs retrieved successfully");
            response.put("data", clubs);
            response.put("count", clubs.size());
            response.put("category", category);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while retrieving clubs by category");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get club statistics
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getClubStatistics(@RequestParam(required = false) String schoolId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Map<String, Object> stats = new HashMap<>();
            
            if (schoolId != null && !schoolId.trim().isEmpty()) {
                stats.put("totalClubs", clubService.getClubCountBySchool(schoolId));
                stats.put("activeClubs", clubService.getActiveClubCountBySchool(schoolId));
            } else {
                stats.put("totalClubs", clubService.getClubCount());
                stats.put("activeClubs", clubService.getActiveClubs().size());
            }
            
            response.put("success", true);
            response.put("message", "Statistics retrieved successfully");
            response.put("data", stats);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while retrieving club statistics");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Check if club name exists in school
    @GetMapping("/check-name")
    public ResponseEntity<Map<String, Object>> checkClubName(
            @RequestParam String name,
            @RequestParam String schoolId,
            @RequestParam(required = false) String excludeId) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean exists;
            
            if (excludeId != null && !excludeId.trim().isEmpty()) {
                // For updates - check if name exists excluding the current club
                exists = clubService.getClubsBySchool(schoolId).stream()
                    .anyMatch(club -> club.getName().equalsIgnoreCase(name.trim()) && 
                             !club.getId().equals(excludeId));
            } else {
                // For new clubs - check if name exists in school
                exists = clubService.clubExistsInSchool(name.trim(), schoolId);
            }
            
            response.put("success", true);
            response.put("exists", exists);
            response.put("message", exists ? "Club name already exists in this school" : 
                                           "Club name is available");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while checking club name");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
        // Get school members for type-ahead
    @GetMapping("/school-members")
    public ResponseEntity<Map<String, Object>> getSchoolMembers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String schoolId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication and authorization
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Only SCHOOL_ADMIN and APP_ADMIN can access this endpoint
            if (!"SCHOOL_ADMIN".equals(currentMember.getRole()) && !"APP_ADMIN".equals(currentMember.getRole())) {
                response.put("success", false);
                response.put("message", "Access denied. Only school admins can view school members.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            String targetSchoolId = null;
            
            // For SCHOOL_ADMIN, use their school ID
            if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
                targetSchoolId = currentMember.getSchoolId();
                if (targetSchoolId == null) {
                    response.put("success", false);
                    response.put("message", "School admin must be associated with a school.");
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
                }
            }
            // For APP_ADMIN, schoolId parameter is required
            else if ("APP_ADMIN".equals(currentMember.getRole())) {
                // For APP_ADMIN, use the schoolId parameter
                if (schoolId != null && !schoolId.trim().isEmpty()) {
                    targetSchoolId = schoolId.trim();
                } else {
                    // If no school context, return error message to help with debugging
                    response.put("success", false);
                    response.put("message", "School ID parameter is required for APP_ADMIN. Please provide schoolId parameter.");
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
                }
            }
            
            // Create pageable
            Pageable pageable = PageRequest.of(page, size, Sort.by("firstName", "lastName"));
            
            // Get school members with search functionality
            Page<Member> membersPage;
            if (search != null && !search.trim().isEmpty()) {
                // Search by name or email
                membersPage = memberService.findBySchoolIdAndSearchTerm(targetSchoolId, search.trim(), pageable);
            } else {
                membersPage = memberService.findBySchoolIdAndActiveTrue(targetSchoolId, pageable);
            }
            
            // Filter to only include members who can be club admins (SCHOOL_USER or SCHOOL_ADMIN)
            List<Map<String, Object>> memberList = new java.util.ArrayList<>();
            for (Member member : membersPage.getContent()) {
                if (member.isActive() && 
                    ("SCHOOL_USER".equals(member.getRole()) || "SCHOOL_ADMIN".equals(member.getRole()))) {
                    Map<String, Object> memberInfo = new HashMap<>();
                    memberInfo.put("id", member.getId());
                    memberInfo.put("email", member.getEmail());
                    memberInfo.put("firstName", member.getFirstName());
                    memberInfo.put("lastName", member.getLastName());
                    memberInfo.put("role", member.getRole());
                    memberInfo.put("displayName", member.getFirstName() + " " + member.getLastName() + " (" + member.getEmail() + ")");
                    memberList.add(memberInfo);
                }
            }
            
            response.put("success", true);
            response.put("data", memberList);
            response.put("totalElements", membersPage.getTotalElements());
            response.put("totalPages", membersPage.getTotalPages());
            response.put("currentPage", page);
            response.put("size", size);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to fetch school members: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Helper method to get current authenticated member
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
     * Helper method to check if current user can manage a specific club
     */
    private boolean canManageClub(Club club, Member currentMember) {
        if (currentMember == null || club == null) {
            return false;
        }
        
        String role = currentMember.getRole();
        
        // SCHOOL_ADMIN can only manage clubs in their school
        if ("SCHOOL_ADMIN".equals(role)) {
            return club.getSchoolId() != null && club.getSchoolId().equals(currentMember.getSchoolId());
        }
        
        // Check if user has CLUB_ADMIN role for this specific club
        return userClubRoleService.isClubAdmin(currentMember.getEmail(), club.getId());
    }
    
    private boolean canEditClub(Club club, Member currentMember) {
        if (currentMember == null || club == null) {
            return false;
        }
        
        // Only CLUB_ADMIN (from user_club_roles table) can edit club details
        return userClubRoleService.isClubAdmin(currentMember.getEmail(), club.getId());
    }
    
    private boolean canDeleteClub(Club club, Member currentMember) {
        if (currentMember == null || club == null) {
            return false;
        }
        
        // Only SCHOOL_ADMIN from the same school can delete clubs
        return "SCHOOL_ADMIN".equals(currentMember.getRole()) && 
               club.getSchoolId() != null && 
               club.getSchoolId().equals(currentMember.getSchoolId());
    }
}