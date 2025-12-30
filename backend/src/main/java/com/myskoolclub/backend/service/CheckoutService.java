package com.myskoolclub.backend.service;

import com.myskoolclub.backend.model.Checkout;
import com.myskoolclub.backend.repository.CheckoutRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Service class for Checkout operations
 */
@Service
public class CheckoutService {
    
    @Autowired
    private CheckoutRepository checkoutRepository;
    
    // CRUD Operations
    
    /**
     * Get all checkouts
     */
    public List<Checkout> getAllCheckouts() {
        return checkoutRepository.findAll();
    }
    
    /**
     * Get all checkouts with pagination
     */
    public Page<Checkout> getAllCheckouts(Pageable pageable) {
        return checkoutRepository.findAll(pageable);
    }
    
    /**
     * Get checkout by ID
     */
    public Optional<Checkout> getCheckoutById(String id) {
        return checkoutRepository.findById(id);
    }
    
    /**
     * Get checkout by checkout number
     */
    public Optional<Checkout> getCheckoutByNumber(String checkoutNumber) {
        return checkoutRepository.findByCheckoutNumber(checkoutNumber);
    }
    
    /**
     * Create a new checkout
     */
    public Checkout createCheckout(Checkout checkout) {
        // Auto-generate checkout number if not provided
        if (checkout.getCheckoutNumber() == null || checkout.getCheckoutNumber().trim().isEmpty()) {
            String userName = checkout.getCreatedByName() != null ? checkout.getCreatedByName() : "UNKN";
            checkout.setCheckoutNumber(generateCheckoutNumber(userName));
        }
        
        // Set timestamps
        checkout.setCreatedAt(LocalDateTime.now());
        checkout.setUpdatedAt(LocalDateTime.now());
        
        // Calculate total estimated value
        checkout.calculateTotalValue();
        
        // Validate checkout
        validateCheckout(checkout);
        
        return checkoutRepository.save(checkout);
    }
    
    /**
     * Update an existing checkout
     */
    public Optional<Checkout> updateCheckout(String id, Checkout updatedCheckout) {
        return checkoutRepository.findById(id)
                .map(existingCheckout -> {
                    // Update fields
                    existingCheckout.setClubId(updatedCheckout.getClubId());
                    existingCheckout.setClubName(updatedCheckout.getClubName());
                    existingCheckout.setCheckoutDate(updatedCheckout.getCheckoutDate());
                    existingCheckout.setDueDate(updatedCheckout.getDueDate());
                    existingCheckout.setReturnDate(updatedCheckout.getReturnDate());
                    existingCheckout.setStatus(updatedCheckout.getStatus());
                    existingCheckout.setBorrowerName(updatedCheckout.getBorrowerName());
                    existingCheckout.setBorrowerEmail(updatedCheckout.getBorrowerEmail());
                    existingCheckout.setBorrowerPhone(updatedCheckout.getBorrowerPhone());
                    existingCheckout.setBorrowerAddress(updatedCheckout.getBorrowerAddress());
                    existingCheckout.setCheckoutItems(updatedCheckout.getCheckoutItems());
                    existingCheckout.setNotes(updatedCheckout.getNotes());
                    existingCheckout.setReturnNotes(updatedCheckout.getReturnNotes());
                    existingCheckout.setUpdatedBy(updatedCheckout.getUpdatedBy());
                    existingCheckout.setUpdatedByName(updatedCheckout.getUpdatedByName());
                    
                    // Update timestamp
                    existingCheckout.setUpdatedAt(LocalDateTime.now());
                    
                    // Recalculate total value
                    existingCheckout.calculateTotalValue();
                    
                    // Validate updated checkout
                    validateCheckout(existingCheckout);
                    
                    return checkoutRepository.save(existingCheckout);
                });
    }
    
    /**
     * Delete a checkout
     */
    public boolean deleteCheckout(String id) {
        if (checkoutRepository.existsById(id)) {
            checkoutRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    // Search and Filter Operations
    
    /**
     * Search checkouts by keyword
     */
    public List<Checkout> searchCheckouts(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAllCheckouts();
        }
        return checkoutRepository.searchByKeyword(keyword.trim());
    }
    
    /**
     * Advanced search with multiple filters
     */
    public List<Checkout> advancedSearchCheckouts(
            String clubId, String status, String borrowerName,
            LocalDate checkoutDateFrom, LocalDate checkoutDateTo,
            LocalDate dueDateFrom, LocalDate dueDateTo,
            BigDecimal minValue, BigDecimal maxValue) {
        
        // Set default values for empty filters
        String clubFilter = (clubId != null && !clubId.trim().isEmpty()) ? clubId : ".*";
        String statusFilter = (status != null && !status.trim().isEmpty()) ? status : ".*";
        String borrowerFilter = (borrowerName != null && !borrowerName.trim().isEmpty()) ? borrowerName : ".*";
        
        LocalDate checkoutFrom = (checkoutDateFrom != null) ? checkoutDateFrom : LocalDate.of(2000, 1, 1);
        LocalDate checkoutTo = (checkoutDateTo != null) ? checkoutDateTo : LocalDate.of(2100, 12, 31);
        LocalDate dueFrom = (dueDateFrom != null) ? dueDateFrom : LocalDate.of(2000, 1, 1);
        LocalDate dueTo = (dueDateTo != null) ? dueDateTo : LocalDate.of(2100, 12, 31);
        
        BigDecimal minVal = (minValue != null) ? minValue : BigDecimal.ZERO;
        BigDecimal maxVal = (maxValue != null) ? maxValue : new BigDecimal("999999999");
        
        return checkoutRepository.findByAdvancedFilters(
            clubFilter, statusFilter, borrowerFilter,
            checkoutFrom, checkoutTo, dueFrom, dueTo,
            minVal, maxVal
        );
    }
    
    /**
     * Get checkouts by club
     */
    public List<Checkout> getCheckoutsByClub(String clubId) {
        return checkoutRepository.findByClubIdOrderByCheckoutDateDesc(clubId);
    }
    
    /**
     * Get checkouts by status
     */
    public List<Checkout> getCheckoutsByStatus(String status) {
        return checkoutRepository.findByStatusOrderByCheckoutDateDesc(status);
    }
    
    /**
     * Get overdue checkouts
     */
    public List<Checkout> getOverdueCheckouts() {
        return checkoutRepository.findOverdueCheckouts(LocalDate.now());
    }
    
    /**
     * Get active checkouts
     */
    public List<Checkout> getActiveCheckouts() {
        return checkoutRepository.findActiveCheckouts();
    }
    
    /**
     * Get returned checkouts
     */
    public List<Checkout> getReturnedCheckouts() {
        return checkoutRepository.findReturnedCheckouts();
    }
    
    /**
     * Get checkouts by borrower
     */
    public List<Checkout> getCheckoutsByBorrower(String borrowerName) {
        return checkoutRepository.findByBorrowerNameContainingIgnoreCase(borrowerName);
    }
    
    /**
     * Get checkouts by date range
     */
    public List<Checkout> getCheckoutsByDateRange(LocalDate startDate, LocalDate endDate) {
        return checkoutRepository.findByCheckoutDateBetween(startDate, endDate);
    }
    
    /**
     * Get checkouts by item type
     */
    public List<Checkout> getCheckoutsByItemType(String itemType) {
        return checkoutRepository.findByItemType(itemType);
    }
    
    /**
     * Get recent checkouts
     */
    public List<Checkout> getRecentCheckouts() {
        return checkoutRepository.findTop20ByOrderByCheckoutDateDesc();
    }
    
    // Statistics and Counts
    
    /**
     * Get total checkout count
     */
    public long getTotalCheckoutCount() {
        return checkoutRepository.count();
    }
    
    /**
     * Get count by status
     */
    public long getCountByStatus(String status) {
        return checkoutRepository.countByStatus(status);
    }
    
    /**
     * Get count by club
     */
    public long getCountByClub(String clubId) {
        return checkoutRepository.countByClubId(clubId);
    }
    
    /**
     * Get overdue checkout count
     */
    public long getOverdueCheckoutCount() {
        return checkoutRepository.countOverdueCheckouts(LocalDate.now());
    }
    
    // Utility Methods
    
    /**
     * Generate unique checkout number in format:
     * CHK-<12 alpha identifier for date/time>-<1ST 4 CHARACTERS OF USER NAME>-<4 DIGIT RANDOM NUMBER>
     * Example: CHK-202412251430-JOHN-5738
     */
    private String generateCheckoutNumber(String createdByName) {
        // Format: CHK-YYYYMMDDHHmm-XXXX-NNNN
        LocalDateTime now = LocalDateTime.now();
        String dateTimePart = now.format(DateTimeFormatter.ofPattern("yyyyMMddHHmm"));
        
        // Get first 4 characters of user name (uppercase, remove spaces)
        String userPart = createdByName.replaceAll("\\s+", "").toUpperCase();
        if (userPart.length() > 4) {
            userPart = userPart.substring(0, 4);
        } else {
            // Pad with 'X' if less than 4 characters
            userPart = String.format("%-4s", userPart).replace(' ', 'X');
        }
        
        // Generate 4-digit random number
        int randomNum = (int)(Math.random() * 9000) + 1000; // Random number between 1000-9999
        
        return String.format("CHK-%s-%s-%04d", dateTimePart, userPart, randomNum);
    }
    
    /**
     * Validate checkout data
     */
    private void validateCheckout(Checkout checkout) {
        if (checkout.getCheckoutNumber() == null || checkout.getCheckoutNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("Checkout number is required");
        }
        
        if (checkout.getClubId() == null || checkout.getClubId().trim().isEmpty()) {
            throw new IllegalArgumentException("Club ID is required");
        }
        
        if (checkout.getClubName() == null || checkout.getClubName().trim().isEmpty()) {
            throw new IllegalArgumentException("Club name is required");
        }
        
        if (checkout.getBorrowerName() == null || checkout.getBorrowerName().trim().isEmpty()) {
            throw new IllegalArgumentException("Borrower name is required");
        }
        
        if (checkout.getBorrowerEmail() == null || checkout.getBorrowerEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Borrower email is required");
        }
        
        if (checkout.getCheckoutDate() == null) {
            throw new IllegalArgumentException("Checkout date is required");
        }
        
        if (checkout.getDueDate() == null) {
            throw new IllegalArgumentException("Due date is required");
        }
        
        if (checkout.getDueDate().isBefore(checkout.getCheckoutDate())) {
            throw new IllegalArgumentException("Due date cannot be before checkout date");
        }
        
        if (checkout.getCheckoutItems() == null || checkout.getCheckoutItems().isEmpty()) {
            throw new IllegalArgumentException("At least one checkout item is required");
        }
        
        // Validate checkout items
        for (int i = 0; i < checkout.getCheckoutItems().size(); i++) {
            var item = checkout.getCheckoutItems().get(i);
            if (item.getItemName() == null || item.getItemName().trim().isEmpty()) {
                throw new IllegalArgumentException("Item name is required for item " + (i + 1));
            }
            if (item.getQuantity() <= 0) {
                throw new IllegalArgumentException("Item quantity must be greater than 0 for item " + (i + 1));
            }
        }
    }
    
    /**
     * Return items (mark checkout as returned)
     */
    public Optional<Checkout> returnCheckout(String id, String returnNotes) {
        return checkoutRepository.findById(id)
                .map(checkout -> {
                    checkout.setStatus("RETURNED");
                    checkout.setReturnDate(LocalDate.now());
                    checkout.setReturnNotes(returnNotes);
                    checkout.setUpdatedAt(LocalDateTime.now());
                    
                    return checkoutRepository.save(checkout);
                });
    }
    
    /**
     * Mark checkout as overdue
     */
    public Optional<Checkout> markAsOverdue(String id) {
        return checkoutRepository.findById(id)
                .map(checkout -> {
                    checkout.setStatus("OVERDUE");
                    checkout.setUpdatedAt(LocalDateTime.now());
                    
                    return checkoutRepository.save(checkout);
                });
    }
    
    /**
     * Find checkout by ID
     */
    public Optional<Checkout> findById(String id) {
        return checkoutRepository.findById(id);
    }
    
    /**
     * Save checkout
     */
    public Checkout save(Checkout checkout) {
        return checkoutRepository.save(checkout);
    }
    
    /**
     * Find checkouts by approval status
     */
    public List<Checkout> findByApprovalStatus(String approvalStatus) {
        return checkoutRepository.findByApprovalStatus(approvalStatus);
    }
    
    /**
     * Find checkouts by club IDs and approval status
     */
    public List<Checkout> findByClubIdInAndApprovalStatus(List<String> clubIds, String approvalStatus) {
        return checkoutRepository.findByClubIdInAndApprovalStatus(clubIds, approvalStatus);
    }
    
    /**
     * Find checkouts by club IDs and status
     */
    public List<Checkout> findByClubIdInAndStatus(List<String> clubIds, String status) {
        return checkoutRepository.findByClubIdInAndStatus(clubIds, status);
    }
    
    /**
     * Find checkouts by status
     */
    public List<Checkout> findByStatus(String status) {
        return checkoutRepository.findByStatusOrderByCheckoutDateDesc(status);
    }
    
    /**
     * Get checkouts by club with pagination
     */
    public Page<Checkout> getCheckoutsByClub(String clubId, Pageable pageable) {
        return checkoutRepository.findByClubId(clubId, pageable);
    }
    
    /**
     * Get checkouts by status with pagination
     */
    public Page<Checkout> getCheckoutsByStatus(String status, Pageable pageable) {
        return checkoutRepository.findByStatus(status, pageable);
    }
    
    /**
     * Search checkouts by keyword with pagination
     */
    public Page<Checkout> searchCheckoutsByKeyword(String keyword, Pageable pageable) {
        return checkoutRepository.searchByKeyword(keyword, pageable);
    }
    
    /**
     * Search checkouts by club and keyword with pagination
     */
    public Page<Checkout> searchCheckoutsByClubAndKeyword(String clubId, String keyword, Pageable pageable) {
        return checkoutRepository.searchByClubAndKeyword(clubId, keyword, pageable);
    }
}