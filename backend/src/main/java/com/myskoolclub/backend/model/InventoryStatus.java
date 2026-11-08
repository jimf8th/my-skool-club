package com.myskoolclub.backend.model;

/**
 * Persisted status of an inventory item. OVERDUE is never stored — it is
 * derived at read time: an item is overdue when it is CHECKED_OUT and its
 * active checkout's due date has passed.
 */
public enum InventoryStatus {
    CHECKED_IN,
    CHECKED_OUT
}
