package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.model.School;
import com.myskoolclub.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@Profile("!prod") // Only available when NOT in production profile
@CrossOrigin(origins = "*")
public class TestController {

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @Autowired
    private ClubRepository clubRepository;

    @Autowired
    private UserClubRoleRepository userClubRoleRepository;

    @Autowired
    private CheckoutRepository checkoutRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    /**
     * Clean up the entire database - DELETE ALL DATA
     * This endpoint is only available in development/test environments
     * 
     * @param confirmationToken A safety token that must match "CONFIRM_DELETE_ALL" 
     * @return Response indicating success or failure
     */
    @DeleteMapping("/cleanup-database")
    public ResponseEntity<Map<String, Object>> cleanupDatabase(
            @RequestParam(name = "confirm", required = true) String confirmationToken) {
        
        Map<String, Object> response = new HashMap<>();

        // Safety check - ensure we're not in production
        if ("prod".equals(activeProfile) || "production".equals(activeProfile)) {
            response.put("success", false);
            response.put("message", "Database cleanup is not allowed in production environment");
            response.put("activeProfile", activeProfile);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }

        // Safety confirmation token
        if (!"CONFIRM_DELETE_ALL".equals(confirmationToken)) {
            response.put("success", false);
            response.put("message", "Invalid confirmation token. Use 'CONFIRM_DELETE_ALL' to proceed.");
            response.put("hint", "Add ?confirm=CONFIRM_DELETE_ALL to your request");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        try {
            Map<String, Long> deletedCounts = new HashMap<>();

            // Delete in order to respect foreign key constraints
            // Start with dependent entities first

            // 1. Delete invoices
            long invoicesDeleted = invoiceRepository.count();
            invoiceRepository.deleteAll();
            deletedCounts.put("invoices", invoicesDeleted);

            // 2. Delete checkouts  
            long checkoutsDeleted = checkoutRepository.count();
            checkoutRepository.deleteAll();
            deletedCounts.put("checkouts", checkoutsDeleted);

            // 3. Delete user club roles
            long userClubRolesDeleted = userClubRoleRepository.count();
            userClubRoleRepository.deleteAll();
            deletedCounts.put("userClubRoles", userClubRolesDeleted);

            // 4. Delete clubs
            long clubsDeleted = clubRepository.count();
            clubRepository.deleteAll();
            deletedCounts.put("clubs", clubsDeleted);

            // 5. Delete schools
            long schoolsDeleted = schoolRepository.count();
            schoolRepository.deleteAll();
            deletedCounts.put("schools", schoolsDeleted);

            // 6. Delete members (including APP_ADMIN)
            long membersDeleted = memberRepository.count();
            memberRepository.deleteAll();
            deletedCounts.put("members", membersDeleted);

            response.put("success", true);
            response.put("message", "Database cleanup completed successfully");
            response.put("deletedCounts", deletedCounts);
            response.put("totalDeleted", deletedCounts.values().stream().mapToLong(Long::longValue).sum());
            response.put("activeProfile", activeProfile);
            response.put("warning", "All data has been permanently deleted from the database");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred during database cleanup: " + e.getMessage());
            response.put("error", e.getClass().getSimpleName());
            response.put("activeProfile", activeProfile);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get database statistics - shows count of records in each collection
     * Useful to verify cleanup or check current state
     * 
     * @return Current count of records in each collection
     */
    @GetMapping("/database-stats")
    public ResponseEntity<Map<String, Object>> getDatabaseStats() {
        Map<String, Object> response = new HashMap<>();

        try {
            Map<String, Long> counts = new HashMap<>();
            
            counts.put("members", memberRepository.count());
            counts.put("schools", schoolRepository.count());
            counts.put("clubs", clubRepository.count());
            counts.put("userClubRoles", userClubRoleRepository.count());
            counts.put("checkouts", checkoutRepository.count());
            counts.put("invoices", invoiceRepository.count());

            long totalRecords = counts.values().stream().mapToLong(Long::longValue).sum();

            response.put("success", true);
            response.put("message", "Database statistics retrieved successfully");
            response.put("counts", counts);
            response.put("totalRecords", totalRecords);
            response.put("activeProfile", activeProfile);
            response.put("timestamp", java.time.Instant.now().toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while retrieving database statistics: " + e.getMessage());
            response.put("error", e.getClass().getSimpleName());
            response.put("activeProfile", activeProfile);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Create an APP_ADMIN user for testing purposes
     * 
     * @param email Email for the admin user
     * @param password Password for the admin user (optional, defaults to "admin123")
     * @param name Name for the admin user (optional, defaults to "Test Admin")
     * @return Response indicating success or failure
     */
    @PostMapping("/create-app-admin")
    public ResponseEntity<Map<String, Object>> createAppAdmin(
            @RequestParam(name = "email", required = true) String email,
            @RequestParam(name = "password", defaultValue = "admin123") String password,
            @RequestParam(name = "name", defaultValue = "Test Admin") String name) {
        
        Map<String, Object> response = new HashMap<>();

        // Safety check - ensure we're not in production
        if ("prod".equals(activeProfile) || "production".equals(activeProfile)) {
            response.put("success", false);
            response.put("message", "Create admin is not allowed in production environment");
            response.put("activeProfile", activeProfile);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }

        try {
            // Check if member already exists
            if (memberRepository.existsByEmail(email)) {
                response.put("success", false);
                response.put("message", "User with email '" + email + "' already exists");
                response.put("email", email);
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }

            // Hash the password using SHA-256 (same as frontend)
            String hashedPassword = hashPassword(password);

            // Create new APP_ADMIN member
            Member newAdmin = new Member();
            newAdmin.setEmail(email);
            newAdmin.setPasswordHash(hashedPassword);
            
            // Split the name into firstName and lastName
            String[] nameParts = name.trim().split("\\s+", 2);
            newAdmin.setFirstName(nameParts[0]);
            if (nameParts.length > 1) {
                newAdmin.setLastName(nameParts[1]);
            } else {
                newAdmin.setLastName("");
            }
            
            newAdmin.setRole("APP_ADMIN");
            newAdmin.setMemberType("admin");
            newAdmin.setSchoolId(null);
            newAdmin.setSchoolName("");
            newAdmin.setGradeLevel("");
            newAdmin.setActive(true);
            newAdmin.setCreatedAt(java.time.LocalDateTime.now());
            newAdmin.setUpdatedAt(java.time.LocalDateTime.now());

            Member savedMember = memberRepository.save(newAdmin);

            response.put("success", true);
            response.put("message", "APP_ADMIN user created successfully");
            response.put("user", Map.of(
                "id", savedMember.getId(),
                "email", savedMember.getEmail(),
                "firstName", savedMember.getFirstName(),
                "lastName", savedMember.getLastName(),
                "role", savedMember.getRole(),
                "createdAt", savedMember.getCreatedAt().toString()
            ));
            response.put("activeProfile", activeProfile);
            response.put("credentials", Map.of(
                "email", email,
                "password", password,
                "note", "Use these credentials to login as APP_ADMIN"
            ));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while creating APP_ADMIN user: " + e.getMessage());
            response.put("error", e.getClass().getSimpleName());
            response.put("activeProfile", activeProfile);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Create a test school for development purposes
     * 
     * @param name School name (required)
     * @param description School description (optional)
     * @param city School city (optional)
     * @param state School state (optional)
     * @return Created school information
     */
    @PostMapping("/create-school")
    public ResponseEntity<Map<String, Object>> createSchool(
            @RequestParam(name = "name", required = true) String name,
            @RequestParam(name = "description", defaultValue = "") String description,
            @RequestParam(name = "city", defaultValue = "") String city,
            @RequestParam(name = "state", defaultValue = "") String state,
            @RequestParam(name = "type", defaultValue = "Public") String type) {
        
        Map<String, Object> response = new HashMap<>();

        // Safety check - ensure we're not in production
        if ("prod".equals(activeProfile) || "production".equals(activeProfile)) {
            response.put("success", false);
            response.put("message", "Create school is not allowed in production environment");
            response.put("activeProfile", activeProfile);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }

        try {
            // Check if school with same name already exists
            if (schoolRepository.existsByName(name)) {
                response.put("success", false);
                response.put("message", "School with name '" + name + "' already exists");
                response.put("name", name);
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }

            // Create new school
            School newSchool = new School();
            newSchool.setName(name);
            if (!description.isEmpty()) {
                newSchool.setDescription(description);
            }
            if (!city.isEmpty()) {
                newSchool.setCity(city);
            }
            if (!state.isEmpty()) {
                newSchool.setState(state);
            }
            newSchool.setType(type);
            newSchool.setCountry("USA"); // Default country

            School savedSchool = schoolRepository.save(newSchool);

            response.put("success", true);
            response.put("message", "School created successfully");
            response.put("school", Map.of(
                "id", savedSchool.getId(),
                "name", savedSchool.getName(),
                "description", savedSchool.getDescription() != null ? savedSchool.getDescription() : "",
                "city", savedSchool.getCity() != null ? savedSchool.getCity() : "",
                "state", savedSchool.getState() != null ? savedSchool.getState() : "",
                "type", savedSchool.getType() != null ? savedSchool.getType() : "",
                "country", savedSchool.getCountry() != null ? savedSchool.getCountry() : "",
                "createdAt", savedSchool.getCreatedAt().toString()
            ));
            response.put("activeProfile", activeProfile);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while creating school: " + e.getMessage());
            response.put("error", e.getClass().getSimpleName());
            response.put("activeProfile", activeProfile);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Health check for test endpoints
     * 
     * @return Basic health status and environment info
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> testHealth() {
        Map<String, Object> response = new HashMap<>();
        
        response.put("success", true);
        response.put("message", "Test endpoints are available");
        response.put("activeProfile", activeProfile);
        response.put("environment", "prod".equals(activeProfile) || "production".equals(activeProfile) ? "PRODUCTION" : "DEVELOPMENT");
        response.put("testEndpointsEnabled", !"prod".equals(activeProfile) && !"production".equals(activeProfile));
        response.put("timestamp", java.time.Instant.now().toString());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Hash password using SHA-256 (same as frontend)
     */
    private String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }
}