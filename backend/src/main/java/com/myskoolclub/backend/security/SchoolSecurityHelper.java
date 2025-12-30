package com.myskoolclub.backend.security;

import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.service.MemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SchoolSecurityHelper {

    @Autowired
    private MemberService memberService;

    /**
     * Check if the current user can access resources for a specific school
     */
    public boolean canAccessSchool(String schoolId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof Member)) {
            return false;
        }

        Member member = (Member) principal;
        
        // APP_ADMIN can access any school
        if ("APP_ADMIN".equals(member.getRole())) {
            return true;
        }
        
        // SCHOOL_ADMIN can only access their assigned school
        if ("SCHOOL_ADMIN".equals(member.getRole())) {
            return schoolId != null && schoolId.equals(member.getSchoolId());
        }
        
        return false;
    }

    /**
     * Get the current authenticated member (includes APP_ADMIN)
     */
    public Member getCurrentMember() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        
        // If principal is already a Member object, return it
        if (principal instanceof Member) {
            Member member = (Member) principal;
            return member;
        }
        
        // If principal is a String (username/email), load the member from database
        if (principal instanceof String) {
            String email = (String) principal;
            try {
                java.util.Optional<Member> memberOpt = memberService.findByEmail(email);
                if (memberOpt.isPresent()) {
                    Member member = memberOpt.get();
                    return member;
                }
            } catch (Exception e) {
                // Error loading member
            }
        }
        
        return null;
    }

    /**
     * Check if current user is APP_ADMIN
     */
    public boolean isAppAdmin() {
        Member member = getCurrentMember();
        return member != null && "APP_ADMIN".equals(member.getRole());
    }

    /**
     * Check if current user is SCHOOL_ADMIN for a specific school
     */
    public boolean isSchoolAdmin(String schoolId) {
        Member member = getCurrentMember();
        return member != null && 
               "SCHOOL_ADMIN".equals(member.getRole()) && 
               schoolId != null && 
               schoolId.equals(member.getSchoolId());
    }

    /**
     * Get the school ID for the current SCHOOL_ADMIN user
     * Returns null if user is not SCHOOL_ADMIN
     */
    public String getCurrentUserSchoolId() {
        Member member = getCurrentMember();
        if (member != null && "SCHOOL_ADMIN".equals(member.getRole())) {
            return member.getSchoolId();
        }
        return null;
    }

    /**
     * Check if current user can create clubs
     */
    public boolean canCreateClub() {
        Member member = getCurrentMember();
        return member != null && 
               ("APP_ADMIN".equals(member.getRole()) || "SCHOOL_ADMIN".equals(member.getRole()));
    }

    /**
     * Check if current user can access financial features (invoices and checkouts)
     */
    public boolean canAccessFinancialFeatures() {
        Member member = getCurrentMember();
        return member != null && 
               ("APP_ADMIN".equals(member.getRole()) || "SCHOOL_ADMIN".equals(member.getRole()));
    }

    /**
     * Check if current user can modify a specific club
     */
    public boolean canModifyClub(String clubSchoolId) {
        Member member = getCurrentMember();
        if (member == null || clubSchoolId == null) {
            return false;
        }
        
        // APP_ADMIN can modify any club
        if ("APP_ADMIN".equals(member.getRole())) {
            return true;
        }
        
        // SCHOOL_ADMIN can only modify clubs from their school
        if ("SCHOOL_ADMIN".equals(member.getRole())) {
            return canAccessSchool(clubSchoolId);
        }
        
        return false;
    }

    /**
     * Validate and enforce school assignment for club creation/updates
     * For SCHOOL_ADMIN users, this ensures they can only work with their assigned school
     */
    public String validateAndGetSchoolId(String requestedSchoolId) {
        Member member = getCurrentMember();
        if (member == null) {
            throw new SecurityException("Authentication required");
        }
        
        if ("APP_ADMIN".equals(member.getRole())) {
            return requestedSchoolId; // APP_ADMIN can use any school
        }
        
        if ("SCHOOL_ADMIN".equals(member.getRole())) {
            String memberSchoolId = member.getSchoolId();
            if (memberSchoolId == null) {
                throw new SecurityException("School admin user has no assigned school");
            }
            
            // For SCHOOL_ADMIN, always use their assigned school regardless of request
            return memberSchoolId;
        }
        
        throw new SecurityException("Insufficient permissions to perform this action");
    }

    /**
     * Check if current member can manage other members
     * APP_ADMIN can manage all members
     * SCHOOL_ADMIN can only manage SCHOOL_USER and SCHOOL_ADMIN members from their school
     */
    public boolean canManageMembers() {
        Member member = getCurrentMember();
        return member != null && 
               ("APP_ADMIN".equals(member.getRole()) || "SCHOOL_ADMIN".equals(member.getRole()));
    }

    /**
     * Check if current member can manage a specific member
     */
    public boolean canManageMember(Member targetMember) {
        Member currentMember = getCurrentMember();
        if (currentMember == null || targetMember == null) {
            return false;
        }
        
        // APP_ADMIN can manage anyone
        if ("APP_ADMIN".equals(currentMember.getRole())) {
            return true;
        }
        
        // SCHOOL_ADMIN can only manage members from their school
        if ("SCHOOL_ADMIN".equals(currentMember.getRole())) {
            return currentMember.getSchoolId() != null &&
                   currentMember.getSchoolId().equals(targetMember.getSchoolId()) &&
                   ("SCHOOL_USER".equals(targetMember.getRole()) || "SCHOOL_ADMIN".equals(targetMember.getRole()));
        }
        
        return false;
    }
}