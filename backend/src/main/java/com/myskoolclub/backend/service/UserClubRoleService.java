package com.myskoolclub.backend.service;

import com.myskoolclub.backend.model.UserClubRole;
import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.model.Club;
import com.myskoolclub.backend.repository.UserClubRoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UserClubRoleService {
    
    @Autowired
    private UserClubRoleRepository userClubRoleRepository;
    
    @Autowired
    private MemberService memberService;
    
    @Autowired
    private ClubService clubService;
    
    /**
     * Add a member to a club with a specific role.
     * If the member already exists in the club, their role will be updated to the new role.
     */
    public UserClubRole addMemberToClub(String memberId, String clubId, String clubRole) {
        // Validate that member and club exist
        Optional<Member> memberOpt = memberService.getMemberById(memberId);
        Optional<Club> clubOpt = clubService.getClubById(clubId);
        
        if (!memberOpt.isPresent()) {
            throw new IllegalArgumentException("Member not found with ID: " + memberId);
        }
        
        if (!clubOpt.isPresent()) {
            throw new IllegalArgumentException("Club not found with ID: " + clubId);
        }
        
        Member member = memberOpt.get();
        Club club = clubOpt.get();
        
        // Check if relationship already exists
        Optional<UserClubRole> existingRole = userClubRoleRepository.findByMemberIdAndClubIdAndActiveTrue(memberId, clubId);
        if (existingRole.isPresent()) {
            // If member already exists, update their role instead of throwing an error
            UserClubRole role = existingRole.get();
            if (!role.getClubRole().equals(clubRole)) {
                role.setClubRole(clubRole);
                role.setUpdatedAt(LocalDateTime.now());
                return userClubRoleRepository.save(role);
            }
            // If role is already the same, just return it
            return role;
        }
        
        // Create new user club role
        UserClubRole userClubRole = new UserClubRole(memberId, clubId, club.getSchoolId(), clubRole);
        userClubRole.setMemberEmail(member.getEmail());
        userClubRole.setMemberName(member.getFirstName() + " " + member.getLastName());
        userClubRole.setClubName(club.getName());
        userClubRole.setSchoolName(club.getSchoolName());
        
        return userClubRoleRepository.save(userClubRole);
    }
    
    /**
     * Update a member's role in a club
     */
    public UserClubRole updateMemberClubRole(String memberId, String clubId, String newRole) {
        Optional<UserClubRole> roleOpt = userClubRoleRepository.findByMemberIdAndClubIdAndActiveTrue(memberId, clubId);
        
        if (!roleOpt.isPresent()) {
            throw new IllegalArgumentException("Member is not part of this club");
        }
        
        UserClubRole role = roleOpt.get();
        role.setClubRole(newRole);
        role.setUpdatedAt(LocalDateTime.now());
        
        return userClubRoleRepository.save(role);
    }
    
    /**
     * Remove a member from a club (soft delete)
     */
    public boolean removeMemberFromClub(String memberId, String clubId) {
        Optional<UserClubRole> roleOpt = userClubRoleRepository.findByMemberIdAndClubIdAndActiveTrue(memberId, clubId);
        
        if (!roleOpt.isPresent()) {
            return false;
        }
        
        UserClubRole role = roleOpt.get();
        role.setActive(false);
        role.setUpdatedAt(LocalDateTime.now());
        userClubRoleRepository.save(role);
        
        return true;
    }
    
    /**
     * Update a user-club role
     */
    public UserClubRole updateUserClubRole(String roleId, String newRole) {
        Optional<UserClubRole> roleOpt = userClubRoleRepository.findById(roleId);
        
        if (!roleOpt.isPresent()) {
            throw new IllegalArgumentException("User club role not found");
        }
        
        UserClubRole role = roleOpt.get();
        role.setClubRole(newRole);
        role.setUpdatedAt(LocalDateTime.now());
        
        return userClubRoleRepository.save(role);
    }
    
    /**
     * Get all clubs for a member
     */
    public List<UserClubRole> getMemberClubs(String memberId) {
        return userClubRoleRepository.findByMemberIdAndActiveTrue(memberId);
    }
    
    /**
     * Get all members of a club
     */
    public List<UserClubRole> getClubMembers(String clubId) {
        return userClubRoleRepository.findByClubIdAndActiveTrue(clubId);
    }
    
    /**
     * Get all clubs for a member in a specific school
     */
    public List<UserClubRole> getMemberClubsInSchool(String memberId, String schoolId) {
        return userClubRoleRepository.findByMemberIdAndSchoolIdAndActiveTrue(memberId, schoolId);
    }
    
    /**
     * Get all members of clubs in a specific school
     */
    public List<UserClubRole> getAllClubMembersInSchool(String schoolId) {
        return userClubRoleRepository.findBySchoolIdAndActiveTrue(schoolId);
    }
    
    /**
     * Get specific member-club relationship
     */
    public Optional<UserClubRole> getMemberClubRole(String memberId, String clubId) {
        return userClubRoleRepository.findByMemberIdAndClubIdAndActiveTrue(memberId, clubId);
    }
    
    /**
     * Get all club admins for a specific club
     */
    public List<UserClubRole> getClubAdmins(String clubId) {
        return userClubRoleRepository.findByClubIdAndClubRoleAndActiveTrue(clubId, "CLUB_ADMIN");
    }
    
    /**
     * Get all clubs where a member is admin
     */
    public List<UserClubRole> getMemberAdminClubs(String memberId) {
        return userClubRoleRepository.findByMemberIdAndClubRoleAndActiveTrue(memberId, "CLUB_ADMIN");
    }
    
    /**
     * Check if a member is admin of a specific club
     */
    public boolean isMemberClubAdmin(String memberId, String clubId) {
        Optional<UserClubRole> roleOpt = userClubRoleRepository.findByMemberIdAndClubIdAndActiveTrue(memberId, clubId);
        return roleOpt.isPresent() && "CLUB_ADMIN".equals(roleOpt.get().getClubRole());
    }
    
    /**
     * Check if a member (by email) is a club admin
     */
    public boolean isClubAdmin(String memberEmail, String clubId) {
        if (memberEmail == null || clubId == null) {
            return false;
        }
        // Find member by email
        Optional<Member> memberOpt = memberService.findByEmail(memberEmail);
        if (!memberOpt.isPresent()) {
            return false;
        }
        // Check if they have CLUB_ADMIN role for this club
        return isMemberClubAdmin(memberOpt.get().getId(), clubId);
    }
    
    /**
     * Check if a member belongs to a specific club (any role)
     */
    public boolean isMemberInClub(String memberId, String clubId) {
        return userClubRoleRepository.existsByMemberIdAndClubIdAndActiveTrue(memberId, clubId);
    }
    
    /**
     * Count members in a club
     */
    public long countClubMembers(String clubId) {
        return userClubRoleRepository.countByClubIdAndActiveTrue(clubId);
    }
    
    /**
     * Count clubs a member belongs to
     */
    public long countMemberClubs(String memberId) {
        return userClubRoleRepository.countByMemberIdAndActiveTrue(memberId);
    }
    
    /**
     * Count club admins in a club
     */
    public long countClubAdmins(String clubId) {
        return userClubRoleRepository.countByClubIdAndClubRoleAndActiveTrue(clubId, "CLUB_ADMIN");
    }
    
    /**
     * Get member club roles by email
     */
    public List<UserClubRole> getMemberClubRolesByEmail(String memberEmail) {
        return userClubRoleRepository.findByMemberEmailAndActiveTrue(memberEmail);
    }
    
    /**
     * Remove all members from a club (when club is deleted)
     */
    public void removeAllMembersFromClub(String clubId) {
        List<UserClubRole> clubMembers = userClubRoleRepository.findByClubId(clubId);
        userClubRoleRepository.deleteAll(clubMembers);
    }
    
    /**
     * Remove member from all clubs (when member is deleted/deactivated)
     */
    public void removeMemberFromAllClubs(String memberId) {
        List<UserClubRole> memberRoles = userClubRoleRepository.findByMemberIdAndActiveTrue(memberId);
        for (UserClubRole role : memberRoles) {
            role.setActive(false);
            role.setUpdatedAt(LocalDateTime.now());
        }
        userClubRoleRepository.saveAll(memberRoles);
    }
    
    /**
     * Get MemberService (for internal use)
     */
    public MemberService getMemberService() {
        return memberService;
    }
}