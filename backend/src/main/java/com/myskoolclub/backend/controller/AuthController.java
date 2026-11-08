package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.SessionResponse;
import com.myskoolclub.backend.dto.SessionSyncRequest;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.service.FirebaseSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final FirebaseSessionService firebaseSessionService;

    /**
     * Creates or refreshes the local account for the Firebase identity in the
     * Authorization header and returns the application profile.
     */
    @PostMapping("/session")
    public ResponseEntity<SessionResponse> session(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) SessionSyncRequest request) {
        return ResponseEntity.ok(firebaseSessionService.sync(bearerToken(authorization), request));
    }

    static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Sign in to continue.");
        }
        return authorization.substring(7);
    }
}
