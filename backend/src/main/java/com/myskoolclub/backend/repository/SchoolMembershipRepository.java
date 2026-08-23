package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.MembershipRole;
import com.myskoolclub.backend.model.MembershipStatus;
import com.myskoolclub.backend.model.SchoolMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SchoolMembershipRepository extends JpaRepository<SchoolMembership, Long> {

    Optional<SchoolMembership> findByUserIdAndSchoolId(Long userId, Long schoolId);

    Optional<SchoolMembership> findByUserIdAndSchoolIdAndRoleAndStatus(
            Long userId, Long schoolId, MembershipRole role, MembershipStatus status);

    List<SchoolMembership> findBySchoolIdAndStatusOrderByRequestedAtAsc(Long schoolId, MembershipStatus status);

    List<SchoolMembership> findBySchoolIdAndRoleAndStatusOrderByRequestedAtAsc(
            Long schoolId, MembershipRole role, MembershipStatus status);

    // Check if user already belongs to any school (approved)
    boolean existsByUserIdAndStatus(Long userId, MembershipStatus status);

    // Used for cascade: when school admin role is removed, demote all club admin roles
    @Modifying
    @Query("""
            UPDATE SchoolMembership sm
            SET sm.status = :revoked, sm.reviewedAt = CURRENT_TIMESTAMP, sm.reviewedBy = :reviewer
            WHERE sm.user.id = :userId AND sm.school.id = :schoolId AND sm.status = :approved
           """)
    void revokeApprovedMembership(
            @Param("userId") Long userId,
            @Param("schoolId") Long schoolId,
            @Param("reviewer") com.myskoolclub.backend.model.User reviewer,
            @Param("approved") MembershipStatus approved,
            @Param("revoked") MembershipStatus revoked);
}
