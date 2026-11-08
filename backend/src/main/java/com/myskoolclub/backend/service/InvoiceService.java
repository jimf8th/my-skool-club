package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.CancelInvoiceRequest;
import com.myskoolclub.backend.dto.InvoiceRequest;
import com.myskoolclub.backend.dto.InvoiceResponse;
import com.myskoolclub.backend.dto.InvoiceSummaryResponse;
import com.myskoolclub.backend.dto.LineItemRequest;
import com.myskoolclub.backend.dto.RejectInvoiceRequest;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.AppRole;
import com.myskoolclub.backend.model.Club;
import com.myskoolclub.backend.model.Invoice;
import com.myskoolclub.backend.model.InvoiceAuditAction;
import com.myskoolclub.backend.model.InvoiceAuditLog;
import com.myskoolclub.backend.model.InvoiceLineItem;
import com.myskoolclub.backend.model.InvoiceStatus;
import com.myskoolclub.backend.model.MembershipRole;
import com.myskoolclub.backend.model.MembershipStatus;
import com.myskoolclub.backend.model.NotificationType;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.ClubMembershipRepository;
import com.myskoolclub.backend.repository.ClubRepository;
import com.myskoolclub.backend.repository.InvoiceAuditLogRepository;
import com.myskoolclub.backend.repository.InvoiceRepository;
import com.myskoolclub.backend.repository.SchoolMembershipRepository;
import com.myskoolclub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private static final Set<InvoiceStatus> CANCELLABLE_STATUSES =
            Set.of(InvoiceStatus.DRAFT, InvoiceStatus.SUBMITTED, InvoiceStatus.APPROVED);

    private final InvoiceRepository invoiceRepository;
    private final InvoiceAuditLogRepository invoiceAuditLogRepository;
    private final ClubRepository clubRepository;
    private final ClubMembershipRepository clubMembershipRepository;
    private final SchoolMembershipRepository schoolMembershipRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // ---- Reads ----

    @Transactional(readOnly = true)
    public List<InvoiceSummaryResponse> listInvoices(Long clubId) {
        return invoiceRepository.findByClubIdOrderByCreatedAtDesc(clubId).stream()
                .map(InvoiceSummaryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(Long clubId, Long invoiceId) {
        Invoice invoice = requireInvoiceInClub(clubId, invoiceId);
        return toResponse(invoice);
    }

    // ---- Draft lifecycle (creator only) ----

    @Transactional
    public InvoiceResponse createDraft(Long clubId, InvoiceRequest request, String requesterEmail) {
        Club club = requireClub(clubId);
        User creator = requireUser(requesterEmail);

        Invoice invoice = Invoice.builder()
                .club(club)
                .createdBy(creator)
                .title(request.title())
                .notes(request.notes())
                .paymentRequired(request.paymentRequired())
                .payeeName(request.payeeName())
                .payeeEmail(request.payeeEmail())
                .status(InvoiceStatus.DRAFT)
                .build();

        List<InvoiceLineItem> items = buildLineItems(invoice, request.lineItems());
        invoice.setLineItems(items);
        invoice.setTotalAmount(sumTotal(items));

        Invoice saved = invoiceRepository.save(invoice);
        logAudit(saved, InvoiceAuditAction.CREATED, creator, null, InvoiceStatus.DRAFT, null);
        return toResponse(saved);
    }

    @Transactional
    public InvoiceResponse updateDraft(Long clubId, Long invoiceId, InvoiceRequest request, String requesterEmail) {
        Invoice invoice = requireInvoiceInClub(clubId, invoiceId);
        User requester = requireUser(requesterEmail);
        requireOwner(invoice, requester);
        requireStatus(invoice, InvoiceStatus.DRAFT, "Only draft invoices can be edited");

        invoice.setTitle(request.title());
        invoice.setNotes(request.notes());
        invoice.setPaymentRequired(request.paymentRequired());
        invoice.setPayeeName(request.payeeName());
        invoice.setPayeeEmail(request.payeeEmail());

        invoice.getLineItems().clear();
        List<InvoiceLineItem> items = buildLineItems(invoice, request.lineItems());
        invoice.getLineItems().addAll(items);
        invoice.setTotalAmount(sumTotal(items));

        logAudit(invoice, InvoiceAuditAction.UPDATED, requester, InvoiceStatus.DRAFT, InvoiceStatus.DRAFT, null);
        return toResponse(invoice);
    }

    @Transactional
    public void deleteDraft(Long clubId, Long invoiceId, String requesterEmail) {
        Invoice invoice = requireInvoiceInClub(clubId, invoiceId);
        User requester = requireUser(requesterEmail);
        requireOwner(invoice, requester);
        requireStatus(invoice, InvoiceStatus.DRAFT, "Only draft invoices can be deleted");
        invoiceRepository.delete(invoice);
    }

    @Transactional
    public InvoiceResponse submit(Long clubId, Long invoiceId, String requesterEmail) {
        Invoice invoice = requireInvoiceInClub(clubId, invoiceId);
        User requester = requireUser(requesterEmail);
        requireOwner(invoice, requester);
        requireStatus(invoice, InvoiceStatus.DRAFT, "Only draft invoices can be submitted");

        invoice.setStatus(InvoiceStatus.SUBMITTED);
        invoice.setSubmittedAt(LocalDateTime.now());
        invoice.setRejectionReason(null);

        logAudit(invoice, InvoiceAuditAction.SUBMITTED, requester, InvoiceStatus.DRAFT, InvoiceStatus.SUBMITTED, null);
        notifyClubAdmins(invoice.getClub(), invoice, requester);
        return toResponse(invoice);
    }

    // ---- Admin review (club admin / school admin / app admin only) ----

    @Transactional
    public InvoiceResponse approve(Long clubId, Long invoiceId, String adminEmail) {
        Invoice invoice = requireInvoiceInClub(clubId, invoiceId);
        User admin = requireUser(adminEmail);
        requireStatus(invoice, InvoiceStatus.SUBMITTED, "Only submitted invoices can be approved");

        InvoiceStatus newStatus = invoice.isPaymentRequired() ? InvoiceStatus.APPROVED : InvoiceStatus.PAID;
        invoice.setStatus(newStatus);
        invoice.setApprovedAt(LocalDateTime.now());
        invoice.setApprovedBy(admin);

        if (newStatus == InvoiceStatus.PAID) {
            invoice.setPaidAt(invoice.getApprovedAt());
            invoice.setPaidBy(admin);
            logAudit(invoice, InvoiceAuditAction.APPROVED, admin, InvoiceStatus.SUBMITTED, InvoiceStatus.PAID,
                    "No payment required — closed automatically upon approval");
            notificationService.notify(invoice.getCreatedBy(), NotificationType.INVOICE_PAID,
                    invoiceId.toString(),
                    "Your invoice \"" + invoice.getTitle() + "\" was approved and closed (no payment required)");
        } else {
            logAudit(invoice, InvoiceAuditAction.APPROVED, admin, InvoiceStatus.SUBMITTED, InvoiceStatus.APPROVED, null);
            notificationService.notify(invoice.getCreatedBy(), NotificationType.INVOICE_APPROVED,
                    invoiceId.toString(),
                    "Your invoice \"" + invoice.getTitle() + "\" was approved");
        }
        return toResponse(invoice);
    }

    @Transactional
    public InvoiceResponse sendBackToDraft(Long clubId, Long invoiceId, RejectInvoiceRequest request, String adminEmail) {
        Invoice invoice = requireInvoiceInClub(clubId, invoiceId);
        User admin = requireUser(adminEmail);
        requireStatus(invoice, InvoiceStatus.SUBMITTED, "Only submitted invoices can be sent back");

        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setSubmittedAt(null);
        invoice.setRejectionReason(request.reason());

        logAudit(invoice, InvoiceAuditAction.SENT_BACK_TO_DRAFT, admin, InvoiceStatus.SUBMITTED, InvoiceStatus.DRAFT, request.reason());
        notificationService.notify(invoice.getCreatedBy(), NotificationType.INVOICE_SENT_BACK,
                invoiceId.toString(),
                "Your invoice \"" + invoice.getTitle() + "\" needs changes: " + request.reason());
        return toResponse(invoice);
    }

    @Transactional
    public InvoiceResponse markPaid(Long clubId, Long invoiceId, String adminEmail) {
        Invoice invoice = requireInvoiceInClub(clubId, invoiceId);
        User admin = requireUser(adminEmail);
        requireStatus(invoice, InvoiceStatus.APPROVED, "Only approved invoices can be marked paid");

        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        invoice.setPaidBy(admin);

        logAudit(invoice, InvoiceAuditAction.MARKED_PAID, admin, InvoiceStatus.APPROVED, InvoiceStatus.PAID, null);
        notificationService.notify(invoice.getCreatedBy(), NotificationType.INVOICE_PAID,
                invoiceId.toString(),
                "Your invoice \"" + invoice.getTitle() + "\" has been marked as paid");
        return toResponse(invoice);
    }

    // ---- Cancellation (creator or club/school/app admin) ----

    @Transactional
    public InvoiceResponse cancel(Long clubId, Long invoiceId, CancelInvoiceRequest request, String requesterEmail) {
        Invoice invoice = requireInvoiceInClub(clubId, invoiceId);
        User requester = requireUser(requesterEmail);

        boolean isOwner = invoice.getCreatedBy().getId().equals(requester.getId());
        if (!isOwner && !isClubOrSchoolAdmin(invoice.getClub(), requester)) {
            throw new AppException(HttpStatus.FORBIDDEN, "You do not have permission to cancel this invoice");
        }
        if (!CANCELLABLE_STATUSES.contains(invoice.getStatus())) {
            throw new AppException(HttpStatus.CONFLICT, "This invoice can no longer be cancelled");
        }

        InvoiceStatus previousStatus = invoice.getStatus();
        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setCancelledAt(LocalDateTime.now());
        invoice.setCancelledBy(requester);
        invoice.setCancellationReason(request.reason());

        logAudit(invoice, InvoiceAuditAction.CANCELLED, requester, previousStatus, InvoiceStatus.CANCELLED, request.reason());
        if (!isOwner) {
            notificationService.notify(invoice.getCreatedBy(), NotificationType.INVOICE_CANCELLED,
                    invoiceId.toString(),
                    "Your invoice \"" + invoice.getTitle() + "\" was cancelled"
                            + (request.reason() != null && !request.reason().isBlank() ? ": " + request.reason() : ""));
        }
        return toResponse(invoice);
    }

    // ---- Helpers ----

    private List<InvoiceLineItem> buildLineItems(Invoice invoice, List<LineItemRequest> requests) {
        List<InvoiceLineItem> items = new ArrayList<>();
        int order = 0;
        for (LineItemRequest r : requests) {
            BigDecimal totalPrice = r.unitPrice().multiply(BigDecimal.valueOf(r.quantity()));
            items.add(InvoiceLineItem.builder()
                    .invoice(invoice)
                    .lineOrder(order++)
                    .description(r.description())
                    .quantity(r.quantity())
                    .unitPrice(r.unitPrice())
                    .totalPrice(totalPrice)
                    .build());
        }
        return items;
    }

    private BigDecimal sumTotal(List<InvoiceLineItem> items) {
        return items.stream().map(InvoiceLineItem::getTotalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void requireOwner(Invoice invoice, User requester) {
        if (!invoice.getCreatedBy().getId().equals(requester.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Only the invoice creator can perform this action");
        }
    }

    private void requireStatus(Invoice invoice, InvoiceStatus required, String message) {
        if (invoice.getStatus() != required) {
            throw new AppException(HttpStatus.CONFLICT, message);
        }
    }

    /** APP_ADMIN, SCHOOL_ADMIN of the club's school, or CLUB_ADMIN of this club. */
    private boolean isClubOrSchoolAdmin(Club club, User user) {
        if (user.getAppRole() == AppRole.APP_ADMIN) return true;

        var schoolMembership = schoolMembershipRepository
                .findByUserIdAndSchoolId(user.getId(), club.getSchool().getId())
                .orElse(null);
        if (schoolMembership != null
                && schoolMembership.getStatus() == MembershipStatus.APPROVED
                && schoolMembership.getRole() == MembershipRole.ADMIN) {
            return true;
        }

        var clubMembership = clubMembershipRepository
                .findByUserIdAndClubId(user.getId(), club.getId())
                .orElse(null);
        return clubMembership != null
                && clubMembership.getStatus() == MembershipStatus.APPROVED
                && clubMembership.getRole() == MembershipRole.ADMIN;
    }

    private void notifyClubAdmins(Club club, Invoice invoice, User submitter) {
        clubMembershipRepository
                .findByClubIdAndStatusOrderByRequestedAtAsc(club.getId(), MembershipStatus.APPROVED)
                .stream()
                .filter(m -> m.getRole() == MembershipRole.ADMIN)
                .forEach(admin -> notificationService.notify(
                        admin.getUser(),
                        NotificationType.INVOICE_SUBMITTED,
                        invoice.getId().toString(),
                        submitter.getFirstName() + " " + submitter.getLastName() +
                                " submitted an invoice for approval: " + invoice.getTitle() +
                                " ($" + invoice.getTotalAmount() + ")"));
    }

    private void logAudit(Invoice invoice, InvoiceAuditAction action, User performedBy,
                           InvoiceStatus previousStatus, InvoiceStatus newStatus, String note) {
        InvoiceAuditLog log = InvoiceAuditLog.builder()
                .invoice(invoice)
                .action(action)
                .performedBy(performedBy)
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .note(note)
                .build();
        invoiceAuditLogRepository.save(log);
    }

    private InvoiceResponse toResponse(Invoice invoice) {
        List<InvoiceAuditLog> auditLogs = invoiceAuditLogRepository.findByInvoiceIdOrderByPerformedAtAsc(invoice.getId());
        return InvoiceResponse.from(invoice, auditLogs);
    }

    private Invoice requireInvoiceInClub(Long clubId, Long invoiceId) {
        Invoice invoice = invoiceRepository.findByIdWithDetails(invoiceId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Invoice not found"));
        if (!invoice.getClub().getId().equals(clubId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Invoice not found");
        }
        return invoice;
    }

    private Club requireClub(Long clubId) {
        return clubRepository.findById(clubId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Club not found"));
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
