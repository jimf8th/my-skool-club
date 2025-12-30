package com.myskoolclub.backend.model;

/**
 * Roles for the MySkoolClub application
 */
public enum Role {
    /**
     * Application Administrator - Full access to all features and settings
     * Can manage schools, clubs, users, and system configuration
     */
    APP_ADMIN("Application Administrator", "Full administrative access to the application"),

    /**
     * School Administrator - Can manage their assigned school and its clubs
     * Limited to school-specific operations
     */
    SCHOOL_ADMIN("School Administrator", "Administrative access to specific school operations"),

    /**
     * Club Advisor - Can manage their assigned clubs
     * Limited to club-specific operations they advise
     */
    CLUB_ADVISOR("Club Advisor", "Access to manage assigned clubs"),

    /**
     * Club Member - Basic member access
     * Can view club information and manage their own membership
     */
    CLUB_MEMBER("Club Member", "Basic member access to club features"),

    /**
     * Student - General student access
     * Can browse clubs and join/leave clubs
     */
    STUDENT("Student", "General student access for browsing and joining clubs");

    private final String displayName;
    private final String description;

    Role(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Check if this role has administrative privileges
     */
    public boolean isAdmin() {
        return this == APP_ADMIN || this == SCHOOL_ADMIN;
    }

    /**
     * Check if this role can manage clubs
     */
    public boolean canManageClubs() {
        return this == APP_ADMIN || this == SCHOOL_ADMIN || this == CLUB_ADVISOR;
    }

    /**
     * Check if this role can manage schools
     */
    public boolean canManageSchools() {
        return this == APP_ADMIN;
    }

    /**
     * Check if this role can manage users
     */
    public boolean canManageUsers() {
        return this == APP_ADMIN || this == SCHOOL_ADMIN;
    }

    /**
     * Get the Spring Security authority string for this role
     */
    public String getAuthority() {
        return "ROLE_" + this.name();
    }
}