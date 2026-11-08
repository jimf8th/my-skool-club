package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.exception.AppException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthControllerTests {

    @Test
    void bearerTokenRequiresBearerPrefix() {
        assertThatThrownBy(() -> AuthController.bearerToken("token-only"))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void bearerTokenStripsPrefixAndRetainsTokenValue() {
        assertThat(AuthController.bearerToken("Bearer abc123")).isEqualTo("abc123");
    }

    @Test
    void bearerTokenRejectsMissingAuthorizationHeader() {
        assertThatThrownBy(() -> AuthController.bearerToken(null))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getMessage()).isEqualTo("Sign in to continue."));
    }
}
