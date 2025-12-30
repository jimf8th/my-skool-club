package com.myskoolclub.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Document(collection = "clubs")
public class Club {
    @Id
    private String id;
    
    @Indexed
    private String name;
    
    @Indexed
    private String schoolId;
    
    private String schoolName;
    private String description;
    private String category;
    
    // Advisor information
    private String advisorName;
    private String advisorEmail;
    
    // Meeting information
    private String meetingLocation;
    private String meetingTime;
    private String meetingDay;
    
    // Club settings
    private Integer maxMembers;
    private List<String> tags = new ArrayList<>();
    
    // System fields
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean active = true;
    
    // Constructors
    public Club() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public Club(String name, String schoolId, String schoolName) {
        this();
        this.name = name;
        this.schoolId = schoolId;
        this.schoolName = schoolName;
    }
    
    public Club(String name, String schoolId, String schoolName, String description) {
        this(name, schoolId, schoolName);
        this.description = description;
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getSchoolId() {
        return schoolId;
    }
    
    public void setSchoolId(String schoolId) {
        this.schoolId = schoolId;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getSchoolName() {
        return schoolName;
    }
    
    public void setSchoolName(String schoolName) {
        this.schoolName = schoolName;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getCategory() {
        return category;
    }
    
    public void setCategory(String category) {
        this.category = category;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getAdvisorName() {
        return advisorName;
    }
    
    public void setAdvisorName(String advisorName) {
        this.advisorName = advisorName;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getAdvisorEmail() {
        return advisorEmail;
    }
    
    public void setAdvisorEmail(String advisorEmail) {
        this.advisorEmail = advisorEmail;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getMeetingLocation() {
        return meetingLocation;
    }
    
    public void setMeetingLocation(String meetingLocation) {
        this.meetingLocation = meetingLocation;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getMeetingTime() {
        return meetingTime;
    }
    
    public void setMeetingTime(String meetingTime) {
        this.meetingTime = meetingTime;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getMeetingDay() {
        return meetingDay;
    }
    
    public void setMeetingDay(String meetingDay) {
        this.meetingDay = meetingDay;
        this.updatedAt = LocalDateTime.now();
    }
    
    public Integer getMaxMembers() {
        return maxMembers;
    }
    
    public void setMaxMembers(Integer maxMembers) {
        this.maxMembers = maxMembers;
        this.updatedAt = LocalDateTime.now();
    }
    
    public List<String> getTags() {
        return tags;
    }
    
    public void setTags(List<String> tags) {
        this.tags = tags != null ? tags : new ArrayList<>();
        this.updatedAt = LocalDateTime.now();
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
        this.updatedAt = LocalDateTime.now();
    }
    
    // Utility methods
    public void addTag(String tag) {
        if (tag != null && !tag.trim().isEmpty() && !this.tags.contains(tag.trim())) {
            this.tags.add(tag.trim());
            this.updatedAt = LocalDateTime.now();
        }
    }
    
    public void removeTag(String tag) {
        if (tag != null) {
            this.tags.remove(tag.trim());
            this.updatedAt = LocalDateTime.now();
        }
    }
    
    @Override
    public String toString() {
        return "Club{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", schoolId='" + schoolId + '\'' +
                ", schoolName='" + schoolName + '\'' +
                ", description='" + description + '\'' +
                ", category='" + category + '\'' +
                ", advisorName='" + advisorName + '\'' +
                ", advisorEmail='" + advisorEmail + '\'' +
                ", meetingLocation='" + meetingLocation + '\'' +
                ", meetingTime='" + meetingTime + '\'' +
                ", meetingDay='" + meetingDay + '\'' +
                ", maxMembers=" + maxMembers +
                ", tags=" + tags +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                ", active=" + active +
                '}';
    }
}