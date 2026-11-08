package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.SchoolOnboardingRequest;
import com.myskoolclub.backend.model.SchoolRequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SchoolOnboardingRequestRepository extends JpaRepository<SchoolOnboardingRequest, Long> {

    List<SchoolOnboardingRequest> findAllByOrderByCreatedAtDesc();

    List<SchoolOnboardingRequest> findByStatusOrderByCreatedAtDesc(SchoolRequestStatus status);

    boolean existsByAdminEmailIgnoreCaseAndStatus(String adminEmail, SchoolRequestStatus status);

    long countByAdminEmailIgnoreCaseAndCreatedAtAfter(String adminEmail, LocalDateTime createdAt);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT request FROM SchoolOnboardingRequest request WHERE request.id = :id")
    Optional<SchoolOnboardingRequest> findByIdForUpdate(@Param("id") Long id);
}
