package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.AuthResponse;
import com.myskoolclub.backend.dto.LoginRequest;
import com.myskoolclub.backend.dto.RegisterRequest;
import com.myskoolclub.backend.dto.RegistrationResponse;
import com.myskoolclub.backend.dto.ResendVerificationRequest;
import com.myskoolclub.backend.dto.VerifyEmailRequest;
import com.myskoolclub.backend.dto.ForgotPasswordRequest;
import com.myskoolclub.backend.dto.ResetPasswordRequest;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.UserRepository;
import com.myskoolclub.backend.service.AuthService;
import com.myskoolclub.backend.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final AuthService authService;
    private final UserRepository userRepository;
    private final PasswordResetService passwordResetService;

    @PostMapping("/register")
    public ResponseEntity<RegistrationResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!user.isEmailVerified()) {
            throw new AppException(
                    HttpStatus.FORBIDDEN,
                    "Verify your email before signing in."
            );
        }
        return ResponseEntity.ok(authService.createAuthResponse(user));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerification(request.email());
        return ResponseEntity.ok(Map.of(
                "message", "If an unverified account exists, a new verification code has been sent."
        ));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.request(request.email());
        return ResponseEntity.ok(Map.of(
                "message", "If an eligible account exists, a password reset code has been sent."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.reset(request);
        return ResponseEntity.ok(Map.of("message", "Password updated. You can now sign in."));
    }
}
