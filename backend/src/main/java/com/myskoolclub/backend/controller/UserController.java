package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.UserResponse;
import com.myskoolclub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

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
}
