package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.model.Invoice;
import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.model.UserClubRole;
import com.myskoolclub.backend.service.InvoiceService;
import com.myskoolclub.backend.service.MemberService;
import com.myskoolclub.backend.service.UserClubRoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/invoices")
@CrossOrigin(origins = "*")
public class InvoiceController {
    
    @Autowired
    private InvoiceService invoiceService;
    
    @Autowired
    private MemberService memberService;
    
    @Autowired
    private UserClubRoleService userClubRoleService;
    
    @Autowired
    private com.myskoolclub.backend.security.JwtTokenUtil jwtTokenUtil;
    
    // Create invoice
    @PostMapping
    public ResponseEntity<Map<String, Object>> createInvoice(@RequestBody Invoice invoice) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Verify club members can create invoices for their clubs
            if (invoice.getClubId() == null || invoice.getClubId().isEmpty()) {
                response.put("success", false);
                response.put("message", "Club ID is required.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
            boolean hasAccess = clubRoles.stream()
                .anyMatch(role -> role.getClubId().equals(invoice.getClubId()) && 
                                 (role.getClubRole().equals("CLUB_ADMIN") || role.getClubRole().equals("CLUB_USER")));
            
            if (!hasAccess) {
                response.put("success", false);
                response.put("message", "Access denied. You can only create invoices for clubs you belong to.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Set creator information
            invoice.setCreatedBy(currentMember.getId());
            invoice.setCreatedByName(currentMember.getFirstName() + " " + currentMember.getLastName());
            
            Invoice createdInvoice = invoiceService.createInvoice(invoice);
            
            response.put("success", true);
            response.put("message", "Invoice created successfully");
            response.put("data", createdInvoice);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while creating the invoice");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get all invoices with pagination
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllInvoices(
            @RequestParam(required = false) String clubId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "invoiceNumber") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDirection) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication and authorization - APP_ADMIN or club members can access invoices
            ResponseEntity<Map<String, Object>> accessCheck = checkInvoiceAccess();
            if (accessCheck != null) {
                return accessCheck;
            }
            // Create sort object
            Sort sort = sortDirection.equalsIgnoreCase("desc") 
                ? Sort.by(sortBy).descending() 
                : Sort.by(sortBy).ascending();
            
            // Create pageable object
            Pageable pageable = PageRequest.of(page, size, sort);
            
            // Get current member and check if they need filtering
            Member currentMember = getCurrentMember();
            boolean isAppAdmin = "APP_ADMIN".equals(currentMember.getRole());
            
            Page<Invoice> invoicesPage;
            
            // For non-APP_ADMIN users, filter by their club membership
            if (!isAppAdmin) {
                // Get user's club IDs
                List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
                if (clubRoles == null || clubRoles.isEmpty()) {
                    // User has no club roles, return empty result
                    invoicesPage = Page.empty(pageable);
                } else {
                    // Get the first club ID from user's roles (for now, we'll filter by their first club)
                    // TODO: In the future, this could be expanded to show invoices from all user's clubs
                    String userClubId = clubRoles.get(0).getClubId();
                    
                    // Determine which club ID to use for filtering
                    String effectiveClubId = userClubId; // Default to user's first club
                    
                    if (clubId != null && !clubId.trim().isEmpty()) {
                        // Check if user has access to the requested club
                        boolean hasAccessToClub = clubRoles.stream()
                                .anyMatch(role -> role.getClubId().equals(clubId.trim()));
                        if (hasAccessToClub) {
                            effectiveClubId = clubId.trim();
                        }
                        // If user doesn't have access, effectiveClubId remains as userClubId
                    }
                    
                    // Apply filters with club restriction
                    if (search != null && !search.trim().isEmpty()) {
                        invoicesPage = invoiceService.searchInvoicesByClubAndKeyword(effectiveClubId, search.trim(), pageable);
                    } else {
                        invoicesPage = invoiceService.getInvoicesByClub(effectiveClubId, pageable);
                    }
                }
            } else {
                // APP_ADMIN can see all invoices - use original logic
                if (search != null && !search.trim().isEmpty()) {
                    if (clubId != null && !clubId.trim().isEmpty()) {
                        invoicesPage = invoiceService.searchInvoicesByClubAndKeyword(clubId, search.trim(), pageable);
                    } else {
                        invoicesPage = invoiceService.searchInvoicesByKeyword(search.trim(), pageable);
                    }
                } else if (clubId != null && !clubId.trim().isEmpty()) {
                    invoicesPage = invoiceService.getInvoicesByClub(clubId, pageable);
                } else if (status != null && !status.trim().isEmpty()) {
                    invoicesPage = invoiceService.getInvoicesByStatus(status, pageable);
                } else {
                    invoicesPage = invoiceService.getAllInvoices(pageable);
                }
            }
            
            response.put("success", true);
            response.put("message", "Invoices retrieved successfully");
            response.put("data", invoicesPage.getContent());
            response.put("currentPage", invoicesPage.getNumber());
            response.put("totalPages", invoicesPage.getTotalPages());
            response.put("totalElements", invoicesPage.getTotalElements());
            response.put("size", invoicesPage.getSize());
            response.put("hasNext", invoicesPage.hasNext());
            response.put("hasPrevious", invoicesPage.hasPrevious());
            response.put("count", invoicesPage.getContent().size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while retrieving invoices");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Advanced search invoices
    @GetMapping("/advanced-search")
    public ResponseEntity<Map<String, Object>> advancedSearchInvoices(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String clubId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate issueDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate issueDateTo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDateTo,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false, defaultValue = "invoiceNumber") String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String sortDirection) {
        
        // Check authorization - APP_ADMIN or club members can access
        ResponseEntity<Map<String, Object>> accessCheck = checkInvoiceAccess();
        if (accessCheck != null) {
            return accessCheck;
        }
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Get current member and filter by club membership if needed
            Member currentMember = getCurrentMember();
            boolean isAppAdmin = "APP_ADMIN".equals(currentMember.getRole());
            
            // Determine effective club ID for filtering
            String effectiveClubId;
            
            // For non-APP_ADMIN users, filter by their club membership
            if (!isAppAdmin) {
                List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
                if (clubRoles == null || clubRoles.isEmpty()) {
                    // User has no club roles, return empty result
                    response.put("success", true);
                    response.put("message", "No invoices found");
                    response.put("data", java.util.Collections.emptyList());
                    response.put("count", 0);
                    return ResponseEntity.ok(response);
                } else {
                    // Use user's first club if no clubId specified, or validate access
                    String userClubId = clubRoles.get(0).getClubId();
                    
                    if (clubId == null || clubId.trim().isEmpty()) {
                        effectiveClubId = userClubId;
                    } else {
                        // Check if user has access to the requested club
                        final String requestedClubId = clubId.trim();
                        boolean hasAccessToClub = clubRoles.stream()
                                .anyMatch(role -> role.getClubId().equals(requestedClubId));
                        effectiveClubId = hasAccessToClub ? requestedClubId : userClubId;
                    }
                }
            } else {
                // APP_ADMIN can access any club
                effectiveClubId = clubId;
            }
            
            List<Invoice> invoices = invoiceService.advancedSearchInvoices(
                search, effectiveClubId, status, issueDateFrom, issueDateTo, 
                dueDateFrom, dueDateTo, minAmount, maxAmount, sortBy, sortDirection
            );
            
            response.put("success", true);
            response.put("message", "Invoices retrieved successfully");
            response.put("data", invoices);
            response.put("count", invoices.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while searching invoices");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get invoice by ID
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getInvoiceById(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<Invoice> invoiceOpt = invoiceService.getInvoiceById(id);
            
            if (invoiceOpt.isPresent()) {
                response.put("success", true);
                response.put("message", "Invoice retrieved successfully");
                response.put("data", invoiceOpt.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Invoice not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while retrieving the invoice");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get invoice by number
    @GetMapping("/number/{invoiceNumber}")
    public ResponseEntity<Map<String, Object>> getInvoiceByNumber(@PathVariable String invoiceNumber) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<Invoice> invoiceOpt = invoiceService.getInvoiceByNumber(invoiceNumber);
            
            if (invoiceOpt.isPresent()) {
                response.put("success", true);
                response.put("message", "Invoice retrieved successfully");
                response.put("data", invoiceOpt.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Invoice not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while retrieving the invoice");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get overdue invoices
    @GetMapping("/overdue")
    public ResponseEntity<Map<String, Object>> getOverdueInvoices() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Invoice> overdueInvoices = invoiceService.getOverdueInvoices();
            
            response.put("success", true);
            response.put("message", "Overdue invoices retrieved successfully");
            response.put("data", overdueInvoices);
            response.put("count", overdueInvoices.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while retrieving overdue invoices");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Update invoice
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateInvoice(@PathVariable String id, @RequestBody Invoice invoice) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Get current member for tracking who updated
            Member currentMember = getCurrentMember();
            if (currentMember != null) {
                invoice.setUpdatedBy(currentMember.getId());
                invoice.setUpdatedByName(currentMember.getFirstName() + " " + currentMember.getLastName());
            }
            
            Invoice updatedInvoice = invoiceService.updateInvoice(id, invoice);
            
            response.put("success", true);
            response.put("message", "Invoice updated successfully");
            response.put("data", updatedInvoice);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while updating the invoice");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Delete invoice
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteInvoice(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            invoiceService.deleteInvoice(id);
            
            response.put("success", true);
            response.put("message", "Invoice deleted successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while deleting the invoice");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get invoice statistics
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getInvoiceStats() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalInvoices", invoiceService.getInvoiceCount());
            stats.put("draftInvoices", invoiceService.getInvoiceCountByStatus("DRAFT"));
            stats.put("sentInvoices", invoiceService.getInvoiceCountByStatus("SENT"));
            stats.put("paidInvoices", invoiceService.getInvoiceCountByStatus("PAID"));
            stats.put("overdueInvoices", invoiceService.getInvoiceCountByStatus("OVERDUE"));
            stats.put("cancelledInvoices", invoiceService.getInvoiceCountByStatus("CANCELLED"));
            
            response.put("success", true);
            response.put("message", "Invoice statistics retrieved successfully");
            response.put("data", stats);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An error occurred while retrieving invoice statistics");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Helper method to get current member from JWT token
     */
    private Member getCurrentMember() {
        String currentUserEmail = getCurrentUserEmailFromToken();
        if (currentUserEmail == null) {
            return null;
        }
        
        Optional<Member> currentMemberOpt = memberService.findByEmail(currentUserEmail);
        return currentMemberOpt.orElse(null);
    }
    
    /**
     * Helper method to extract current user email from JWT token
     */
    private String getCurrentUserEmailFromToken() {
        try {
            org.springframework.web.context.request.ServletRequestAttributes requestAttributes = 
                (org.springframework.web.context.request.ServletRequestAttributes) 
                org.springframework.web.context.request.RequestContextHolder.currentRequestAttributes();
            
            jakarta.servlet.http.HttpServletRequest request = requestAttributes.getRequest();
            String authHeader = request.getHeader("Authorization");
            
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                
                try {
                    boolean isValid = jwtTokenUtil.validateToken(token);
                    
                    if (isValid) {
                        String username = jwtTokenUtil.getUsernameFromToken(token);
                        return username;
                    }
                } catch (Exception tokenException) {
                    // Token validation failed
                }
            }
        } catch (Exception e) {
            // Error extracting token
        }
        return null;
    }
    
    // Approve invoice
    @PostMapping("/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveInvoice(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Get the invoice
            Optional<Invoice> invoiceOpt = invoiceService.findById(id);
            if (!invoiceOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Invoice not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Invoice invoice = invoiceOpt.get();
            
            // Check if user can approve this invoice (APP_ADMIN or CLUB_ADMIN for this club)
            boolean canApprove = false;
            if ("APP_ADMIN".equals(currentMember.getRole())) {
                canApprove = true;
            } else {
                // Check if user has CLUB_ADMIN role for this club
                List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
                for (UserClubRole role : clubRoles) {
                    if (role.getClubId().equals(invoice.getClubId()) && "CLUB_ADMIN".equals(role.getClubRole())) {
                        canApprove = true;
                        break;
                    }
                }
            }
            
            if (!canApprove) {
                response.put("success", false);
                response.put("message", "Access denied. Only App Admins or Club Admins can approve invoices for this club.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Check if invoice is in appropriate status for approval
            if (!"PENDING".equals(invoice.getApprovalStatus())) {
                response.put("success", false);
                response.put("message", "Invoice is not pending approval.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            // Approve the invoice
            invoice.setApprovalStatus("APPROVED");
            invoice.setApprovedBy(currentMember.getId());
            invoice.setApprovedByName(currentMember.getFirstName() + " " + currentMember.getLastName());
            invoice.setApprovedAt(java.time.LocalDateTime.now());
            invoice.setStatus("APPROVED");
            invoice.setUpdatedAt(java.time.LocalDateTime.now());
            invoice.setUpdatedBy(currentMember.getId());
            
            Invoice savedInvoice = invoiceService.save(invoice);
            
            response.put("success", true);
            response.put("message", "Invoice approved successfully.");
            response.put("data", savedInvoice);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error approving invoice: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Reject invoice
    @PostMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectInvoice(@PathVariable String id, @RequestBody Map<String, String> requestBody) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Get the invoice
            Optional<Invoice> invoiceOpt = invoiceService.findById(id);
            if (!invoiceOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Invoice not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Invoice invoice = invoiceOpt.get();
            
            // Check if user can reject this invoice (APP_ADMIN or CLUB_ADMIN for this club)
            boolean canReject = false;
            if ("APP_ADMIN".equals(currentMember.getRole())) {
                canReject = true;
            } else {
                // Check if user has CLUB_ADMIN role for this club
                List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
                for (UserClubRole role : clubRoles) {
                    if (role.getClubId().equals(invoice.getClubId()) && "CLUB_ADMIN".equals(role.getClubRole())) {
                        canReject = true;
                        break;
                    }
                }
            }
            
            if (!canReject) {
                response.put("success", false);
                response.put("message", "Access denied. Only App Admins or Club Admins can reject invoices for this club.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Check if invoice is in appropriate status for rejection
            if (!"PENDING".equals(invoice.getApprovalStatus())) {
                response.put("success", false);
                response.put("message", "Invoice is not pending approval.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            String rejectionReason = requestBody.get("rejectionReason");
            if (rejectionReason == null || rejectionReason.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Rejection reason is required.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            // Reject the invoice
            invoice.setApprovalStatus("REJECTED");
            invoice.setApprovedBy(currentMember.getId());
            invoice.setApprovedByName(currentMember.getFirstName() + " " + currentMember.getLastName());
            invoice.setApprovedAt(java.time.LocalDateTime.now());
            invoice.setRejectionReason(rejectionReason);
            invoice.setStatus("REJECTED");
            invoice.setUpdatedAt(java.time.LocalDateTime.now());
            invoice.setUpdatedBy(currentMember.getId());
            
            Invoice savedInvoice = invoiceService.save(invoice);
            
            response.put("success", true);
            response.put("message", "Invoice rejected successfully.");
            response.put("data", savedInvoice);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error rejecting invoice: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Submit invoice for approval
    @PostMapping("/{id}/submit-for-approval")
    public ResponseEntity<Map<String, Object>> submitInvoiceForApproval(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication and authorization - only APP_ADMIN can manage invoices
            ResponseEntity<Map<String, Object>> accessCheck = checkInvoiceAccess();
            if (accessCheck != null) {
                return accessCheck; // Return the error response
            }
            
            // Get the invoice
            Optional<Invoice> invoiceOpt = invoiceService.findById(id);
            if (!invoiceOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Invoice not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Invoice invoice = invoiceOpt.get();
            
            // Invoices are already created in PENDING status, so this mainly just confirms the status
            // If invoice is already PENDING, consider it already submitted
            if ("PENDING".equals(invoice.getApprovalStatus())) {
                response.put("success", true);
                response.put("message", "Invoice is already pending approval.");
                response.put("data", invoice);
                return ResponseEntity.ok(response);
            }
            
            // Submit for approval - set to PENDING
            invoice.setStatus("PENDING");
            invoice.setApprovalStatus("PENDING");
            invoice.setUpdatedAt(java.time.LocalDateTime.now());
            
            Invoice savedInvoice = invoiceService.save(invoice);
            
            response.put("success", true);
            response.put("message", "Invoice submitted for approval successfully.");
            response.put("data", savedInvoice);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error submitting invoice for approval: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get invoices pending approval for club admins
    @GetMapping("/pending-approval")
    public ResponseEntity<Map<String, Object>> getInvoicesPendingApproval(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
            Pageable pageable = PageRequest.of(page, size, sort);
            
            Page<Invoice> invoicesPage;
            
            if ("APP_ADMIN".equals(currentMember.getRole())) {
                // APP_ADMIN can see all pending invoices
                invoicesPage = invoiceService.getInvoicesByApprovalStatus("PENDING", pageable);
            } else {
                // Get clubs where user is CLUB_ADMIN
                List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
                List<String> adminClubIds = clubRoles.stream()
                    .filter(role -> "CLUB_ADMIN".equals(role.getClubRole()))
                    .map(UserClubRole::getClubId)
                    .collect(java.util.stream.Collectors.toList());
                
                if (adminClubIds.isEmpty()) {
                    // User is not admin of any clubs
                    response.put("success", false);
                    response.put("message", "Access denied. You are not an admin of any clubs.");
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
                }
                
                // Get pending invoices for clubs where user is admin
                invoicesPage = invoiceService.getInvoicesByApprovalStatusAndClubIds("PENDING", adminClubIds, pageable);
            }
            
            response.put("success", true);
            response.put("data", invoicesPage.getContent());
            response.put("currentPage", invoicesPage.getNumber());
            response.put("totalPages", invoicesPage.getTotalPages());
            response.put("totalElements", invoicesPage.getTotalElements());
            response.put("size", invoicesPage.getSize());
            response.put("hasNext", invoicesPage.hasNext());
            response.put("hasPrevious", invoicesPage.hasPrevious());
            response.put("message", "Pending invoices retrieved successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving pending invoices: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Helper method to check if current user can access invoices (APP_ADMIN or has club roles)
     */
    private ResponseEntity<Map<String, Object>> checkInvoiceAccess() {
        Member currentMember = getCurrentMember();
        Map<String, Object> response = new HashMap<>();
        
        if (currentMember == null) {
            response.put("success", false);
            response.put("message", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // APP_ADMIN has full access
        if ("APP_ADMIN".equals(currentMember.getRole())) {
            return null; // No error, access is allowed
        }
        
        // Check if user has any club roles
        try {
            List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
            if (clubRoles != null && !clubRoles.isEmpty()) {
                return null; // No error, access is allowed for members with club roles
            }
        } catch (Exception e) {
            // Log error but continue with access denial
            System.err.println("Error checking club roles: " + e.getMessage());
        }
        
        response.put("success", false);
        response.put("message", "Access denied. Only App Admins or club members can access invoices.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    /**
     * Helper method to check if current user is APP_ADMIN and return appropriate response
     * Used for operations that require APP_ADMIN only (create, update, delete)
     */
    private ResponseEntity<Map<String, Object>> checkAppAdminAccess() {
        Member currentMember = getCurrentMember();
        Map<String, Object> response = new HashMap<>();
        
        if (currentMember == null) {
            response.put("success", false);
            response.put("message", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        if (!"APP_ADMIN".equals(currentMember.getRole())) {
            response.put("success", false);
            response.put("message", "Access denied. Only App Admins can manage invoices.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        return null; // No error, access is allowed
    }
}