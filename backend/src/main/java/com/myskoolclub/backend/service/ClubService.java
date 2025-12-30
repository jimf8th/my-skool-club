package com.myskoolclub.backend.service;

import com.myskoolclub.backend.model.Club;
import com.myskoolclub.backend.repository.ClubRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ClubService {
    
    @Autowired
    private ClubRepository clubRepository;
    
    // Create operations
    public Club createClub(Club club) {
        validateClub(club);
        
        // Check for duplicate club name within the same school
        if (clubRepository.existsByNameAndSchoolId(club.getName(), club.getSchoolId())) {
            throw new IllegalArgumentException("A club with the name '" + club.getName() + 
                                             "' already exists in this school");
        }
        
        // Set system fields
        club.setCreatedAt(LocalDateTime.now());
        club.setUpdatedAt(LocalDateTime.now());
        club.setActive(true);
        
        return clubRepository.save(club);
    }
    
    // Read operations
    public List<Club> getAllClubs() {
        return clubRepository.findAll();
    }
    
    public List<Club> getActiveClubs() {
        return clubRepository.findByActive(true);
    }
    
    public Optional<Club> getClubById(String id) {
        return clubRepository.findById(id);
    }
    
    public List<Club> getClubsBySchool(String schoolId) {
        return clubRepository.findBySchoolId(schoolId);
    }
    
    public List<Club> getActiveClubsBySchool(String schoolId) {
        return clubRepository.findBySchoolIdAndActive(schoolId, true);
    }
    
    public List<Club> getClubsByCategory(String category) {
        return clubRepository.findByCategory(category);
    }
    
    public List<Club> getClubsByCategoryAndSchool(String category, String schoolId) {
        return clubRepository.findByCategoryAndSchoolId(category, schoolId);
    }
    
    public List<Club> searchClubsByName(String name) {
        return clubRepository.findByNameContainingIgnoreCase(name);
    }
    
    public List<Club> searchClubsByKeyword(String keyword) {
        return clubRepository.searchClubsByKeyword(keyword);
    }
    
    public List<Club> searchClubsBySchoolAndKeyword(String schoolId, String keyword) {
        return clubRepository.searchClubsBySchoolAndKeyword(schoolId, keyword);
    }
    
    public List<Club> getClubsByAdvisorEmail(String advisorEmail) {
        return clubRepository.findByAdvisorEmailIgnoreCase(advisorEmail);
    }
    
    public List<Club> getClubsByMeetingDay(String meetingDay) {
        return clubRepository.findByMeetingDay(meetingDay);
    }
    
    public List<Club> getClubsByTags(List<String> tags) {
        return clubRepository.findByTagsIn(tags);
    }
    
    // Paginated Read operations
    public Page<Club> getAllClubs(Pageable pageable) {
        return clubRepository.findAll(pageable);
    }
    
    public Page<Club> getActiveClubs(Pageable pageable) {
        return clubRepository.findByActive(true, pageable);
    }
    
    public Page<Club> getClubsBySchool(String schoolId, Pageable pageable) {
        return clubRepository.findBySchoolId(schoolId, pageable);
    }
    
    public Page<Club> getActiveClubsBySchool(String schoolId, Pageable pageable) {
        return clubRepository.findBySchoolIdAndActive(schoolId, true, pageable);
    }
    
    public Page<Club> getClubsByCategory(String category, Pageable pageable) {
        return clubRepository.findByCategory(category, pageable);
    }
    
    public Page<Club> getClubsByCategoryAndSchool(String category, String schoolId, Pageable pageable) {
        return clubRepository.findByCategoryAndSchoolId(category, schoolId, pageable);
    }
    
    public Page<Club> searchClubsByKeyword(String keyword, Pageable pageable) {
        return clubRepository.searchClubsByKeyword(keyword, pageable);
    }
    
    public Page<Club> searchClubsBySchoolAndKeyword(String schoolId, String keyword, Pageable pageable) {
        return clubRepository.searchClubsBySchoolAndKeyword(schoolId, keyword, pageable);
    }
    
    // Update operations
    public Club updateClub(String id, Club updatedClub) {
        Optional<Club> existingClubOpt = clubRepository.findById(id);
        
        if (existingClubOpt.isEmpty()) {
            throw new IllegalArgumentException("Club not found with id: " + id);
        }
        
        Club existingClub = existingClubOpt.get();
        
        // Validate the updated club data
        validateClub(updatedClub);
        
        // Check for duplicate name (excluding current club)
        if (!existingClub.getName().equals(updatedClub.getName()) &&
            clubRepository.existsByNameAndSchoolIdAndIdNot(updatedClub.getName(), 
                                                          updatedClub.getSchoolId(), id)) {
            throw new IllegalArgumentException("A club with the name '" + updatedClub.getName() + 
                                             "' already exists in this school");
        }
        
        // Update fields
        existingClub.setName(updatedClub.getName());
        existingClub.setSchoolId(updatedClub.getSchoolId());
        existingClub.setSchoolName(updatedClub.getSchoolName());
        existingClub.setDescription(updatedClub.getDescription());
        existingClub.setCategory(updatedClub.getCategory());
        existingClub.setAdvisorName(updatedClub.getAdvisorName());
        existingClub.setAdvisorEmail(updatedClub.getAdvisorEmail());
        existingClub.setMeetingLocation(updatedClub.getMeetingLocation());
        existingClub.setMeetingTime(updatedClub.getMeetingTime());
        existingClub.setMeetingDay(updatedClub.getMeetingDay());
        existingClub.setMaxMembers(updatedClub.getMaxMembers());
        existingClub.setTags(updatedClub.getTags());
        existingClub.setUpdatedAt(LocalDateTime.now());
        
        return clubRepository.save(existingClub);
    }
    
    public Club updateClubPartial(String id, Club partialUpdate) {
        Optional<Club> existingClubOpt = clubRepository.findById(id);
        
        if (existingClubOpt.isEmpty()) {
            throw new IllegalArgumentException("Club not found with id: " + id);
        }
        
        Club existingClub = existingClubOpt.get();
        
        // Update only non-null fields
        if (partialUpdate.getName() != null && !partialUpdate.getName().trim().isEmpty()) {
            // Check for duplicate name
            if (!existingClub.getName().equals(partialUpdate.getName()) &&
                clubRepository.existsByNameAndSchoolIdAndIdNot(partialUpdate.getName(), 
                                                              existingClub.getSchoolId(), id)) {
                throw new IllegalArgumentException("A club with the name '" + partialUpdate.getName() + 
                                                 "' already exists in this school");
            }
            existingClub.setName(partialUpdate.getName().trim());
        }
        
        if (partialUpdate.getDescription() != null) {
            existingClub.setDescription(partialUpdate.getDescription());
        }
        
        if (partialUpdate.getCategory() != null) {
            existingClub.setCategory(partialUpdate.getCategory());
        }
        
        if (partialUpdate.getAdvisorName() != null) {
            existingClub.setAdvisorName(partialUpdate.getAdvisorName());
        }
        
        if (partialUpdate.getAdvisorEmail() != null) {
            existingClub.setAdvisorEmail(partialUpdate.getAdvisorEmail());
        }
        
        if (partialUpdate.getMeetingLocation() != null) {
            existingClub.setMeetingLocation(partialUpdate.getMeetingLocation());
        }
        
        if (partialUpdate.getMeetingTime() != null) {
            existingClub.setMeetingTime(partialUpdate.getMeetingTime());
        }
        
        if (partialUpdate.getMeetingDay() != null) {
            existingClub.setMeetingDay(partialUpdate.getMeetingDay());
        }
        
        if (partialUpdate.getMaxMembers() != null) {
            existingClub.setMaxMembers(partialUpdate.getMaxMembers());
        }
        
        if (partialUpdate.getTags() != null) {
            existingClub.setTags(partialUpdate.getTags());
        }
        
        existingClub.setUpdatedAt(LocalDateTime.now());
        
        return clubRepository.save(existingClub);
    }
    
    // Activate/Deactivate operations
    public Club deactivateClub(String id) {
        Optional<Club> clubOpt = clubRepository.findById(id);
        
        if (clubOpt.isEmpty()) {
            throw new IllegalArgumentException("Club not found with id: " + id);
        }
        
        Club club = clubOpt.get();
        club.setActive(false);
        club.setUpdatedAt(LocalDateTime.now());
        
        return clubRepository.save(club);
    }
    
    public Club activateClub(String id) {
        Optional<Club> clubOpt = clubRepository.findById(id);
        
        if (clubOpt.isEmpty()) {
            throw new IllegalArgumentException("Club not found with id: " + id);
        }
        
        Club club = clubOpt.get();
        club.setActive(true);
        club.setUpdatedAt(LocalDateTime.now());
        
        return clubRepository.save(club);
    }
    
    // Delete operations
    public void deleteClub(String id) {
        if (!clubRepository.existsById(id)) {
            throw new IllegalArgumentException("Club not found with id: " + id);
        }
        
        clubRepository.deleteById(id);
    }
    
    public void softDeleteClub(String id) {
        deactivateClub(id);
    }
    
    // Count operations
    public long getClubCount() {
        return clubRepository.count();
    }
    
    public long getClubCountBySchool(String schoolId) {
        return clubRepository.countBySchoolId(schoolId);
    }
    
    public long getActiveClubCountBySchool(String schoolId) {
        return clubRepository.countBySchoolIdAndActive(schoolId, true);
    }
    
    public long getClubCountByCategory(String category) {
        return clubRepository.countByCategory(category);
    }
    
    // Advanced search method
    public List<Club> advancedSearchClubs(String search, String schoolId, String category, 
                                          String meetingDay, String advisorName, String status,
                                          String sortBy, String sortDirection) {
        
        List<Club> clubs = clubRepository.findAll();
        
        // Apply filters
        clubs = clubs.stream()
                .filter(club -> {
                    // Search filter (name or description)
                    if (search != null && !search.trim().isEmpty()) {
                        String searchLower = search.toLowerCase();
                        return club.getName().toLowerCase().contains(searchLower) ||
                               (club.getDescription() != null && club.getDescription().toLowerCase().contains(searchLower));
                    }
                    return true;
                })
                .filter(club -> {
                    // School filter
                    if (schoolId != null && !schoolId.trim().isEmpty()) {
                        return club.getSchoolId().equals(schoolId);
                    }
                    return true;
                })
                .filter(club -> {
                    // Category filter
                    if (category != null && !category.trim().isEmpty()) {
                        return club.getCategory() != null && club.getCategory().equalsIgnoreCase(category);
                    }
                    return true;
                })
                .filter(club -> {
                    // Meeting day filter
                    if (meetingDay != null && !meetingDay.trim().isEmpty()) {
                        return club.getMeetingDay() != null && club.getMeetingDay().equalsIgnoreCase(meetingDay);
                    }
                    return true;
                })
                .filter(club -> {
                    // Advisor name filter
                    if (advisorName != null && !advisorName.trim().isEmpty()) {
                        return club.getAdvisorName() != null && 
                               club.getAdvisorName().toLowerCase().contains(advisorName.toLowerCase());
                    }
                    return true;
                })
                .filter(club -> {
                    // Status filter
                    if (status != null && !status.trim().isEmpty()) {
                        if (status.equalsIgnoreCase("active")) {
                            return club.isActive();
                        } else if (status.equalsIgnoreCase("inactive")) {
                            return !club.isActive();
                        }
                    }
                    return true;
                })
                .sorted((club1, club2) -> {
                    // Sorting
                    int comparison = 0;
                    String field = sortBy != null ? sortBy : "name";
                    
                    switch (field.toLowerCase()) {
                        case "name":
                            comparison = club1.getName().compareToIgnoreCase(club2.getName());
                            break;
                        case "schoolname":
                            String school1 = club1.getSchoolName() != null ? club1.getSchoolName() : "";
                            String school2 = club2.getSchoolName() != null ? club2.getSchoolName() : "";
                            comparison = school1.compareToIgnoreCase(school2);
                            break;
                        case "category":
                            String cat1 = club1.getCategory() != null ? club1.getCategory() : "";
                            String cat2 = club2.getCategory() != null ? club2.getCategory() : "";
                            comparison = cat1.compareToIgnoreCase(cat2);
                            break;
                        case "advisorname":
                            String advisor1 = club1.getAdvisorName() != null ? club1.getAdvisorName() : "";
                            String advisor2 = club2.getAdvisorName() != null ? club2.getAdvisorName() : "";
                            comparison = advisor1.compareToIgnoreCase(advisor2);
                            break;
                        case "createdat":
                            if (club1.getCreatedAt() != null && club2.getCreatedAt() != null) {
                                comparison = club1.getCreatedAt().compareTo(club2.getCreatedAt());
                            }
                            break;
                        case "meetingday":
                            String day1 = club1.getMeetingDay() != null ? club1.getMeetingDay() : "";
                            String day2 = club2.getMeetingDay() != null ? club2.getMeetingDay() : "";
                            comparison = day1.compareToIgnoreCase(day2);
                            break;
                        default:
                            comparison = club1.getName().compareToIgnoreCase(club2.getName());
                    }
                    
                    return "desc".equalsIgnoreCase(sortDirection) ? -comparison : comparison;
                })
                .collect(java.util.stream.Collectors.toList());
        
        return clubs;
    }
    
    // Paginated advanced search method
    public Page<Club> advancedSearchClubs(String search, String schoolId, String category, 
                                          String meetingDay, String advisorName, String status, 
                                          Pageable pageable) {
        
        // For simplicity, we'll use the existing search and then apply pagination
        // In a production environment, you'd want to implement this with proper MongoDB queries
        List<Club> allClubs = advancedSearchClubs(search, schoolId, category, meetingDay, 
                                                   advisorName, status, "name", "asc");
        
        // Manual pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allClubs.size());
        
        List<Club> pageContent = start >= allClubs.size() ? 
                                 new ArrayList<>() : 
                                 allClubs.subList(start, end);
        
        return new org.springframework.data.domain.PageImpl<>(
            pageContent, pageable, allClubs.size()
        );
    }
    
    // Validation
    private void validateClub(Club club) {
        if (club == null) {
            throw new IllegalArgumentException("Club cannot be null");
        }
        
        if (club.getName() == null || club.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Club name is required");
        }
        
        if (club.getSchoolId() == null || club.getSchoolId().trim().isEmpty()) {
            throw new IllegalArgumentException("School ID is required");
        }
        
        if (club.getName().trim().length() > 100) {
            throw new IllegalArgumentException("Club name cannot exceed 100 characters");
        }
        
        if (club.getDescription() != null && club.getDescription().length() > 1000) {
            throw new IllegalArgumentException("Club description cannot exceed 1000 characters");
        }
        
        if (club.getAdvisorEmail() != null && !club.getAdvisorEmail().trim().isEmpty()) {
            if (!isValidEmail(club.getAdvisorEmail())) {
                throw new IllegalArgumentException("Invalid advisor email format");
            }
        }
        
        if (club.getMaxMembers() != null && club.getMaxMembers() < 1) {
            throw new IllegalArgumentException("Maximum members must be at least 1");
        }
    }
    
    private boolean isValidEmail(String email) {
        // Simple email validation
        return email != null && email.trim().matches("^[A-Za-z0-9+_.-]+@(.+)$");
    }
    
    // Utility methods
    public boolean clubExistsInSchool(String clubName, String schoolId) {
        return clubRepository.existsByNameAndSchoolId(clubName, schoolId);
    }
    
    public Optional<Club> findClubByNameAndSchool(String clubName, String schoolId) {
        return clubRepository.findByNameAndSchoolId(clubName, schoolId);
    }
}