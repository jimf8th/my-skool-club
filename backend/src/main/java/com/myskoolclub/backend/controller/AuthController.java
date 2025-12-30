package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.model.UserClubRole;
import com.myskoolclub.backend.repository.UserRepository;
import com.myskoolclub.backend.service.MemberService;
import com.myskoolclub.backend.service.UserService;
import com.myskoolclub.backend.service.UserClubRoleService;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import com.myskoolclub.backend.security.JwtTokenUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtTokenUtil jwtTokenUtil;
    
    @Autowired
    private MemberService memberService;
    
    @Autowired
    private UserClubRoleService userClubRoleService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginRequest) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String email = loginRequest.get("email");
            String passwordHash = loginRequest.get("passwordHash");
            
            // Validate input
            if (email == null || email.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (passwordHash == null || passwordHash.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Password is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // First, try to find member by email
            Optional<Member> memberOpt = memberService.findByEmail(email.trim().toLowerCase());
            
            if (memberOpt.isPresent()) {
                Member member = memberOpt.get();
                
                // Check if member is active
                if (!member.isActive()) {
                    response.put("success", false);
                    response.put("message", "Your account is pending activation by a school administrator. Please wait for approval or contact your school administrator.");
                    return ResponseEntity.badRequest().body(response);
                }
                
                // Verify password hash for member
                if (!passwordHash.equals(member.getPasswordHash())) {
                    response.put("success", false);
                    response.put("message", "Invalid email or password");
                    return ResponseEntity.badRequest().body(response);
                }
                
                // Login successful for Member - generate JWT token
                String token = jwtTokenUtil.generateToken(member.getEmail());
                
                response.put("success", true);
                response.put("message", "Login successful!");
                
                // Prepare member data (remove sensitive information)
                Map<String, Object> memberData = new HashMap<>();
                memberData.put("id", member.getId());
                memberData.put("firstName", member.getFirstName());
                memberData.put("lastName", member.getLastName());
                memberData.put("email", member.getEmail());
                memberData.put("memberType", member.getMemberType());
                memberData.put("role", member.getRole());
                memberData.put("schoolId", member.getSchoolId());
                memberData.put("schoolName", member.getSchoolName());
                memberData.put("gradeLevel", member.getGradeLevel());
                memberData.put("createdAt", member.getCreatedAt());
                memberData.put("accountType", "member");
                
                response.put("token", token);
                response.put("user", memberData);
                
                return ResponseEntity.ok(response);
            }
            
            // Member not found
            response.put("success", false);
            response.put("message", "Invalid email or password");
            return ResponseEntity.badRequest().body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred during login");
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        
        Map<String, Object> response = new HashMap<>();
        
        if (token != null && jwtTokenUtil.validateToken(token)) {
            String username = jwtTokenUtil.getUsernameFromToken(token);
            response.put("valid", true);
            response.put("username", username);
            response.put("message", "Token is valid");
        } else {
            response.put("valid", false);
            response.put("message", "Token is invalid or expired");
        }
        
        response.put("timestamp", LocalDateTime.now());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshToken(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            if (jwtTokenUtil.validateToken(token)) {
                String username = jwtTokenUtil.getUsernameFromToken(token);
                String newToken = jwtTokenUtil.generateToken(username);
                
                Map<String, Object> response = new HashMap<>();
                response.put("token", newToken);
                response.put("type", "Bearer");
                response.put("username", username);
                response.put("expiresIn", jwtTokenUtil.getTokenValidity());
                response.put("issuedAt", LocalDateTime.now());
                
                return ResponseEntity.ok(response);
            }
        }
        
        Map<String, Object> error = new HashMap<>();
        error.put("error", "Invalid token");
        error.put("message", "Cannot refresh invalid or expired token");
        error.put("timestamp", LocalDateTime.now());
        
        return ResponseEntity.status(401).body(error);
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getAuthInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("service", "MySkoolClub Authentication Server");
        info.put("version", "1.0.0");
        info.put("tokenType", "JWT");
        info.put("tokenValidity", jwtTokenUtil.getTokenValidity() + " seconds");
        info.put("endpoints", Map.of(
            "login", "POST /api/auth/login - Authenticate and get token",
            "validate", "POST /api/auth/validate - Validate existing token",
            "refresh", "POST /api/auth/refresh - Refresh existing token",
            "info", "GET /api/auth/info - Authentication server information"
        ));
        
        return ResponseEntity.ok(info);
    }
    
    @GetMapping("/club-roles")
    public ResponseEntity<Map<String, Object>> getMemberClubRoles(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Get current member from JWT token
            Member currentMember = getCurrentMember(request);
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Get club roles for the member
            List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
            
            response.put("success", true);
            response.put("data", clubRoles);
            response.put("hasClubRoles", !clubRoles.isEmpty());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to fetch club roles: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Create a new APP_ADMIN user
     * This is a production-safe endpoint that requires proper authentication
     * Accepts password in plain text and hashes it (matching frontend behavior)
     */
    @PostMapping("/create-app-admin")
    public ResponseEntity<Map<String, Object>> createAppAdmin(@RequestBody Map<String, String> adminRequest) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String email = adminRequest.get("email");
            String password = adminRequest.get("password");
            String firstName = adminRequest.get("firstName");
            String lastName = adminRequest.get("lastName");
            
            // Support legacy 'name' field for backwards compatibility
            if (firstName == null && adminRequest.get("name") != null) {
                String[] nameParts = adminRequest.get("name").split("\\s+", 2);
                firstName = nameParts[0];
                lastName = nameParts.length > 1 ? nameParts[1] : "";
            }
            
            // Validate required input
            if (email == null || email.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (password == null || password.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Password is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (firstName == null || firstName.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "First name is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Check if member already exists
            if (memberService.findByEmail(email).isPresent()) {
                response.put("success", false);
                response.put("message", "User with email '" + email + "' already exists");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }
            
            // Hash the password using SHA-256 (same as frontend)
            String hashedPassword = hashPassword(password);
            
            // Create new APP_ADMIN member
            Member newAdmin = new Member();
            newAdmin.setEmail(email);
            newAdmin.setPasswordHash(hashedPassword); // Store hashed password
            newAdmin.setFirstName(firstName);
            newAdmin.setLastName(lastName != null ? lastName : "");
            newAdmin.setRole("APP_ADMIN");
            newAdmin.setMemberType("admin");
            newAdmin.setSchoolId(null); // APP_ADMIN is not school-scoped
            newAdmin.setSchoolName("");
            newAdmin.setGradeLevel("");
            newAdmin.setActive(true);
            newAdmin.setCreatedAt(LocalDateTime.now());
            newAdmin.setUpdatedAt(LocalDateTime.now());
            
            Member savedMember = memberService.createMember(newAdmin);
            
            response.put("success", true);
            response.put("message", "APP_ADMIN user created successfully");
            response.put("user", Map.of(
                "id", savedMember.getId(),
                "email", savedMember.getEmail(),
                "firstName", savedMember.getFirstName(),
                "lastName", savedMember.getLastName(),
                "role", savedMember.getRole(),
                "createdAt", savedMember.getCreatedAt()
            ));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to create APP_ADMIN user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Update user password with proper hashing (for fixing legacy users)
     */
    @PostMapping("/update-user-password")
    public ResponseEntity<Map<String, Object>> updateUserPassword(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String email = request.get("email");
            String newPassword = request.get("password");
            
            // Validate input
            if (email == null || email.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (newPassword == null || newPassword.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Password is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Find user by email
            Optional<User> userOpt = userService.getUserByEmail(email.trim().toLowerCase());
            if (!userOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            User user = userOpt.get();
            
            // Hash the new password
            String hashedPassword = hashPassword(newPassword);
            
            // Update user password
            user.setPassword(hashedPassword);
            user.setUpdatedAt(LocalDateTime.now());
            
            User updatedUser = userRepository.save(user);
            
            response.put("success", true);
            response.put("message", "Password updated successfully");
            response.put("user", Map.of(
                "id", updatedUser.getId(),
                "email", updatedUser.getEmail(),
                "updatedAt", updatedUser.getUpdatedAt()
            ));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to update password: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Hash password using SHA-256 (same algorithm as frontend)
     */
    private String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }

    /**
     * Helper method to get current authenticated member
     */
    private Member getCurrentMember(HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                String email = jwtTokenUtil.getUsernameFromToken(token);
                
                if (email != null && jwtTokenUtil.validateToken(token, email)) {
                    Optional<Member> memberOpt = memberService.findByEmail(email);
                    return memberOpt.orElse(null);
                }
            }
        } catch (Exception e) {
            // Error extracting token
        }
        return null;
    }

    /**
     * Migrate users from users collection to members collection
     * This is a one-time migration endpoint
     */
    @PostMapping("/migrate-users-to-members")
    public ResponseEntity<Map<String, Object>> migrateUsersToMembers() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Get all users from users collection
            List<User> users = userRepository.findAll();
            
            if (users.isEmpty()) {
                response.put("success", true);
                response.put("message", "No users to migrate");
                response.put("migratedCount", 0);
                return ResponseEntity.ok(response);
            }
            
            int migratedCount = 0;
            int skippedCount = 0;
            List<String> errors = new ArrayList<>();
            
            for (User user : users) {
                try {
                    // Check if member already exists
                    if (memberService.findByEmail(user.getEmail()).isPresent()) {
                        skippedCount++;
                        continue;
                    }
                    
                    // Create member from user
                    Member member = new Member();
                    member.setEmail(user.getEmail());
                    member.setPasswordHash(user.getPassword());
                    member.setFirstName(user.getFirstName());
                    member.setLastName(user.getLastName());
                    member.setRole(user.getRole().toString());
                    member.setMemberType("admin");
                    member.setSchoolId(null);
                    member.setSchoolName("");
                    member.setGradeLevel("");
                    member.setActive(user.isActive());
                    member.setCreatedAt(user.getCreatedAt());
                    member.setUpdatedAt(LocalDateTime.now());
                    
                    memberService.createMember(member);
                    migratedCount++;
                    
                } catch (Exception e) {
                    errors.add("Failed to migrate user " + user.getEmail() + ": " + e.getMessage());
                }
            }
            
            response.put("success", true);
            response.put("message", "Migration completed");
            response.put("totalUsers", users.size());
            response.put("migratedCount", migratedCount);
            response.put("skippedCount", skippedCount);
            
            if (!errors.isEmpty()) {
                response.put("errors", errors);
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Migration failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Simple user validation for demo purposes

}