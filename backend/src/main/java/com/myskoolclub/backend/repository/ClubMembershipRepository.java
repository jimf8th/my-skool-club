package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.ClubMembership;
import com.myskoolclub.backend.model.MembershipRole;
import com.myskoolclub.backend.model.MembershipStatus;
import com.myskoolclub.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClubMembershipRepository extends JpaRepository<ClubMembership, Long> {

    @Query("SELECT m FROM ClubMembership m JOIN FETCH m.user WHERE m.user.id = :userId AND m.club.id = :clubId")
    Optional<ClubMembership> findByUserIdAndClubId(@Param("userId") Long userId, @Param("clubId") Long clubId);

    Optional<ClubMembership> findByUserIdAndClubIdAndRoleAndStatus(
            Long userId, Long clubId, MembershipRole role, MembershipStatus status);

    @Query("SELECT m FROM ClubMembership m JOIN FETCH m.user WHERE m.club.id = :clubId AND m.role = :role AND m.status = :status ORDER BY m.requestedAt ASC")
    List<ClubMembership> findByClubIdAndRoleAndStatus(@Param("clubId") Long clubId, @Param("role") MembershipRole role, @Param("status") MembershipStatus status);

    @Query("SELECT m FROM ClubMembership m JOIN FETCH m.user WHERE m.club.id = :clubId AND m.status = :status ORDER BY m.requestedAt ASC")
    List<ClubMembership> findByClubIdAndStatusOrderByRequestedAtAsc(@Param("clubId") Long clubId, @Param("status") MembershipStatus status);

    // Cascade: revoke all approved club memberships for a user in a school (when school membership revoked)
    @Modifying
    @Query("""
            UPDATE ClubMembership cm
            SET cm.status = :revoked, cm.reviewedAt = CURRENT_TIMESTAMP, cm.reviewedBy = :reviewer
            WHERE cm.user.id = :userId AND cm.club.school.id = :schoolId AND cm.status = :approved
           """)
    void revokeAllApprovedForUserInSchool(
            @Param("userId") Long userId,
            @Param("schoolId") Long schoolId,
            @Param("reviewer") User reviewer,
            @Param("approved") MembershipStatus approved,
            @Param("revoked") MembershipStatus revoked);

    // Cascade: demote club admin to member when user loses school admin role
    @Modifying
    @Query("""
            UPDATE ClubMembership cm SET cm.role = :member
            WHERE cm.user.id = :userId AND cm.club.school.id = :schoolId
            AND cm.role = :admin AND cm.status = :approved
           """)
    void demoteAllClubAdminsForUserInSchool(
            @Param("userId") Long userId,
            @Param("schoolId") Long schoolId,
            @Param("admin") MembershipRole admin,
            @Param("member") MembershipRole member,
            @Param("approved") MembershipStatus approved);

    @Modifying
    @Query("DELETE FROM ClubMembership cm WHERE cm.club.id = :clubId")
    void deleteByClubId(@Param("clubId") Long clubId);
}
