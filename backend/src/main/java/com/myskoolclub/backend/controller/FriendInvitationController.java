package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.AcceptFriendInvitationRequest;
import com.myskoolclub.backend.dto.AuthResponse;
import com.myskoolclub.backend.dto.CreateFriendInvitationRequest;
import com.myskoolclub.backend.dto.FriendInvitationDetailsResponse;
import com.myskoolclub.backend.dto.InvitationTokenRequest;
import com.myskoolclub.backend.service.FriendInvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FriendInvitationController {

    private final FriendInvitationService invitationService;

    @PostMapping("/invitations")
    public ResponseEntity<Map<String, String>> invite(
            @Valid @RequestBody CreateFriendInvitationRequest request,
            Authentication authentication) {
        invitationService.invite(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "If the email is eligible, an invitation has been sent."
        ));
    }

    @PostMapping("/auth/invitations/details")
    public ResponseEntity<FriendInvitationDetailsResponse> details(
            @Valid @RequestBody InvitationTokenRequest request) {
        return ResponseEntity.ok(invitationService.details(request.token()));
    }

    @PostMapping("/auth/invitations/send-code")
    public ResponseEntity<Map<String, String>> sendCode(
            @Valid @RequestBody InvitationTokenRequest request) {
        invitationService.sendVerificationCode(request.token());
        return ResponseEntity.ok(Map.of(
                "message", "A six-digit verification code was sent to the invited email."
        ));
    }

    @PostMapping("/auth/invitations/accept")
    public ResponseEntity<AuthResponse> accept(
            @Valid @RequestBody AcceptFriendInvitationRequest request) {
        return ResponseEntity.ok(invitationService.accept(request));
    }
}
