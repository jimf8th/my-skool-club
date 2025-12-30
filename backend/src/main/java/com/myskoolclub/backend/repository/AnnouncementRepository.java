package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.Announcement;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementRepository extends MongoRepository<Announcement, String> {
    
    // Find all active announcements for a school, ordered by creation date (newest first)
    List<Announcement> findBySchoolIdAndActiveOrderByCreatedAtDesc(String schoolId, boolean active);
    
    // Find all announcements for a school (including inactive)
    List<Announcement> findBySchoolIdOrderByCreatedAtDesc(String schoolId);
    
    // Find by creator
    List<Announcement> findByCreatedByAndActiveOrderByCreatedAtDesc(String createdBy, boolean active);
}
