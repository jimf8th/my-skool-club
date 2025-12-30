package com.myskoolclub.backend.service;

import com.myskoolclub.backend.model.School;
import com.myskoolclub.backend.repository.SchoolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class SchoolService {

    @Autowired
    private SchoolRepository schoolRepository;

    // Create a new school
    public School createSchool(School school) {
        // Validate mandatory fields
        if (school.getName() == null || school.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("School name is required");
        }
        
        // Check if school name already exists
        if (schoolRepository.existsByName(school.getName().trim())) {
            throw new IllegalArgumentException("School with this name already exists");
        }
        
        school.setName(school.getName().trim());
        school.setCreatedAt(LocalDateTime.now());
        school.setUpdatedAt(LocalDateTime.now());
        school.setActive(true);
        
        return schoolRepository.save(school);
    }

    // Get school by ID
    public Optional<School> getSchoolById(String schoolId) {
        return schoolRepository.findById(schoolId);
    }

    // Get school by name
    public Optional<School> getSchoolByName(String name) {
        return schoolRepository.findByName(name);
    }

    // Get all schools
    public List<School> getAllSchools() {
        return schoolRepository.findAll();
    }

    // Get active schools
    public List<School> getActiveSchools() {
        return schoolRepository.findByIsActiveTrueOrderByName();
    }

    // Search schools by name
    public List<School> searchSchoolsByName(String name) {
        return schoolRepository.findByNameContainingIgnoreCase(name);
    }

    // Get schools by city
    public List<School> getSchoolsByCity(String city) {
        return schoolRepository.findByCity(city);
    }

    // Get schools by state
    public List<School> getSchoolsByState(String state) {
        return schoolRepository.findByState(state);
    }

    // Get schools by type
    public List<School> getSchoolsByType(String type) {
        return schoolRepository.findByType(type);
    }

    // Update school
    public School updateSchool(School school) {
        if (school.getId() == null) {
            throw new IllegalArgumentException("School ID is required for update");
        }
        
        if (!schoolRepository.existsById(school.getId())) {
            throw new IllegalArgumentException("School not found");
        }
        
        school.setUpdatedAt(LocalDateTime.now());
        return schoolRepository.save(school);
    }

    // Deactivate school
    public School deactivateSchool(String schoolId) {
        School school = schoolRepository.findById(schoolId)
            .orElseThrow(() -> new IllegalArgumentException("School not found"));
        
        school.setActive(false);
        school.setUpdatedAt(LocalDateTime.now());
        
        return schoolRepository.save(school);
    }

    // Reactivate school
    public School reactivateSchool(String schoolId) {
        School school = schoolRepository.findById(schoolId)
            .orElseThrow(() -> new IllegalArgumentException("School not found"));
        
        school.setActive(true);
        school.setUpdatedAt(LocalDateTime.now());
        
        return schoolRepository.save(school);
    }

    // Check if school exists
    public boolean schoolExists(String schoolId) {
        return schoolRepository.existsById(schoolId);
    }

    // Check if school name exists
    public boolean schoolNameExists(String name) {
        return schoolRepository.existsByName(name);
    }

    // Get school count
    public long getTotalSchoolCount() {
        return schoolRepository.count();
    }

    // Get active school count
    public long getActiveSchoolCount() {
        return schoolRepository.countByIsActive(true);
    }

    // Delete school by ID
    public boolean deleteSchool(String schoolId) {
        try {
            Optional<School> schoolOpt = schoolRepository.findById(schoolId);
            if (schoolOpt.isPresent()) {
                schoolRepository.deleteById(schoolId);
                return true;
            }
            return false;
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete school: " + e.getMessage());
        }
    }

    // Soft delete - mark school as inactive
    public boolean softDeleteSchool(String schoolId) {
        try {
            Optional<School> schoolOpt = schoolRepository.findById(schoolId);
            if (schoolOpt.isPresent()) {
                School school = schoolOpt.get();
                school.setActive(false);
                school.setUpdatedAt(LocalDateTime.now());
                schoolRepository.save(school);
                return true;
            }
            return false;
        } catch (Exception e) {
            throw new RuntimeException("Failed to deactivate school: " + e.getMessage());
        }
    }

    // Activate school - mark school as active
    public boolean activateSchool(String schoolId) {
        try {
            Optional<School> schoolOpt = schoolRepository.findById(schoolId);
            if (schoolOpt.isPresent()) {
                School school = schoolOpt.get();
                school.setActive(true);
                school.setUpdatedAt(LocalDateTime.now());
                schoolRepository.save(school);
                return true;
            }
            return false;
        } catch (Exception e) {
            throw new RuntimeException("Failed to activate school: " + e.getMessage());
        }
    }
}