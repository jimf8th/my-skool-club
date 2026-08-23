package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.ClubRequest;
import com.myskoolclub.backend.dto.ClubResponse;
import com.myskoolclub.backend.dto.MembershipResponse;
import com.myskoolclub.backend.dto.UpdateClubRequest;
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
public class ClubService {

    private final ClubRepository clubRepository;
    private final ClubMembershipRepository clubMembershipRepository;
    private final UserRepository userRepository;
    private final SchoolService schoolService;
    private final NotificationService notificationService;
    private final ContentSafetyService contentSafetyService;

    // ---- Club management (SCHOOL_ADMIN only) ----

    @Transactional
    public ClubResponse createClub(Long schoolId, ClubRequest request, String schoolAdminEmail) {
        contentSafetyService.requireAllowed(request.name(), request.description());
        User admin = requireUser(schoolAdminEmail);
        // Access already verified by @PreAuthorize(ADD_CLUB); service validates business rules

        if (clubRepository.existsByNameAndSchoolId(request.name(), schoolId)) {
            throw new AppException(HttpStatus.CONFLICT, "A club with that name already exists in this school");
        }

        // First club admin must be an approved school member
        User firstAdmin = requireUserById(request.firstAdminUserId());
        schoolService.requireApprovedMember(schoolId, firstAdmin.getId());

        School school = schoolService.getSchoolEntity(schoolId);

        Club club = Club.builder()
                .name(request.name())
                .description(request.description())
                .school(school)
                .createdBy(admin)
                .build();
        Club saved = clubRepository.save(club);

        // Assign first club admin directly (approved, no request needed)
        ClubMembership adminMembership = ClubMembership.builder()
                .user(firstAdmin)
                .club(saved)
                .role(MembershipRole.ADMIN)
                .status(MembershipStatus.APPROVED)
                .build();
        adminMembership.setReviewedAt(LocalDateTime.now());
        adminMembership.setReviewedBy(admin);
        clubMembershipRepository.save(adminMembership);

        notificationService.notify(firstAdmin, NotificationType.CLUB_ADMIN_ASSIGNED,
                saved.getId().toString(),
                "You have been assigned as admin of the club: " + saved.getName());

        return ClubResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ClubResponse> listClubs(Long schoolId, String requesterEmail) {
        User requester = requireUser(requesterEmail);
        schoolService.requireApprovedMember(schoolId, requester.getId());
        return clubRepository.findBySchoolIdOrderByNameAsc(schoolId).stream()
                .map(ClubResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClubResponse getClub(Long clubId, String requesterEmail) {
        Club club = requireClub(clubId);
        User requester = requireUser(requesterEmail);
        schoolService.requireApprovedMember(club.getSchool().getId(), requester.getId());
        List<ClubMembership> admins = clubMembershipRepository
                .findByClubIdAndRoleAndStatus(clubId, MembershipRole.ADMIN, MembershipStatus.APPROVED);
        return ClubResponse.from(club, admins);
    }

    // ---- Club membership requests ----

    @Transactional
    public MembershipResponse requestMembership(Long clubId, String requesterEmail) {
        User requester = requireUser(requesterEmail);
        Club club = requireClub(clubId);

        // Must be an approved school member
        schoolService.requireApprovedMember(club.getSchool().getId(), requester.getId());

        ClubMembership existing = clubMembershipRepository
                .findByUserIdAndClubId(requester.getId(), clubId)
                .orElse(null);

        if (existing != null) {
            if (existing.getStatus() == MembershipStatus.PENDING) {
                throw new AppException(HttpStatus.CONFLICT, "You already have a pending membership request for this club");
            }
            if (existing.getStatus() == MembershipStatus.APPROVED) {
                throw new AppException(HttpStatus.CONFLICT, "You are already a member of this club");
            }
            // Re-request after rejection or revocation
            existing.setStatus(MembershipStatus.PENDING);
            existing.setReviewedAt(null);
            existing.setReviewedBy(null);
            ClubMembership saved = clubMembershipRepository.save(existing);
            notifyClubAdmins(club, requester);
            return MembershipResponse.from(saved);
        }

        ClubMembership membership = ClubMembership.builder()
                .user(requester)
                .club(club)
                .build();
        ClubMembership saved = clubMembershipRepository.save(membership);
        notifyClubAdmins(club, requester);
        return MembershipResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Optional<MembershipResponse> getMyMembership(Long clubId, String email) {
        User user = requireUser(email);
        return clubMembershipRepository
                .findByUserIdAndClubId(user.getId(), clubId)
                .map(MembershipResponse::from);
    }

    @Transactional(readOnly = true)
    public List<MembershipResponse> listMembershipRequests(Long clubId) {
        return clubMembershipRepository
                .findByClubIdAndStatusOrderByRequestedAtAsc(clubId, MembershipStatus.PENDING)
                .stream().map(MembershipResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MembershipResponse> listMembers(Long clubId) {
        return clubMembershipRepository
                .findByClubIdAndStatusOrderByRequestedAtAsc(clubId, MembershipStatus.APPROVED)
                .stream().map(MembershipResponse::from).toList();
    }

    @Transactional
    public MembershipResponse approveMembership(Long clubId, Long targetUserId, String adminEmail) {
        User admin = requireUser(adminEmail);
        Club club = requireClub(clubId);

        ClubMembership membership = clubMembershipRepository
                .findByUserIdAndClubId(targetUserId, clubId)
                .filter(m -> m.getStatus() == MembershipStatus.PENDING)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "No pending membership request found"));

        membership.setStatus(MembershipStatus.APPROVED);
        membership.setReviewedAt(LocalDateTime.now());
        membership.setReviewedBy(admin);
        ClubMembership saved = clubMembershipRepository.save(membership);

        notificationService.notify(membership.getUser(), NotificationType.CLUB_MEMBERSHIP_APPROVED,
                clubId.toString(),
                "Your membership request for the club \"" + club.getName() + "\" has been approved");
        return MembershipResponse.from(saved);
    }

    @Transactional
    public MembershipResponse rejectMembership(Long clubId, Long targetUserId, String adminEmail) {
        User admin = requireUser(adminEmail);
        Club club = requireClub(clubId);

        ClubMembership membership = clubMembershipRepository
                .findByUserIdAndClubId(targetUserId, clubId)
                .filter(m -> m.getStatus() == MembershipStatus.PENDING)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "No pending membership request found"));

        membership.setStatus(MembershipStatus.REJECTED);
        membership.setReviewedAt(LocalDateTime.now());
        membership.setReviewedBy(admin);
        ClubMembership saved = clubMembershipRepository.save(membership);

        notificationService.notify(membership.getUser(), NotificationType.CLUB_MEMBERSHIP_REJECTED,
                clubId.toString(),
                "Your membership request for the club \"" + club.getName() + "\" was not approved");
        return MembershipResponse.from(saved);
    }

    @Transactional
    public void revokeMembership(Long clubId, Long targetUserId, String adminEmail) {
        User admin = requireUser(adminEmail);
        Club club = requireClub(clubId);

        ClubMembership membership = clubMembershipRepository
                .findByUserIdAndClubId(targetUserId, clubId)
                .filter(m -> m.getStatus() == MembershipStatus.APPROVED)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "No active membership found for this user"));

        membership.setStatus(MembershipStatus.REVOKED);
        membership.setReviewedAt(LocalDateTime.now());
        membership.setReviewedBy(admin);
        clubMembershipRepository.save(membership);

        notificationService.notify(membership.getUser(), NotificationType.CLUB_MEMBERSHIP_REVOKED,
                clubId.toString(),
                "Your membership in the club \"" + club.getName() + "\" has been removed");
    }

    // ---- Club Admin management (CLUB_ADMIN or SCHOOL_ADMIN) ----

    @Transactional
    public void assignClubAdmin(Long clubId, Long targetUserId, String requesterEmail) {
        User requester = requireUser(requesterEmail);
        Club club = requireClub(clubId);
        User target = requireUserById(targetUserId);

        // Target must be an approved school member
        schoolService.requireApprovedMember(club.getSchool().getId(), targetUserId);

        ClubMembership membership = clubMembershipRepository
                .findByUserIdAndClubId(targetUserId, clubId)
                .orElseGet(() -> ClubMembership.builder()
                        .user(target)
                        .club(club)
                        .build());

        membership.setRole(MembershipRole.ADMIN);
        membership.setStatus(MembershipStatus.APPROVED);
        membership.setReviewedAt(LocalDateTime.now());
        membership.setReviewedBy(requester);
        clubMembershipRepository.save(membership);

        notificationService.notify(target, NotificationType.CLUB_ADMIN_ASSIGNED,
                clubId.toString(),
                "You have been assigned as club admin for: " + club.getName());
    }

    @Transactional
    public void revokeClubAdminRole(Long clubId, Long targetUserId, String requesterEmail) {
        User requester = requireUser(requesterEmail);
        Club club = requireClub(clubId);

        ClubMembership membership = clubMembershipRepository
                .findByUserIdAndClubIdAndRoleAndStatus(targetUserId, clubId,
                        MembershipRole.ADMIN, MembershipStatus.APPROVED)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User is not a club admin"));

        long adminCount = clubMembershipRepository
                .findByClubIdAndRoleAndStatus(clubId, MembershipRole.ADMIN, MembershipStatus.APPROVED)
                .size();
        if (adminCount <= 1) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Cannot remove the last admin. Assign another admin first.");
        }

        membership.setRole(MembershipRole.MEMBER);
        membership.setReviewedAt(LocalDateTime.now());
        membership.setReviewedBy(requester);
        clubMembershipRepository.save(membership);

        notificationService.notify(membership.getUser(), NotificationType.CLUB_MEMBERSHIP_REVOKED,
                clubId.toString(),
                "Your club admin role at \"" + club.getName() + "\" has been removed");
    }

    @Transactional(readOnly = true)
    public List<MembershipResponse> getClubAdmins(Long clubId) {
        return clubMembershipRepository
                .findByClubIdAndRoleAndStatus(clubId, MembershipRole.ADMIN, MembershipStatus.APPROVED)
                .stream().map(MembershipResponse::from).toList();
    }

    // ---- Club management ----

    @Transactional
    public ClubResponse updateClub(Long schoolId, Long clubId, UpdateClubRequest request, String requesterEmail) {
        contentSafetyService.requireAllowed(request.name(), request.description());
        Club club = requireClub(clubId);
        if (!club.getSchool().getId().equals(schoolId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Club not found in this school");
        }
        if (!club.getName().equalsIgnoreCase(request.name()) &&
                clubRepository.existsByNameAndSchoolId(request.name(), schoolId)) {
            throw new AppException(HttpStatus.CONFLICT, "A club with that name already exists in this school");
        }
        club.setName(request.name());
        club.setDescription(request.description() != null ? request.description().trim() : null);
        return ClubResponse.from(clubRepository.save(club));
    }

    @Transactional
    public void deleteClub(Long schoolId, Long clubId, String requesterEmail) {
        Club club = requireClub(clubId);
        if (!club.getSchool().getId().equals(schoolId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Club not found in this school");
        }
        clubMembershipRepository.deleteByClubId(clubId);
        clubRepository.delete(club);
    }

    // ---- Helpers ----

    private ClubMembership requireClubAdmin(Long clubId, Long userId) {
        return clubMembershipRepository
                .findByUserIdAndClubIdAndRoleAndStatus(userId, clubId, MembershipRole.ADMIN, MembershipStatus.APPROVED)
                .orElseThrow(() -> new AppException(HttpStatus.FORBIDDEN, "Club admin privileges required"));
    }

    private void notifyClubAdmins(Club club, User requester) {
        clubMembershipRepository
                .findByClubIdAndStatusOrderByRequestedAtAsc(club.getId(), MembershipStatus.APPROVED)
                .stream()
                .filter(m -> m.getRole() == MembershipRole.ADMIN)
                .forEach(admin -> notificationService.notify(
                        admin.getUser(),
                        NotificationType.CLUB_MEMBERSHIP_REQUESTED,
                        club.getId().toString(),
                        requester.getFirstName() + " " + requester.getLastName() +
                        " has requested to join the club: " + club.getName()));
    }

    private Club requireClub(Long clubId) {
        return clubRepository.findById(clubId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Club not found"));
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private User requireUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
