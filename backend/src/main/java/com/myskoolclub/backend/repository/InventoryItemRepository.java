package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

    @Query("SELECT i FROM InventoryItem i JOIN FETCH i.club JOIN FETCH i.createdBy " +
            "WHERE i.club.id = :clubId ORDER BY i.name ASC")
    List<InventoryItem> findByClubIdOrderByNameAsc(@Param("clubId") Long clubId);

    @Query("SELECT i FROM InventoryItem i JOIN FETCH i.club JOIN FETCH i.createdBy WHERE i.id = :id")
    Optional<InventoryItem> findByIdWithDetails(@Param("id") Long id);
}
