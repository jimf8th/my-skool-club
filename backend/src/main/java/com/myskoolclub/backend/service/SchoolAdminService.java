package com.myskoolclub.backend.service;

import com.myskoolclub.backend.model.Role;
import com.myskoolclub.backend.model.School;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SchoolAdminService {

    private static final Logger logger = LoggerFactory.getLogger(SchoolAdminService.class);

    @Autowired
    private UserRepository userRepository;



    /**
     * Assign SCHOOL_ADMIN role to users whose email is in the school's admin emails list
     */
    public void assignSchoolAdminRoles(School school) {
        try {
            String schoolId = school.getId();
            List<String> adminEmails = school.getAdminEmails();

            if (adminEmails == null || adminEmails.isEmpty()) {
                logger.info("No admin emails configured for school: {}", school.getName());
                return;
            }

            for (String adminEmail : adminEmails) {
                Optional<User> userOpt = userRepository.findByEmail(adminEmail);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    
                    // Only assign if user doesn't already have APP_ADMIN role (which is higher)
                    if (user.getRole() != Role.APP_ADMIN) {
                        user.setRole(Role.SCHOOL_ADMIN);
                        user.setSchoolId(schoolId);
                        userRepository.save(user);
                        
                        logger.info("Assigned SCHOOL_ADMIN role to user {} for school {}", 
                                adminEmail, school.getName());
                    }
                } else {
                    logger.info("User not found for admin email: {} in school {}", 
                            adminEmail, school.getName());
                }
            }
        } catch (Exception e) {
            logger.error("Error assigning school admin roles for school {}: {}", school.getName(), e.getMessage(), e);
        }
    }

    /**
     * Remove SCHOOL_ADMIN role from users who are no longer in the admin emails list
     */
    public void removeSchoolAdminRoles(String schoolId, List<String> currentAdminEmails) {
        try {
            List<User> currentSchoolAdmins = userRepository.findBySchoolIdAndRole(schoolId, Role.SCHOOL_ADMIN);
            
            for (User user : currentSchoolAdmins) {
                if (!currentAdminEmails.contains(user.getEmail())) {
                    // Remove school admin role and school association
                    user.setRole(Role.STUDENT); // Default role
                    user.setSchoolId(null);
                    userRepository.save(user);
                    
                    logger.info("Removed SCHOOL_ADMIN role from user {} for school {}", 
                            user.getEmail(), schoolId);
                }
            }
        } catch (Exception e) {
            logger.error("Error removing school admin roles for school {}: {}", schoolId, e.getMessage(), e);
        }
    }

    /**
     * Update school admin roles when admin emails are changed
     */
    public void updateSchoolAdminRoles(School school) {
        // First remove roles from users no longer in the list
        removeSchoolAdminRoles(school.getId(), school.getAdminEmails());
        
        // Then assign roles to new admin emails
        assignSchoolAdminRoles(school);
    }

    /**
     * Check if a user is a school admin for a specific school
     */
    public boolean isSchoolAdmin(String userId, String schoolId) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return false;
            }

            User user = userOpt.get();
            return user.getRole() == Role.SCHOOL_ADMIN && schoolId.equals(user.getSchoolId());
        } catch (Exception e) {
            logger.error("Error checking school admin status for user {} and school {}: {}", 
                    userId, schoolId, e.getMessage());
            return false;
        }
    }

    /**
     * Get all school admins for a specific school
     */
    public List<User> getSchoolAdmins(String schoolId) {
        return userRepository.findBySchoolIdAndRoleAndActiveTrue(schoolId, Role.SCHOOL_ADMIN);
    }
}