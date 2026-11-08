package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.InventoryCheckout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryCheckoutRepository extends JpaRepository<InventoryCheckout, Long> {

    @Query("SELECT c FROM InventoryCheckout c " +
            "JOIN FETCH c.checkedOutBy LEFT JOIN FETCH c.checkedInBy " +
            "WHERE c.item.id = :itemId ORDER BY c.checkedOutAt DESC")
    List<InventoryCheckout> findByItemIdOrderByCheckedOutAtDesc(@Param("itemId") Long itemId);

    /** The open (not yet checked-in) checkout for an item, if any. */
    @Query("SELECT c FROM InventoryCheckout c " +
            "JOIN FETCH c.checkedOutBy " +
            "WHERE c.item.id = :itemId AND c.checkedInAt IS NULL")
    Optional<InventoryCheckout> findActiveByItemId(@Param("itemId") Long itemId);

    /** Open checkouts for all items in a club — used to decorate list views. */
    @Query("SELECT c FROM InventoryCheckout c " +
            "JOIN FETCH c.checkedOutBy " +
            "WHERE c.item.club.id = :clubId AND c.checkedInAt IS NULL")
    List<InventoryCheckout> findActiveByClubId(@Param("clubId") Long clubId);
}
