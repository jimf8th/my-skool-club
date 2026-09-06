package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.AcceptFriendInvitationRequest;
import com.myskoolclub.backend.dto.CreateFriendInvitationRequest;
import com.myskoolclub.backend.dto.FriendInvitationDetailsResponse;
import com.myskoolclub.backend.dto.SessionResponse;
import com.myskoolclub.backend.dto.SessionSyncRequest;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.FriendInvitation;
import com.myskoolclub.backend.model.MembershipRole;
import com.myskoolclub.backend.model.MembershipStatus;
import com.myskoolclub.backend.model.School;
import com.myskoolclub.backend.model.SchoolMembership;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.FriendInvitationRepository;
import com.myskoolclub.backend.repository.SchoolMembershipRepository;
import com.myskoolclub.backend.repository.UserRepository;
import com.myskoolclub.backend.security.FirebaseTokenVerifier;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class FriendInvitationService {

    private static final int MAX_INVITATIONS_PER_DAY = 20;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final FriendInvitationRepository invitationRepository;
    private final SchoolMembershipRepository schoolMembershipRepository;
    private final UserRepository userRepository;
    private final FirebaseTokenVerifier firebaseTokenVerifier;
    private final FirebaseSessionService firebaseSessionService;
    private final EmailService emailService;

    @Transactional
    public void invite(CreateFriendInvitationRequest request, String inviterEmail) {
        User inviter = userRepository.findByEmailIgnoreCase(normalizeEmail(inviterEmail))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Account not found"));
        String email = normalizeEmail(request.email());

        // Keep the response generic so this endpoint cannot be used to discover
        // whether an email address already belongs to a member.
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        long sentToday = invitationRepository.countByInvitedBy_IdAndCreatedAtAfter(
                inviter.getId(), now.minusHours(24));
        if (sentToday >= MAX_INVITATIONS_PER_DAY) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS,
                    "You have reached the daily invitation limit. Try again tomorrow.");
        }

        invitationRepository
                .findFirstByInvitedBy_IdAndEmailIgnoreCaseOrderByCreatedAtDesc(inviter.getId(), email)
                .filter(latest -> latest.getCreatedAt() != null
                        && latest.getCreatedAt().isAfter(now.minusMinutes(1)))
                .ifPresent(latest -> {
                    throw new AppException(HttpStatus.TOO_MANY_REQUESTS,
                            "Please wait one minute before inviting this email again.");
                });

        revokeOpenInvitations(email, now);

        String rawToken = generateToken();
        FriendInvitation invitation = FriendInvitation.builder()
                .invitedBy(inviter)
                .email(email)
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .tokenHash(hashToken(rawToken))
                .expiresAt(now.plusHours(48))
                .build();
        invitationRepository.save(invitation);

        emailService.sendFriendInvitationEmail(
                email,
                invitation.getFirstName(),
                inviter.getFirstName() + " " + inviter.getLastName(),
                rawToken
        );
    }

    @Transactional
    public void inviteSchoolAdmin(
            String firstName, String lastName, String adminEmail, User reviewer, School school) {
        String email = normalizeEmail(adminEmail);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new AppException(HttpStatus.CONFLICT,
                    "The requested administrator already has an account.");
        }

        LocalDateTime now = LocalDateTime.now();
        revokeOpenInvitations(email, now);
        String rawToken = generateToken();
        invitationRepository.save(FriendInvitation.builder()
                .invitedBy(reviewer)
                .school(school)
                .email(email)
                .firstName(firstName.trim())
                .lastName(lastName.trim())
                .tokenHash(hashToken(rawToken))
                .expiresAt(now.plusHours(48))
                .build());
        emailService.sendSchoolAdminInvitationEmail(email, firstName.trim(), school.getName(), rawToken);
    }

    @Transactional
    public FriendInvitationDetailsResponse details(String rawToken) {
        FriendInvitation invitation = requireUsableInvitation(rawToken);
        return new FriendInvitationDetailsResponse(
                invitation.getFirstName(),
                invitation.getLastName(),
                maskEmail(invitation.getEmail())
        );
    }

    @Transactional
    public void sendVerificationCode(String rawToken) {
        // Firebase Authentication now proves email ownership; the invitation
        // no longer issues its own codes.
        requireUsableInvitation(rawToken);
    }

    /**
     * Claims an invitation for the signed-in Firebase identity. The Firebase
     * account email must match the invited email and be verified.
     */
    @Transactional(noRollbackFor = AppException.class)
    public SessionResponse accept(String idToken, AcceptFriendInvitationRequest request) {
        FirebaseTokenVerifier.FirebaseIdentity identity = firebaseTokenVerifier.verify(idToken);
        FriendInvitation invitation = requireUsableInvitation(request.token(), true);
        LocalDateTime now = LocalDateTime.now();

        if (!identity.email().equalsIgnoreCase(invitation.getEmail())) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Sign in with the invited email address to accept this invitation.");
        }
        if (!identity.emailVerified()) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Verify your email before accepting this invitation.");
        }

        SessionResponse session = firebaseSessionService.sync(idToken, new SessionSyncRequest(
                request.ageConfirmed(),
                request.acceptedTerms(),
                invitation.getFirstName(),
                invitation.getLastName(),
                null
        ));
        User user = userRepository.findByFirebaseUid(identity.uid())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Account not found"));

        if (invitation.getSchool() != null
                && schoolMembershipRepository
                        .findByUserIdAndSchoolId(user.getId(), invitation.getSchool().getId())
                        .isEmpty()) {
            schoolMembershipRepository.save(SchoolMembership.builder()
                    .user(user)
                    .school(invitation.getSchool())
                    .role(MembershipRole.ADMIN)
                    .status(MembershipStatus.APPROVED)
                    .reviewedBy(invitation.getInvitedBy())
                    .reviewedAt(now)
                    .build());
        }

        invitation.setAcceptedAt(now);
        revokeOpenInvitations(invitation.getEmail(), now);
        return session;
    }

    private FriendInvitation requireUsableInvitation(String rawToken) {
        return requireUsableInvitation(rawToken, false);
    }

    private FriendInvitation requireUsableInvitation(String rawToken, boolean lockForUpdate) {
        if (rawToken == null || rawToken.isBlank() || rawToken.length() > 128) {
            throw invalidInvitation();
        }
        String tokenHash = hashToken(rawToken);
        FriendInvitation invitation = (lockForUpdate
                ? invitationRepository.findByTokenHashForUpdate(tokenHash)
                : invitationRepository.findByTokenHash(tokenHash))
                .orElseThrow(this::invalidInvitation);
        if (invitation.getAcceptedAt() != null || invitation.getRevokedAt() != null) {
            throw invalidInvitation();
        }
        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            invitation.setRevokedAt(LocalDateTime.now());
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "This invitation has expired. Ask your friend to send a new one.");
        }
        return invitation;
    }

    private void revokeOpenInvitations(String email, LocalDateTime revokedAt) {
        invitationRepository
                .findAllByEmailIgnoreCaseAndAcceptedAtIsNullAndRevokedAtIsNull(email)
                .forEach(open -> open.setRevokedAt(revokedAt));
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String maskEmail(String email) {
        int separator = email.indexOf('@');
        if (separator <= 1) return "***" + email.substring(Math.max(separator, 0));
        return email.charAt(0) + "***" + email.substring(separator);
    }

    private AppException invalidInvitation() {
        return new AppException(HttpStatus.BAD_REQUEST,
                "This invitation is invalid or has already been used.");
    }
}
