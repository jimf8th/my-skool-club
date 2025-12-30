package com.myskoolclub.backend.model;

import java.math.BigDecimal;

/**
 * CheckoutItem represents an individual item being checked out as part of a checkout
 */
public class CheckoutItem {
    
    private String itemName;
    private String itemType;
    private String itemCode;
    private int quantity;
    private String condition;
    private BigDecimal estimatedValue;
    private String notes;
    
    // Default constructor
    public CheckoutItem() {
        this.quantity = 1;
        this.condition = "GOOD";
        this.estimatedValue = BigDecimal.ZERO;
    }
    
    // Constructor with required fields
    public CheckoutItem(String itemName, String itemType, int quantity) {
        this();
        this.itemName = itemName;
        this.itemType = itemType;
        this.quantity = quantity;
    }
    
    // Constructor with all fields
    public CheckoutItem(String itemName, String itemType, String itemCode, int quantity, 
                       String condition, BigDecimal estimatedValue, String notes) {
        this.itemName = itemName;
        this.itemType = itemType;
        this.itemCode = itemCode;
        this.quantity = quantity;
        this.condition = condition;
        this.estimatedValue = estimatedValue;
        this.notes = notes;
    }
    
    // Getters and Setters
    public String getItemName() {
        return itemName;
    }
    
    public void setItemName(String itemName) {
        this.itemName = itemName;
    }
    
    public String getItemType() {
        return itemType;
    }
    
    public void setItemType(String itemType) {
        this.itemType = itemType;
    }
    
    public String getItemCode() {
        return itemCode;
    }
    
    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }
    
    public int getQuantity() {
        return quantity;
    }
    
    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }
    
    public String getCondition() {
        return condition;
    }
    
    public void setCondition(String condition) {
        this.condition = condition;
    }
    
    public BigDecimal getEstimatedValue() {
        return estimatedValue;
    }
    
    public void setEstimatedValue(BigDecimal estimatedValue) {
        this.estimatedValue = estimatedValue;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    @Override
    public String toString() {
        return "CheckoutItem{" +
                "itemName='" + itemName + '\'' +
                ", itemType='" + itemType + '\'' +
                ", itemCode='" + itemCode + '\'' +
                ", quantity=" + quantity +
                ", condition='" + condition + '\'' +
                ", estimatedValue=" + estimatedValue +
                ", notes='" + notes + '\'' +
                '}';
    }
}