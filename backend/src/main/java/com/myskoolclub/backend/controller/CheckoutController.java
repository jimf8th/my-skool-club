package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.model.Checkout;
import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.model.UserClubRole;
import com.myskoolclub.backend.service.CheckoutService;
import com.myskoolclub.backend.service.MemberService;
import com.myskoolclub.backend.service.UserClubRoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

/**
 * REST Controller for Checkout operations
 */
@RestController
@RequestMapping("/api/checkouts")
@CrossOrigin(origins = "*")
public class CheckoutController {
    
    @Autowired
    private CheckoutService checkoutService;
    
    @Autowired
    private MemberService memberService;
    
    @Autowired
    private UserClubRoleService userClubRoleService;
    
    @Autowired
    private com.myskoolclub.backend.security.JwtTokenUtil jwtTokenUtil;
    
    /**
     * Get all checkouts with pagination
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllCheckouts(
            @RequestParam(required = false) String clubId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "checkoutNumber") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDirection) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check authentication and authorization - APP_ADMIN or club members can access checkouts
            ResponseEntity<Map<String, Object>> accessCheck = checkCheckoutAccess();
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
            
            Page<Checkout> checkoutsPage;
            
            // For non-APP_ADMIN users, filter by their club membership
            if (!isAppAdmin) {
                // Get user's club IDs
                List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
                if (clubRoles == null || clubRoles.isEmpty()) {
                    // User has no club roles, return empty result
                    checkoutsPage = Page.empty(pageable);
                } else {
                    // Determine which club ID to use for filtering
                    String effectiveClubId = clubRoles.get(0).getClubId(); // Default to user's first club
                    
                    if (clubId != null && !clubId.trim().isEmpty()) {
                        // Check if user has access to the requested club
                        boolean hasAccessToClub = clubRoles.stream()
                                .anyMatch(role -> role.getClubId().equals(clubId.trim()));
                        if (hasAccessToClub) {
                            effectiveClubId = clubId.trim();
                        }
                    }
                    
                    // Apply filters with club restriction
                    if (search != null && !search.trim().isEmpty()) {
                        checkoutsPage = checkoutService.searchCheckoutsByClubAndKeyword(effectiveClubId, search.trim(), pageable);
                    } else {
                        checkoutsPage = checkoutService.getCheckoutsByClub(effectiveClubId, pageable);
                    }
                }
            } else {
                // APP_ADMIN can see all checkouts
                if (search != null && !search.trim().isEmpty()) {
                    if (clubId != null && !clubId.trim().isEmpty()) {
                        checkoutsPage = checkoutService.searchCheckoutsByClubAndKeyword(clubId, search.trim(), pageable);
                    } else {
                        checkoutsPage = checkoutService.searchCheckoutsByKeyword(search.trim(), pageable);
                    }
                } else if (clubId != null && !clubId.trim().isEmpty()) {
                    checkoutsPage = checkoutService.getCheckoutsByClub(clubId, pageable);
                } else if (status != null && !status.trim().isEmpty()) {
                    checkoutsPage = checkoutService.getCheckoutsByStatus(status, pageable);
                } else {
                    checkoutsPage = checkoutService.getAllCheckouts(pageable);
                }
            }
            
            response.put("success", true);
            response.put("data", checkoutsPage.getContent());
            response.put("currentPage", checkoutsPage.getNumber());
            response.put("totalPages", checkoutsPage.getTotalPages());
            response.put("totalElements", checkoutsPage.getTotalElements());
            response.put("size", checkoutsPage.getSize());
            response.put("hasNext", checkoutsPage.hasNext());
            response.put("hasPrevious", checkoutsPage.hasPrevious());
            response.put("count", checkoutsPage.getContent().size());
            response.put("message", "Checkouts retrieved successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to retrieve checkouts");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get checkout by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getCheckoutById(@PathVariable String id) {
        try {
            Optional<Checkout> checkout = checkoutService.getCheckoutById(id);
            
            Map<String, Object> response = new HashMap<>();
            if (checkout.isPresent()) {
                response.put("success", true);
                response.put("data", checkout.get());
                response.put("message", "Checkout retrieved successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Checkout not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to retrieve checkout");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get checkout by checkout number
     */
    @GetMapping("/number/{checkoutNumber}")
    public ResponseEntity<Map<String, Object>> getCheckoutByNumber(@PathVariable String checkoutNumber) {
        try {
            Optional<Checkout> checkout = checkoutService.getCheckoutByNumber(checkoutNumber);
            
            Map<String, Object> response = new HashMap<>();
            if (checkout.isPresent()) {
                response.put("success", true);
                response.put("data", checkout.get());
                response.put("message", "Checkout retrieved successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Checkout not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to retrieve checkout");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Create a new checkout
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createCheckout(@RequestBody Checkout checkout) {
        try {
            // Get current member for tracking
            Member currentMember = getCurrentMember();
            if (currentMember != null) {
                checkout.setCreatedBy(currentMember.getId());
                checkout.setCreatedByName(currentMember.getFirstName() + " " + currentMember.getLastName());
            }
            
            Checkout createdCheckout = checkoutService.createCheckout(checkout);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", createdCheckout);
            response.put("message", "Checkout created successfully");
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Validation failed");
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to create checkout");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Update an existing checkout
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateCheckout(@PathVariable String id, @RequestBody Checkout checkout) {
        try {
            // Get current member for tracking
            Member currentMember = getCurrentMember();
            if (currentMember != null) {
                checkout.setUpdatedBy(currentMember.getId());
                checkout.setUpdatedByName(currentMember.getFirstName() + " " + currentMember.getLastName());
            }
            
            Optional<Checkout> updatedCheckout = checkoutService.updateCheckout(id, checkout);
            
            Map<String, Object> response = new HashMap<>();
            if (updatedCheckout.isPresent()) {
                response.put("success", true);
                response.put("data", updatedCheckout.get());
                response.put("message", "Checkout updated successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Checkout not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Validation failed");
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to update checkout");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Delete a checkout
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteCheckout(@PathVariable String id) {
        try {
            boolean deleted = checkoutService.deleteCheckout(id);
            
            Map<String, Object> response = new HashMap<>();
            if (deleted) {
                response.put("success", true);
                response.put("message", "Checkout deleted successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Checkout not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to delete checkout");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Search checkouts by keyword
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchCheckouts(@RequestParam String keyword) {
        try {
            List<Checkout> checkouts = checkoutService.searchCheckouts(keyword);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", checkouts);
            response.put("count", checkouts.size());
            response.put("message", "Checkouts searched successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to search checkouts");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Advanced search with multiple filters
     */
    @GetMapping("/advanced-search")
    public ResponseEntity<Map<String, Object>> advancedSearchCheckouts(
            @RequestParam(required = false) String clubId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String borrowerName,
            @RequestParam(required = false) String checkoutDateFrom,
            @RequestParam(required = false) String checkoutDateTo,
            @RequestParam(required = false) String dueDateFrom,
            @RequestParam(required = false) String dueDateTo,
            @RequestParam(required = false) String minValue,
            @RequestParam(required = false) String maxValue) {
        
        try {
            LocalDate checkoutFrom = (checkoutDateFrom != null && !checkoutDateFrom.isEmpty()) ? LocalDate.parse(checkoutDateFrom) : null;
            LocalDate checkoutTo = (checkoutDateTo != null && !checkoutDateTo.isEmpty()) ? LocalDate.parse(checkoutDateTo) : null;
            LocalDate dueFrom = (dueDateFrom != null && !dueDateFrom.isEmpty()) ? LocalDate.parse(dueDateFrom) : null;
            LocalDate dueTo = (dueDateTo != null && !dueDateTo.isEmpty()) ? LocalDate.parse(dueDateTo) : null;
            
            BigDecimal min = (minValue != null && !minValue.isEmpty()) ? new BigDecimal(minValue) : null;
            BigDecimal max = (maxValue != null && !maxValue.isEmpty()) ? new BigDecimal(maxValue) : null;
            
            List<Checkout> checkouts = checkoutService.advancedSearchCheckouts(
                clubId, status, borrowerName, checkoutFrom, checkoutTo, dueFrom, dueTo, min, max
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", checkouts);
            response.put("count", checkouts.size());
            response.put("message", "Advanced search completed successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to perform advanced search");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get checkouts by club
     */
    @GetMapping("/club/{clubId}")
    public ResponseEntity<Map<String, Object>> getCheckoutsByClub(@PathVariable String clubId) {
        try {
            List<Checkout> checkouts = checkoutService.getCheckoutsByClub(clubId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", checkouts);
            response.put("count", checkouts.size());
            response.put("message", "Checkouts retrieved successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to retrieve checkouts");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get checkouts by status
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<Map<String, Object>> getCheckoutsByStatus(@PathVariable String status) {
        try {
            List<Checkout> checkouts = checkoutService.getCheckoutsByStatus(status);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", checkouts);
            response.put("count", checkouts.size());
            response.put("message", "Checkouts retrieved successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to retrieve checkouts");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get overdue checkouts
     */
    @GetMapping("/overdue")
    public ResponseEntity<Map<String, Object>> getOverdueCheckouts() {
        try {
            List<Checkout> checkouts = checkoutService.getOverdueCheckouts();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", checkouts);
            response.put("count", checkouts.size());
            response.put("message", "Overdue checkouts retrieved successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to retrieve overdue checkouts");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get active checkouts
     */
    @GetMapping("/active")
    public ResponseEntity<Map<String, Object>> getActiveCheckouts() {
        try {
            List<Checkout> checkouts = checkoutService.getActiveCheckouts();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", checkouts);
            response.put("count", checkouts.size());
            response.put("message", "Active checkouts retrieved successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to retrieve active checkouts");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Return items (mark checkout as returned)
     */
    @PutMapping("/{id}/return")
    public ResponseEntity<Map<String, Object>> returnCheckout(@PathVariable String id, 
                                                             @RequestBody(required = false) Map<String, String> requestBody) {
        try {
            String returnNotes = (requestBody != null) ? requestBody.get("returnNotes") : "";
            Optional<Checkout> returnedCheckout = checkoutService.returnCheckout(id, returnNotes);
            
            Map<String, Object> response = new HashMap<>();
            if (returnedCheckout.isPresent()) {
                response.put("success", true);
                response.put("data", returnedCheckout.get());
                response.put("message", "Checkout returned successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Checkout not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to return checkout");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get checkout statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getCheckoutStats() {
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalCheckouts", checkoutService.getTotalCheckoutCount());
            stats.put("activeCheckouts", checkoutService.getCountByStatus("ACTIVE"));
            stats.put("returnedCheckouts", checkoutService.getCountByStatus("RETURNED"));
            stats.put("overdueCheckouts", checkoutService.getOverdueCheckoutCount());
            stats.put("cancelledCheckouts", checkoutService.getCountByStatus("CANCELLED"));
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", stats);
            response.put("message", "Checkout statistics retrieved successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to retrieve checkout statistics");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get recent checkouts
     */
    @GetMapping("/recent")
    public ResponseEntity<Map<String, Object>> getRecentCheckouts() {
        try {
            List<Checkout> checkouts = checkoutService.getRecentCheckouts();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", checkouts);
            response.put("count", checkouts.size());
            response.put("message", "Recent checkouts retrieved successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to retrieve recent checkouts");
            
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
    
    /**
     * Helper method to check if current user has access to checkouts (APP_ADMIN or club member)
     */
    private ResponseEntity<Map<String, Object>> checkCheckoutAccess() {
        Member currentMember = getCurrentMember();
        Map<String, Object> response = new HashMap<>();
        
        if (currentMember == null) {
            response.put("success", false);
            response.put("message", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // APP_ADMIN has access
        if ("APP_ADMIN".equals(currentMember.getRole())) {
            return null; // No error, access is allowed
        }
        
        // Check if user has any club roles
        List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
        if (clubRoles == null || clubRoles.isEmpty()) {
            response.put("success", false);
            response.put("message", "Access denied. You must be a member of at least one club to access checkouts.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        return null; // No error, access is allowed
    }
    
    // Approve checkout
    @PostMapping("/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveCheckout(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Get the checkout
            Optional<Checkout> checkoutOpt = checkoutService.findById(id);
            if (!checkoutOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Checkout not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Checkout checkout = checkoutOpt.get();
            
            // Check if user can approve this checkout (APP_ADMIN or CLUB_ADMIN for this club)
            boolean canApprove = false;
            if ("APP_ADMIN".equals(currentMember.getRole())) {
                canApprove = true;
            } else {
                // Check if user has CLUB_ADMIN role for this club
                List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
                for (UserClubRole role : clubRoles) {
                    if (role.getClubId().equals(checkout.getClubId()) && "CLUB_ADMIN".equals(role.getClubRole())) {
                        canApprove = true;
                        break;
                    }
                }
            }
            
            if (!canApprove) {
                response.put("success", false);
                response.put("message", "Access denied. Only App Admins or Club Admins can approve checkouts for this club.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Check if checkout is in appropriate status for approval
            if (!"PENDING".equals(checkout.getApprovalStatus())) {
                response.put("success", false);
                response.put("message", "Checkout is not pending approval.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            // Approve the checkout
            checkout.setApprovalStatus("APPROVED");
            checkout.setApprovedBy(currentMember.getId());
            checkout.setApprovedByName(currentMember.getFirstName() + " " + currentMember.getLastName());
            checkout.setApprovedAt(java.time.LocalDateTime.now());
            checkout.setStatus("APPROVED");
            checkout.setUpdatedAt(java.time.LocalDateTime.now());
            checkout.setUpdatedBy(currentMember.getId());
            checkout.setUpdatedByName(currentMember.getFirstName() + " " + currentMember.getLastName());
            
            Checkout savedCheckout = checkoutService.save(checkout);
            
            response.put("success", true);
            response.put("message", "Checkout approved successfully.");
            response.put("data", savedCheckout);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error approving checkout: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Reject checkout
    @PostMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectCheckout(@PathVariable String id, @RequestBody Map<String, String> requestBody) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Get the checkout
            Optional<Checkout> checkoutOpt = checkoutService.findById(id);
            if (!checkoutOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Checkout not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Checkout checkout = checkoutOpt.get();
            
            // Check if user can reject this checkout (APP_ADMIN or CLUB_ADMIN for this club)
            boolean canReject = false;
            if ("APP_ADMIN".equals(currentMember.getRole())) {
                canReject = true;
            } else {
                // Check if user has CLUB_ADMIN role for this club
                List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
                for (UserClubRole role : clubRoles) {
                    if (role.getClubId().equals(checkout.getClubId()) && "CLUB_ADMIN".equals(role.getClubRole())) {
                        canReject = true;
                        break;
                    }
                }
            }
            
            if (!canReject) {
                response.put("success", false);
                response.put("message", "Access denied. Only App Admins or Club Admins can reject checkouts for this club.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Check if checkout is in appropriate status for rejection
            if (!"PENDING".equals(checkout.getApprovalStatus())) {
                response.put("success", false);
                response.put("message", "Checkout is not pending approval.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            String rejectionReason = requestBody.get("rejectionReason");
            if (rejectionReason == null || rejectionReason.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Rejection reason is required.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            // Reject the checkout
            checkout.setApprovalStatus("REJECTED");
            checkout.setApprovedBy(currentMember.getId());
            checkout.setApprovedByName(currentMember.getFirstName() + " " + currentMember.getLastName());
            checkout.setApprovedAt(java.time.LocalDateTime.now());
            checkout.setRejectionReason(rejectionReason);
            checkout.setStatus("REJECTED");
            checkout.setUpdatedAt(java.time.LocalDateTime.now());
            checkout.setUpdatedBy(currentMember.getId());
            checkout.setUpdatedByName(currentMember.getFirstName() + " " + currentMember.getLastName());
            
            Checkout savedCheckout = checkoutService.save(checkout);
            
            response.put("success", true);
            response.put("message", "Checkout rejected successfully.");
            response.put("data", savedCheckout);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error rejecting checkout: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get checkouts pending approval for clubs where user is admin
    @GetMapping("/pending-approval")
    public ResponseEntity<Map<String, Object>> getCheckoutsPendingApproval(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Get clubs where user is admin
            List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
            List<String> adminClubIds = new java.util.ArrayList<>();
            
            for (UserClubRole role : clubRoles) {
                if ("CLUB_ADMIN".equals(role.getClubRole())) {
                    adminClubIds.add(role.getClubId());
                }
            }
            
            if (adminClubIds.isEmpty() && !"APP_ADMIN".equals(currentMember.getRole())) {
                response.put("success", true);
                response.put("data", new java.util.ArrayList<>());
                response.put("currentPage", page);
                response.put("totalPages", 0);
                response.put("totalElements", 0);
                response.put("size", size);
                response.put("hasNext", false);
                response.put("hasPrevious", false);
                response.put("message", "No pending checkouts found.");
                return ResponseEntity.ok(response);
            }
            
            // Get pending checkouts
            List<Checkout> allPendingCheckouts;
            if ("APP_ADMIN".equals(currentMember.getRole())) {
                // App admins can see all pending checkouts
                allPendingCheckouts = checkoutService.findByApprovalStatus("PENDING");
            } else {
                // Club admins can only see pending checkouts for their clubs
                allPendingCheckouts = checkoutService.findByClubIdInAndApprovalStatus(adminClubIds, "PENDING");
            }
            
            // Apply pagination
            int totalElements = allPendingCheckouts.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            int startIndex = page * size;
            int endIndex = Math.min(startIndex + size, totalElements);
            
            List<Checkout> paginatedCheckouts = new java.util.ArrayList<>();
            if (startIndex < totalElements) {
                paginatedCheckouts = allPendingCheckouts.subList(startIndex, endIndex);
            }
            
            response.put("success", true);
            response.put("data", paginatedCheckouts);
            response.put("currentPage", page);
            response.put("totalPages", totalPages);
            response.put("totalElements", totalElements);
            response.put("size", size);
            response.put("hasNext", page < totalPages - 1);
            response.put("hasPrevious", page > 0);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error fetching pending checkouts: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get checkouts pending return (APPROVED status) for clubs where user is admin
    @GetMapping("/pending-returns")
    public ResponseEntity<Map<String, Object>> getCheckoutsPendingReturn(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Get clubs where user is admin
            List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
            List<String> adminClubIds = new java.util.ArrayList<>();
            
            for (UserClubRole role : clubRoles) {
                if ("CLUB_ADMIN".equals(role.getClubRole())) {
                    adminClubIds.add(role.getClubId());
                }
            }
            
            if (adminClubIds.isEmpty() && !"APP_ADMIN".equals(currentMember.getRole())) {
                response.put("success", true);
                response.put("data", new java.util.ArrayList<>());
                response.put("currentPage", page);
                response.put("totalPages", 0);
                response.put("totalElements", 0);
                response.put("size", size);
                response.put("hasNext", false);
                response.put("hasPrevious", false);
                response.put("message", "No pending returns found.");
                return ResponseEntity.ok(response);
            }
            
            // Get APPROVED checkouts (pending return)
            List<Checkout> allPendingReturns;
            if ("APP_ADMIN".equals(currentMember.getRole())) {
                // App admins can see all APPROVED checkouts
                allPendingReturns = checkoutService.findByStatus("APPROVED");
            } else {
                // Club admins can only see APPROVED checkouts for their clubs
                allPendingReturns = checkoutService.findByClubIdInAndStatus(adminClubIds, "APPROVED");
            }
            
            // Apply pagination
            int totalElements = allPendingReturns.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            int startIndex = page * size;
            int endIndex = Math.min(startIndex + size, totalElements);
            
            List<Checkout> paginatedReturns = new java.util.ArrayList<>();
            if (startIndex < totalElements) {
                paginatedReturns = allPendingReturns.subList(startIndex, endIndex);
            }
            
            response.put("success", true);
            response.put("data", paginatedReturns);
            response.put("currentPage", page);
            response.put("totalPages", totalPages);
            response.put("totalElements", totalElements);
            response.put("size", size);
            response.put("hasNext", page < totalPages - 1);
            response.put("hasPrevious", page > 0);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error fetching pending returns: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Mark checkout as returned
    @PostMapping("/{id}/mark-returned")
    public ResponseEntity<Map<String, Object>> markCheckoutAsReturned(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Member currentMember = getCurrentMember();
            if (currentMember == null) {
                response.put("success", false);
                response.put("message", "Authentication required.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Get checkout
            Optional<Checkout> checkoutOpt = checkoutService.findById(id);
            if (!checkoutOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Checkout not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            Checkout checkout = checkoutOpt.get();
            
            // Check if user has admin role for this club
            List<UserClubRole> clubRoles = userClubRoleService.getMemberClubRolesByEmail(currentMember.getEmail());
            boolean isClubAdmin = false;
            
            if ("APP_ADMIN".equals(currentMember.getRole())) {
                isClubAdmin = true;
            } else {
                for (UserClubRole role : clubRoles) {
                    if ("CLUB_ADMIN".equals(role.getClubRole()) && 
                        role.getClubId().equals(checkout.getClubId())) {
                        isClubAdmin = true;
                        break;
                    }
                }
            }
            
            if (!isClubAdmin) {
                response.put("success", false);
                response.put("message", "Only club admins can mark checkouts as returned.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Check if checkout is in APPROVED status
            if (!"APPROVED".equals(checkout.getStatus())) {
                response.put("success", false);
                response.put("message", "Only APPROVED checkouts can be marked as returned. Current status: " + checkout.getStatus());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            // Update status to RETURNED
            checkout.setStatus("RETURNED");
            checkout.setReturnDate(LocalDate.now());
            checkout.setUpdatedAt(java.time.LocalDateTime.now());
            checkout.setUpdatedBy(currentMember.getId());
            checkout.setUpdatedByName(currentMember.getFullName());
            
            Checkout updatedCheckout = checkoutService.save(checkout);
            
            response.put("success", true);
            response.put("data", updatedCheckout);
            response.put("message", "Checkout marked as returned successfully.");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error marking checkout as returned: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}