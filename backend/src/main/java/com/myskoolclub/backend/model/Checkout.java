package com.myskoolclub.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

/**
 * Checkout represents a checkout transaction with multiple items
 */
@Document(collection = "checkouts")
public class Checkout {
    
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String checkoutNumber;
    
    @Indexed
    private String clubId;
    private String clubName;
    
    @Indexed
    private LocalDate checkoutDate;
    private LocalDate dueDate;
    private LocalDate returnDate;
    
    @Indexed
    private String status; // ACTIVE, RETURNED, OVERDUE, CANCELLED, PENDING, APPROVED, REJECTED
    
    // Approval fields
    private boolean approvalRequired = true; // Most checkouts require approval
    private String approvalStatus; // PENDING, APPROVED, REJECTED
    private String approvedBy; // Member ID who approved
    private String approvedByName; // Denormalized approver name
    private LocalDateTime approvedAt;
    private String rejectionReason;
    
    private String borrowerName;
    private String borrowerEmail;
    private String borrowerPhone;
    private String borrowerAddress;
    
    private List<CheckoutItem> checkoutItems;
    private BigDecimal totalEstimatedValue;
    
    private String notes;
    private String returnNotes;
    
    // System tracking fields
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String createdByName;
    private String updatedBy;
    private String updatedByName;
    
    // Default constructor
    public Checkout() {
        this.status = "PENDING";
        this.approvalRequired = true;
        this.approvalStatus = "PENDING";
        this.checkoutItems = new ArrayList<>();
        this.totalEstimatedValue = BigDecimal.ZERO;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    // Constructor with required fields
    public Checkout(String checkoutNumber, String clubId, String clubName, LocalDate checkoutDate, 
                   LocalDate dueDate, String borrowerName, String borrowerEmail) {
        this();
        this.checkoutNumber = checkoutNumber;
        this.clubId = clubId;
        this.clubName = clubName;
        this.checkoutDate = checkoutDate;
        this.dueDate = dueDate;
        this.borrowerName = borrowerName;
        this.borrowerEmail = borrowerEmail;
    }
    
    // Method to calculate total estimated value
    public void calculateTotalValue() {
        if (checkoutItems != null && !checkoutItems.isEmpty()) {
            this.totalEstimatedValue = checkoutItems.stream()
                .map(item -> (item.getEstimatedValue() != null ? item.getEstimatedValue() : BigDecimal.ZERO)
                    .multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            this.totalEstimatedValue = BigDecimal.ZERO;
        }
        this.updatedAt = LocalDateTime.now();
    }
    
    // Method to add checkout item
    public void addCheckoutItem(CheckoutItem item) {
        if (this.checkoutItems == null) {
            this.checkoutItems = new ArrayList<>();
        }
        this.checkoutItems.add(item);
        calculateTotalValue();
    }
    
    // Method to remove checkout item
    public void removeCheckoutItem(int index) {
        if (this.checkoutItems != null && index >= 0 && index < this.checkoutItems.size()) {
            this.checkoutItems.remove(index);
            calculateTotalValue();
        }
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getCheckoutNumber() {
        return checkoutNumber;
    }
    
    public void setCheckoutNumber(String checkoutNumber) {
        this.checkoutNumber = checkoutNumber;
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
    
    public LocalDate getCheckoutDate() {
        return checkoutDate;
    }
    
    public void setCheckoutDate(LocalDate checkoutDate) {
        this.checkoutDate = checkoutDate;
    }
    
    public LocalDate getDueDate() {
        return dueDate;
    }
    
    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }
    
    public LocalDate getReturnDate() {
        return returnDate;
    }
    
    public void setReturnDate(LocalDate returnDate) {
        this.returnDate = returnDate;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public String getBorrowerName() {
        return borrowerName;
    }
    
    public void setBorrowerName(String borrowerName) {
        this.borrowerName = borrowerName;
    }
    
    public String getBorrowerEmail() {
        return borrowerEmail;
    }
    
    public void setBorrowerEmail(String borrowerEmail) {
        this.borrowerEmail = borrowerEmail;
    }
    
    public String getBorrowerPhone() {
        return borrowerPhone;
    }
    
    public void setBorrowerPhone(String borrowerPhone) {
        this.borrowerPhone = borrowerPhone;
    }
    
    public String getBorrowerAddress() {
        return borrowerAddress;
    }
    
    public void setBorrowerAddress(String borrowerAddress) {
        this.borrowerAddress = borrowerAddress;
    }
    
    public List<CheckoutItem> getCheckoutItems() {
        return checkoutItems;
    }
    
    public void setCheckoutItems(List<CheckoutItem> checkoutItems) {
        this.checkoutItems = checkoutItems;
        calculateTotalValue();
    }
    
    public BigDecimal getTotalEstimatedValue() {
        return totalEstimatedValue;
    }
    
    public void setTotalEstimatedValue(BigDecimal totalEstimatedValue) {
        this.totalEstimatedValue = totalEstimatedValue;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    public String getReturnNotes() {
        return returnNotes;
    }
    
    public void setReturnNotes(String returnNotes) {
        this.returnNotes = returnNotes;
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
    
    public String getUpdatedBy() {
        return updatedBy;
    }
    
    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }
    
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
    
    public String getCreatedByName() {
        return createdByName;
    }
    
    public void setCreatedByName(String createdByName) {
        this.createdByName = createdByName;
    }
    
    public String getUpdatedByName() {
        return updatedByName;
    }
    
    public void setUpdatedByName(String updatedByName) {
        this.updatedByName = updatedByName;
    }
    
    @Override
    public String toString() {
        return "Checkout{" +
                "id='" + id + '\'' +
                ", checkoutNumber='" + checkoutNumber + '\'' +
                ", clubId='" + clubId + '\'' +
                ", clubName='" + clubName + '\'' +
                ", checkoutDate=" + checkoutDate +
                ", dueDate=" + dueDate +
                ", returnDate=" + returnDate +
                ", status='" + status + '\'' +
                ", borrowerName='" + borrowerName + '\'' +
                ", borrowerEmail='" + borrowerEmail + '\'' +
                ", totalEstimatedValue=" + totalEstimatedValue +
                ", checkoutItems=" + (checkoutItems != null ? checkoutItems.size() : 0) + " items" +
                ", createdAt=" + createdAt +
                '}';
    }
}