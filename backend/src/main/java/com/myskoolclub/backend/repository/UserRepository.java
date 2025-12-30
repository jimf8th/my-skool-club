package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.Role;
import com.myskoolclub.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    /**
     * Find user by username
     */
    Optional<User> findByUsername(String username);

    /**
     * Find user by email
     */
    Optional<User> findByEmail(String email);

    /**
     * Find user by username or email
     */
    Optional<User> findByUsernameOrEmail(String username, String email);

    /**
     * Check if username exists
     */
    boolean existsByUsername(String username);

    /**
     * Check if email exists
     */
    boolean existsByEmail(String email);

    /**
     * Find all active users
     */
    List<User> findByActiveTrue();

    /**
     * Find users by role
     */
    List<User> findByRole(Role role);

    /**
     * Find active users by role
     */
    List<User> findByRoleAndActiveTrue(Role role);

    /**
     * Count total users
     */
    long countByActiveTrue();

    /**
     * Count users by role
     */
    long countByRole(Role role);

    /**
     * Find users by active status
     */
    List<User> findByActive(boolean active);

    /**
     * Count users by active status
     */
    long countByActive(boolean active);

    /**
     * Find users by school ID
     */
    List<User> findBySchoolId(String schoolId);

    /**
     * Find users by school ID and role
     */
    List<User> findBySchoolIdAndRole(String schoolId, Role role);

    /**
     * Find active school admins by school ID
     */
    List<User> findBySchoolIdAndRoleAndActiveTrue(String schoolId, Role role);
}