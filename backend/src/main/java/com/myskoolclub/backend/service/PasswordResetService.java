package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.ResetPasswordRequest;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.PasswordResetCode;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.PasswordResetCodeRepository;
import com.myskoolclub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PasswordResetService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final PasswordResetCodeRepository codeRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Transactional
    public void request(String rawEmail) {
        User user = userRepository.findByEmailIgnoreCase(normalize(rawEmail)).orElse(null);
        // Do not disclose whether an account exists or is suspended.
        if (user == null || !user.isEnabled()) return;

        codeRepository.findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId())
                .filter(code -> code.getCreatedAt() != null
                        && code.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(1)))
                .ifPresent(code -> {
                    throw new AppException(HttpStatus.TOO_MANY_REQUESTS,
                            "Please wait one minute before requesting another code.");
                });

        codeRepository.invalidateAllForUser(user.getId());
        String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        codeRepository.save(PasswordResetCode.builder()
                .user(user)
                .token(passwordEncoder.encode(code))
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build());
        emailService.sendPasswordResetEmail(user.getEmail(), code);
    }

    @Transactional(noRollbackFor = AppException.class)
    public void reset(ResetPasswordRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalize(request.email()))
                .orElseThrow(this::invalidCode);
        PasswordResetCode code = codeRepository
                .findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId())
                .orElseThrow(this::invalidCode);

        if (code.getExpiresAt().isBefore(LocalDateTime.now())) {
            code.setUsed(true);
            throw new AppException(HttpStatus.BAD_REQUEST, "Reset code expired. Request a new code.");
        }
        if (!passwordEncoder.matches(request.code(), code.getToken())) {
            code.setAttemptCount(code.getAttemptCount() + 1);
            if (code.getAttemptCount() >= MAX_ATTEMPTS) code.setUsed(true);
            throw invalidCode();
        }
        code.setUsed(true);
        user.setPassword(passwordEncoder.encode(request.newPassword()));
    }

    private AppException invalidCode() {
        return new AppException(HttpStatus.BAD_REQUEST, "Invalid email or reset code.");
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
