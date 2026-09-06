package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.SchoolRequestResponse;
import com.myskoolclub.backend.dto.SubmitSchoolRequest;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.*;
import com.myskoolclub.backend.repository.SchoolMembershipRepository;
import com.myskoolclub.backend.repository.SchoolOnboardingRequestRepository;
import com.myskoolclub.backend.repository.SchoolRepository;
import com.myskoolclub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SchoolOnboardingRequestService {

    private static final int MAX_REQUESTS_PER_EMAIL_PER_DAY = 3;

    private final SchoolOnboardingRequestRepository requestRepository;
    private final SchoolRepository schoolRepository;
    private final SchoolMembershipRepository schoolMembershipRepository;
    private final UserRepository userRepository;
    private final ContentSafetyService contentSafetyService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final FriendInvitationService friendInvitationService;

    @Transactional
    public SchoolRequestResponse submit(SubmitSchoolRequest request) {
        String adminEmail = normalizeEmail(request.adminEmail());
        String schoolName = request.schoolName().trim();
        contentSafetyService.requireAllowed(
                request.firstName(), request.lastName(), schoolName, request.description(),
                request.address(), request.city(), request.state());

        if (schoolRepository.existsByNameIgnoreCase(schoolName)) {
            throw new AppException(HttpStatus.CONFLICT,
                    "This school is already active. Sign in to request membership or contact support.");
        }
        if (requestRepository.existsByAdminEmailIgnoreCaseAndStatus(
                adminEmail, SchoolRequestStatus.PENDING)) {
            throw new AppException(HttpStatus.CONFLICT,
                    "A school request for this administrator email is already awaiting review.");
        }
        if (requestRepository.countByAdminEmailIgnoreCaseAndCreatedAtAfter(
                adminEmail, LocalDateTime.now().minusHours(24)) >= MAX_REQUESTS_PER_EMAIL_PER_DAY) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many school requests were submitted for this email. Try again tomorrow.");
        }

        SchoolOnboardingRequest saved = requestRepository.saveAndFlush(
                SchoolOnboardingRequest.builder()
                        .firstName(request.firstName().trim())
                        .lastName(request.lastName().trim())
                        .contactPhone(request.contactPhone().trim())
                        .adminEmail(adminEmail)
                        .schoolName(schoolName)
                        .description(request.description().trim())
                        .address(request.address().trim())
                        .city(request.city().trim())
                        .state(request.state().trim())
                        .postalCode(request.postalCode().trim())
                        .website(request.website().trim())
                        .schoolPhone(request.schoolPhone().trim())
                        .build());

        userRepository.findByAppRoleAndEnabledTrue(AppRole.APP_ADMIN).forEach(admin ->
                notificationService.notify(admin, NotificationType.SCHOOL_REQUEST_SUBMITTED,
                        saved.getId().toString(),
                        saved.getSchoolName() + " submitted a school activation request."));
        emailService.sendSchoolRequestSubmitted(saved);
        return SchoolRequestResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<SchoolRequestResponse> list(SchoolRequestStatus status) {
        List<SchoolOnboardingRequest> requests = status == null
                ? requestRepository.findAllByOrderByCreatedAtDesc()
                : requestRepository.findByStatusOrderByCreatedAtDesc(status);
        return requests.stream().map(SchoolRequestResponse::from).toList();
    }

    @Transactional
    public SchoolRequestResponse approve(Long requestId, String reviewerEmail) {
        User reviewer = requireAppAdmin(reviewerEmail);
        SchoolOnboardingRequest request = requirePending(requestId);
        if (schoolRepository.existsByNameIgnoreCase(request.getSchoolName())) {
            throw new AppException(HttpStatus.CONFLICT,
                    "A school with this name already exists. Reject or resolve the duplicate request.");
        }

        User requestedAdmin = userRepository.findByEmailIgnoreCase(request.getAdminEmail()).orElse(null);
        if (requestedAdmin != null && schoolMembershipRepository.existsByUserIdAndStatus(
                requestedAdmin.getId(), MembershipStatus.APPROVED)) {
            throw new AppException(HttpStatus.CONFLICT,
                    "The requested administrator already belongs to another school.");
        }

        School school = schoolRepository.saveAndFlush(School.builder()
                .name(request.getSchoolName())
                .description(request.getDescription())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .postalCode(request.getPostalCode())
                .website(request.getWebsite())
                .phone(request.getSchoolPhone())
                .createdBy(reviewer)
                .build());

        if (requestedAdmin != null) {
            schoolMembershipRepository.save(SchoolMembership.builder()
                    .user(requestedAdmin)
                    .school(school)
                    .role(MembershipRole.ADMIN)
                    .status(MembershipStatus.APPROVED)
                    .reviewedBy(reviewer)
                    .reviewedAt(LocalDateTime.now())
                    .build());
            notificationService.notify(requestedAdmin, NotificationType.SCHOOL_ADMIN_ASSIGNED,
                    school.getId().toString(),
                    "Your request for " + school.getName() + " was approved. You are its school administrator.");
            emailService.sendSchoolRequestApproved(request, school);
        } else {
            friendInvitationService.inviteSchoolAdmin(
                    request.getFirstName(), request.getLastName(), request.getAdminEmail(), reviewer, school);
        }

        request.setStatus(SchoolRequestStatus.APPROVED);
        request.setReviewedBy(reviewer);
        request.setReviewedAt(LocalDateTime.now());
        request.setCreatedSchool(school);
        return SchoolRequestResponse.from(request);
    }

    @Transactional
    public SchoolRequestResponse reject(Long requestId, String reason, String reviewerEmail) {
        User reviewer = requireAppAdmin(reviewerEmail);
        SchoolOnboardingRequest request = requirePending(requestId);
        contentSafetyService.requireAllowed(reason);
        request.setStatus(SchoolRequestStatus.REJECTED);
        request.setRejectionReason(reason.trim());
        request.setReviewedBy(reviewer);
        request.setReviewedAt(LocalDateTime.now());
        emailService.sendSchoolRequestRejected(request);
        return SchoolRequestResponse.from(request);
    }

    private SchoolOnboardingRequest requirePending(Long id) {
        SchoolOnboardingRequest request = requestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "School request not found"));
        if (request.getStatus() != SchoolRequestStatus.PENDING) {
            throw new AppException(HttpStatus.CONFLICT, "This school request has already been reviewed.");
        }
        return request;
    }

    private User requireAppAdmin(String email) {
        User reviewer = userRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Account not found"));
        if (reviewer.getAppRole() != AppRole.APP_ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Only an application administrator can review school requests.");
        }
        return reviewer;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
