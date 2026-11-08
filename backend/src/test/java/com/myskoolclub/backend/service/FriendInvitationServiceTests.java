package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.AcceptFriendInvitationRequest;
import com.myskoolclub.backend.dto.CreateFriendInvitationRequest;
import com.myskoolclub.backend.dto.FriendInvitationDetailsResponse;
import com.myskoolclub.backend.dto.SessionResponse;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.FriendInvitation;
import com.myskoolclub.backend.model.AppRole;
import com.myskoolclub.backend.model.MembershipRole;
import com.myskoolclub.backend.model.MembershipStatus;
import com.myskoolclub.backend.model.School;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.FriendInvitationRepository;
import com.myskoolclub.backend.repository.SchoolMembershipRepository;
import com.myskoolclub.backend.repository.SchoolRepository;
import com.myskoolclub.backend.repository.UserRepository;
import com.myskoolclub.backend.security.FirebaseTokenVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Import(FriendInvitationServiceTests.EmailCaptureConfiguration.class)
class FriendInvitationServiceTests {

    @Autowired private FriendInvitationService invitationService;
    @Autowired private FriendInvitationRepository invitationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private SchoolMembershipRepository schoolMembershipRepository;
    @Autowired private CapturingInvitationEmailService emailService;

    @MockBean private FirebaseTokenVerifier firebaseTokenVerifier;

    @Test
    void inviteStoresOnlyHashedTokenAndMasksTheInvitedEmail() {
        User inviter = createUser("inviter@example.com", "Ivy", "Inviter");

        invitationService.invite(
                new CreateFriendInvitationRequest("Maya", "Member", "Friend@Example.com"),
                inviter.getEmail());

        String rawToken = emailService.tokenFor("friend@example.com");
        FriendInvitation stored = invitationRepository.findAll().getFirst();
        assertThat(rawToken).isNotBlank();
        assertThat(stored.getTokenHash()).hasSize(64).isNotEqualTo(rawToken);
        assertThat(stored.getEmail()).isEqualTo("friend@example.com");

        FriendInvitationDetailsResponse details = invitationService.details(rawToken);
        assertThat(details.firstName()).isEqualTo("Maya");
        assertThat(details.maskedEmail()).isEqualTo("f***@example.com");
    }

    @Test
    void verifiedFirebaseIdentityWithConsentAcceptsInvitationOnlyOnce() {
        User inviter = createUser("sender@example.com", "Sam", "Sender");
        invitationService.invite(
                new CreateFriendInvitationRequest("New", "Friend", "new.friend@example.com"),
                inviter.getEmail());
        String token = emailService.tokenFor("new.friend@example.com");
        stubIdentity("uid-friend", "new.friend@example.com", true);

        SessionResponse response = invitationService.accept("firebase-token",
                new AcceptFriendInvitationRequest(token, true, true));

        assertThat(response.email()).isEqualTo("new.friend@example.com");
        assertThat(response.emailVerified()).isTrue();
        User created = userRepository.findByEmail("new.friend@example.com").orElseThrow();
        assertThat(created.getFirebaseUid()).isEqualTo("uid-friend");
        assertThat(created.isAgeConfirmed()).isTrue();
        assertThat(created.getTermsAcceptedAt()).isNotNull();
        assertThat(created.getPassword()).isNull();

        assertThatThrownBy(() -> invitationService.accept("firebase-token",
                new AcceptFriendInvitationRequest(token, true, true)))
                .isInstanceOfSatisfying(AppException.class,
                        exception -> assertThat(exception.getMessage())
                                .contains("invalid or has already been used"));
    }

    @Test
    void rejectsAcceptanceFromADifferentOrUnverifiedEmail() {
        User inviter = createUser("sender3@example.com", "Sana", "Sender");
        invitationService.invite(
                new CreateFriendInvitationRequest("Only", "Invited", "invited@example.com"),
                inviter.getEmail());
        String token = emailService.tokenFor("invited@example.com");

        stubIdentity("uid-other", "other@example.com", true);
        assertThatThrownBy(() -> invitationService.accept("firebase-token",
                new AcceptFriendInvitationRequest(token, true, true)))
                .isInstanceOfSatisfying(AppException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        stubIdentity("uid-invited", "invited@example.com", false);
        assertThatThrownBy(() -> invitationService.accept("firebase-token",
                new AcceptFriendInvitationRequest(token, true, true)))
                .isInstanceOfSatisfying(AppException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void existingMemberEmailIsNotDisclosedAndDoesNotReceiveInvitation() {
        User inviter = createUser("sender2@example.com", "Sally", "Sender");
        createUser("existing@example.com", "Existing", "Member");

        invitationService.invite(
                new CreateFriendInvitationRequest("Existing", "Member", "existing@example.com"),
                inviter.getEmail());

        assertThat(emailService.tokenFor("existing@example.com")).isNull();
        assertThat(invitationRepository.findAll()).isEmpty();
    }

    @Test
    void acceptedSchoolAdministratorInvitationCreatesApprovedAdminMembership() {
        User reviewer = createUser("app-admin@example.com", "Avery", "Admin");
        reviewer.setAppRole(AppRole.APP_ADMIN);
        School school = schoolRepository.saveAndFlush(School.builder()
                .name("Invitation School").createdBy(reviewer).build());

        invitationService.inviteSchoolAdmin(
                "New", "Administrator", "new.admin@example.com", reviewer, school);
        String token = emailService.tokenFor("new.admin@example.com");
        stubIdentity("uid-admin", "new.admin@example.com", true);

        SessionResponse response = invitationService.accept("firebase-token",
                new AcceptFriendInvitationRequest(token, true, true));

        User created = userRepository.findByEmail(response.email()).orElseThrow();
        var membership = schoolMembershipRepository
                .findByUserIdAndSchoolId(created.getId(), school.getId()).orElseThrow();
        assertThat(membership.getRole()).isEqualTo(MembershipRole.ADMIN);
        assertThat(membership.getStatus()).isEqualTo(MembershipStatus.APPROVED);
    }

    private void stubIdentity(String uid, String email, boolean emailVerified) {
        when(firebaseTokenVerifier.verify(anyString())).thenReturn(
                new FirebaseTokenVerifier.FirebaseIdentity(uid, email, emailVerified, null));
    }

    private User createUser(String email, String firstName, String lastName) {
        return userRepository.saveAndFlush(User.builder()
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .emailVerified(true)
                .ageConfirmed(true)
                .build());
    }

    @TestConfiguration
    static class EmailCaptureConfiguration {
        @Bean
        @Primary
        CapturingInvitationEmailService capturingInvitationEmailService() {
            return new CapturingInvitationEmailService();
        }
    }

    static class CapturingInvitationEmailService extends EmailService {
        private final Map<String, String> tokens = new HashMap<>();

        CapturingInvitationEmailService() {
            super(null);
        }

        @Override
        public void sendFriendInvitationEmail(
                String toEmail, String firstName, String inviterName, String token) {
            tokens.put(toEmail, token);
        }

        @Override
        public void sendSchoolAdminInvitationEmail(
                String toEmail, String firstName, String schoolName, String token) {
            tokens.put(toEmail, token);
        }

        String tokenFor(String email) { return tokens.get(email); }
    }
}
