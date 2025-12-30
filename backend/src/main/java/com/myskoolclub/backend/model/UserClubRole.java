package com.myskoolclub.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.CompoundIndex;

import java.time.LocalDateTime;

@Document(collection = "user_club_roles")
@CompoundIndex(def = "{'memberId': 1, 'clubId': 1}", unique = true)
public class UserClubRole {
    
    @Id
    private String id;
    
    @Indexed
    private String memberId;
    
    @Indexed
    private String clubId;
    
    @Indexed
    private String schoolId; // For efficient querying by school
    
    // Role can be CLUB_ADMIN or CLUB_USER
    @Indexed
    private String clubRole;
    
    // Additional metadata
    private String memberEmail;
    private String memberName;
    private String clubName;
    private String schoolName;
    
    // System fields
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean active = true;
    
    // Constructors
    public UserClubRole() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.active = true;
    }
    
    public UserClubRole(String memberId, String clubId, String schoolId, String clubRole) {
        this();
        this.memberId = memberId;
        this.clubId = clubId;
        this.schoolId = schoolId;
        this.clubRole = clubRole;
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getMemberId() {
        return memberId;
    }
    
    public void setMemberId(String memberId) {
        this.memberId = memberId;
    }
    
    public String getClubId() {
        return clubId;
    }
    
    public void setClubId(String clubId) {
        this.clubId = clubId;
    }
    
    public String getSchoolId() {
        return schoolId;
    }
    
    public void setSchoolId(String schoolId) {
        this.schoolId = schoolId;
    }
    
    public String getClubRole() {
        return clubRole;
    }
    
    public void setClubRole(String clubRole) {
        this.clubRole = clubRole;
    }
    
    public String getMemberEmail() {
        return memberEmail;
    }
    
    public void setMemberEmail(String memberEmail) {
        this.memberEmail = memberEmail;
    }
    
    public String getMemberName() {
        return memberName;
    }
    
    public void setMemberName(String memberName) {
        this.memberName = memberName;
    }
    
    public String getClubName() {
        return clubName;
    }
    
    public void setClubName(String clubName) {
        this.clubName = clubName;
    }
    
    public String getSchoolName() {
        return schoolName;
    }
    
    public void setSchoolName(String schoolName) {
        this.schoolName = schoolName;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public boolean isActive() {
        return active;
    }
    
    public void setActive(boolean active) {
        this.active = active;
    }
    
    @Override
    public String toString() {
        return "UserClubRole{" +
                "id='" + id + '\'' +
                ", memberId='" + memberId + '\'' +
                ", clubId='" + clubId + '\'' +
                ", schoolId='" + schoolId + '\'' +
                ", clubRole='" + clubRole + '\'' +
                ", memberEmail='" + memberEmail + '\'' +
                ", memberName='" + memberName + '\'' +
                ", clubName='" + clubName + '\'' +
                ", schoolName='" + schoolName + '\'' +
                ", active=" + active +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}