package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.InvoiceAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InvoiceAuditLogRepository extends JpaRepository<InvoiceAuditLog, Long> {

    @Query("SELECT a FROM InvoiceAuditLog a JOIN FETCH a.performedBy WHERE a.invoice.id = :invoiceId ORDER BY a.performedAt ASC")
    List<InvoiceAuditLog> findByInvoiceIdOrderByPerformedAtAsc(@Param("invoiceId") Long invoiceId);
}
