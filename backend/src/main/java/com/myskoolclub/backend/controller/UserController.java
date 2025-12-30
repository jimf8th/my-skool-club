package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.model.Role;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.service.SchoolAdminService;
import com.myskoolclub.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('APP_ADMIN')")
public class UserController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private SchoolAdminService schoolAdminService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllUsers() {
        Map<String, Object> response = new HashMap<>();

        try {
            List<User> users = userService.getAllUsers();
            
            response.put("success", true);
            response.put("message", "Users retrieved successfully");
            response.put("data", users.stream().map(this::createUserResponse).toList());
            response.put("total", users.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching users");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/active")
    public ResponseEntity<Map<String, Object>> getActiveUsers() {
        Map<String, Object> response = new HashMap<>();

        try {
            List<User> users = userService.getActiveUsers();
            
            response.put("success", true);
            response.put("message", "Active users retrieved successfully");
            response.put("data", users.stream().map(this::createUserResponse).toList());
            response.put("total", users.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching active users");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> getUserById(@PathVariable String userId) {
        Map<String, Object> response = new HashMap<>();

        try {
            Optional<User> userOpt = userService.getUserById(userId);
            
            if (userOpt.isEmpty()) {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.status(404).body(response);
            }

            response.put("success", true);
            response.put("message", "User retrieved successfully");
            response.put("data", createUserResponse(userOpt.get()));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching user");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createUser(@RequestBody CreateUserRequest request) {
        Map<String, Object> response = new HashMap<>();

        try {
            User user = new User(
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                request.getFirstName(),
                request.getLastName(),
                request.getRole()
            );

            User createdUser = userService.createUser(user);

            response.put("success", true);
            response.put("message", "User created successfully");
            response.put("data", createUserResponse(createdUser));

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(400).body(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while creating user");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PutMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> updateUser(@PathVariable String userId, @RequestBody UpdateUserRequest request) {
        Map<String, Object> response = new HashMap<>();

        try {
            User userUpdates = new User();
            userUpdates.setUsername(request.getUsername());
            userUpdates.setEmail(request.getEmail());
            userUpdates.setFirstName(request.getFirstName());
            userUpdates.setLastName(request.getLastName());
            userUpdates.setRole(request.getRole());
            userUpdates.setPassword(request.getPassword());

            User updatedUser = userService.updateUser(userId, userUpdates);

            response.put("success", true);
            response.put("message", "User updated successfully");
            response.put("data", createUserResponse(updatedUser));

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(400).body(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while updating user");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PutMapping("/{userId}/activate")
    public ResponseEntity<Map<String, Object>> activateUser(@PathVariable String userId) {
        Map<String, Object> response = new HashMap<>();

        try {
            boolean activated = userService.activateUser(userId);
            
            if (activated) {
                response.put("success", true);
                response.put("message", "User activated successfully");
            } else {
                response.put("success", false);
                response.put("message", "User not found");
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while activating user");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PutMapping("/{userId}/deactivate")
    public ResponseEntity<Map<String, Object>> deactivateUser(@PathVariable String userId) {
        Map<String, Object> response = new HashMap<>();

        try {
            boolean deactivated = userService.deactivateUser(userId);
            
            if (deactivated) {
                response.put("success", true);
                response.put("message", "User deactivated successfully");
            } else {
                response.put("success", false);
                response.put("message", "User not found");
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while deactivating user");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable String userId) {
        Map<String, Object> response = new HashMap<>();

        try {
            userService.deleteUser(userId);
            
            response.put("success", true);
            response.put("message", "User deleted successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while deleting user");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/role/{role}")
    public ResponseEntity<Map<String, Object>> getUsersByRole(@PathVariable Role role) {
        Map<String, Object> response = new HashMap<>();

        try {
            List<User> users = userService.getUsersByRole(role);
            
            response.put("success", true);
            response.put("message", "Users retrieved successfully");
            response.put("data", users.stream().map(this::createUserResponse).toList());
            response.put("total", users.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching users by role");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getUserStats() {
        Map<String, Object> response = new HashMap<>();

        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalActiveUsers", userService.countActiveUsers());
            stats.put("totalAppAdmins", userService.countUsersByRole(Role.APP_ADMIN));
            stats.put("totalSchoolAdmins", userService.countUsersByRole(Role.SCHOOL_ADMIN));
            stats.put("totalClubAdvisors", userService.countUsersByRole(Role.CLUB_ADVISOR));
            stats.put("totalClubMembers", userService.countUsersByRole(Role.CLUB_MEMBER));
            stats.put("totalStudents", userService.countUsersByRole(Role.STUDENT));
            
            response.put("success", true);
            response.put("message", "User statistics retrieved successfully");
            response.put("data", stats);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching user statistics");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    private Map<String, Object> createUserResponse(User user) {
        Map<String, Object> userResponse = new HashMap<>();
        userResponse.put("id", user.getId());
        userResponse.put("username", user.getUsername());
        userResponse.put("email", user.getEmail());
        userResponse.put("firstName", user.getFirstName());
        userResponse.put("lastName", user.getLastName());
        userResponse.put("fullName", user.getFullName());
        userResponse.put("role", user.getRole());
        userResponse.put("roleName", user.getRole().getDisplayName());
        userResponse.put("schoolId", user.getSchoolId());
        userResponse.put("active", user.isActive());
        userResponse.put("createdAt", user.getCreatedAt());
        userResponse.put("updatedAt", user.getUpdatedAt());
        userResponse.put("lastLoginAt", user.getLastLoginAt());
        return userResponse;
    }

    // Request DTOs
    public static class CreateUserRequest {
        private String username;
        private String email;
        private String password;
        private String firstName;
        private String lastName;
        private Role role;

        // Getters and setters
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        public Role getRole() { return role; }
        public void setRole(Role role) { this.role = role; }
    }

    public static class UpdateUserRequest {
        private String username;
        private String email;
        private String password;
        private String firstName;
        private String lastName;
        private Role role;

        // Getters and setters
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        public Role getRole() { return role; }
        public void setRole(Role role) { this.role = role; }
    }

    @GetMapping("/school/{schoolId}/admins")
    public ResponseEntity<Map<String, Object>> getSchoolAdmins(@PathVariable String schoolId) {
        Map<String, Object> response = new HashMap<>();

        try {
            List<User> schoolAdmins = schoolAdminService.getSchoolAdmins(schoolId);
            
            response.put("success", true);
            response.put("message", "School admins retrieved successfully");
            response.put("data", schoolAdmins.stream().map(this::createUserResponse).toList());
            response.put("total", schoolAdmins.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching school admins");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}