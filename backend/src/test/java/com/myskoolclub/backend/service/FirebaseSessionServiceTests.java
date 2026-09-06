package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.SessionResponse;
import com.myskoolclub.backend.dto.SessionSyncRequest;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.UserRepository;
import com.myskoolclub.backend.security.FirebaseTokenVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FirebaseSessionServiceTests {

    @Autowired private FirebaseSessionService sessionService;
    @Autowired private UserRepository userRepository;

    @MockBean private FirebaseTokenVerifier firebaseTokenVerifier;

    private static final SessionSyncRequest CONSENT =
            new SessionSyncRequest(true, true, null, null, null);

    @Test
    void createsANewAccountOnlyWithAgeAndTermsConsent() {
        stubIdentity("uid-new", "new.member@example.com", true, "New Member");

        assertThatThrownBy(() -> sessionService.sync("token", null))
                .isInstanceOfSatisfying(AppException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.PRECONDITION_REQUIRED));

        SessionResponse response = sessionService.sync("token", CONSENT);
        assertThat(response.email()).isEqualTo("new.member@example.com");
        assertThat(response.appRole()).isEqualTo("APP_USER");
        assertThat(response.emailVerified()).isTrue();

        User created = userRepository.findByFirebaseUid("uid-new").orElseThrow();
        assertThat(created.getFirstName()).isEqualTo("New");
        assertThat(created.getLastName()).isEqualTo("Member");
        assertThat(created.isAgeConfirmed()).isTrue();
        assertThat(created.getTermsAcceptedAt()).isNotNull();
        assertThat(created.getPassword()).isNull();
    }

    @Test
    void linksAnExistingAccountByVerifiedEmailAndKeepsItsRole() {
        userRepository.saveAndFlush(User.builder()
                .email("legacy@example.com")
                .password("$2a$10$legacy-bcrypt-hash")
                .firstName("Legacy").lastName("Member")
                .emailVerified(true).ageConfirmed(true)
                .build());
        stubIdentity("uid-legacy", "legacy@example.com", true, null);

        SessionResponse response = sessionService.sync("token", null);

        assertThat(response.email()).isEqualTo("legacy@example.com");
        assertThat(userRepository.findByFirebaseUid("uid-legacy")).isPresent();
    }

    @Test
    void refusesToLinkByUnverifiedEmail() {
        userRepository.saveAndFlush(User.builder()
                .email("takeover@example.com")
                .firstName("Existing").lastName("Member")
                .emailVerified(true).ageConfirmed(true)
                .build());
        stubIdentity("uid-attacker", "takeover@example.com", false, null);

        // Without a verified email the identity cannot claim the account, and
        // creating a duplicate for the same email is refused.
        assertThatThrownBy(() -> sessionService.sync("token", CONSENT))
                .isInstanceOfSatisfying(AppException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        assertThat(userRepository.findByFirebaseUid("uid-attacker")).isEmpty();
    }

    @Test
    void rejectsSuspendedAccounts() {
        userRepository.saveAndFlush(User.builder()
                .email("suspended@example.com")
                .firebaseUid("uid-suspended")
                .firstName("Suspended").lastName("Member")
                .emailVerified(true).ageConfirmed(true)
                .enabled(false)
                .build());
        stubIdentity("uid-suspended", "suspended@example.com", true, null);

        assertThatThrownBy(() -> sessionService.sync("token", null))
                .isInstanceOfSatisfying(AppException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    private void stubIdentity(String uid, String email, boolean emailVerified, String displayName) {
        when(firebaseTokenVerifier.verify(anyString())).thenReturn(
                new FirebaseTokenVerifier.FirebaseIdentity(uid, email, emailVerified, displayName));
    }
}
