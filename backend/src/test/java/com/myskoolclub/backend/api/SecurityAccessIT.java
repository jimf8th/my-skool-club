package com.myskoolclub.backend.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityAccessIT {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/users/accounts",
            "/api/schools/1",
            "/api/clubs/1",
            "/api/clubs/1/invoices",
            "/api/clubs/1/inventory",
            "/api/schools/1/events",
            "/api/schools/1/announcements",
            "/api/notifications/unread-count",
            "/api/content-reports/mine"
    })
    void protectedApiRoutesRejectAnonymousRequests(String endpoint) throws Exception {
        mockMvc.perform(get(endpoint))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void schoolRequestSubmissionIsPubliclyReachableWithoutAuthentication() throws Exception {
        mockMvc.perform(post("/api/school-requests"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401) {
                        throw new AssertionError("Expected a validation/business failure, but route required authentication");
                    }
                });
    }
}
