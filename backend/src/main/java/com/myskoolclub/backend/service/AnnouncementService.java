package com.myskoolclub.backend.service;

import com.myskoolclub.backend.model.Announcement;
import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.repository.AnnouncementRepository;
import com.myskoolclub.backend.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AnnouncementService {
    
    @Autowired
    private AnnouncementRepository announcementRepository;
    
    @Autowired
    private MemberRepository memberRepository;
    
    /**
     * Create a new announcement (SCHOOL_ADMIN only)
     */
    public Announcement createAnnouncement(String schoolId, String title, String content, String createdBy) {
        // Verify creator exists and get their name
        Optional<Member> creatorOpt = memberRepository.findById(createdBy);
        if (creatorOpt.isEmpty()) {
            throw new RuntimeException("Creator member not found");
        }
        
        Member creator = creatorOpt.get();
        
        // Verify creator is SCHOOL_ADMIN
        if (!"SCHOOL_ADMIN".equals(creator.getRole())) {
            throw new RuntimeException("Only SCHOOL_ADMIN can create announcements");
        }
        
        // Verify creator belongs to the same school
        if (!schoolId.equals(creator.getSchoolId())) {
            throw new RuntimeException("Cannot create announcements for a different school");
        }
        
        String creatorName = creator.getFirstName() + " " + creator.getLastName();
        
        Announcement announcement = new Announcement(schoolId, title, content, createdBy, creatorName);
        return announcementRepository.save(announcement);
    }
    
    /**
     * Update an existing announcement (SCHOOL_ADMIN only, must be creator)
     */
    public Announcement updateAnnouncement(String announcementId, String title, String content, String updatedBy) {
        Optional<Announcement> announcementOpt = announcementRepository.findById(announcementId);
        if (announcementOpt.isEmpty()) {
            throw new RuntimeException("Announcement not found");
        }
        
        Announcement announcement = announcementOpt.get();
        
        // Verify updater is the creator
        if (!announcement.getCreatedBy().equals(updatedBy)) {
            throw new RuntimeException("Only the creator can update this announcement");
        }
        
        // Verify updater is still SCHOOL_ADMIN
        Optional<Member> updaterOpt = memberRepository.findById(updatedBy);
        if (updaterOpt.isEmpty() || !"SCHOOL_ADMIN".equals(updaterOpt.get().getRole())) {
            throw new RuntimeException("Only SCHOOL_ADMIN can update announcements");
        }
        
        announcement.setTitle(title);
        announcement.setContent(content);
        announcement.setUpdatedAt(LocalDateTime.now());
        
        return announcementRepository.save(announcement);
    }
    
    /**
     * Delete (soft delete) an announcement (SCHOOL_ADMIN only, must be creator)
     */
    public void deleteAnnouncement(String announcementId, String deletedBy) {
        Optional<Announcement> announcementOpt = announcementRepository.findById(announcementId);
        if (announcementOpt.isEmpty()) {
            throw new RuntimeException("Announcement not found");
        }
        
        Announcement announcement = announcementOpt.get();
        
        // Verify deleter is the creator
        if (!announcement.getCreatedBy().equals(deletedBy)) {
            throw new RuntimeException("Only the creator can delete this announcement");
        }
        
        // Verify deleter is still SCHOOL_ADMIN
        Optional<Member> deleterOpt = memberRepository.findById(deletedBy);
        if (deleterOpt.isEmpty() || !"SCHOOL_ADMIN".equals(deleterOpt.get().getRole())) {
            throw new RuntimeException("Only SCHOOL_ADMIN can delete announcements");
        }
        
        announcement.setActive(false);
        announcement.setUpdatedAt(LocalDateTime.now());
        announcementRepository.save(announcement);
    }
    
    /**
     * Get all active announcements for a school (visible to all SCHOOL_USER and SCHOOL_ADMIN)
     */
    public List<Announcement> getAnnouncementsBySchool(String schoolId) {
        return announcementRepository.findBySchoolIdAndActiveOrderByCreatedAtDesc(schoolId, true);
    }
    
    /**
     * Get announcement by ID
     */
    public Optional<Announcement> getAnnouncementById(String announcementId) {
        return announcementRepository.findById(announcementId);
    }
}
