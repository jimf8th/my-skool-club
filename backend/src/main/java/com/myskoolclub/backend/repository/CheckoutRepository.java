package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.Checkout;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Checkout entity with custom query methods
 */
@Repository
public interface CheckoutRepository extends MongoRepository<Checkout, String> {
    
    // Find by checkout number
    Optional<Checkout> findByCheckoutNumber(String checkoutNumber);
    
    // Find by club
    List<Checkout> findByClubId(String clubId);
    List<Checkout> findByClubName(String clubName);
    List<Checkout> findByClubIdOrderByCheckoutDateDesc(String clubId);
    
    // Find by status
    List<Checkout> findByStatus(String status);
    List<Checkout> findByStatusOrderByCheckoutDateDesc(String status);
    
    // Find by approval status
    List<Checkout> findByApprovalStatus(String approvalStatus);
    List<Checkout> findByClubIdInAndApprovalStatus(List<String> clubIds, String approvalStatus);
    
    // Find by status for multiple clubs
    List<Checkout> findByClubIdInAndStatus(List<String> clubIds, String status);
    
    // Paginated queries
    Page<Checkout> findByClubId(String clubId, Pageable pageable);
    Page<Checkout> findByStatus(String status, Pageable pageable);
    
    @Query("{'$or': [" +
           "{'checkoutNumber': {$regex: ?0, $options: 'i'}}, " +
           "{'clubName': {$regex: ?0, $options: 'i'}}, " +
           "{'borrowerName': {$regex: ?0, $options: 'i'}}, " +
           "{'borrowerEmail': {$regex: ?0, $options: 'i'}}, " +
           "{'checkoutItems.itemName': {$regex: ?0, $options: 'i'}}, " +
           "{'checkoutItems.itemType': {$regex: ?0, $options: 'i'}}, " +
           "{'notes': {$regex: ?0, $options: 'i'}}" +
           "]}")
    Page<Checkout> searchByKeyword(String keyword, Pageable pageable);
    
    @Query("{'$and': [" +
           "{'clubId': ?0}, " +
           "{'$or': [" +
           "{'checkoutNumber': {$regex: ?1, $options: 'i'}}, " +
           "{'borrowerName': {$regex: ?1, $options: 'i'}}, " +
           "{'borrowerEmail': {$regex: ?1, $options: 'i'}}, " +
           "{'checkoutItems.itemName': {$regex: ?1, $options: 'i'}}, " +
           "{'notes': {$regex: ?1, $options: 'i'}}" +
           "]}" +
           "]}")
    Page<Checkout> searchByClubAndKeyword(String clubId, String keyword, Pageable pageable);
    
    // Find by borrower
    List<Checkout> findByBorrowerName(String borrowerName);
    List<Checkout> findByBorrowerEmail(String borrowerEmail);
    List<Checkout> findByBorrowerNameContainingIgnoreCase(String borrowerName);
    
    // Find by date ranges
    List<Checkout> findByCheckoutDateBetween(LocalDate startDate, LocalDate endDate);
    List<Checkout> findByDueDateBetween(LocalDate startDate, LocalDate endDate);
    List<Checkout> findByReturnDateBetween(LocalDate startDate, LocalDate endDate);
    
    // Find overdue checkouts (due date passed and status is ACTIVE)
    @Query("{'dueDate': {$lt: ?0}, 'status': 'ACTIVE'}")
    List<Checkout> findOverdueCheckouts(LocalDate currentDate);
    
    // Find by estimated value range
    List<Checkout> findByTotalEstimatedValueBetween(BigDecimal minValue, BigDecimal maxValue);
    List<Checkout> findByTotalEstimatedValueGreaterThan(BigDecimal minValue);
    List<Checkout> findByTotalEstimatedValueLessThan(BigDecimal maxValue);
    
    // Complex search queries
    @Query("{'$or': [" +
           "{'checkoutNumber': {$regex: ?0, $options: 'i'}}, " +
           "{'clubName': {$regex: ?0, $options: 'i'}}, " +
           "{'borrowerName': {$regex: ?0, $options: 'i'}}, " +
           "{'borrowerEmail': {$regex: ?0, $options: 'i'}}, " +
           "{'checkoutItems.itemName': {$regex: ?0, $options: 'i'}}, " +
           "{'checkoutItems.itemType': {$regex: ?0, $options: 'i'}}, " +
           "{'notes': {$regex: ?0, $options: 'i'}}" +
           "]}")
    List<Checkout> searchByKeyword(String keyword);
    
    // Advanced search with multiple filters
    @Query("{'$and': [" +
           "{'clubId': {$regex: ?0, $options: 'i'}}, " +
           "{'status': {$regex: ?1, $options: 'i'}}, " +
           "{'borrowerName': {$regex: ?2, $options: 'i'}}, " +
           "{'checkoutDate': {$gte: ?3}}, " +
           "{'checkoutDate': {$lte: ?4}}, " +
           "{'dueDate': {$gte: ?5}}, " +
           "{'dueDate': {$lte: ?6}}, " +
           "{'totalEstimatedValue': {$gte: ?7}}, " +
           "{'totalEstimatedValue': {$lte: ?8}}" +
           "]}")
    List<Checkout> findByAdvancedFilters(
        String clubId, String status, String borrowerName,
        LocalDate checkoutDateFrom, LocalDate checkoutDateTo,
        LocalDate dueDateFrom, LocalDate dueDateTo,
        BigDecimal minValue, BigDecimal maxValue
    );
    
    // Count queries
    long countByStatus(String status);
    long countByClubId(String clubId);
    long countByCheckoutDateBetween(LocalDate startDate, LocalDate endDate);
    
    @Query(value = "{'dueDate': {$lt: ?0}, 'status': 'ACTIVE'}", count = true)
    long countOverdueCheckouts(LocalDate currentDate);
    
    // Statistics queries
    @Query("{'status': 'ACTIVE'}")
    List<Checkout> findActiveCheckouts();
    
    @Query("{'status': 'RETURNED'}")
    List<Checkout> findReturnedCheckouts();
    
    // Find checkouts with specific item types
    @Query("{'checkoutItems.itemType': {$regex: ?0, $options: 'i'}}")
    List<Checkout> findByItemType(String itemType);
    
    // Find checkouts with specific item names
    @Query("{'checkoutItems.itemName': {$regex: ?0, $options: 'i'}}")
    List<Checkout> findByItemName(String itemName);
    
    // Recent checkouts
    List<Checkout> findTop10ByOrderByCreatedAtDesc();
    List<Checkout> findTop20ByOrderByCheckoutDateDesc();
    
    // Delete operations
    void deleteByClubId(String clubId);
}