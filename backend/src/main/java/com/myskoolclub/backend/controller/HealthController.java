package com.myskoolclub.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @Value("${spring.profiles.active}")
    private String activeProfile;

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now());
        response.put("service", "MySkoolClub Backend");
        response.put("profile", activeProfile);
        response.put("version", "0.0.1-SNAPSHOT");
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/db")
    public ResponseEntity<Map<String, Object>> databaseHealth() {
        Map<String, Object> response = new HashMap<>();
        try {
            // Add authentication info for debugging
            org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            
            response.put("database", "MongoDB");
            response.put("status", "CONNECTED");
            response.put("timestamp", LocalDateTime.now());
            
            // Debug info
            response.put("authenticated", auth != null ? auth.isAuthenticated() : false);
            response.put("principal", auth != null ? auth.getName() : "anonymous");
            
        } catch (Exception e) {
            response.put("database", "MongoDB");
            response.put("status", "DISCONNECTED");
            response.put("error", e.getMessage());
            response.put("timestamp", LocalDateTime.now());
        }
        
        return ResponseEntity.ok(response);
    }
}