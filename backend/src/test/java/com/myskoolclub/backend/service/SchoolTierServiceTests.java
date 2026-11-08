package com.myskoolclub.backend.service;

import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.AppRole;
import com.myskoolclub.backend.model.Club;
import com.myskoolclub.backend.model.School;
import com.myskoolclub.backend.model.SchoolTier;
import com.myskoolclub.backend.model.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SchoolTierServiceTests {

    @Autowired private EntityManager entityManager;
    @Autowired private MockMvc mockMvc;
    @Autowired private ReceiptScanService receiptScanService;
    @Autowired private SchoolService schoolService;

    @Test
    void schoolsDefaultToStandardAndStandardSchoolsCannotUseAiReceiptScanning() {
        User creator = persistUser("creator@example.com", AppRole.APP_ADMIN);
        School school = persist(School.builder().name("Standard School").createdBy(creator).build());
        Club club = persist(Club.builder().name("Standard Club").school(school).createdBy(creator).build());
        entityManager.flush();

        assertThat(school.getTier()).isEqualTo(SchoolTier.STANDARD);
        assertThatThrownBy(() -> receiptScanService.scan(club.getId(), "receipt"))
                .isInstanceOfSatisfying(AppException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(ex.getMessage()).contains("Premium");
                });
    }

    @Test
    void premiumSchoolPassesTierGateBeforeScannerConfigurationCheck() {
        User creator = persistUser("premium-creator@example.com", AppRole.APP_ADMIN);
        School school = persist(School.builder()
                .name("Premium School")
                .tier(SchoolTier.PREMIUM)
                .createdBy(creator)
                .build());
        Club club = persist(Club.builder().name("Premium Club").school(school).createdBy(creator).build());
        entityManager.flush();

        assertThatThrownBy(() -> receiptScanService.scan(club.getId(), "receipt"))
                .isInstanceOfSatisfying(AppException.class, ex ->
                        assertThat(ex.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    @Test
    @WithMockUser(username = "app-admin@example.com", roles = "APP_ADMIN")
    void appAdminCanChangeSchoolTier() throws Exception {
        User appAdmin = persistUser("app-admin@example.com", AppRole.APP_ADMIN);
        School school = persist(School.builder().name("Tier Managed School").createdBy(appAdmin).build());
        entityManager.flush();

        mockMvc.perform(patch("/api/schools/{schoolId}/tier", school.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tier\":\"PREMIUM\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tier").value("PREMIUM"));

        assertThat(entityManager.find(School.class, school.getId()).getTier()).isEqualTo(SchoolTier.PREMIUM);
    }

    @Test
    @WithMockUser(username = "school-admin@example.com", roles = "APP_USER")
    void nonAppAdminCannotChangeSchoolTier() throws Exception {
        User appAdmin = persistUser("owner@example.com", AppRole.APP_ADMIN);
        persistUser("school-admin@example.com", AppRole.APP_USER);
        School school = persist(School.builder().name("Protected Tier School").createdBy(appAdmin).build());
        entityManager.flush();

        mockMvc.perform(patch("/api/schools/{schoolId}/tier", school.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tier\":\"PREMIUM\"}"))
                .andExpect(status().isForbidden());

        assertThat(school.getTier()).isEqualTo(SchoolTier.STANDARD);
        assertThatThrownBy(() -> schoolService.setSchoolTier(
                school.getId(), SchoolTier.PREMIUM, "school-admin@example.com"))
                .isInstanceOfSatisfying(AppException.class, ex ->
                        assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    private User persistUser(String email, AppRole role) {
        return persist(User.builder()
                .email(email)
                .password("not-used")
                .firstName("Test")
                .lastName("User")
                .appRole(role)
                .emailVerified(true)
                .enabled(true)
                .build());
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
