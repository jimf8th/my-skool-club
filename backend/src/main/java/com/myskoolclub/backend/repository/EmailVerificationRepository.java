package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findFirstByUser_IdAndUsedFalseOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Query("UPDATE EmailVerification e SET e.used = true WHERE e.user.id = :userId AND e.used = false")
    void invalidateAllForUser(@Param("userId") Long userId);
}
