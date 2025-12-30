package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.Club;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClubRepository extends MongoRepository<Club, String> {
    
    // Find clubs by school
    List<Club> findBySchoolId(String schoolId);
    List<Club> findBySchoolIdAndActive(String schoolId, boolean active);
    
    // Find clubs by name
    Optional<Club> findByNameAndSchoolId(String name, String schoolId);
    List<Club> findByNameContainingIgnoreCase(String name);
    
    // Find active clubs
    List<Club> findByActive(boolean active);
    
    // Find clubs by category
    List<Club> findByCategory(String category);
    List<Club> findByCategoryAndSchoolId(String category, String schoolId);
    
    // Find clubs by advisor
    List<Club> findByAdvisorEmailIgnoreCase(String advisorEmail);
    List<Club> findByAdvisorNameContainingIgnoreCase(String advisorName);
    
    // Search queries
    @Query("{ 'name': { $regex: ?0, $options: 'i' } }")
    List<Club> findByNameRegex(String namePattern);
    
    @Query("{ 'schoolId': ?0, 'name': { $regex: ?1, $options: 'i' } }")
    List<Club> findBySchoolIdAndNameRegex(String schoolId, String namePattern);
    
    @Query("{ 'description': { $regex: ?0, $options: 'i' } }")
    List<Club> findByDescriptionRegex(String descriptionPattern);
    
    @Query("{ 'tags': { $in: ?0 } }")
    List<Club> findByTagsIn(List<String> tags);
    
    @Query("{ 'schoolId': ?0, 'tags': { $in: ?1 } }")
    List<Club> findBySchoolIdAndTagsIn(String schoolId, List<String> tags);
    
    // Advanced search
    @Query("{ " +
           "$and: [" +
           "  { 'schoolId': ?0 }," +
           "  { $or: [" +
           "    { 'name': { $regex: ?1, $options: 'i' } }," +
           "    { 'description': { $regex: ?1, $options: 'i' } }," +
           "    { 'category': { $regex: ?1, $options: 'i' } }," +
           "    { 'advisorName': { $regex: ?1, $options: 'i' } }" +
           "  ] }" +
           "] }")
    List<Club> searchClubsBySchoolAndKeyword(String schoolId, String keyword);
    
    @Query("{ $or: [" +
           "  { 'name': { $regex: ?0, $options: 'i' } }," +
           "  { 'description': { $regex: ?0, $options: 'i' } }," +
           "  { 'category': { $regex: ?0, $options: 'i' } }," +
           "  { 'advisorName': { $regex: ?0, $options: 'i' } }," +
           "  { 'schoolName': { $regex: ?0, $options: 'i' } }" +
           "] }")
    List<Club> searchClubsByKeyword(String keyword);
    
    // Count queries
    long countBySchoolId(String schoolId);
    long countBySchoolIdAndActive(String schoolId, boolean active);
    long countByCategory(String category);
    long countByCategoryAndSchoolId(String category, String schoolId);
    
    // Validation queries
    boolean existsByNameAndSchoolId(String name, String schoolId);
    boolean existsByNameAndSchoolIdAndIdNot(String name, String schoolId, String id);
    
    // Meeting day queries
    List<Club> findByMeetingDay(String meetingDay);
    List<Club> findBySchoolIdAndMeetingDay(String schoolId, String meetingDay);
    
    // Custom delete (soft delete by setting active to false)
    @Query("{ '_id': ?0 }")
    Optional<Club> findByIdForUpdate(String id);
    
    // Paginated methods
    Page<Club> findByActive(boolean active, Pageable pageable);
    Page<Club> findBySchoolId(String schoolId, Pageable pageable);
    Page<Club> findBySchoolIdAndActive(String schoolId, boolean active, Pageable pageable);
    Page<Club> findByCategory(String category, Pageable pageable);
    Page<Club> findByCategoryAndSchoolId(String category, String schoolId, Pageable pageable);
    
    // Paginated search queries
    @Query("{ $or: [ " +
           "{ 'name': { $regex: ?0, $options: 'i' } }, " +
           "{ 'description': { $regex: ?0, $options: 'i' } }, " +
           "{ 'category': { $regex: ?0, $options: 'i' } }, " +
           "{ 'advisorName': { $regex: ?0, $options: 'i' } }, " +
           "{ 'tags': { $regex: ?0, $options: 'i' } } " +
           "] }")
    Page<Club> searchClubsByKeyword(String keyword, Pageable pageable);
    
    @Query("{ 'schoolId': ?0, $or: [ " +
           "{ 'name': { $regex: ?1, $options: 'i' } }, " +
           "{ 'description': { $regex: ?1, $options: 'i' } }, " +
           "{ 'category': { $regex: ?1, $options: 'i' } }, " +
           "{ 'advisorName': { $regex: ?1, $options: 'i' } }, " +
           "{ 'tags': { $regex: ?1, $options: 'i' } } " +
           "] }")
    Page<Club> searchClubsBySchoolAndKeyword(String schoolId, String keyword, Pageable pageable);
}