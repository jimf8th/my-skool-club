package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.PasswordResetCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, Long> {
    Optional<PasswordResetCode> findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Query("UPDATE PasswordResetCode p SET p.used = true WHERE p.user.id = :userId AND p.used = false")
    void invalidateAllForUser(@Param("userId") Long userId);
}
