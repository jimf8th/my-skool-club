package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.AdminAccountResponse;
import com.myskoolclub.backend.dto.UserResponse;
import com.myskoolclub.backend.repository.UserRepository;
import com.myskoolclub.backend.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final AdminUserService adminUserService;

    /**
     * Any authenticated user may list users.
     * School admins need this to pick who to appoint as a school admin;
     * APP_ADMIN needs it to manage all users.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<UserResponse>> listUsers() {
        return ResponseEntity.ok(
                userRepository.findAllByEnabledTrueOrderByFirstNameAscLastNameAsc()
                        .stream().map(UserResponse::from).toList()
        );
    }

    /** Account search for the APP_ADMIN account-management screen (includes disabled users). */
    @GetMapping("/accounts")
    @PreAuthorize("hasRole('APP_ADMIN')")
    public ResponseEntity<List<AdminAccountResponse>> searchAccounts(
            @RequestParam(required = false) String query) {
        return ResponseEntity.ok(adminUserService.searchAccounts(query));
    }

    /** Clears a stale Firebase link so the account can relink on its next sign-in. */
    @PostMapping("/{userId}/reset-sign-in")
    @PreAuthorize("hasRole('APP_ADMIN')")
    public ResponseEntity<AdminAccountResponse> resetSignIn(@PathVariable Long userId) {
        return ResponseEntity.ok(adminUserService.resetSignIn(userId));
    }
}
