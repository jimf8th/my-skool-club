package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.*;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.*;
import com.myskoolclub.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContentReportService {

    private static final List<ContentReportStatus> ACTIVE_STATUSES =
            List.of(ContentReportStatus.OPEN, ContentReportStatus.UNDER_REVIEW);

    private final ContentReportRepository reportRepository;
    private final UserRepository userRepository;
    private final AnnouncementRepository announcementRepository;
    private final EventRepository eventRepository;
    private final EventRsvpRepository eventRsvpRepository;
    private final SchoolRepository schoolRepository;
    private final ClubRepository clubRepository;
    private final SchoolMembershipRepository schoolMembershipRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Transactional
    public ContentReportResponse create(ContentReportRequest request, String email) {
        User reporter = requireUser(email);
        if (reportRepository.countByReporterIdAndCreatedAtAfter(
                reporter.getId(), LocalDateTime.now().minusHours(1)) >= 10) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many reports. Please wait before submitting another.");
        }
        if (reportRepository.existsByReporterIdAndContentTypeAndContentIdAndStatusIn(
                reporter.getId(), request.contentType(), request.contentId(), ACTIVE_STATUSES)) {
            throw new AppException(HttpStatus.CONFLICT, "You already reported this content.");
        }

        Target target = resolveTarget(request.contentType(), request.contentId());
        requireTargetAccess(reporter, target);
        if (target.author() != null && target.author().getId().equals(reporter.getId())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "You cannot report your own content.");
        }

        ContentReport saved = reportRepository.save(ContentReport.builder()
                .reporter(reporter)
                .contentType(request.contentType())
                .contentId(request.contentId())
                .contentAuthor(target.author())
                .reason(request.reason())
                .details(clean(request.details()))
                .contentSnapshot(target.snapshot())
                .build());
        userRepository.findByAppRoleAndEnabledTrue(AppRole.APP_ADMIN).forEach(admin ->
                notificationService.notify(admin, NotificationType.CONTENT_REPORT_SUBMITTED,
                        saved.getId().toString(),
                        "A " + request.contentType().name().toLowerCase() +
                                " was reported for " + request.reason().name().toLowerCase().replace('_', ' ') +
                                ". Review it in the moderation queue."));
        emailService.sendModerationAlert(saved.getId(), request.contentType().name(), request.reason().name());
        return ContentReportResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ContentReportResponse> mine(String email) {
        User user = requireUser(email);
        return reportRepository.findByReporterIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(ContentReportResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ContentReportResponse> list(ContentReportStatus status) {
        List<ContentReport> reports = status == null
                ? reportRepository.findAllByOrderByCreatedAtDesc()
                : reportRepository.findByStatusOrderByCreatedAtDesc(status);
        return reports.stream().map(ContentReportResponse::from).toList();
    }

    @Transactional
    public ContentReportResponse decide(Long reportId, ModerationDecisionRequest request, String email) {
        User reviewer = requireUser(email);
        ContentReport report = requireReport(reportId);
        if (request.status() == ContentReportStatus.OPEN) {
            report.setReviewedBy(null);
            report.setReviewedAt(null);
        } else {
            report.setReviewedBy(reviewer);
            report.setReviewedAt(LocalDateTime.now());
        }
        report.setStatus(request.status());
        report.setResolution(clean(request.resolution()));
        return ContentReportResponse.from(report);
    }

    @Transactional
    public ContentReportResponse removeContent(Long reportId, String email) {
        User reviewer = requireUser(email);
        ContentReport report = requireReport(reportId);
        switch (report.getContentType()) {
            case ANNOUNCEMENT -> announcementRepository.deleteById(report.getContentId());
            case EVENT -> {
                eventRsvpRepository.deleteAll(eventRsvpRepository.findByEventIdOrderByRespondedAtAsc(report.getContentId()));
                eventRepository.deleteById(report.getContentId());
            }
            case SCHOOL -> schoolRepository.findById(report.getContentId()).ifPresent(school -> {
                school.setDescription(null);
                school.setEnabled(false);
            });
            case CLUB -> clubRepository.findById(report.getContentId()).ifPresent(club -> club.setDescription(null));
        }
        report.setStatus(ContentReportStatus.RESOLVED);
        report.setResolution("Reported content removed or disabled by an app administrator.");
        report.setReviewedBy(reviewer);
        report.setReviewedAt(LocalDateTime.now());
        return ContentReportResponse.from(report);
    }

    @Transactional
    public ContentReportResponse suspendAuthor(Long reportId, SuspendUserRequest request, String email) {
        User reviewer = requireUser(email);
        ContentReport report = requireReport(reportId);
        User author = report.getContentAuthor();
        if (author == null) {
            throw new AppException(HttpStatus.CONFLICT, "The content author is no longer available.");
        }
        if (author.getId().equals(reviewer.getId())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "You cannot suspend your own account.");
        }
        author.setEnabled(false);
        author.setSuspendedAt(LocalDateTime.now());
        author.setSuspendedBy(reviewer);
        author.setSuspensionReason(request.reason().trim());
        report.setStatus(ContentReportStatus.RESOLVED);
        report.setResolution("Content author suspended: " + request.reason().trim());
        report.setReviewedBy(reviewer);
        report.setReviewedAt(LocalDateTime.now());
        return ContentReportResponse.from(report);
    }

    @Transactional
    public void restoreUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
        user.setEnabled(true);
        user.setSuspendedAt(null);
        user.setSuspendedBy(null);
        user.setSuspensionReason(null);
    }

    private Target resolveTarget(ReportContentType type, Long id) {
        return switch (type) {
            case ANNOUNCEMENT -> {
                Announcement a = announcementRepository.findByIdWithDetails(id)
                        .orElseThrow(() -> notFound(type));
                yield new Target(a.getCreatedBy(), a.getSchool().getId(), true,
                        "Announcement: " + a.getTitle() + "\n" + a.getBody());
            }
            case EVENT -> {
                Event e = eventRepository.findByIdWithDetails(id).orElseThrow(() -> notFound(type));
                yield new Target(e.getCreatedBy(), e.getSchool().getId(), true,
                        "Event: " + e.getTitle() + "\nLocation: " + e.getLocation());
            }
            case SCHOOL -> {
                School s = schoolRepository.findById(id).orElseThrow(() -> notFound(type));
                yield new Target(s.getCreatedBy(), s.getId(), !s.isEnabled(),
                        "School: " + s.getName() + "\n" + nullSafe(s.getDescription()));
            }
            case CLUB -> {
                Club c = clubRepository.findById(id).orElseThrow(() -> notFound(type));
                yield new Target(c.getCreatedBy(), c.getSchool().getId(), true,
                        "Club: " + c.getName() + "\n" + nullSafe(c.getDescription()));
            }
        };
    }

    private ContentReport requireReport(Long id) {
        return reportRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Report not found"));
    }

    private void requireTargetAccess(User reporter, Target target) {
        if (reporter.getAppRole() == AppRole.APP_ADMIN) return;
        if (!target.membershipRequired()) return;
        boolean approved = schoolMembershipRepository
                .findByUserIdAndSchoolId(reporter.getId(), target.schoolId())
                .map(membership -> membership.getStatus() == MembershipStatus.APPROVED)
                .orElse(false);
        if (!approved) {
            // Return not found rather than revealing that inaccessible content exists.
            throw new AppException(HttpStatus.NOT_FOUND, "Content not found");
        }
    }

    private User requireUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private AppException notFound(ReportContentType type) {
        return new AppException(HttpStatus.NOT_FOUND, type.name().toLowerCase() + " not found");
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private record Target(User author, Long schoolId, boolean membershipRequired, String snapshot) {}
}
