package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.SessionResponse;
import com.myskoolclub.backend.dto.SessionSyncRequest;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.UserRepository;
import com.myskoolclub.backend.security.FirebaseTokenVerifier;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FirebaseSessionService {

    private static final String CURRENT_TERMS_VERSION = "2026-08-08";

    private final FirebaseTokenVerifier firebaseTokenVerifier;
    private final UserRepository userRepository;

    /**
     * Establishes the local account for a Firebase identity. Links by UID,
     * then by verified email, and otherwise creates a new account — which
     * requires the age and terms consent flags (HTTP 428 until provided).
     * A local account may be created before the email is verified so the
     * registration consent is recorded, but the response flags the state.
     */
    @Transactional
    public SessionResponse sync(String idToken, SessionSyncRequest request) {
        FirebaseTokenVerifier.FirebaseIdentity identity = firebaseTokenVerifier.verify(idToken);

        User user = userRepository.findByFirebaseUid(identity.uid())
                .or(() -> linkByEmail(identity))
                .orElseGet(() -> create(identity, request));

        if (!user.isEnabled()) {
            throw new AppException(HttpStatus.FORBIDDEN, "This account is suspended.");
        }
        if (identity.emailVerified() && !user.isEmailVerified()) {
            user.setEmailVerified(true);
        }

        return new SessionResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getAppRole().name(),
                user.isEmailVerified() && identity.emailVerified()
        );
    }

    private Optional<User> linkByEmail(FirebaseTokenVerifier.FirebaseIdentity identity) {
        // Only a Firebase-verified email may claim an existing account.
        if (!identity.emailVerified()) {
            return Optional.empty();
        }
        return userRepository.findByEmailIgnoreCase(identity.email())
                .map(user -> {
                    if (user.getFirebaseUid() != null && !user.getFirebaseUid().equals(identity.uid())) {
                        throw new AppException(HttpStatus.CONFLICT,
                                "This email is already linked to a different sign-in.");
                    }
                    user.setFirebaseUid(identity.uid());
                    return user;
                });
    }

    private User create(FirebaseTokenVerifier.FirebaseIdentity identity, SessionSyncRequest request) {
        if (request == null
                || !Boolean.TRUE.equals(request.ageConfirmed())
                || !Boolean.TRUE.equals(request.acceptedTerms())) {
            // The client shows the consent screen and retries with both flags.
            throw new AppException(HttpStatus.PRECONDITION_REQUIRED,
                    "Confirm you are at least 13 and accept the Terms, Privacy Policy, and Community Standards.");
        }
        if (userRepository.existsByEmailIgnoreCase(identity.email())) {
            throw new AppException(HttpStatus.CONFLICT, "Email already in use");
        }

        String[] tokenName = splitDisplayName(identity.displayName());
        User user = User.builder()
                .email(identity.email())
                .firebaseUid(identity.uid())
                .firstName(firstNonBlank(request.firstName(), tokenName[0], "Member"))
                .lastName(firstNonBlank(request.lastName(), tokenName[1], "Account"))
                .graduationYear(request.graduationYear())
                .emailVerified(identity.emailVerified())
                .ageConfirmed(true)
                .termsAcceptedAt(LocalDateTime.now())
                .termsVersion(CURRENT_TERMS_VERSION)
                .build();
        return userRepository.save(user);
    }

    private String[] splitDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            return new String[]{null, null};
        }
        String[] parts = displayName.trim().split("\\s+", 2);
        return new String[]{parts[0], parts.length > 1 ? parts[1] : null};
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}
