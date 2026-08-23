package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.AuthResponse;
import com.myskoolclub.backend.dto.RegisterRequest;
import com.myskoolclub.backend.dto.RegistrationResponse;
import com.myskoolclub.backend.dto.VerifyEmailRequest;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.EmailVerification;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.EmailVerificationRepository;
import com.myskoolclub.backend.repository.UserRepository;
import com.myskoolclub.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String CURRENT_TERMS_VERSION = "2026-08-08";

    private static final Duration CODE_LIFETIME = Duration.ofMinutes(15);
    private static final Duration RESEND_COOLDOWN = Duration.ofMinutes(1);
    private static final int MAX_CODE_ATTEMPTS = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final EmailService emailService;

    @Value("${app.email-verification.enabled:true}")
    private boolean emailVerificationEnabled;

    @Transactional
    public RegistrationResponse register(RegisterRequest request) {
        if (!Boolean.TRUE.equals(request.ageConfirmed()) || !Boolean.TRUE.equals(request.acceptedTerms())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "You must be at least 13 and accept the Terms, Privacy Policy, and Community Standards.");
        }
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new AppException(HttpStatus.CONFLICT, "Email already in use");
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .graduationYear(request.graduationYear())
                .emailVerified(!emailVerificationEnabled)
                .ageConfirmed(Boolean.TRUE.equals(request.ageConfirmed()))
                .termsAcceptedAt(LocalDateTime.now())
                .termsVersion(CURRENT_TERMS_VERSION)
                .build();

        userRepository.save(user);
        if (emailVerificationEnabled) {
            issueAndSendVerificationCode(user);
        }

        return new RegistrationResponse(
                emailVerificationEnabled
                        ? "Account created. Enter the verification code sent to your email."
                        : "Account created.",
                user.getEmail(),
                emailVerificationEnabled
        );
    }

    @Transactional(noRollbackFor = AppException.class)
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        requireEmailVerificationEnabled();
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(this::invalidCode);

        if (user.isEmailVerified()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Email is already verified. Please sign in.");
        }

        EmailVerification verification = emailVerificationRepository
                .findFirstByUser_IdAndUsedFalseOrderByCreatedAtDesc(user.getId())
                .orElseThrow(this::invalidCode);

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            verification.setUsed(true);
            throw new AppException(HttpStatus.BAD_REQUEST, "Verification code expired. Request a new code.");
        }

        if (!passwordEncoder.matches(request.code(), verification.getToken())) {
            int attempts = verification.getAttemptCount() + 1;
            verification.setAttemptCount(attempts);
            if (attempts >= MAX_CODE_ATTEMPTS) {
                verification.setUsed(true);
                throw new AppException(HttpStatus.BAD_REQUEST, "Too many incorrect attempts. Request a new code.");
            }
            throw invalidCode();
        }

        verification.setUsed(true);
        user.setEmailVerified(true);

        return createAuthResponse(user);
    }

    @Transactional
    public void resendVerification(String email) {
        if (!emailVerificationEnabled) {
            return;
        }
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(email)).orElse(null);

        // Do not reveal whether an account exists or is already verified.
        if (user == null || user.isEmailVerified()) {
            return;
        }

        emailVerificationRepository.findFirstByUser_IdAndUsedFalseOrderByCreatedAtDesc(user.getId())
                .ifPresent(latest -> {
                    if (latest.getCreatedAt().isAfter(LocalDateTime.now().minus(RESEND_COOLDOWN))) {
                        throw new AppException(HttpStatus.TOO_MANY_REQUESTS,
                                "Please wait one minute before requesting another code.");
                    }
                });

        emailVerificationRepository.invalidateAllForUser(user.getId());
        issueAndSendVerificationCode(user);
    }

    public AuthResponse createAuthResponse(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        return new AuthResponse(
                jwtUtil.generateToken(userDetails),
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getAppRole().name(),
                user.isEmailVerified()
        );
    }

    private void issueAndSendVerificationCode(User user) {
        String code = String.format(Locale.ROOT, "%06d", SECURE_RANDOM.nextInt(1_000_000));

        EmailVerification verification = EmailVerification.builder()
                .user(user)
                // Store only a one-way hash so database access cannot expose valid codes.
                .token(passwordEncoder.encode(code))
                .expiresAt(LocalDateTime.now().plus(CODE_LIFETIME))
                .build();

        emailVerificationRepository.save(verification);
        emailService.sendVerificationEmail(user.getEmail(), code);
    }

    private AppException invalidCode() {
        return new AppException(HttpStatus.BAD_REQUEST, "Invalid email or verification code.");
    }

    private void requireEmailVerificationEnabled() {
        if (!emailVerificationEnabled) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Email verification is disabled in this environment.");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
