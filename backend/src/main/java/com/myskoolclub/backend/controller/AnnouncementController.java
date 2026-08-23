package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.AnnouncementRequest;
import com.myskoolclub.backend.dto.AnnouncementResponse;
import com.myskoolclub.backend.service.AnnouncementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    /** List announcements for a school, newest first. Requires VIEW_ANNOUNCEMENTS (any approved school member or above). */
    @GetMapping("/api/schools/{schoolId}/announcements")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'VIEW_ANNOUNCEMENTS')")
    public ResponseEntity<List<AnnouncementResponse>> listAnnouncements(@PathVariable Long schoolId) {
        return ResponseEntity.ok(announcementService.listAnnouncements(schoolId));
    }

    /** Create an announcement. Requires CREATE_ANNOUNCEMENT (school/app admin only). */
    @PostMapping("/api/schools/{schoolId}/announcements")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'CREATE_ANNOUNCEMENT')")
    public ResponseEntity<AnnouncementResponse> createAnnouncement(
            @PathVariable Long schoolId, @Valid @RequestBody AnnouncementRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(announcementService.createAnnouncement(schoolId, request, auth.getName()));
    }

    /** Delete an announcement. Only the creator or a school/app admin (service-enforced). */
    @DeleteMapping("/api/schools/{schoolId}/announcements/{announcementId}")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'CREATE_ANNOUNCEMENT')")
    public ResponseEntity<Void> deleteAnnouncement(
            @PathVariable Long schoolId, @PathVariable Long announcementId, Authentication auth) {
        announcementService.deleteAnnouncement(schoolId, announcementId, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
