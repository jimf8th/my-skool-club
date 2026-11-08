package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.InventoryCheckout;
import com.myskoolclub.backend.model.InventoryItem;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Full inventory item detail, including the active checkout (if any) and the
 * complete checkout history. {@code status} is the effective status
 * (CHECKED_IN / CHECKED_OUT / OVERDUE).
 */
public record InventoryItemResponse(
        Long id,
        Long clubId,
        String clubName,
        Long createdByUserId,
        String createdByName,
        String name,
        String description,
        String category,
        String serialNumber,
        String status,
        Long checkedOutByUserId,
        String checkedOutByName,
        LocalDateTime checkedOutAt,
        LocalDate dueDate,
        String checkoutNotes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<InventoryCheckoutResponse> checkoutHistory
) {
    public static InventoryItemResponse from(InventoryItem item, InventoryCheckout activeCheckout,
                                             List<InventoryCheckout> history) {
        return new InventoryItemResponse(
                item.getId(),
                item.getClub().getId(),
                item.getClub().getName(),
                item.getCreatedBy().getId(),
                item.getCreatedBy().getFirstName() + " " + item.getCreatedBy().getLastName(),
                item.getName(),
                item.getDescription(),
                item.getCategory(),
                item.getSerialNumber(),
                InventoryItemSummaryResponse.effectiveStatus(item, activeCheckout),
                activeCheckout != null ? activeCheckout.getCheckedOutBy().getId() : null,
                activeCheckout != null
                        ? activeCheckout.getCheckedOutBy().getFirstName() + " " + activeCheckout.getCheckedOutBy().getLastName()
                        : null,
                activeCheckout != null ? activeCheckout.getCheckedOutAt() : null,
                activeCheckout != null ? activeCheckout.getDueDate() : null,
                activeCheckout != null ? activeCheckout.getCheckoutNotes() : null,
                item.getCreatedAt(),
                item.getUpdatedAt(),
                history.stream().map(InventoryCheckoutResponse::from).toList()
        );
    }
}
