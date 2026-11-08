package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.SchoolRequest;
import com.myskoolclub.backend.dto.SchoolResponse;
import com.myskoolclub.backend.dto.MembershipResponse;
import com.myskoolclub.backend.dto.UpdateSchoolRequest;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.*;
import com.myskoolclub.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SchoolService {

    private final SchoolRepository schoolRepository;
    private final SchoolMembershipRepository schoolMembershipRepository;
    private final ClubMembershipRepository clubMembershipRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ContentSafetyService contentSafetyService;

    // ---- School CRUD ----

    @Transactional
    public SchoolResponse createSchool(SchoolRequest request, String adminEmail) {
        contentSafetyService.requireAllowed(request.name(), request.description());
        if (schoolRepository.existsByName(request.name())) {
            throw new AppException(HttpStatus.CONFLICT, "A school with that name already exists");
        }
        User appAdmin = requireUser(adminEmail);
        // Validate the chosen school admin exists before creating the school
        requireUserById(request.adminUserId());

        School school = School.builder()
                .name(request.name())
                .description(request.description())
                .createdBy(appAdmin)
                .build();
        School saved = schoolRepository.save(school);

        // Atomically assign the designated school admin
        assignSchoolAdmin(saved.getId(), request.adminUserId(), adminEmail);

        return SchoolResponse.from(saved);
    }

    public List<SchoolResponse> listSchools(boolean includeDisabled) {
        List<School> schools = includeDisabled
                ? schoolRepository.findAllByOrderByNameAsc()
                : schoolRepository.findAllByEnabledTrueOrderByNameAsc();
        return schools.stream().map(SchoolResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public SchoolResponse getSchool(Long schoolId) {
        School school = requireSchool(schoolId);
        List<SchoolMembership> admins = schoolMembershipRepository
                .findBySchoolIdAndRoleAndStatusOrderByRequestedAtAsc(schoolId, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        return SchoolResponse.from(school, admins);
    }

    @Transactional
    public SchoolResponse updateSchool(Long schoolId, UpdateSchoolRequest request, String requesterEmail) {
        contentSafetyService.requireAllowed(request.name(), request.description(), request.address(), request.city(), request.state());
        User requester = requireUser(requesterEmail);
        School school = requireSchool(schoolId);

        String newName = request.name().trim();
        if (!school.getName().equalsIgnoreCase(newName) && schoolRepository.existsByName(newName)) {
            throw new AppException(HttpStatus.CONFLICT, "A school with that name already exists");
        }

        school.setName(newName);
        school.setDescription(request.description() != null ? request.description().trim() : null);
        school.setAddress(clean(request.address()));
        school.setCity(clean(request.city()));
        school.setState(clean(request.state()));
        school.setPostalCode(clean(request.postalCode()));
        school.setWebsite(clean(request.website()));
        school.setPhone(clean(request.phone()));
        School saved = schoolRepository.save(school);

        List<SchoolMembership> admins = schoolMembershipRepository
                .findBySchoolIdAndRoleAndStatusOrderByRequestedAtAsc(schoolId, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        return SchoolResponse.from(saved, admins);
    }

    @Transactional
    public void setSchoolEnabled(Long schoolId, boolean enabled, String adminEmail) {
        requireUser(adminEmail);
        School school = requireSchool(schoolId);
        school.setEnabled(enabled);
        schoolRepository.save(school);
    }

    @Transactional
    public SchoolResponse setSchoolTier(Long schoolId, SchoolTier tier, String adminEmail) {
        User appAdmin = requireUser(adminEmail);
        if (appAdmin.getAppRole() != AppRole.APP_ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Only an application administrator can change a school tier");
        }
        School school = requireSchool(schoolId);
        school.setTier(tier);
        return SchoolResponse.from(schoolRepository.save(school));
    }

    // ---- School Admin management (APP_ADMIN or SCHOOL_ADMIN of that school) ----

    @Transactional
    public void assignSchoolAdmin(Long schoolId, Long targetUserId, String requesterEmail) {
        User requester = requireUser(requesterEmail);
        School school = requireSchool(schoolId);
        User target = requireUserById(targetUserId);

        SchoolMembership membership = schoolMembershipRepository
                .findByUserIdAndSchoolId(targetUserId, schoolId)
                .orElseGet(() -> SchoolMembership.builder()
                        .user(target)
                        .school(school)
                        .build());

        membership.setRole(MembershipRole.ADMIN);
        membership.setStatus(MembershipStatus.APPROVED);
        membership.setReviewedAt(LocalDateTime.now());
        membership.setReviewedBy(requester);
        schoolMembershipRepository.save(membership);

        notificationService.notify(target, NotificationType.SCHOOL_ADMIN_ASSIGNED,
                schoolId.toString(),
                "You have been assigned as school admin for " + school.getName());
    }

    // ---- Membership requests ----

    @Transactional
    public MembershipResponse requestMembership(Long schoolId, String requesterEmail) {
        User requester = requireVerifiedUser(requesterEmail);
        School school = requireSchool(schoolId);

        if (schoolMembershipRepository.existsByUserIdAndStatus(requester.getId(), MembershipStatus.APPROVED)) {
            throw new AppException(HttpStatus.CONFLICT, "You are already a member of a school");
        }

        SchoolMembership existing = schoolMembershipRepository
                .findByUserIdAndSchoolId(requester.getId(), schoolId)
                .orElse(null);

        if (existing != null) {
            if (existing.getStatus() == MembershipStatus.PENDING) {
                throw new AppException(HttpStatus.CONFLICT, "You already have a pending membership request for this school");
            }
            // Allow re-request after rejection or revocation
            existing.setStatus(MembershipStatus.PENDING);
            existing.setRequestedAt(LocalDateTime.now());
            existing.setReviewedAt(null);
            existing.setReviewedBy(null);
            SchoolMembership saved = schoolMembershipRepository.save(existing);
            notifySchoolAdmins(school, requester);
            return MembershipResponse.from(saved);
        }

        SchoolMembership membership = SchoolMembership.builder()
                .user(requester)
                .school(school)
                .build();
        SchoolMembership saved = schoolMembershipRepository.save(membership);
        notifySchoolAdmins(school, requester);
        return MembershipResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<MembershipResponse> listMembershipRequests(Long schoolId) {
        return schoolMembershipRepository
                .findBySchoolIdAndStatusOrderByRequestedAtAsc(schoolId, MembershipStatus.PENDING)
                .stream().map(MembershipResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MembershipResponse> listMembers(Long schoolId) {
        return schoolMembershipRepository
                .findBySchoolIdAndRoleAndStatusOrderByRequestedAtAsc(schoolId, MembershipRole.MEMBER, MembershipStatus.APPROVED)
                .stream().map(MembershipResponse::from).toList();
    }

    @Transactional
    public MembershipResponse approveMembership(Long schoolId, Long targetUserId, String adminEmail) {
        User admin = requireUser(adminEmail);
        School school = requireSchool(schoolId);

        SchoolMembership membership = schoolMembershipRepository
                .findByUserIdAndSchoolId(targetUserId, schoolId)
                .filter(m -> m.getStatus() == MembershipStatus.PENDING)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "No pending membership request found"));

        membership.setStatus(MembershipStatus.APPROVED);
        membership.setReviewedAt(LocalDateTime.now());
        membership.setReviewedBy(admin);
        SchoolMembership saved = schoolMembershipRepository.save(membership);

        notificationService.notify(membership.getUser(), NotificationType.SCHOOL_MEMBERSHIP_APPROVED,
                schoolId.toString(),
                "Your membership request for " + school.getName() + " has been approved");
        return MembershipResponse.from(saved);
    }

    @Transactional
    public MembershipResponse rejectMembership(Long schoolId, Long targetUserId, String adminEmail) {
        User admin = requireUser(adminEmail);
        School school = requireSchool(schoolId);

        SchoolMembership membership = schoolMembershipRepository
                .findByUserIdAndSchoolId(targetUserId, schoolId)
                .filter(m -> m.getStatus() == MembershipStatus.PENDING)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "No pending membership request found"));

        membership.setStatus(MembershipStatus.REJECTED);
        membership.setReviewedAt(LocalDateTime.now());
        membership.setReviewedBy(admin);
        SchoolMembership saved = schoolMembershipRepository.save(membership);

        notificationService.notify(membership.getUser(), NotificationType.SCHOOL_MEMBERSHIP_REJECTED,
                schoolId.toString(),
                "Your membership request for " + school.getName() + " was not approved");
        return MembershipResponse.from(saved);
    }

    @Transactional
    public void revokeMembership(Long schoolId, Long targetUserId, String adminEmail) {
        User admin = requireUser(adminEmail);
        School school = requireSchool(schoolId);

        SchoolMembership membership = schoolMembershipRepository
                .findByUserIdAndSchoolId(targetUserId, schoolId)
                .filter(m -> m.getStatus() == MembershipStatus.APPROVED)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "No active membership found for this user"));

        // Cascade 1: revoke all club memberships in this school
        clubMembershipRepository.revokeAllApprovedForUserInSchool(
                targetUserId, schoolId, admin, MembershipStatus.APPROVED, MembershipStatus.REVOKED);

        // Cascade 2: if this user was school admin, demote all their club admin roles first
        if (membership.getRole() == MembershipRole.ADMIN) {
            clubMembershipRepository.demoteAllClubAdminsForUserInSchool(
                    targetUserId, schoolId, MembershipRole.ADMIN, MembershipRole.MEMBER, MembershipStatus.APPROVED);
        }

        membership.setStatus(MembershipStatus.REVOKED);
        membership.setReviewedAt(LocalDateTime.now());
        membership.setReviewedBy(admin);
        schoolMembershipRepository.save(membership);

        notificationService.notify(membership.getUser(), NotificationType.SCHOOL_MEMBERSHIP_REVOKED,
                schoolId.toString(),
                "Your membership at " + school.getName() + " has been removed");
    }

    @Transactional
    public void revokeSchoolAdminRole(Long schoolId, Long targetUserId, String requesterEmail) {
        User requester = requireUser(requesterEmail);
        School school = requireSchool(schoolId);
        requireUserById(targetUserId);

        SchoolMembership membership = schoolMembershipRepository
                .findByUserIdAndSchoolIdAndRoleAndStatus(targetUserId, schoolId, MembershipRole.ADMIN, MembershipStatus.APPROVED)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User is not a school admin for this school"));

        // At-least-1-admin guard
        long adminCount = schoolMembershipRepository
                .findBySchoolIdAndRoleAndStatusOrderByRequestedAtAsc(schoolId, MembershipRole.ADMIN, MembershipStatus.APPROVED)
                .size();
        if (adminCount <= 1) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Cannot remove the last admin. Assign another admin first.");
        }

        // Cascade: demote all club admin roles for this user in this school
        clubMembershipRepository.demoteAllClubAdminsForUserInSchool(
                targetUserId, schoolId, MembershipRole.ADMIN, MembershipRole.MEMBER, MembershipStatus.APPROVED);

        // Demote to regular member
        membership.setRole(MembershipRole.MEMBER);
        membership.setReviewedAt(LocalDateTime.now());
        membership.setReviewedBy(requester);
        schoolMembershipRepository.save(membership);

        notificationService.notify(membership.getUser(), NotificationType.SCHOOL_MEMBERSHIP_REVOKED,
                schoolId.toString(),
                "Your school admin role at " + school.getName() + " has been removed");
    }

    // ---- Helpers ----

    @Transactional(readOnly = true)
    public Optional<MembershipResponse> getMyMembership(Long schoolId, String email) {
        User user = requireUser(email);
        return schoolMembershipRepository.findByUserIdAndSchoolId(user.getId(), schoolId)
                .map(MembershipResponse::from);
    }

    public SchoolMembership requireSchoolAdmin(Long schoolId, Long userId) {
        return schoolMembershipRepository
                .findByUserIdAndSchoolIdAndRoleAndStatus(userId, schoolId, MembershipRole.ADMIN, MembershipStatus.APPROVED)
                .orElseThrow(() -> new AppException(HttpStatus.FORBIDDEN, "School admin privileges required"));
    }

    public SchoolMembership requireApprovedMember(Long schoolId, Long userId) {
        return schoolMembershipRepository
                .findByUserIdAndSchoolId(userId, schoolId)
                .filter(m -> m.getStatus() == MembershipStatus.APPROVED)
                .orElseThrow(() -> new AppException(HttpStatus.FORBIDDEN, "You must be an approved member of this school"));
    }

    public School getSchoolEntity(Long schoolId) {
        return requireSchool(schoolId);
    }

    private void notifySchoolAdmins(School school, User requester) {
        schoolMembershipRepository
                .findBySchoolIdAndRoleAndStatusOrderByRequestedAtAsc(school.getId(), MembershipRole.ADMIN, MembershipStatus.APPROVED)
                .forEach(admin -> notificationService.notify(
                        admin.getUser(),
                        NotificationType.SCHOOL_MEMBERSHIP_REQUESTED,
                        school.getId().toString(),
                        requester.getFirstName() + " " + requester.getLastName() +
                        " has requested to join " + school.getName()));
    }

    private School requireSchool(Long schoolId) {
        return schoolRepository.findById(schoolId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "School not found"));
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private User requireUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private User requireVerifiedUser(String email) {
        User user = requireUser(email);
        if (!user.isEmailVerified()) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Verify your email before joining a school");
        }
        return user;
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
