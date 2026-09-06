package com.myskoolclub.backend.service;

import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.*;
import com.myskoolclub.backend.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AccountDeletionServiceTests {

    @Autowired
    private AccountDeletionService accountDeletionService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "session@example.com")
    void returnsCurrentAccountForSessionValidation() throws Exception {
        persistUser("session@example.com");
        entityManager.flush();

        mockMvc.perform(get("/api/account"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("session@example.com"))
                .andExpect(jsonPath("$.firstName").value("Test"))
                .andExpect(jsonPath("$.appRole").value("APP_USER"));
    }

    @Test
    void deletesPersonalDataAndAnonymizesRetainedOrganizationRecords() {
        User user = persistUser("member@example.com");
        School school = persist(School.builder()
                .name("Deletion Test School")
                .description("School record remains")
                .createdBy(user)
                .build());
        Club club = persist(Club.builder()
                .name("Deletion Test Club")
                .description("Club record remains")
                .school(school)
                .createdBy(user)
                .build());

        persist(SchoolMembership.builder()
                .user(user)
                .school(school)
                .role(MembershipRole.MEMBER)
                .status(MembershipStatus.APPROVED)
                .build());
        persist(Announcement.builder()
                .school(school)
                .createdBy(user)
                .title("Delete me")
                .body("User-authored content")
                .build());
        persist(Event.builder()
                .school(school)
                .createdBy(user)
                .title("Delete this event")
                .location("Gym")
                .eventTime(LocalDateTime.now().plusDays(1))
                .build());

        Invoice draft = persist(Invoice.builder()
                .club(club)
                .createdBy(user)
                .title("Delete draft")
                .status(InvoiceStatus.DRAFT)
                .totalAmount(BigDecimal.TEN)
                .build());
        persist(InvoiceLineItem.builder()
                .invoice(draft)
                .lineOrder(0)
                .description("Draft item")
                .quantity(1)
                .unitPrice(BigDecimal.TEN)
                .totalPrice(BigDecimal.TEN)
                .build());
        persist(InvoiceAuditLog.builder()
                .invoice(draft)
                .action(InvoiceAuditAction.CREATED)
                .performedBy(user)
                .newStatus(InvoiceStatus.DRAFT)
                .build());

        Invoice submitted = persist(Invoice.builder()
                .club(club)
                .createdBy(user)
                .title("Retain submitted")
                .payeeName("Test Member")
                .payeeEmail("member@example.com")
                .status(InvoiceStatus.SUBMITTED)
                .totalAmount(BigDecimal.valueOf(25))
                .submittedAt(LocalDateTime.now())
                .build());
        persist(InvoiceAuditLog.builder()
                .invoice(submitted)
                .action(InvoiceAuditAction.SUBMITTED)
                .performedBy(user)
                .previousStatus(InvoiceStatus.DRAFT)
                .newStatus(InvoiceStatus.SUBMITTED)
                .build());

        entityManager.flush();

        accountDeletionService.deleteAccount(user.getEmail());
        entityManager.clear();

        assertThat(userRepository.findByEmail("member@example.com")).isEmpty();

        User deletedUser = userRepository.findByEmail(AccountDeletionService.DELETED_USER_EMAIL)
                .orElseThrow();
        assertThat(deletedUser.isEnabled()).isFalse();
        assertThat(deletedUser.getFirstName()).isEqualTo("Deleted");

        assertThat(count("Announcement")).isZero();
        assertThat(count("Event")).isZero();
        assertThat(count("SchoolMembership")).isZero();

        School retainedSchool = entityManager.find(School.class, school.getId());
        Club retainedClub = entityManager.find(Club.class, club.getId());
        assertThat(retainedSchool.getCreatedBy().getId()).isEqualTo(deletedUser.getId());
        assertThat(retainedClub.getCreatedBy().getId()).isEqualTo(deletedUser.getId());

        assertThat(entityManager.find(Invoice.class, draft.getId())).isNull();
        Invoice retainedInvoice = entityManager.find(Invoice.class, submitted.getId());
        assertThat(retainedInvoice).isNotNull();
        assertThat(retainedInvoice.getCreatedBy().getId()).isEqualTo(deletedUser.getId());
        assertThat(retainedInvoice.getPayeeName()).isEqualTo("Deleted User");
        assertThat(retainedInvoice.getPayeeEmail()).isNull();

        InvoiceAuditLog retainedAudit = entityManager.createQuery("""
                select l from InvoiceAuditLog l where l.invoice.id = :invoiceId
                """, InvoiceAuditLog.class)
                .setParameter("invoiceId", submitted.getId())
                .getSingleResult();
        assertThat(retainedAudit.getPerformedBy().getId()).isEqualTo(deletedUser.getId());
    }

    @Test
    void rejectsDeletionWhileInventoryIsCheckedOut() {
        User user = persistUser("checkout@example.com");
        School school = persist(School.builder()
                .name("Checkout Test School")
                .createdBy(user)
                .build());
        Club club = persist(Club.builder()
                .name("Checkout Test Club")
                .school(school)
                .createdBy(user)
                .build());
        InventoryItem item = persist(InventoryItem.builder()
                .club(club)
                .createdBy(user)
                .name("Camera")
                .status(InventoryStatus.CHECKED_OUT)
                .build());
        persist(InventoryCheckout.builder()
                .item(item)
                .checkedOutBy(user)
                .build());
        entityManager.flush();

        assertThatThrownBy(() ->
                accountDeletionService.deleteAccount(user.getEmail()))
                .isInstanceOfSatisfying(AppException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getMessage()).contains("checked-out inventory");
                });

        assertThat(userRepository.findByEmail(user.getEmail())).isPresent();
    }

    private User persistUser(String email) {
        return persist(User.builder()
                .email(email)
                .firebaseUid(null)
                .firstName("Test")
                .lastName("Member")
                .appRole(AppRole.APP_USER)
                .emailVerified(true)
                .enabled(true)
                .build());
    }

    private long count(String entityName) {
        return entityManager.createQuery("select count(e) from " + entityName + " e", Long.class)
                .getSingleResult();
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
