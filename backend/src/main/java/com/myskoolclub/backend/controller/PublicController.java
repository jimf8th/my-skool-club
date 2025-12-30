package com.myskoolclub.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getApiInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("service", "MySkoolClub Backend API");
        info.put("version", "0.0.1-SNAPSHOT");
        info.put("description", "High School Club Management System");
        info.put("endpoints", List.of(
            "/api/health - Health check (public)",
            "/api/health/db - Database health check (requires JWT)",
            "/api/public/info - API information",
            "/api/auth/login - Authenticate and get JWT token",
            "/api/auth/info - Authentication server information",
            "/api/protected/* - Protected endpoints (require JWT)"
        ));
        
        return ResponseEntity.ok(info);
    }


}