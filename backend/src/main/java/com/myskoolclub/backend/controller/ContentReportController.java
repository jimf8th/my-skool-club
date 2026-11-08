package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.*;
import com.myskoolclub.backend.model.ContentReportStatus;
import com.myskoolclub.backend.service.ContentReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/content-reports")
@RequiredArgsConstructor
public class ContentReportController {

    private final ContentReportService reportService;

    @PostMapping
    public ResponseEntity<ContentReportResponse> report(
            @Valid @RequestBody ContentReportRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reportService.create(request, authentication.getName()));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<ContentReportResponse>> mine(Authentication authentication) {
        return ResponseEntity.ok(reportService.mine(authentication.getName()));
    }

    @GetMapping("/moderation")
    @PreAuthorize("hasRole('APP_ADMIN')")
    public ResponseEntity<List<ContentReportResponse>> moderationQueue(
            @RequestParam(required = false) ContentReportStatus status) {
        return ResponseEntity.ok(reportService.list(status));
    }

    @PatchMapping("/{reportId}")
    @PreAuthorize("hasRole('APP_ADMIN')")
    public ResponseEntity<ContentReportResponse> decide(
            @PathVariable Long reportId,
            @Valid @RequestBody ModerationDecisionRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(reportService.decide(reportId, request, authentication.getName()));
    }

    @PostMapping("/{reportId}/remove-content")
    @PreAuthorize("hasRole('APP_ADMIN')")
    public ResponseEntity<ContentReportResponse> removeContent(
            @PathVariable Long reportId, Authentication authentication) {
        return ResponseEntity.ok(reportService.removeContent(reportId, authentication.getName()));
    }

    @PostMapping("/{reportId}/suspend-author")
    @PreAuthorize("hasRole('APP_ADMIN')")
    public ResponseEntity<ContentReportResponse> suspendAuthor(
            @PathVariable Long reportId,
            @Valid @RequestBody SuspendUserRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(reportService.suspendAuthor(reportId, request, authentication.getName()));
    }

    @PostMapping("/moderation/users/{userId}/restore")
    @PreAuthorize("hasRole('APP_ADMIN')")
    public ResponseEntity<Map<String, String>> restoreUser(@PathVariable Long userId) {
        reportService.restoreUser(userId);
        return ResponseEntity.ok(Map.of("message", "User access restored"));
    }
}
