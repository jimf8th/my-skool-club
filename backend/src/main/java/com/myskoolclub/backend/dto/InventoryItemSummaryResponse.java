package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.InventoryCheckout;
import com.myskoolclub.backend.model.InventoryItem;
import com.myskoolclub.backend.model.InventoryStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Lightweight inventory item representation for list views.
 * {@code status} is the effective status: CHECKED_IN, CHECKED_OUT or OVERDUE
 * (a checked-out item whose due date has passed).
 */
public record InventoryItemSummaryResponse(
        Long id,
        String name,
        String category,
        String serialNumber,
        String status,
        Long checkedOutByUserId,
        String checkedOutByName,
        LocalDateTime checkedOutAt,
        LocalDate dueDate
) {
    public static InventoryItemSummaryResponse from(InventoryItem item, InventoryCheckout activeCheckout) {
        return new InventoryItemSummaryResponse(
                item.getId(),
                item.getName(),
                item.getCategory(),
                item.getSerialNumber(),
                effectiveStatus(item, activeCheckout),
                activeCheckout != null ? activeCheckout.getCheckedOutBy().getId() : null,
                activeCheckout != null
                        ? activeCheckout.getCheckedOutBy().getFirstName() + " " + activeCheckout.getCheckedOutBy().getLastName()
                        : null,
                activeCheckout != null ? activeCheckout.getCheckedOutAt() : null,
                activeCheckout != null ? activeCheckout.getDueDate() : null
        );
    }

    /** CHECKED_OUT past its due date reads as OVERDUE. */
    public static String effectiveStatus(InventoryItem item, InventoryCheckout activeCheckout) {
        if (item.getStatus() == InventoryStatus.CHECKED_OUT
                && activeCheckout != null
                && activeCheckout.getDueDate() != null
                && activeCheckout.getDueDate().isBefore(LocalDate.now())) {
            return "OVERDUE";
        }
        return item.getStatus().name();
    }
}
