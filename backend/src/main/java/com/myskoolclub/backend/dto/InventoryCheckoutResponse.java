package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.InventoryCheckout;
import com.myskoolclub.backend.model.User;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** One entry in an item's checkout history. */
public record InventoryCheckoutResponse(
        Long id,
        Long checkedOutByUserId,
        String checkedOutByName,
        LocalDateTime checkedOutAt,
        LocalDate dueDate,
        String checkoutNotes,
        Long checkedInByUserId,
        String checkedInByName,
        LocalDateTime checkedInAt,
        String checkinNotes
) {
    public static InventoryCheckoutResponse from(InventoryCheckout c) {
        return new InventoryCheckoutResponse(
                c.getId(),
                c.getCheckedOutBy().getId(),
                fullName(c.getCheckedOutBy()),
                c.getCheckedOutAt(),
                c.getDueDate(),
                c.getCheckoutNotes(),
                c.getCheckedInBy() != null ? c.getCheckedInBy().getId() : null,
                c.getCheckedInBy() != null ? fullName(c.getCheckedInBy()) : null,
                c.getCheckedInAt(),
                c.getCheckinNotes()
        );
    }

    private static String fullName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }
}
