package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends MongoRepository<Invoice, String> {
    
    // Find by invoice number
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    boolean existsByInvoiceNumber(String invoiceNumber);
    
    // Find by club
    List<Invoice> findByClubId(String clubId);
    Page<Invoice> findByClubId(String clubId, Pageable pageable);
    List<Invoice> findByClubName(String clubName);
    List<Invoice> findByClubIdOrderByCreatedAtDesc(String clubId);
    
    // Find by status
    List<Invoice> findByStatus(String status);
    Page<Invoice> findByStatus(String status, Pageable pageable);
    List<Invoice> findByStatusIn(List<String> statuses);
    List<Invoice> findByClubIdAndStatus(String clubId, String status);
    
    // Find by date ranges
    List<Invoice> findByIssueDateBetween(LocalDate startDate, LocalDate endDate);
    List<Invoice> findByDueDateBetween(LocalDate startDate, LocalDate endDate);
    List<Invoice> findByDueDateBeforeAndStatus(LocalDate date, String status);
    
    // Find overdue invoices
    @Query("{ 'dueDate': { $lt: ?0 }, 'status': { $in: ['SENT', 'OVERDUE'] } }")
    List<Invoice> findOverdueInvoices(LocalDate currentDate);
    
    // Search functionality
    @Query("{ $or: [ " +
           "{ 'invoiceNumber': { $regex: ?0, $options: 'i' } }, " +
           "{ 'clubName': { $regex: ?0, $options: 'i' } }, " +
           "{ 'billToName': { $regex: ?0, $options: 'i' } }, " +
           "{ 'notes': { $regex: ?0, $options: 'i' } } " +
           "] }")
    List<Invoice> searchInvoicesByKeyword(String keyword);
    
    @Query("{ $or: [ " +
           "{ 'invoiceNumber': { $regex: ?0, $options: 'i' } }, " +
           "{ 'clubName': { $regex: ?0, $options: 'i' } }, " +
           "{ 'billToName': { $regex: ?0, $options: 'i' } }, " +
           "{ 'notes': { $regex: ?0, $options: 'i' } } " +
           "] }")
    Page<Invoice> searchInvoicesByKeyword(String keyword, Pageable pageable);
    
    @Query("{ 'clubId': ?0, $or: [ " +
           "{ 'invoiceNumber': { $regex: ?1, $options: 'i' } }, " +
           "{ 'clubName': { $regex: ?1, $options: 'i' } }, " +
           "{ 'billToName': { $regex: ?1, $options: 'i' } }, " +
           "{ 'notes': { $regex: ?1, $options: 'i' } } " +
           "] }")
    List<Invoice> searchInvoicesByClubAndKeyword(String clubId, String keyword);
    
    @Query("{ 'clubId': ?0, $or: [ " +
           "{ 'invoiceNumber': { $regex: ?1, $options: 'i' } }, " +
           "{ 'clubName': { $regex: ?1, $options: 'i' } }, " +
           "{ 'billToName': { $regex: ?1, $options: 'i' } }, " +
           "{ 'notes': { $regex: ?1, $options: 'i' } } " +
           "] }")
    Page<Invoice> searchInvoicesByClubAndKeyword(String clubId, String keyword, Pageable pageable);
    
    // Count queries
    long countByClubId(String clubId);
    long countByStatus(String status);
    long countByClubIdAndStatus(String clubId, String status);
    
    // Find recent invoices
    List<Invoice> findTop10ByOrderByCreatedAtDesc();
    List<Invoice> findByClubIdOrderByCreatedAtDesc(String clubId, org.springframework.data.domain.Pageable pageable);
    
    // Find by total amount range
    @Query("{ 'totalAmount': { $gte: ?0, $lte: ?1 } }")
    List<Invoice> findByTotalAmountBetween(java.math.BigDecimal minAmount, java.math.BigDecimal maxAmount);
    
    // Approval-related queries
    Page<Invoice> findByApprovalStatus(String approvalStatus, Pageable pageable);
    Page<Invoice> findByApprovalStatusAndClubIdIn(String approvalStatus, List<String> clubIds, Pageable pageable);
    List<Invoice> findByApprovalStatus(String approvalStatus);
    List<Invoice> findByApprovalStatusAndClubId(String approvalStatus, String clubId);
}