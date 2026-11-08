package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("SELECT i FROM Invoice i JOIN FETCH i.club JOIN FETCH i.createdBy WHERE i.club.id = :clubId ORDER BY i.createdAt DESC")
    List<Invoice> findByClubIdOrderByCreatedAtDesc(@Param("clubId") Long clubId);

    @Query("SELECT i FROM Invoice i " +
            "JOIN FETCH i.club JOIN FETCH i.createdBy " +
            "LEFT JOIN FETCH i.approvedBy LEFT JOIN FETCH i.paidBy LEFT JOIN FETCH i.cancelledBy " +
            "LEFT JOIN FETCH i.lineItems " +
            "WHERE i.id = :id")
    Optional<Invoice> findByIdWithDetails(@Param("id") Long id);
}
