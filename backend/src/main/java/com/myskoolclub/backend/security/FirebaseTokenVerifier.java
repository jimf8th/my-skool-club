package com.myskoolclub.backend.security;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.myskoolclub.backend.exception.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Verifies Firebase Authentication ID tokens and exposes the identity claims
 * the application needs. Initialization is lazy so test contexts and local
 * environments without Google credentials can still start.
 */
@Component
public class FirebaseTokenVerifier {

    public record FirebaseIdentity(
            String uid,
            String email,
            boolean emailVerified,
            String displayName
    ) {}

    private final String projectId;
    private volatile FirebaseApp app;

    public FirebaseTokenVerifier(@Value("${app.firebase.project-id}") String projectId) {
        this.projectId = projectId;
    }

    public FirebaseIdentity verify(String idToken) {
        FirebaseToken token;
        try {
            token = FirebaseAuth.getInstance(firebaseApp()).verifyIdToken(idToken);
        } catch (FirebaseAuthException e) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Your session could not be verified.");
        }
        String email = token.getEmail();
        if (token.getUid() == null || email == null || email.isBlank()) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Your session could not be verified.");
        }
        return new FirebaseIdentity(
                token.getUid(),
                email.trim().toLowerCase(java.util.Locale.ROOT),
                token.isEmailVerified(),
                token.getName()
        );
    }

    /** Best-effort removal of the Firebase account during account deletion. */
    public void deleteUser(String firebaseUid) {
        try {
            FirebaseAuth.getInstance(firebaseApp()).deleteUser(firebaseUid);
        } catch (FirebaseAuthException e) {
            // The local account is already gone; an orphaned Firebase account
            // cannot access any data and can be removed manually.
        }
    }

    private FirebaseApp firebaseApp() {
        FirebaseApp existing = app;
        if (existing != null) {
            return existing;
        }
        synchronized (this) {
            if (app == null) {
                GoogleCredentials credentials;
                try {
                    credentials = GoogleCredentials.getApplicationDefault();
                } catch (IOException e) {
                    // Token verification only needs Google's public keys.
                    credentials = GoogleCredentials.newBuilder().build();
                }
                app = FirebaseApp.getApps().isEmpty()
                        ? FirebaseApp.initializeApp(FirebaseOptions.builder()
                                .setProjectId(projectId)
                                .setCredentials(credentials)
                                .build())
                        : FirebaseApp.getInstance();
            }
            return app;
        }
    }
}
