package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.AcceptFriendInvitationRequest;
import com.myskoolclub.backend.dto.AuthResponse;
import com.myskoolclub.backend.dto.CreateFriendInvitationRequest;
import com.myskoolclub.backend.dto.FriendInvitationDetailsResponse;
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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private CapturingInvitationEmailService emailService;

    @Test
    void inviteStoresOnlyHashedTokenAndRequiresSeparateEmailCode() {
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

        assertThatThrownBy(() -> invitationService.accept(acceptRequest(rawToken, "123456")))
                .isInstanceOfSatisfying(AppException.class,
                        exception -> assertThat(exception.getMessage()).contains("Request a verification code"));

        invitationService.sendVerificationCode(rawToken);
        String code = emailService.codeFor("friend@example.com");
        assertThat(code).matches("\\d{6}");

        assertThatThrownBy(() -> invitationService.accept(acceptRequest(rawToken, wrongCode(code))))
                .isInstanceOfSatisfying(AppException.class,
                        exception -> assertThat(exception.getMessage()).contains("Invalid invitation"));
    }

    @Test
    void validTokenAndSeparatelyDeliveredCodeCreateVerifiedAccountOnlyOnce() {
        User inviter = createUser("sender@example.com", "Sam", "Sender");
        invitationService.invite(
                new CreateFriendInvitationRequest("New", "Friend", "new.friend@example.com"),
                inviter.getEmail());
        String token = emailService.tokenFor("new.friend@example.com");
        invitationService.sendVerificationCode(token);

        AuthResponse response = invitationService.accept(
                acceptRequest(token, emailService.codeFor("new.friend@example.com")));

        assertThat(response.token()).isNotBlank();
        assertThat(response.email()).isEqualTo("new.friend@example.com");
        assertThat(response.emailVerified()).isTrue();
        User created = userRepository.findByEmail("new.friend@example.com").orElseThrow();
        assertThat(created.isAgeConfirmed()).isTrue();
        assertThat(created.getTermsAcceptedAt()).isNotNull();
        assertThat(passwordEncoder.matches("StrongPassword1!", created.getPassword())).isTrue();

        assertThatThrownBy(() -> invitationService.accept(
                acceptRequest(token, emailService.codeFor("new.friend@example.com"))))
                .isInstanceOfSatisfying(AppException.class,
                        exception -> assertThat(exception.getMessage()).contains("already been used"));
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
        invitationService.sendVerificationCode(token);
        AuthResponse response = invitationService.accept(
                acceptRequest(token, emailService.codeFor("new.admin@example.com")));

        User created = userRepository.findByEmail(response.email()).orElseThrow();
        var membership = schoolMembershipRepository
                .findByUserIdAndSchoolId(created.getId(), school.getId()).orElseThrow();
        assertThat(membership.getRole()).isEqualTo(MembershipRole.ADMIN);
        assertThat(membership.getStatus()).isEqualTo(MembershipStatus.APPROVED);
    }

    private User createUser(String email, String firstName, String lastName) {
        return userRepository.saveAndFlush(User.builder()
                .email(email)
                .password(passwordEncoder.encode("OriginalPassword1!"))
                .firstName(firstName)
                .lastName(lastName)
                .emailVerified(true)
                .ageConfirmed(true)
                .build());
    }

    private AcceptFriendInvitationRequest acceptRequest(String token, String code) {
        return new AcceptFriendInvitationRequest(
                token, code, "StrongPassword1!", true, true);
    }

    private String wrongCode(String code) {
        return code.equals("999999") ? "888888" : "999999";
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
        private final Map<String, String> codes = new HashMap<>();

        CapturingInvitationEmailService() {
            super(null);
        }

        @Override
        public void sendFriendInvitationEmail(
                String toEmail, String firstName, String inviterName, String token) {
            tokens.put(toEmail, token);
        }

        @Override
        public void sendFriendInvitationVerificationCode(String toEmail, String firstName, String code) {
            codes.put(toEmail, code);
        }

        @Override
        public void sendSchoolAdminInvitationEmail(
                String toEmail, String firstName, String schoolName, String token) {
            tokens.put(toEmail, token);
        }

        String tokenFor(String email) { return tokens.get(email); }
        String codeFor(String email) { return codes.get(email); }
    }
}
