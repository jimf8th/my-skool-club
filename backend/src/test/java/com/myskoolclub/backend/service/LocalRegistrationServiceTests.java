package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.RegisterRequest;
import com.myskoolclub.backend.dto.RegistrationResponse;
import com.myskoolclub.backend.repository.EmailVerificationRepository;
import com.myskoolclub.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "app.email-verification.enabled=false")
@ActiveProfiles("test")
@Transactional
class LocalRegistrationServiceTests {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailVerificationRepository verificationRepository;

    @Test
    void localRegistrationIsImmediatelyVerifiedAndCreatesNoEmailCode() {
        RegistrationResponse response = authService.register(new RegisterRequest(
                "local@example.com",
                "ValidPassword1!",
                "Local",
                "Developer",
                null,
                true,
                true
        ));

        assertThat(response.verificationRequired()).isFalse();
        assertThat(userRepository.findByEmail("local@example.com").orElseThrow().isEmailVerified()).isTrue();
        assertThat(userRepository.findByEmail("local@example.com").orElseThrow().isAgeConfirmed()).isTrue();
        assertThat(verificationRepository.count()).isZero();
    }
}
