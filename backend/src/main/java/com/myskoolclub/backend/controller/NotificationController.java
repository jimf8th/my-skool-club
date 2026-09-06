package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.NotificationResponse;
import com.myskoolclub.backend.model.Notification;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.NotificationRepository;
import com.myskoolclub.backend.repository.UserRepository;
import com.myskoolclub.backend.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(Authentication auth) {
        Long userId = resolveUserId(auth);
        return ResponseEntity.ok(
                notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                        .stream().map(NotificationResponse::from).toList()
        );
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(Authentication auth) {
        Long userId = resolveUserId(auth);
        return ResponseEntity.ok(Map.of("count", notificationRepository.countByUserIdAndReadFalse(userId)));
    }

    @PostMapping("/{id}/read")
    @Transactional
    public ResponseEntity<Map<String, String>> markRead(
            @PathVariable Long id, Authentication auth) {
        Long userId = resolveUserId(auth);
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!notification.getUser().getId().equals(userId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Not your notification");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @PostMapping("/read-all")
    @Transactional
    public ResponseEntity<Map<String, String>> markAllRead(Authentication auth) {
        Long userId = resolveUserId(auth);
        notificationRepository.markAllReadForUser(userId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    private Long resolveUserId(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .map(User::getId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
