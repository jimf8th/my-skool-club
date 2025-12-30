package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.UserClubRole;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserClubRoleRepository extends MongoRepository<UserClubRole, String> {
    
    // Find all club roles for a specific member
    List<UserClubRole> findByMemberIdAndActiveTrue(String memberId);
    
    // Find all members of a specific club
    List<UserClubRole> findByClubIdAndActiveTrue(String clubId);
    
    // Find all members of a specific club (including inactive)
    List<UserClubRole> findByClubId(String clubId);
    
    // Find all club roles for a specific member in a specific school
    List<UserClubRole> findByMemberIdAndSchoolIdAndActiveTrue(String memberId, String schoolId);
    
    // Find all members of clubs in a specific school
    List<UserClubRole> findBySchoolIdAndActiveTrue(String schoolId);
    
    // Find specific member-club relationship
    Optional<UserClubRole> findByMemberIdAndClubIdAndActiveTrue(String memberId, String clubId);
    
    // Find all club admins for a specific club
    List<UserClubRole> findByClubIdAndClubRoleAndActiveTrue(String clubId, String clubRole);
    
    // Find all clubs where a member has a specific role
    List<UserClubRole> findByMemberIdAndClubRoleAndActiveTrue(String memberId, String clubRole);
    
    // Find all members with a specific role in a specific school
    List<UserClubRole> findBySchoolIdAndClubRoleAndActiveTrue(String schoolId, String clubRole);
    
    // Check if a member is admin of any club
    @Query("{'memberId': ?0, 'clubRole': 'CLUB_ADMIN', 'active': true}")
    List<UserClubRole> findClubAdminRolesByMemberId(String memberId);
    
    // Check if a member has any role in a specific club
    boolean existsByMemberIdAndClubIdAndActiveTrue(String memberId, String clubId);
    
    // Count members in a club
    long countByClubIdAndActiveTrue(String clubId);
    
    // Count clubs a member belongs to
    long countByMemberIdAndActiveTrue(String memberId);
    
    // Count club admins
    long countByClubIdAndClubRoleAndActiveTrue(String clubId, String clubRole);
    
    // Find by member email (for convenience)
    List<UserClubRole> findByMemberEmailAndActiveTrue(String memberEmail);
    
    // Find all roles for members in a list of club IDs
    List<UserClubRole> findByClubIdInAndActiveTrue(List<String> clubIds);
    
    // Delete (soft delete by setting active=false) - custom query if needed
    // We'll handle this in the service layer
}