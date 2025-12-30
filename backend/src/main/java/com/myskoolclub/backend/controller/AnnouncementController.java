package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.model.Announcement;
import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.service.AnnouncementService;
import com.myskoolclub.backend.service.MemberService;
import com.myskoolclub.backend.security.JwtTokenUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/announcements")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class AnnouncementController {
    
    @Autowired
    private AnnouncementService announcementService;
    
    @Autowired
    private MemberService memberService;
    
    @Autowired
    private JwtTokenUtil jwtTokenUtil;
    
    /**
     * Get current member from JWT token
     */
    private Member getCurrentMember(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Authorization token required");
        }
        
        String token = authHeader.substring(7);
        String email = jwtTokenUtil.getUsernameFromToken(token);
        
        Optional<Member> memberOpt = memberService.findByEmail(email);
        if (memberOpt.isEmpty()) {
            throw new RuntimeException("Member not found");
        }
        
        return memberOpt.get();
    }
    
    /**
     * Create a new announcement (SCHOOL_ADMIN only)
     * POST /api/announcements
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createAnnouncement(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember(authHeader);
            
            String title = request.get("title");
            String content = request.get("content");
            
            if (title == null || title.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Title is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (content == null || content.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Content is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            Announcement announcement = announcementService.createAnnouncement(
                currentMember.getSchoolId(),
                title,
                content,
                currentMember.getId()
            );
            
            response.put("success", true);
            response.put("message", "Announcement created successfully");
            response.put("data", announcement);
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while creating the announcement");
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * Update an announcement (SCHOOL_ADMIN only, must be creator)
     * PUT /api/announcements/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateAnnouncement(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id,
            @RequestBody Map<String, String> request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember(authHeader);
            
            String title = request.get("title");
            String content = request.get("content");
            
            if (title == null || title.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Title is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (content == null || content.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Content is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            Announcement announcement = announcementService.updateAnnouncement(
                id,
                title,
                content,
                currentMember.getId()
            );
            
            response.put("success", true);
            response.put("message", "Announcement updated successfully");
            response.put("data", announcement);
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while updating the announcement");
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * Delete an announcement (SCHOOL_ADMIN only, must be creator)
     * DELETE /api/announcements/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteAnnouncement(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember(authHeader);
            
            announcementService.deleteAnnouncement(id, currentMember.getId());
            
            response.put("success", true);
            response.put("message", "Announcement deleted successfully");
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while deleting the announcement");
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * Get all announcements for the current member's school
     * GET /api/announcements?page=0&size=10
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAnnouncements(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember(authHeader);
            
            List<Announcement> allAnnouncements = announcementService.getAnnouncementsBySchool(
                currentMember.getSchoolId()
            );
            
            int totalCount = allAnnouncements.size();
            int totalPages = (int) Math.ceil((double) totalCount / size);
            
            // Calculate pagination indices
            int startIndex = page * size;
            int endIndex = Math.min(startIndex + size, totalCount);
            
            // Get the paginated sublist
            List<Announcement> paginatedAnnouncements = startIndex < totalCount 
                ? allAnnouncements.subList(startIndex, endIndex)
                : new ArrayList<>();
            
            response.put("success", true);
            response.put("data", paginatedAnnouncements);
            response.put("count", paginatedAnnouncements.size());
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("size", size);
            response.put("totalPages", totalPages);
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching announcements");
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * Get a specific announcement by ID
     * GET /api/announcements/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getAnnouncementById(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember(authHeader);
            
            Optional<Announcement> announcementOpt = announcementService.getAnnouncementById(id);
            
            if (announcementOpt.isEmpty()) {
                response.put("success", false);
                response.put("message", "Announcement not found");
                return ResponseEntity.status(404).body(response);
            }
            
            Announcement announcement = announcementOpt.get();
            
            // Verify the announcement belongs to the member's school
            if (!announcement.getSchoolId().equals(currentMember.getSchoolId())) {
                response.put("success", false);
                response.put("message", "Access denied");
                return ResponseEntity.status(403).body(response);
            }
            
            response.put("success", true);
            response.put("data", announcement);
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while fetching the announcement");
            return ResponseEntity.status(500).body(response);
        }
    }
}
