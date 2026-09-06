package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.CancelInvoiceRequest;
import com.myskoolclub.backend.dto.InvoiceRequest;
import com.myskoolclub.backend.dto.InvoiceResponse;
import com.myskoolclub.backend.dto.InvoiceSummaryResponse;
import com.myskoolclub.backend.dto.RejectInvoiceRequest;
import com.myskoolclub.backend.dto.ScanReceiptRequest;
import com.myskoolclub.backend.dto.ScanReceiptResponse;
import com.myskoolclub.backend.service.InvoiceService;
import com.myskoolclub.backend.service.ReceiptScanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final ReceiptScanService receiptScanService;

    /** List invoices for a club. Requires VIEW_INVOICES (any approved club member or above). */
    @GetMapping("/api/clubs/{clubId}/invoices")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'VIEW_INVOICES')")
    public ResponseEntity<List<InvoiceSummaryResponse>> listInvoices(@PathVariable Long clubId) {
        return ResponseEntity.ok(invoiceService.listInvoices(clubId));
    }

    /** Get full invoice detail, including line items and audit trail. Requires VIEW_INVOICES. */
    @GetMapping("/api/clubs/{clubId}/invoices/{invoiceId}")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'VIEW_INVOICES')")
    public ResponseEntity<InvoiceResponse> getInvoice(
            @PathVariable Long clubId, @PathVariable Long invoiceId) {
        return ResponseEntity.ok(invoiceService.getInvoice(clubId, invoiceId));
    }

    /** Create a draft invoice. Requires CREATE_INVOICE (any approved club member or above). */
    @PostMapping("/api/clubs/{clubId}/invoices")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'CREATE_INVOICE')")
    public ResponseEntity<InvoiceResponse> createDraft(
            @PathVariable Long clubId, @Valid @RequestBody InvoiceRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(invoiceService.createDraft(clubId, request, auth.getName()));
    }

    /** Edit a draft invoice. Only the creator, and only while status is DRAFT (service-enforced). */
    @PutMapping("/api/clubs/{clubId}/invoices/{invoiceId}")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'CREATE_INVOICE')")
    public ResponseEntity<InvoiceResponse> updateDraft(
            @PathVariable Long clubId, @PathVariable Long invoiceId,
            @Valid @RequestBody InvoiceRequest request, Authentication auth) {
        return ResponseEntity.ok(invoiceService.updateDraft(clubId, invoiceId, request, auth.getName()));
    }

    /** Delete a draft invoice. Only the creator, and only while status is DRAFT (service-enforced). */
    @DeleteMapping("/api/clubs/{clubId}/invoices/{invoiceId}")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'CREATE_INVOICE')")
    public ResponseEntity<Void> deleteDraft(
            @PathVariable Long clubId, @PathVariable Long invoiceId, Authentication auth) {
        invoiceService.deleteDraft(clubId, invoiceId, auth.getName());
        return ResponseEntity.noContent().build();
    }

    /** Submit a draft for approval. Only the creator (service-enforced). */
    @PostMapping("/api/clubs/{clubId}/invoices/{invoiceId}/submit")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'CREATE_INVOICE')")
    public ResponseEntity<InvoiceResponse> submit(
            @PathVariable Long clubId, @PathVariable Long invoiceId, Authentication auth) {
        return ResponseEntity.ok(invoiceService.submit(clubId, invoiceId, auth.getName()));
    }

    /** Cancel an invoice. Allowed for the creator or a club/school/app admin (service-enforced). */
    @PostMapping("/api/clubs/{clubId}/invoices/{invoiceId}/cancel")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'CREATE_INVOICE')")
    public ResponseEntity<InvoiceResponse> cancel(
            @PathVariable Long clubId, @PathVariable Long invoiceId,
            @RequestBody(required = false) CancelInvoiceRequest request, Authentication auth) {
        CancelInvoiceRequest body = request != null ? request : new CancelInvoiceRequest(null);
        return ResponseEntity.ok(invoiceService.cancel(clubId, invoiceId, body, auth.getName()));
    }

    /** Approve a submitted invoice. Requires APPROVE_INVOICE (club/school/app admin). */
    @PostMapping("/api/clubs/{clubId}/invoices/{invoiceId}/approve")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'APPROVE_INVOICE')")
    public ResponseEntity<InvoiceResponse> approve(
            @PathVariable Long clubId, @PathVariable Long invoiceId, Authentication auth) {
        return ResponseEntity.ok(invoiceService.approve(clubId, invoiceId, auth.getName()));
    }

    /** Send a submitted invoice back to draft with a reason. Requires APPROVE_INVOICE. */
    @PostMapping("/api/clubs/{clubId}/invoices/{invoiceId}/send-back")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'APPROVE_INVOICE')")
    public ResponseEntity<InvoiceResponse> sendBackToDraft(
            @PathVariable Long clubId, @PathVariable Long invoiceId,
            @Valid @RequestBody RejectInvoiceRequest request, Authentication auth) {
        return ResponseEntity.ok(invoiceService.sendBackToDraft(clubId, invoiceId, request, auth.getName()));
    }

    /** Mark an approved invoice as paid. Requires APPROVE_INVOICE. */
    @PostMapping("/api/clubs/{clubId}/invoices/{invoiceId}/mark-paid")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'APPROVE_INVOICE')")
    public ResponseEntity<InvoiceResponse> markPaid(
            @PathVariable Long clubId, @PathVariable Long invoiceId, Authentication auth) {
        return ResponseEntity.ok(invoiceService.markPaid(clubId, invoiceId, auth.getName()));
    }

    /** AI-assisted receipt scan. Returns suggested line items only — nothing is persisted. */
    @PostMapping("/api/clubs/{clubId}/invoices/scan")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'CREATE_INVOICE')")
    public ResponseEntity<ScanReceiptResponse> scanReceipt(
            @PathVariable Long clubId, @Valid @RequestBody ScanReceiptRequest request) {
        return ResponseEntity.ok(receiptScanService.scan(clubId, request.imageBase64()));
    }
}
