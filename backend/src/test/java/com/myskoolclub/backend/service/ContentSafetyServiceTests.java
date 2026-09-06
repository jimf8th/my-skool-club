package com.myskoolclub.backend.service;

import com.myskoolclub.backend.exception.AppException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ContentSafetyServiceTests {

    private final ContentSafetyService service = new ContentSafetyService();

    @Test
    void blocksDirectThreatsBeforePublication() {
        assertThatThrownBy(() -> service.requireAllowed("Event", "I will kill you"))
                .isInstanceOfSatisfying(AppException.class, exception ->
                        assertThat(exception.getStatus().value()).isEqualTo(422));
    }

    @Test
    void blocksRepeatedLinkSpam() {
        assertThatThrownBy(() -> service.requireAllowed(
                "Visit https://a.example now https://b.example and https://c.example"))
                .isInstanceOf(AppException.class);
    }

    @Test
    void allowsLegitimateSafetyEducation() {
        assertThatCode(() -> service.requireAllowed(
                "Suicide prevention awareness", "Resources for self-harm prevention and counseling"))
                .doesNotThrowAnyException();
    }
}
