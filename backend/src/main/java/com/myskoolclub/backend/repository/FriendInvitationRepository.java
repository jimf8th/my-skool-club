package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.FriendInvitation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FriendInvitationRepository extends JpaRepository<FriendInvitation, Long> {
    Optional<FriendInvitation> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select invitation from FriendInvitation invitation where invitation.tokenHash = :tokenHash")
    Optional<FriendInvitation> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    Optional<FriendInvitation> findFirstByInvitedBy_IdAndEmailIgnoreCaseOrderByCreatedAtDesc(
            Long invitedById, String email);

    List<FriendInvitation> findAllByEmailIgnoreCaseAndAcceptedAtIsNullAndRevokedAtIsNull(String email);

    long countByInvitedBy_IdAndCreatedAtAfter(Long invitedById, LocalDateTime createdAfter);
}
