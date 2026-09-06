package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.UserResponse;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.repository.UserRepository;
import com.myskoolclub.backend.service.AccountDeletionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountDeletionService accountDeletionService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<UserResponse> getCurrentAccount(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .map(UserResponse::from)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAccount(Authentication authentication) {
        accountDeletionService.deleteAccount(authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
