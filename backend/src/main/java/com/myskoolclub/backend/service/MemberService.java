package com.myskoolclub.backend.service;

import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class MemberService {

    @Autowired
    private MemberRepository memberRepository;

    /**
     * Create a new member
     */
    public Member createMember(Member member) {
        // Validate mandatory fields
        validateMandatoryFields(member);
        
        // Check if email already exists
        if (memberRepository.existsByEmail(member.getEmail())) {
            throw new RuntimeException("A member with email '" + member.getEmail() + "' already exists");
        }
        
        // Set system fields
        member.setCreatedAt(LocalDateTime.now());
        member.setUpdatedAt(LocalDateTime.now());
        // New members start as inactive (isActive=false) and require admin activation
        
        // Set default role for new members
        if (member.getRole() == null || member.getRole().trim().isEmpty()) {
            member.setRole("SCHOOL_USER");
        }
        
        return memberRepository.save(member);
    }

    /**
     * Get all members
     */
    public List<Member> getAllMembers() {
        return memberRepository.findAll();
    }

    /**
     * Get all active members
     */
    public List<Member> getAllActiveMembers() {
        return memberRepository.findByIsActive(true);
    }

    /**
     * Find member by email
     */
    public Optional<Member> findByEmail(String email) {
        return memberRepository.findByEmail(email);
    }

    /**
     * Get members by type
     */
    public List<Member> getMembersByType(String memberType) {
        return memberRepository.findByMemberTypeAndIsActive(memberType, true);
    }

    /**
     * Get member by ID
     */
    public Optional<Member> getMemberById(String id) {
        return memberRepository.findById(id);
    }

    /**
     * Get member by email
     */
    public Optional<Member> getMemberByEmail(String email) {
        return memberRepository.findByEmail(email);
    }

    /**
     * Get members by school
     */
    public List<Member> getMembersBySchool(String schoolId) {
        return memberRepository.findBySchoolIdAndIsActive(schoolId, true);
    }

    /**
     * Get members by grade level (for students)
     */
    public List<Member> getMembersByGradeLevel(String gradeLevel) {
        return memberRepository.findByGradeLevelAndIsActive(gradeLevel, true);
    }

    /**
     * Update member
     */
    public Member updateMember(String id, Member updatedMember) {
        Optional<Member> existingMemberOpt = memberRepository.findById(id);
        
        if (existingMemberOpt.isEmpty()) {
            throw new RuntimeException("Member not found with id: " + id);
        }
        
        Member existingMember = existingMemberOpt.get();
        
        // Validate mandatory fields
        validateMandatoryFields(updatedMember);
        
        // Check if email is being changed and if new email already exists
        if (!existingMember.getEmail().equals(updatedMember.getEmail())) {
            if (memberRepository.existsByEmail(updatedMember.getEmail())) {
                throw new RuntimeException("A member with email '" + updatedMember.getEmail() + "' already exists");
            }
        }
        
        // Update fields
        existingMember.setFirstName(updatedMember.getFirstName());
        existingMember.setLastName(updatedMember.getLastName());
        existingMember.setEmail(updatedMember.getEmail());
        existingMember.setMemberType(updatedMember.getMemberType());
        existingMember.setRole(updatedMember.getRole());
        existingMember.setMiddleName(updatedMember.getMiddleName());
        existingMember.setPhoneNumber(updatedMember.getPhoneNumber());
        existingMember.setDateOfBirth(updatedMember.getDateOfBirth());
        existingMember.setGender(updatedMember.getGender());
        existingMember.setAddress(updatedMember.getAddress());
        existingMember.setCity(updatedMember.getCity());
        existingMember.setState(updatedMember.getState());
        existingMember.setZipCode(updatedMember.getZipCode());
        existingMember.setCountry(updatedMember.getCountry());
        existingMember.setParentName(updatedMember.getParentName());
        existingMember.setParentEmail(updatedMember.getParentEmail());
        existingMember.setParentPhone(updatedMember.getParentPhone());
        existingMember.setEmergencyContactName(updatedMember.getEmergencyContactName());
        existingMember.setEmergencyContactPhone(updatedMember.getEmergencyContactPhone());
        existingMember.setGradeLevel(updatedMember.getGradeLevel());
        existingMember.setSchoolId(updatedMember.getSchoolId());
        existingMember.setStudentId(updatedMember.getStudentId());
        existingMember.setEnrollmentDate(updatedMember.getEnrollmentDate());
        existingMember.setUpdatedAt(LocalDateTime.now());
        
        return memberRepository.save(existingMember);
    }

    /**
     * Delete member (soft delete by setting isActive to false)
     */
    public void deleteMember(String id) {
        Optional<Member> memberOpt = memberRepository.findById(id);
        
        if (memberOpt.isEmpty()) {
            throw new RuntimeException("Member not found with id: " + id);
        }
        
        Member member = memberOpt.get();
        member.setActive(false);
        member.setUpdatedAt(LocalDateTime.now());
        memberRepository.save(member);
    }

    /**
     * Permanently delete member
     */
    public void permanentlyDeleteMember(String id) {
        if (!memberRepository.existsById(id)) {
            throw new RuntimeException("Member not found with id: " + id);
        }
        memberRepository.deleteById(id);
    }

    /**
     * Activate member (set active status to true)
     */
    public Member activateMember(String id) {
        Optional<Member> memberOpt = memberRepository.findById(id);
        
        if (memberOpt.isEmpty()) {
            throw new RuntimeException("Member not found with id: " + id);
        }
        
        Member member = memberOpt.get();
        member.setActive(true);
        member.setUpdatedAt(LocalDateTime.now());
        return memberRepository.save(member);
    }

    /**
     * Search members
     */
    public List<Member> searchMembers(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return getAllActiveMembers();
        }
        return memberRepository.searchActiveMembers(searchTerm.trim());
    }

    /**
     * Check if email exists
     */
    public boolean emailExists(String email) {
        return memberRepository.existsByEmail(email);
    }

    /**
     * Count members by school
     */
    public long countMembersBySchool(String schoolId) {
        return memberRepository.countBySchoolIdAndIsActive(schoolId, true);
    }

    /**
     * Count members by type
     */
    public long countMembersByType(String memberType) {
        return memberRepository.countByMemberTypeAndIsActive(memberType, true);
    }

    /**
     * Count members by grade level (for students)
     */
    public long countMembersByGradeLevel(String gradeLevel) {
        return memberRepository.countByGradeLevelAndIsActive(gradeLevel, true);
    }

    /**
     * Advanced search, filter, and sort members
     */
    public List<Member> advancedSearchMembers(String search, String schoolId, String memberType, 
                                            String gradeLevel, String department, String gender,
                                            String city, String state, String sortBy, String sortDirection) {
        
        // Start with all active members
        List<Member> members = memberRepository.findByIsActive(true);
        
        // Apply search filter
        if (search != null && !search.trim().isEmpty()) {
            String searchLower = search.toLowerCase().trim();
            members = members.stream()
                .filter(member -> 
                    (member.getFirstName() != null && member.getFirstName().toLowerCase().contains(searchLower)) ||
                    (member.getLastName() != null && member.getLastName().toLowerCase().contains(searchLower)) ||
                    (member.getEmail() != null && member.getEmail().toLowerCase().contains(searchLower)) ||
                    (member.getSchoolName() != null && member.getSchoolName().toLowerCase().contains(searchLower)) ||
                    (member.getPhoneNumber() != null && member.getPhoneNumber().contains(searchLower)) ||
                    (member.getStudentId() != null && member.getStudentId().toLowerCase().contains(searchLower))
                ).toList();
        }
        
        // Apply school filter
        if (schoolId != null && !schoolId.trim().isEmpty()) {
            members = members.stream()
                .filter(member -> schoolId.equals(member.getSchoolId()))
                .toList();
        }
        
        // Apply member type filter
        if (memberType != null && !memberType.trim().isEmpty()) {
            members = members.stream()
                .filter(member -> memberType.equalsIgnoreCase(member.getMemberType()))
                .toList();
        }
        
        // Apply grade level filter (for students)
        if (gradeLevel != null && !gradeLevel.trim().isEmpty()) {
            members = members.stream()
                .filter(member -> gradeLevel.equals(member.getGradeLevel()))
                .toList();
        }
        
        // Apply department filter (for teachers) - Skip this filter as department field doesn't exist yet
        // TODO: Add department field to Member model if needed for teacher functionality
        
        // Apply gender filter
        if (gender != null && !gender.trim().isEmpty()) {
            members = members.stream()
                .filter(member -> gender.equalsIgnoreCase(member.getGender()))
                .toList();
        }
        
        // Apply city filter
        if (city != null && !city.trim().isEmpty()) {
            String cityLower = city.toLowerCase().trim();
            members = members.stream()
                .filter(member -> member.getCity() != null && 
                                member.getCity().toLowerCase().contains(cityLower))
                .toList();
        }
        
        // Apply state filter
        if (state != null && !state.trim().isEmpty()) {
            String stateLower = state.toLowerCase().trim();
            members = members.stream()
                .filter(member -> member.getState() != null && 
                                member.getState().toLowerCase().contains(stateLower))
                .toList();
        }
        
        // Apply sorting
        if (sortBy != null && !sortBy.trim().isEmpty()) {
            boolean ascending = !"desc".equalsIgnoreCase(sortDirection);
            
            members = members.stream()
                .sorted((m1, m2) -> {
                    String value1 = getMemberFieldValue(m1, sortBy);
                    String value2 = getMemberFieldValue(m2, sortBy);
                    
                    // Handle null values
                    if (value1 == null && value2 == null) return 0;
                    if (value1 == null) return ascending ? 1 : -1;
                    if (value2 == null) return ascending ? -1 : 1;
                    
                    int comparison = value1.compareToIgnoreCase(value2);
                    return ascending ? comparison : -comparison;
                })
                .toList();
        }
        
        return members;
    }
    
    /**
     * Helper method to get field value for sorting
     */
    private String getMemberFieldValue(Member member, String fieldName) {
        if (member == null || fieldName == null) return "";
        
        return switch (fieldName.toLowerCase()) {
            case "firstname" -> member.getFirstName();
            case "lastname" -> member.getLastName();
            case "email" -> member.getEmail();
            case "membertype" -> member.getMemberType();
            case "schoolname" -> member.getSchoolName();
            case "gradelevel" -> member.getGradeLevel();
            case "department" -> ""; // Department field doesn't exist yet
            case "dateofbirth" -> member.getDateOfBirth() != null ? member.getDateOfBirth().toString() : "";
            case "city" -> member.getCity();
            case "state" -> member.getState();
            case "phonenumber" -> member.getPhoneNumber();
            case "gender" -> member.getGender();
            default -> member.getLastName(); // Default to lastName
        };
    }

    /**
     * Validate mandatory fields
     */
    private void validateMandatoryFields(Member member) {
        List<String> errors = new ArrayList<>();
        
        if (member.getFirstName() == null || member.getFirstName().trim().isEmpty()) {
            errors.add("First name is required");
        }
        
        if (member.getLastName() == null || member.getLastName().trim().isEmpty()) {
            errors.add("Last name is required");
        }
        
        if (member.getEmail() == null || member.getEmail().trim().isEmpty()) {
            errors.add("Email is required");
        } else if (!isValidEmail(member.getEmail())) {
            errors.add("Invalid email format");
        }
        
        // For APP_ADMIN, memberType can be "admin" and schoolId/schoolName are not required
        boolean isAppAdmin = "APP_ADMIN".equals(member.getRole());
        
        if (member.getMemberType() == null || member.getMemberType().trim().isEmpty()) {
            errors.add("Member type is required");
        } else if (!isAppAdmin && !isValidMemberType(member.getMemberType())) {
            errors.add("Invalid member type. Must be 'student' or 'teacher'");
        }
        
        if (!isAppAdmin && (member.getSchoolId() == null || member.getSchoolId().trim().isEmpty())) {
            errors.add("School ID is required");
        }
        
        if (!isAppAdmin && (member.getSchoolName() == null || member.getSchoolName().trim().isEmpty())) {
            errors.add("School name is required");
        }
        
        if (member.getPasswordHash() == null || member.getPasswordHash().trim().isEmpty()) {
            errors.add("Password is required");
        }
        
        if (!errors.isEmpty()) {
            throw new IllegalArgumentException("Validation errors: " + String.join(", ", errors));
        }
    }
    
    private boolean isValidMemberType(String memberType) {
        return memberType != null && 
               (memberType.equalsIgnoreCase("student") || memberType.equalsIgnoreCase("teacher"));
    }

    /**
     * Basic email validation
     */
    private boolean isValidEmail(String email) {
        return email != null && 
               email.contains("@") && 
               email.indexOf("@") > 0 && 
               email.indexOf("@") < email.length() - 1 &&
               !email.startsWith("@") &&
               !email.endsWith("@");
    }
    
    /**
     * Get members by school with pagination
     */
    public Page<Member> findBySchoolIdAndActiveTrue(String schoolId, Pageable pageable) {
        return memberRepository.findBySchoolIdAndIsActive(schoolId, true, pageable);
    }
    
    /**
     * Search members by school and search term with pagination
     */
    public Page<Member> findBySchoolIdAndSearchTerm(String schoolId, String searchTerm, Pageable pageable) {
        return memberRepository.findBySchoolIdAndSearchTerm(schoolId, searchTerm, pageable);
    }
}