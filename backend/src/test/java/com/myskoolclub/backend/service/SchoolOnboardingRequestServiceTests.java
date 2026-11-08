package com.myskoolclub.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myskoolclub.backend.dto.SchoolRequestResponse;
import com.myskoolclub.backend.dto.SubmitSchoolRequest;
import com.myskoolclub.backend.model.*;
import com.myskoolclub.backend.repository.FriendInvitationRepository;
import com.myskoolclub.backend.repository.SchoolMembershipRepository;
import com.myskoolclub.backend.repository.SchoolOnboardingRequestRepository;
import com.myskoolclub.backend.repository.SchoolRepository;
import com.myskoolclub.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(SchoolOnboardingRequestServiceTests.EmailCaptureConfiguration.class)
class SchoolOnboardingRequestServiceTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private SchoolOnboardingRequestService requestService;
    @Autowired private SchoolOnboardingRequestRepository requestRepository;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private SchoolMembershipRepository membershipRepository;
    @Autowired private FriendInvitationRepository invitationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CapturingSchoolRequestEmailService emailService;

    @Test
    void anyoneCanSubmitACompleteRequestButCannotAccessTheReviewQueue() throws Exception {
        persistUser("reviewer@example.com", AppRole.APP_ADMIN);

        mockMvc.perform(post("/api/school-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest("Request.Admin@Example.com"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.adminEmail").value("request.admin@example.com"))
                .andExpect(jsonPath("$.schoolName").value("Desert View School"));

        SchoolOnboardingRequest stored = requestRepository.findAll().getFirst();
        assertThat(stored.getStatus()).isEqualTo(SchoolRequestStatus.PENDING);
        assertThat(schoolRepository.findAll()).isEmpty();
        assertThat(emailService.submittedRequestId).isEqualTo(stored.getId());

        mockMvc.perform(get("/api/school-requests"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "app-admin@example.com", roles = "APP_ADMIN")
    void appAdminCanListAndApproveForAnExistingAccount() throws Exception {
        User reviewer = persistUser("app-admin@example.com", AppRole.APP_ADMIN);
        User requestedAdmin = persistUser("school.admin@example.com", AppRole.APP_USER);
        SchoolOnboardingRequest request = persistRequest("school.admin@example.com", "Existing Account School");

        mockMvc.perform(get("/api/school-requests").param("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(request.getId()));

        mockMvc.perform(post("/api/school-requests/{id}/approve", request.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.createdSchoolId").isNumber());

        School school = schoolRepository.findAll().getFirst();
        assertThat(school.isEnabled()).isTrue();
        assertThat(school.getTier()).isEqualTo(SchoolTier.STANDARD);
        assertThat(school.getAddress()).isEqualTo("100 Main Street");
        SchoolMembership membership = membershipRepository
                .findByUserIdAndSchoolId(requestedAdmin.getId(), school.getId()).orElseThrow();
        assertThat(membership.getRole()).isEqualTo(MembershipRole.ADMIN);
        assertThat(membership.getStatus()).isEqualTo(MembershipStatus.APPROVED);
        assertThat(membership.getReviewedBy().getId()).isEqualTo(reviewer.getId());
        assertThat(emailService.approvedRequestId).isEqualTo(request.getId());
    }

    @Test
    void approvalForANewAccountCreatesASchoolLinkedAdministratorInvitation() {
        User reviewer = persistUser("invite-reviewer@example.com", AppRole.APP_ADMIN);
        SchoolOnboardingRequest request = persistRequest("new.admin@example.com", "Invitation School");

        SchoolRequestResponse response = requestService.approve(request.getId(), reviewer.getEmail());

        FriendInvitation invitation = invitationRepository.findAll().getFirst();
        assertThat(response.status()).isEqualTo(SchoolRequestStatus.APPROVED);
        assertThat(invitation.getEmail()).isEqualTo("new.admin@example.com");
        assertThat(invitation.getSchool()).isNotNull();
        assertThat(invitation.getSchool().getId()).isEqualTo(response.createdSchoolId());
        assertThat(emailService.invitedSchoolName).isEqualTo("Invitation School");
    }

    @Test
    void rejectionRequiresAReasonAndEmailsTheRequesterWithoutCreatingASchool() {
        User reviewer = persistUser("reject-reviewer@example.com", AppRole.APP_ADMIN);
        SchoolOnboardingRequest request = persistRequest("rejected.admin@example.com", "Rejected School");

        SchoolRequestResponse response = requestService.reject(
                request.getId(), " School identity could not be verified. ", reviewer.getEmail());

        assertThat(response.status()).isEqualTo(SchoolRequestStatus.REJECTED);
        assertThat(response.rejectionReason()).isEqualTo("School identity could not be verified.");
        assertThat(schoolRepository.findAll()).isEmpty();
        assertThat(emailService.rejectedRequestId).isEqualTo(request.getId());
    }

    private SchoolOnboardingRequest persistRequest(String email, String schoolName) {
        return requestRepository.saveAndFlush(SchoolOnboardingRequest.builder()
                .firstName("Maya").lastName("Member").contactPhone("602-555-0101")
                .adminEmail(email).schoolName(schoolName).description("A neighborhood public school.")
                .address("100 Main Street").city("Phoenix").state("Arizona").postalCode("85001")
                .website("https://school.example").schoolPhone("602-555-0102").build());
    }

    private SubmitSchoolRequest validRequest(String email) {
        return new SubmitSchoolRequest(
                " Maya ", " Member ", " 602-555-0101 ", email, " Desert View School ",
                " A neighborhood public school. ", " 100 Main Street ", " Phoenix ", " Arizona ",
                " 85001 ", "https://school.example", " 602-555-0102 ");
    }

    private User persistUser(String email, AppRole role) {
        return userRepository.saveAndFlush(User.builder()
                .email(email).password("not-used").firstName("Test").lastName("User")
                .appRole(role).emailVerified(true).enabled(true).build());
    }

    @TestConfiguration
    static class EmailCaptureConfiguration {
        @Bean
        @Primary
        CapturingSchoolRequestEmailService capturingSchoolRequestEmailService() {
            return new CapturingSchoolRequestEmailService();
        }

        @Bean
        @Primary
        CapturingNotificationService capturingNotificationService() {
            return new CapturingNotificationService();
        }
    }

    static class CapturingNotificationService extends NotificationService {
        CapturingNotificationService() { super(null); }

        @Override public void notify(
                User recipient, NotificationType type, String referenceId, String message) {
            // Notification persistence is covered independently. Avoid REQUIRES_NEW in
            // transactional tests where users intentionally remain uncommitted.
        }
    }

    static class CapturingSchoolRequestEmailService extends EmailService {
        private Long submittedRequestId;
        private Long approvedRequestId;
        private Long rejectedRequestId;
        private String invitedSchoolName;

        CapturingSchoolRequestEmailService() { super(null); }

        @Override public void sendSchoolRequestSubmitted(SchoolOnboardingRequest request) {
            submittedRequestId = request.getId();
        }

        @Override public void sendSchoolRequestApproved(SchoolOnboardingRequest request, School school) {
            approvedRequestId = request.getId();
        }

        @Override public void sendSchoolRequestRejected(SchoolOnboardingRequest request) {
            rejectedRequestId = request.getId();
        }

        @Override public void sendSchoolAdminInvitationEmail(
                String toEmail, String firstName, String schoolName, String token) {
            invitedSchoolName = schoolName;
        }
    }
}
