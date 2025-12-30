package com.myskoolclub.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "invoices")
public class Invoice {
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String invoiceNumber;
    
    @Indexed
    private String clubId;
    private String clubName; // Denormalized for easier queries and display
    
    private LocalDate issueDate;
    private LocalDate dueDate;
    
    @Indexed
    private String status; // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, SENT, PAID, OVERDUE, CANCELLED
    
    // Approval fields
    private boolean approvalRequired = true; // Most invoices require approval
    private String approvalStatus; // PENDING, APPROVED, REJECTED
    private String approvedBy; // Member ID who approved
    private String approvedByName; // Denormalized approver name
    private LocalDateTime approvedAt;
    private String rejectionReason;
    
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    
    private String notes;
    private String billToName;
    private String billToEmail;
    private String billToAddress;
    
    private List<LineItem> lineItems = new ArrayList<>();
    
    // System fields
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String createdByName;
    private String updatedBy;
    private String updatedByName;
    
    // Constructors
    public Invoice() {}
    
    public Invoice(String invoiceNumber, String clubId, String clubName) {
        this.invoiceNumber = invoiceNumber;
        this.clubId = clubId;
        this.clubName = clubName;
        this.status = "DRAFT";
        this.approvalRequired = true;
        this.approvalStatus = "PENDING";
        this.subtotal = BigDecimal.ZERO;
        this.taxAmount = BigDecimal.ZERO;
        this.totalAmount = BigDecimal.ZERO;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    // Calculate totals from line items
    public void calculateTotals() {
        this.subtotal = lineItems.stream()
            .map(LineItem::getTotalPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // For now, assuming no tax. Can be enhanced later
        this.taxAmount = BigDecimal.ZERO;
        this.totalAmount = this.subtotal.add(this.taxAmount);
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getInvoiceNumber() {
        return invoiceNumber;
    }
    
    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }
    
    public String getClubId() {
        return clubId;
    }
    
    public void setClubId(String clubId) {
        this.clubId = clubId;
    }
    
    public String getClubName() {
        return clubName;
    }
    
    public void setClubName(String clubName) {
        this.clubName = clubName;
    }
    
    public LocalDate getIssueDate() {
        return issueDate;
    }
    
    public void setIssueDate(LocalDate issueDate) {
        this.issueDate = issueDate;
    }
    
    public LocalDate getDueDate() {
        return dueDate;
    }
    
    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public BigDecimal getSubtotal() {
        return subtotal;
    }
    
    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }
    
    public BigDecimal getTaxAmount() {
        return taxAmount;
    }
    
    public void setTaxAmount(BigDecimal taxAmount) {
        this.taxAmount = taxAmount;
    }
    
    public BigDecimal getTotalAmount() {
        return totalAmount;
    }
    
    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    public String getBillToName() {
        return billToName;
    }
    
    public void setBillToName(String billToName) {
        this.billToName = billToName;
    }
    
    public String getBillToEmail() {
        return billToEmail;
    }
    
    public void setBillToEmail(String billToEmail) {
        this.billToEmail = billToEmail;
    }
    
    public String getBillToAddress() {
        return billToAddress;
    }
    
    public void setBillToAddress(String billToAddress) {
        this.billToAddress = billToAddress;
    }
    
    public List<LineItem> getLineItems() {
        return lineItems;
    }
    
    public void setLineItems(List<LineItem> lineItems) {
        this.lineItems = lineItems != null ? lineItems : new ArrayList<>();
        calculateTotals();
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public String getCreatedBy() {
        return createdBy;
    }
    
    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
    
    public String getCreatedByName() {
        return createdByName;
    }
    
    public void setCreatedByName(String createdByName) {
        this.createdByName = createdByName;
    }
    
    public String getUpdatedBy() {
        return updatedBy;
    }
    
    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }
    
    public String getUpdatedByName() {
        return updatedByName;
    }
    
    public void setUpdatedByName(String updatedByName) {
        this.updatedByName = updatedByName;
    }
    
    // Approval getters and setters
    public boolean isApprovalRequired() {
        return approvalRequired;
    }
    
    public void setApprovalRequired(boolean approvalRequired) {
        this.approvalRequired = approvalRequired;
    }
    
    public String getApprovalStatus() {
        return approvalStatus;
    }
    
    public void setApprovalStatus(String approvalStatus) {
        this.approvalStatus = approvalStatus;
    }
    
    public String getApprovedBy() {
        return approvedBy;
    }
    
    public void setApprovedBy(String approvedBy) {
        this.approvedBy = approvedBy;
    }
    
    public String getApprovedByName() {
        return approvedByName;
    }
    
    public void setApprovedByName(String approvedByName) {
        this.approvedByName = approvedByName;
    }
    
    public LocalDateTime getApprovedAt() {
        return approvedAt;
    }
    
    public void setApprovedAt(LocalDateTime approvedAt) {
        this.approvedAt = approvedAt;
    }
    
    public String getRejectionReason() {
        return rejectionReason;
    }
    
    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }
}