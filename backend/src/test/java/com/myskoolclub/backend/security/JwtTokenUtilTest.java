package com.myskoolclub.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class JwtTokenUtilTest {

    private final JwtTokenUtil jwtTokenUtil = new JwtTokenUtil("myskoolclub-super-secret-key-for-jwt-tokens-minimum-512-bits-required-for-hs512-algorithm");

    @Test
    void testGenerateAndValidateToken() {
        String username = "testuser";
        
        // Generate token
        String token = jwtTokenUtil.generateToken(username);
        assertNotNull(token);
        
        // Validate token
        assertTrue(jwtTokenUtil.validateToken(token));
        
        // Extract username from token
        String extractedUsername = jwtTokenUtil.getUsernameFromToken(token);
        assertEquals(username, extractedUsername);
        
        // Validate token with username
        assertTrue(jwtTokenUtil.validateToken(token, username));
        assertFalse(jwtTokenUtil.validateToken(token, "wronguser"));
    }

    @Test
    void testInvalidToken() {
        String invalidToken = "invalid.jwt.token";
        
        assertFalse(jwtTokenUtil.validateToken(invalidToken));
    }

    @Test
    void testTokenExpiration() {
        String username = "testuser";
        String token = jwtTokenUtil.generateToken(username);
        
        // Token should not be expired immediately
        assertNotNull(jwtTokenUtil.getExpirationDateFromToken(token));
        assertTrue(jwtTokenUtil.getExpirationDateFromToken(token).after(new java.util.Date()));
    }
}