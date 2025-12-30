package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MemberRepository extends MongoRepository<Member, String> {
    
    // Find by email (unique field)
    Optional<Member> findByEmail(String email);
    
    // Check if email exists
    boolean existsByEmail(String email);
    
    // Find by member type
    List<Member> findByMemberType(String memberType);
    List<Member> findByMemberTypeAndIsActive(String memberType, boolean isActive);
    
    // Find by name combinations
    List<Member> findByFirstNameAndLastName(String firstName, String lastName);
    List<Member> findByFirstNameContainingIgnoreCase(String firstName);
    List<Member> findByLastNameContainingIgnoreCase(String lastName);
    
    // Find by school
    List<Member> findBySchoolId(String schoolId);
    List<Member> findBySchoolIdAndIsActive(String schoolId, boolean isActive);
    List<Member> findBySchoolName(String schoolName);
    List<Member> findBySchoolNameAndIsActive(String schoolName, boolean isActive);
    List<Member> findBySchoolNameContainingIgnoreCase(String schoolName);
    
    // Find by grade level (for students)
    List<Member> findByGradeLevel(String gradeLevel);
    List<Member> findByGradeLevelAndIsActive(String gradeLevel, boolean isActive);
    
    // Find active members
    List<Member> findByIsActive(boolean isActive);
    
    // Search functionality
    @Query("{ $or: [ " +
           "{ 'firstName': { $regex: ?0, $options: 'i' } }, " +
           "{ 'lastName': { $regex: ?0, $options: 'i' } }, " +
           "{ 'email': { $regex: ?0, $options: 'i' } }, " +
           "{ 'studentId': { $regex: ?0, $options: 'i' } }, " +
           "{ 'memberType': { $regex: ?0, $options: 'i' } } " +
           "] }")
    List<Member> searchMembers(String searchTerm);
    
    // Search active members only
    @Query("{ $and: [ " +
           "{ 'isActive': true }, " +
           "{ $or: [ " +
           "{ 'firstName': { $regex: ?0, $options: 'i' } }, " +
           "{ 'lastName': { $regex: ?0, $options: 'i' } }, " +
           "{ 'email': { $regex: ?0, $options: 'i' } }, " +
           "{ 'studentId': { $regex: ?0, $options: 'i' } }, " +
           "{ 'memberType': { $regex: ?0, $options: 'i' } } " +
           "] } " +
           "] }")
    List<Member> searchActiveMembers(String searchTerm);
    
    // Count members by school
    long countBySchoolId(String schoolId);
    long countBySchoolIdAndIsActive(String schoolId, boolean isActive);
    
    // Count members by member type
    long countByMemberType(String memberType);
    long countByMemberTypeAndIsActive(String memberType, boolean isActive);
    
    // Count members by grade level (for students)
    long countByGradeLevel(String gradeLevel);
    long countByGradeLevelAndIsActive(String gradeLevel, boolean isActive);
    
    // Pageable methods
    Page<Member> findBySchoolIdAndIsActive(String schoolId, boolean isActive, Pageable pageable);
    
    // Search with pagination for school members
    @Query("{ $and: [ " +
           "{ 'schoolId': ?0 }, " +
           "{ 'isActive': true }, " +
           "{ $or: [ " +
           "{ 'firstName': { $regex: ?1, $options: 'i' } }, " +
           "{ 'lastName': { $regex: ?1, $options: 'i' } }, " +
           "{ 'email': { $regex: ?1, $options: 'i' } } " +
           "] } " +
           "] }")
    Page<Member> findBySchoolIdAndSearchTerm(String schoolId, String searchTerm, Pageable pageable);
}