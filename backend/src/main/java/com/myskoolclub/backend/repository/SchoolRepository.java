package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.School;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolRepository extends MongoRepository<School, String> {
    
    // Find by name (unique constraint)
    Optional<School> findByName(String name);
    
    // Find active schools
    List<School> findByIsActive(boolean isActive);
    
    // Find schools by partial name match (case-insensitive)
    @Query("{'name': {'$regex': ?0, '$options': 'i'}}")
    List<School> findByNameContainingIgnoreCase(String name);
    
    // Find schools by city
    List<School> findByCity(String city);
    
    // Find schools by state
    List<School> findByState(String state);
    
    // Find schools by type
    List<School> findByType(String type);
    
    // Find schools by city and state
    List<School> findByCityAndState(String city, String state);
    
    // Find schools ordered by creation date (newest first)
    List<School> findAllByOrderByCreatedAtDesc();
    
    // Find active schools ordered by name
    List<School> findByIsActiveTrueOrderByName();
    
    // Check if school name already exists
    boolean existsByName(String name);
    
    // Count active schools
    long countByIsActive(boolean isActive);
}