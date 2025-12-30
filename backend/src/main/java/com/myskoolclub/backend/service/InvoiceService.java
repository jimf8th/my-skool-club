package com.myskoolclub.backend.service;

import com.myskoolclub.backend.model.Invoice;
import com.myskoolclub.backend.repository.InvoiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class InvoiceService {
    
    @Autowired
    private InvoiceRepository invoiceRepository;
    
    // Create operations
    public Invoice createInvoice(Invoice invoice) {
        validateInvoice(invoice);
        
        // Generate invoice number if not provided
        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().trim().isEmpty()) {
            String userName = invoice.getCreatedByName() != null ? invoice.getCreatedByName() : "USER";
            invoice.setInvoiceNumber(generateInvoiceNumber(userName));
        } else {
            // Check for duplicate invoice number
            if (invoiceRepository.existsByInvoiceNumber(invoice.getInvoiceNumber())) {
                throw new IllegalArgumentException("An invoice with number '" + invoice.getInvoiceNumber() + "' already exists");
            }
        }
        
        // Set initial status to PENDING for new invoices
        invoice.setStatus("PENDING");
        invoice.setApprovalStatus("PENDING");
        
        // Set system fields
        invoice.setCreatedAt(LocalDateTime.now());
        invoice.setUpdatedAt(LocalDateTime.now());
        
        // Calculate totals
        invoice.calculateTotals();
        
        return invoiceRepository.save(invoice);
    }
    
    // Read operations
    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }
    
    public Page<Invoice> getAllInvoices(Pageable pageable) {
        return invoiceRepository.findAll(pageable);
    }
    
    public Optional<Invoice> getInvoiceById(String id) {
        return invoiceRepository.findById(id);
    }
    
    public Optional<Invoice> getInvoiceByNumber(String invoiceNumber) {
        return invoiceRepository.findByInvoiceNumber(invoiceNumber);
    }
    
    public List<Invoice> getInvoicesByClub(String clubId) {
        return invoiceRepository.findByClubIdOrderByCreatedAtDesc(clubId);
    }
    
    public Page<Invoice> getInvoicesByClub(String clubId, Pageable pageable) {
        return invoiceRepository.findByClubId(clubId, pageable);
    }
    
    public List<Invoice> getInvoicesByStatus(String status) {
        return invoiceRepository.findByStatus(status);
    }
    
    public Page<Invoice> getInvoicesByStatus(String status, Pageable pageable) {
        return invoiceRepository.findByStatus(status, pageable);
    }
    
    public List<Invoice> getInvoicesByDateRange(LocalDate startDate, LocalDate endDate) {
        return invoiceRepository.findByIssueDateBetween(startDate, endDate);
    }
    
    public List<Invoice> getOverdueInvoices() {
        return invoiceRepository.findOverdueInvoices(LocalDate.now());
    }
    
    public List<Invoice> searchInvoicesByKeyword(String keyword) {
        return invoiceRepository.searchInvoicesByKeyword(keyword);
    }
    
    public Page<Invoice> searchInvoicesByKeyword(String keyword, Pageable pageable) {
        return invoiceRepository.searchInvoicesByKeyword(keyword, pageable);
    }
    
    public List<Invoice> searchInvoicesByClubAndKeyword(String clubId, String keyword) {
        return invoiceRepository.searchInvoicesByClubAndKeyword(clubId, keyword);
    }
    
    public Page<Invoice> searchInvoicesByClubAndKeyword(String clubId, String keyword, Pageable pageable) {
        return invoiceRepository.searchInvoicesByClubAndKeyword(clubId, keyword, pageable);
    }
    
    // Advanced search method
    public List<Invoice> advancedSearchInvoices(String search, String clubId, String status, 
                                               LocalDate issueDateFrom, LocalDate issueDateTo,
                                               LocalDate dueDateFrom, LocalDate dueDateTo,
                                               BigDecimal minAmount, BigDecimal maxAmount,
                                               String sortBy, String sortDirection) {
        
        List<Invoice> invoices = invoiceRepository.findAll();
        
        // Apply filters
        invoices = invoices.stream()
                .filter(invoice -> {
                    // Search filter (invoice number, club name, bill to name, notes)
                    if (search != null && !search.trim().isEmpty()) {
                        String searchLower = search.toLowerCase();
                        return (invoice.getInvoiceNumber() != null && invoice.getInvoiceNumber().toLowerCase().contains(searchLower)) ||
                               (invoice.getClubName() != null && invoice.getClubName().toLowerCase().contains(searchLower)) ||
                               (invoice.getBillToName() != null && invoice.getBillToName().toLowerCase().contains(searchLower)) ||
                               (invoice.getNotes() != null && invoice.getNotes().toLowerCase().contains(searchLower));
                    }
                    return true;
                })
                .filter(invoice -> {
                    // Club filter
                    if (clubId != null && !clubId.trim().isEmpty()) {
                        return invoice.getClubId().equals(clubId);
                    }
                    return true;
                })
                .filter(invoice -> {
                    // Status filter
                    if (status != null && !status.trim().isEmpty()) {
                        return invoice.getStatus() != null && invoice.getStatus().equalsIgnoreCase(status);
                    }
                    return true;
                })
                .filter(invoice -> {
                    // Issue date range filter
                    if (issueDateFrom != null && invoice.getIssueDate() != null) {
                        if (invoice.getIssueDate().isBefore(issueDateFrom)) {
                            return false;
                        }
                    }
                    if (issueDateTo != null && invoice.getIssueDate() != null) {
                        if (invoice.getIssueDate().isAfter(issueDateTo)) {
                            return false;
                        }
                    }
                    return true;
                })
                .filter(invoice -> {
                    // Due date range filter
                    if (dueDateFrom != null && invoice.getDueDate() != null) {
                        if (invoice.getDueDate().isBefore(dueDateFrom)) {
                            return false;
                        }
                    }
                    if (dueDateTo != null && invoice.getDueDate() != null) {
                        if (invoice.getDueDate().isAfter(dueDateTo)) {
                            return false;
                        }
                    }
                    return true;
                })
                .filter(invoice -> {
                    // Amount range filter
                    if (minAmount != null && invoice.getTotalAmount() != null) {
                        if (invoice.getTotalAmount().compareTo(minAmount) < 0) {
                            return false;
                        }
                    }
                    if (maxAmount != null && invoice.getTotalAmount() != null) {
                        if (invoice.getTotalAmount().compareTo(maxAmount) > 0) {
                            return false;
                        }
                    }
                    return true;
                })
                .sorted((invoice1, invoice2) -> {
                    // Sorting
                    int comparison = 0;
                    String field = sortBy != null ? sortBy : "invoiceNumber";
                    
                    switch (field.toLowerCase()) {
                        case "invoicenumber":
                            comparison = invoice1.getInvoiceNumber().compareToIgnoreCase(invoice2.getInvoiceNumber());
                            break;
                        case "clubname":
                            String club1 = invoice1.getClubName() != null ? invoice1.getClubName() : "";
                            String club2 = invoice2.getClubName() != null ? invoice2.getClubName() : "";
                            comparison = club1.compareToIgnoreCase(club2);
                            break;
                        case "status":
                            String status1 = invoice1.getStatus() != null ? invoice1.getStatus() : "";
                            String status2 = invoice2.getStatus() != null ? invoice2.getStatus() : "";
                            comparison = status1.compareToIgnoreCase(status2);
                            break;
                        case "issuedate":
                            if (invoice1.getIssueDate() != null && invoice2.getIssueDate() != null) {
                                comparison = invoice1.getIssueDate().compareTo(invoice2.getIssueDate());
                            }
                            break;
                        case "duedate":
                            if (invoice1.getDueDate() != null && invoice2.getDueDate() != null) {
                                comparison = invoice1.getDueDate().compareTo(invoice2.getDueDate());
                            }
                            break;
                        case "totalamount":
                            if (invoice1.getTotalAmount() != null && invoice2.getTotalAmount() != null) {
                                comparison = invoice1.getTotalAmount().compareTo(invoice2.getTotalAmount());
                            }
                            break;
                        case "createdat":
                            if (invoice1.getCreatedAt() != null && invoice2.getCreatedAt() != null) {
                                comparison = invoice1.getCreatedAt().compareTo(invoice2.getCreatedAt());
                            }
                            break;
                        default:
                            comparison = invoice1.getInvoiceNumber().compareToIgnoreCase(invoice2.getInvoiceNumber());
                    }
                    
                    return "desc".equalsIgnoreCase(sortDirection) ? -comparison : comparison;
                })
                .collect(Collectors.toList());
        
        return invoices;
    }
    
    // Update operations
    public Invoice updateInvoice(String id, Invoice updatedInvoice) {
        Optional<Invoice> existingInvoiceOpt = invoiceRepository.findById(id);
        
        if (existingInvoiceOpt.isEmpty()) {
            throw new IllegalArgumentException("Invoice not found with id: " + id);
        }
        
        Invoice existingInvoice = existingInvoiceOpt.get();
        
        // Prevent editing APPROVED or REJECTED invoices
        if ("APPROVED".equals(existingInvoice.getStatus()) || "REJECTED".equals(existingInvoice.getStatus())) {
            throw new IllegalArgumentException("Cannot edit an invoice that has been " + existingInvoice.getStatus().toLowerCase());
        }
        
        // Check for duplicate invoice number if changed
        if (!existingInvoice.getInvoiceNumber().equals(updatedInvoice.getInvoiceNumber())) {
            if (invoiceRepository.existsByInvoiceNumber(updatedInvoice.getInvoiceNumber())) {
                throw new IllegalArgumentException("An invoice with number '" + updatedInvoice.getInvoiceNumber() + "' already exists");
            }
        }
        
        // Update fields
        existingInvoice.setInvoiceNumber(updatedInvoice.getInvoiceNumber());
        existingInvoice.setClubId(updatedInvoice.getClubId());
        existingInvoice.setClubName(updatedInvoice.getClubName());
        existingInvoice.setIssueDate(updatedInvoice.getIssueDate());
        existingInvoice.setDueDate(updatedInvoice.getDueDate());
        existingInvoice.setStatus(updatedInvoice.getStatus());
        existingInvoice.setNotes(updatedInvoice.getNotes());
        existingInvoice.setBillToName(updatedInvoice.getBillToName());
        existingInvoice.setBillToEmail(updatedInvoice.getBillToEmail());
        existingInvoice.setBillToAddress(updatedInvoice.getBillToAddress());
        existingInvoice.setLineItems(updatedInvoice.getLineItems());
        existingInvoice.setUpdatedAt(LocalDateTime.now());
        
        // Update tracking fields if provided
        if (updatedInvoice.getUpdatedBy() != null) {
            existingInvoice.setUpdatedBy(updatedInvoice.getUpdatedBy());
        }
        if (updatedInvoice.getUpdatedByName() != null) {
            existingInvoice.setUpdatedByName(updatedInvoice.getUpdatedByName());
        }
        
        // Calculate totals
        existingInvoice.calculateTotals();
        
        return invoiceRepository.save(existingInvoice);
    }
    
    // Delete operations
    public void deleteInvoice(String id) {
        Optional<Invoice> invoiceOpt = invoiceRepository.findById(id);
        
        if (invoiceOpt.isEmpty()) {
            throw new IllegalArgumentException("Invoice not found with id: " + id);
        }
        
        Invoice invoice = invoiceOpt.get();
        
        // Prevent deleting APPROVED or REJECTED invoices
        if ("APPROVED".equals(invoice.getStatus()) || "REJECTED".equals(invoice.getStatus())) {
            throw new IllegalArgumentException("Cannot delete an invoice that has been " + invoice.getStatus().toLowerCase());
        }
        
        invoiceRepository.deleteById(id);
    }
    
    // Count operations
    public long getInvoiceCount() {
        return invoiceRepository.count();
    }
    
    public long getInvoiceCountByClub(String clubId) {
        return invoiceRepository.countByClubId(clubId);
    }
    
    public long getInvoiceCountByStatus(String status) {
        return invoiceRepository.countByStatus(status);
    }
    
    /**
     * Generate invoice number with format: INV-YYYYMMDDHHmm-XXXX-NNNN
     * INV: Prefix
     * YYYYMMDDHHmm: Date and time (12 digits)
     * XXXX: First 4 characters of creator's name (uppercase)
     * NNNN: Random 4-digit number
     * Example: INV-202412251430-JOHN-5738
     */
    private String generateInvoiceNumber(String createdByName) {
        // Format: INV-YYYYMMDDHHmm-XXXX-NNNN
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
        
        return String.format("INV-%s-%s-%04d", dateTimePart, userPart, randomNum);
    }
    
    // Validation
    private void validateInvoice(Invoice invoice) {
        if (invoice == null) {
            throw new IllegalArgumentException("Invoice cannot be null");
        }
        
        if (invoice.getClubId() == null || invoice.getClubId().trim().isEmpty()) {
            throw new IllegalArgumentException("Club ID is required");
        }
        
        if (invoice.getClubName() == null || invoice.getClubName().trim().isEmpty()) {
            throw new IllegalArgumentException("Club name is required");
        }
        
        if (invoice.getLineItems() == null || invoice.getLineItems().isEmpty()) {
            throw new IllegalArgumentException("At least one line item is required");
        }
        
        // Validate line items
        for (int i = 0; i < invoice.getLineItems().size(); i++) {
            var lineItem = invoice.getLineItems().get(i);
            if (lineItem.getDescription() == null || lineItem.getDescription().trim().isEmpty()) {
                throw new IllegalArgumentException("Line item " + (i + 1) + " description is required");
            }
            if (lineItem.getQuantity() == null || lineItem.getQuantity() <= 0) {
                throw new IllegalArgumentException("Line item " + (i + 1) + " quantity must be greater than 0");
            }
            if (lineItem.getUnitPrice() == null || lineItem.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Line item " + (i + 1) + " unit price must be non-negative");
            }
        }
    }
    
    public boolean invoiceExistsByNumber(String invoiceNumber) {
        return invoiceRepository.existsByInvoiceNumber(invoiceNumber);
    }
    
    // Approval-related methods
    public Optional<Invoice> findById(String id) {
        return invoiceRepository.findById(id);
    }
    
    public Invoice save(Invoice invoice) {
        return invoiceRepository.save(invoice);
    }
    
    public Page<Invoice> getInvoicesByApprovalStatus(String approvalStatus, Pageable pageable) {
        return invoiceRepository.findByApprovalStatus(approvalStatus, pageable);
    }
    
    public Page<Invoice> getInvoicesByApprovalStatusAndClubIds(String approvalStatus, List<String> clubIds, Pageable pageable) {
        return invoiceRepository.findByApprovalStatusAndClubIdIn(approvalStatus, clubIds, pageable);
    }
}