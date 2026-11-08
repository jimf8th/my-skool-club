package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.RejectSchoolRequest;
import com.myskoolclub.backend.dto.SchoolRequestResponse;
import com.myskoolclub.backend.dto.SubmitSchoolRequest;
import com.myskoolclub.backend.model.SchoolRequestStatus;
import com.myskoolclub.backend.service.SchoolOnboardingRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/school-requests")
@RequiredArgsConstructor
public class SchoolOnboardingRequestController {

    private final SchoolOnboardingRequestService requestService;

    @PostMapping
    public ResponseEntity<SchoolRequestResponse> submit(
            @Valid @RequestBody SubmitSchoolRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(requestService.submit(request));
    }

    @GetMapping
    @PreAuthorize("hasRole('APP_ADMIN')")
    public ResponseEntity<List<SchoolRequestResponse>> list(
            @RequestParam(required = false) SchoolRequestStatus status) {
        return ResponseEntity.ok(requestService.list(status));
    }

    @PostMapping("/{requestId}/approve")
    @PreAuthorize("hasRole('APP_ADMIN')")
    public ResponseEntity<SchoolRequestResponse> approve(
            @PathVariable Long requestId, Authentication authentication) {
        return ResponseEntity.ok(requestService.approve(requestId, authentication.getName()));
    }

    @PostMapping("/{requestId}/reject")
    @PreAuthorize("hasRole('APP_ADMIN')")
    public ResponseEntity<SchoolRequestResponse> reject(
            @PathVariable Long requestId,
            @Valid @RequestBody RejectSchoolRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(requestService.reject(
                requestId, request.reason(), authentication.getName()));
    }
}
