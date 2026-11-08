package com.myskoolclub.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One checkout of an {@link InventoryItem}. While the item is out, its most
 * recent checkout has {@code checkedInAt == null}; checking the item back in
 * closes that row. All rows together form the item's checkout history.
 */
@Entity
@Table(name = "inventory_checkouts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryCheckout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private InventoryItem item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checked_out_by", nullable = false)
    private User checkedOutBy;

    @CreationTimestamp
    @Column(name = "checked_out_at", nullable = false, updatable = false)
    private LocalDateTime checkedOutAt;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "checkout_notes", columnDefinition = "TEXT")
    private String checkoutNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checked_in_by")
    private User checkedInBy;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @Column(name = "checkin_notes", columnDefinition = "TEXT")
    private String checkinNotes;
}
