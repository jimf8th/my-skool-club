package com.myskoolclub.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myskoolclub.backend.dto.AuthResponse;
import com.myskoolclub.backend.dto.RegisterRequest;
import com.myskoolclub.backend.dto.RegistrationResponse;
import com.myskoolclub.backend.dto.VerifyEmailRequest;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.EmailVerificationRepository;
import com.myskoolclub.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(AuthVerificationServiceTests.EmailCaptureConfiguration.class)
class AuthVerificationServiceTests {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailVerificationRepository verificationRepository;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CapturingEmailService emailService;

    @Test
    void registrationRequiresCodeAndVerificationSignsUserIn() throws Exception {
        RegistrationResponse registration = authService.register(registrationRequest("New.User@example.com"));

        assertThat(registration.email()).isEqualTo("new.user@example.com");
        assertThat(registration.verificationRequired()).isTrue();
        User registeredUser = userRepository.findByEmail("new.user@example.com").orElseThrow();
        assertThat(registeredUser.isEmailVerified()).isFalse();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginPayload(
                                "new.user@example.com", "ValidPassword1!"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Verify your email before signing in."));

        String code = emailService.codeFor("new.user@example.com");
        assertThat(code).matches("\\d{6}");

        AuthResponse auth = authService.verifyEmail(new VerifyEmailRequest("NEW.USER@example.com", code));

        assertThat(auth.token()).isNotBlank();
        assertThat(auth.emailVerified()).isTrue();
        assertThat(userRepository.findByEmail("new.user@example.com").orElseThrow().isEmailVerified()).isTrue();
        assertThat(verificationRepository.findFirstByUser_IdAndUsedFalseOrderByCreatedAtDesc(
                registeredUser.getId())).isEmpty();
    }

    @Test
    void invalidCodeIsLockedAfterFiveAttempts() {
        authService.register(registrationRequest("attempts@example.com"));
        String sentCode = emailService.codeFor("attempts@example.com");
        String wrongCode = sentCode.equals("999999") ? "888888" : "999999";

        for (int attempt = 1; attempt <= 4; attempt++) {
            assertThatThrownBy(() -> authService.verifyEmail(
                    new VerifyEmailRequest("attempts@example.com", wrongCode)))
                    .isInstanceOfSatisfying(AppException.class,
                            exception -> assertThat(exception.getMessage()).contains("Invalid"));
        }

        assertThatThrownBy(() -> authService.verifyEmail(
                new VerifyEmailRequest("attempts@example.com", wrongCode)))
                .isInstanceOfSatisfying(AppException.class,
                        exception -> assertThat(exception.getMessage()).contains("Too many"));

        User user = userRepository.findByEmail("attempts@example.com").orElseThrow();
        assertThat(verificationRepository
                .findFirstByUser_IdAndUsedFalseOrderByCreatedAtDesc(user.getId())).isEmpty();
    }

    @Test
    void resendIsThrottledForOneMinute() {
        authService.register(registrationRequest("resend@example.com"));

        assertThatThrownBy(() -> authService.resendVerification("resend@example.com"))
                .isInstanceOfSatisfying(AppException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(429);
                    assertThat(exception.getMessage()).contains("one minute");
                });
    }

    private RegisterRequest registrationRequest(String email) {
        return new RegisterRequest(email, "ValidPassword1!", "Test", "Member", null, true, true);
    }

    private record LoginPayload(String email, String password) {}

    @TestConfiguration
    static class EmailCaptureConfiguration {

        @Bean
        @Primary
        CapturingEmailService capturingEmailService() {
            return new CapturingEmailService();
        }
    }

    static class CapturingEmailService extends EmailService {

        private final Map<String, String> sentCodes = new HashMap<>();

        CapturingEmailService() {
            super(null);
        }

        @Override
        public void sendVerificationEmail(String toEmail, String code) {
            sentCodes.put(toEmail, code);
        }

        String codeFor(String email) {
            return sentCodes.get(email);
        }
    }
}
