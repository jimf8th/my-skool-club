package com.myskoolclub.backend.service;

import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.AppRole;
import com.myskoolclub.backend.model.InvoiceStatus;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountDeletionService {

    static final String DELETED_USER_EMAIL = "deleted-user@myskoolclub.invalid";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;

    /**
     * Permanently removes the account and personal/user-owned data while
     * preserving institutional, accounting, and completed asset-audit records.
     * Preserved records are detached from the person and attributed to the
     * disabled internal "Deleted User" identity.
     */
    @Transactional
    public void deleteAccount(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Account not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Password is incorrect");
        }

        Long openCheckouts = entityManager.createQuery("""
                select count(c) from InventoryCheckout c
                where c.checkedOutBy.id = :userId and c.checkedInAt is null
                """, Long.class)
                .setParameter("userId", user.getId())
                .getSingleResult();
        if (openCheckouts > 0) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Return all checked-out inventory before deleting your account");
        }

        User deletedUser = getOrCreateDeletedUser();
        Long userId = user.getId();

        // A reporter's submissions are personal data and are removed. Reports
        // about their content remain as moderation audit records but are
        // detached from the person's identity.
        executeUpdate("delete from ContentReport r where r.reporter.id = :userId", userId);
        executeReplacementUpdate(
                "update ContentReport r set r.contentAuthor = :replacement where r.contentAuthor.id = :userId",
                userId, deletedUser);
        executeReplacementUpdate(
                "update ContentReport r set r.reviewedBy = :replacement where r.reviewedBy.id = :userId",
                userId, deletedUser);
        executeReplacementUpdate(
                "update User u set u.suspendedBy = :replacement where u.suspendedBy.id = :userId",
                userId, deletedUser);

        // Delete personal participation and user-authored shared content.
        executeUpdate("""
                delete from EventRsvp r
                where r.user.id = :userId or r.event.createdBy.id = :userId
                """, userId);
        executeUpdate("delete from Announcement a where a.createdBy.id = :userId", userId);
        executeUpdate("delete from Event e where e.createdBy.id = :userId", userId);

        // Draft invoices are private work-in-progress and are deleted. Submitted
        // accounting records are retained below with their actors anonymized.
        executeUpdate("""
                delete from InvoiceAuditLog l
                where l.invoice.createdBy.id = :userId
                  and l.invoice.status = :draftStatus
                """, userId, InvoiceStatus.DRAFT);
        executeUpdate("""
                delete from InvoiceLineItem li
                where li.invoice.createdBy.id = :userId
                  and li.invoice.status = :draftStatus
                """, userId, InvoiceStatus.DRAFT);
        executeUpdate("""
                delete from Invoice i
                where i.createdBy.id = :userId and i.status = :draftStatus
                """, userId, InvoiceStatus.DRAFT);

        // Preserve organization-owned records and finalized audit history, but
        // remove their link to the deleting person's identity.
        executeReplacementUpdate(
                "update School s set s.createdBy = :replacement where s.createdBy.id = :userId",
                userId, deletedUser);
        executeReplacementUpdate(
                "update Club c set c.createdBy = :replacement where c.createdBy.id = :userId",
                userId, deletedUser);
        executeReplacementUpdate(
                "update InventoryItem i set i.createdBy = :replacement where i.createdBy.id = :userId",
                userId, deletedUser);

        executeReplacementUpdate(
                "update Invoice i set i.createdBy = :replacement where i.createdBy.id = :userId",
                userId, deletedUser);
        executeReplacementUpdate(
                "update Invoice i set i.approvedBy = :replacement where i.approvedBy.id = :userId",
                userId, deletedUser);
        executeReplacementUpdate(
                "update Invoice i set i.paidBy = :replacement where i.paidBy.id = :userId",
                userId, deletedUser);
        executeReplacementUpdate(
                "update Invoice i set i.cancelledBy = :replacement where i.cancelledBy.id = :userId",
                userId, deletedUser);
        executeReplacementUpdate(
                "update InvoiceAuditLog l set l.performedBy = :replacement where l.performedBy.id = :userId",
                userId, deletedUser);
        entityManager.createQuery("""
                update Invoice i
                set i.payeeName = :replacementName, i.payeeEmail = null
                where lower(i.payeeEmail) = lower(:email)
                """)
                .setParameter("replacementName", "Deleted User")
                .setParameter("email", user.getEmail())
                .executeUpdate();

        executeReplacementUpdate("""
                update InventoryCheckout c set c.checkedOutBy = :replacement
                where c.checkedOutBy.id = :userId
                """, userId, deletedUser);
        executeReplacementUpdate("""
                update InventoryCheckout c set c.checkedInBy = :replacement
                where c.checkedInBy.id = :userId
                """, userId, deletedUser);
        executeReplacementUpdate("""
                update SchoolMembership m set m.reviewedBy = :replacement
                where m.reviewedBy.id = :userId
                """, userId, deletedUser);
        executeReplacementUpdate("""
                update ClubMembership m set m.reviewedBy = :replacement
                where m.reviewedBy.id = :userId
                """, userId, deletedUser);

        executeUpdate("delete from SchoolMembership m where m.user.id = :userId", userId);
        executeUpdate("delete from ClubMembership m where m.user.id = :userId", userId);
        executeUpdate("delete from Notification n where n.user.id = :userId", userId);
        executeUpdate("delete from EmailVerification e where e.user.id = :userId", userId);
        executeUpdate("delete from PasswordResetCode p where p.user.id = :userId", userId);
        entityManager.createQuery("""
                delete from FriendInvitation f
                where f.invitedBy.id = :userId or lower(f.email) = lower(:email)
                """)
                .setParameter("userId", userId)
                .setParameter("email", user.getEmail())
                .executeUpdate();

        entityManager.flush();
        entityManager.remove(user);
        entityManager.flush();
    }

    private User getOrCreateDeletedUser() {
        return userRepository.findByEmail(DELETED_USER_EMAIL)
                .orElseGet(() -> userRepository.saveAndFlush(User.builder()
                        .email(DELETED_USER_EMAIL)
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .firstName("Deleted")
                        .lastName("User")
                        .appRole(AppRole.APP_USER)
                        .emailVerified(true)
                        .enabled(false)
                        .build()));
    }

    private void executeUpdate(String query, Long userId) {
        entityManager.createQuery(query)
                .setParameter("userId", userId)
                .executeUpdate();
    }

    private void executeUpdate(String query, Long userId, InvoiceStatus status) {
        entityManager.createQuery(query)
                .setParameter("userId", userId)
                .setParameter("draftStatus", status)
                .executeUpdate();
    }

    private void executeReplacementUpdate(String query, Long userId, User replacement) {
        entityManager.createQuery(query)
                .setParameter("userId", userId)
                .setParameter("replacement", replacement)
                .executeUpdate();
    }
}
