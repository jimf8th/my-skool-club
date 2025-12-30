package com.myskoolclub.backend.service;

import com.myskoolclub.backend.model.Role;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UserService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        Optional<User> userOpt = userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail);
        
        if (userOpt.isEmpty()) {
            throw new UsernameNotFoundException("User not found with username or email: " + usernameOrEmail);
        }

        User user = userOpt.get();
        if (!user.isActive()) {
            throw new UsernameNotFoundException("User account is deactivated: " + usernameOrEmail);
        }

        return user;
    }

    /**
     * Create a new user
     */
    public User createUser(User user) {
        // Check if username already exists
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new IllegalArgumentException("Username already exists: " + user.getUsername());
        }

        // Check if email already exists
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + user.getEmail());
        }

        // Encode password
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        
        // Set timestamps
        LocalDateTime now = LocalDateTime.now();
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        return userRepository.save(user);
    }

    /**
     * Update user
     */
    public User updateUser(String userId, User userUpdates) {
        Optional<User> userOpt = userRepository.findById(userId);
        
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found with id: " + userId);
        }

        User existingUser = userOpt.get();

        // Update fields if provided
        if (userUpdates.getUsername() != null && !userUpdates.getUsername().equals(existingUser.getUsername())) {
            if (userRepository.existsByUsername(userUpdates.getUsername())) {
                throw new IllegalArgumentException("Username already exists: " + userUpdates.getUsername());
            }
            existingUser.setUsername(userUpdates.getUsername());
        }

        if (userUpdates.getEmail() != null && !userUpdates.getEmail().equals(existingUser.getEmail())) {
            if (userRepository.existsByEmail(userUpdates.getEmail())) {
                throw new IllegalArgumentException("Email already exists: " + userUpdates.getEmail());
            }
            existingUser.setEmail(userUpdates.getEmail());
        }

        if (userUpdates.getFirstName() != null) {
            existingUser.setFirstName(userUpdates.getFirstName());
        }

        if (userUpdates.getLastName() != null) {
            existingUser.setLastName(userUpdates.getLastName());
        }

        if (userUpdates.getRole() != null) {
            existingUser.setRole(userUpdates.getRole());
        }

        // Update password if provided
        if (userUpdates.getPassword() != null && !userUpdates.getPassword().isEmpty()) {
            existingUser.setPassword(passwordEncoder.encode(userUpdates.getPassword()));
        }

        existingUser.setUpdatedAt(LocalDateTime.now());

        return userRepository.save(existingUser);
    }

    /**
     * Get all users
     */
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Get all active users
     */
    public List<User> getActiveUsers() {
        return userRepository.findByActiveTrue();
    }

    /**
     * Get user by ID
     */
    public Optional<User> getUserById(String userId) {
        return userRepository.findById(userId);
    }

    /**
     * Get user by username
     */
    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * Get user by email
     */
    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * Get users by role
     */
    public List<User> getUsersByRole(Role role) {
        return userRepository.findByRole(role);
    }

    /**
     * Deactivate user (soft delete)
     */
    public boolean deactivateUser(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        
        if (userOpt.isEmpty()) {
            return false;
        }

        User user = userOpt.get();
        user.setActive(false);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        
        return true;
    }

    /**
     * Activate user
     */
    public boolean activateUser(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        
        if (userOpt.isEmpty()) {
            return false;
        }

        User user = userOpt.get();
        user.setActive(true);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        
        return true;
    }

    /**
     * Update last login time
     */
    public void updateLastLogin(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);
        }
    }

    /**
     * Delete user permanently
     */
    public void deleteUser(String userId) {
        userRepository.deleteById(userId);
    }

    /**
     * Check if user exists by username
     */
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    /**
     * Check if user exists by email
     */
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    /**
     * Count total active users
     */
    public long countActiveUsers() {
        return userRepository.countByActiveTrue();
    }

    /**
     * Count users by role
     */
    public long countUsersByRole(Role role) {
        return userRepository.countByRole(role);
    }
}