package com.myskoolclub.backend.service;

import com.myskoolclub.backend.model.Notification;
import com.myskoolclub.backend.model.NotificationType;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notify(User recipient, NotificationType type, String referenceId, String message) {
        Notification notification = Notification.builder()
                .user(recipient)
                .type(type)
                .referenceId(referenceId)
                .message(message)
                .build();
        notificationRepository.save(notification);
    }
}
