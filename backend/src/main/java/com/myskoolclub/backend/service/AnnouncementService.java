package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.AnnouncementRequest;
import com.myskoolclub.backend.dto.AnnouncementResponse;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.AppRole;
import com.myskoolclub.backend.model.Announcement;
import com.myskoolclub.backend.model.MembershipRole;
import com.myskoolclub.backend.model.MembershipStatus;
import com.myskoolclub.backend.model.School;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.AnnouncementRepository;
import com.myskoolclub.backend.repository.SchoolMembershipRepository;
import com.myskoolclub.backend.repository.SchoolRepository;
import com.myskoolclub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final SchoolRepository schoolRepository;
    private final SchoolMembershipRepository schoolMembershipRepository;
    private final UserRepository userRepository;
    private final ContentSafetyService contentSafetyService;

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> listAnnouncements(Long schoolId) {
        return announcementRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId).stream()
                .map(AnnouncementResponse::from)
                .toList();
    }

    @Transactional
    public AnnouncementResponse createAnnouncement(Long schoolId, AnnouncementRequest request, String requesterEmail) {
        contentSafetyService.requireAllowed(request.title(), request.body());
        School school = requireSchool(schoolId);
        User creator = requireUser(requesterEmail);

        Announcement announcement = Announcement.builder()
                .school(school)
                .createdBy(creator)
                .title(request.title())
                .body(request.body())
                .build();

        Announcement saved = announcementRepository.save(announcement);
        return AnnouncementResponse.from(saved);
    }

    @Transactional
    public void deleteAnnouncement(Long schoolId, Long announcementId, String requesterEmail) {
        Announcement announcement = requireAnnouncementInSchool(schoolId, announcementId);
        User requester = requireUser(requesterEmail);

        boolean isOwner = announcement.getCreatedBy().getId().equals(requester.getId());
        if (!isOwner && !isSchoolAdmin(announcement.getSchool(), requester)) {
            throw new AppException(HttpStatus.FORBIDDEN, "You do not have permission to delete this announcement");
        }
        announcementRepository.delete(announcement);
    }

    // ---- Helpers ----

    /** APP_ADMIN or SCHOOL_ADMIN of this school. */
    private boolean isSchoolAdmin(School school, User user) {
        if (user.getAppRole() == AppRole.APP_ADMIN) return true;
        var membership = schoolMembershipRepository
                .findByUserIdAndSchoolId(user.getId(), school.getId())
                .orElse(null);
        return membership != null
                && membership.getStatus() == MembershipStatus.APPROVED
                && membership.getRole() == MembershipRole.ADMIN;
    }

    private Announcement requireAnnouncementInSchool(Long schoolId, Long announcementId) {
        Announcement announcement = announcementRepository.findByIdWithDetails(announcementId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Announcement not found"));
        if (!announcement.getSchool().getId().equals(schoolId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Announcement not found");
        }
        return announcement;
    }

    private School requireSchool(Long schoolId) {
        return schoolRepository.findById(schoolId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "School not found"));
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
