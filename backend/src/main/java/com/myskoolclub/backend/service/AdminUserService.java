package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.AdminAccountResponse;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Account lookup/repair actions for the APP_ADMIN account-management screen. */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AdminAccountResponse> searchAccounts(String query) {
        List<User> users = (query == null || query.isBlank())
                ? userRepository.findAllByOrderByFirstNameAscLastNameAsc()
                : userRepository.findByEmailContainingIgnoreCaseOrderByFirstNameAscLastNameAsc(query.trim());
        return users.stream().map(AdminAccountResponse::from).toList();
    }

    @Transactional
    public AdminAccountResponse resetSignIn(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
        // Clears the stale Firebase link so the next sign-in re-links by verified email
        // instead of tripping the "already linked to a different sign-in" conflict.
        user.setFirebaseUid(null);
        return AdminAccountResponse.from(user);
    }
}
