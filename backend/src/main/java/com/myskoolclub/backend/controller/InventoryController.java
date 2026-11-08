package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.CheckInRequest;
import com.myskoolclub.backend.dto.CheckOutRequest;
import com.myskoolclub.backend.dto.InventoryItemRequest;
import com.myskoolclub.backend.dto.InventoryItemResponse;
import com.myskoolclub.backend.dto.InventoryItemSummaryResponse;
import com.myskoolclub.backend.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    /** List the club's inventory. Requires VIEW_INVENTORY (any approved club member or above). */
    @GetMapping("/api/clubs/{clubId}/inventory")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'VIEW_INVENTORY')")
    public ResponseEntity<List<InventoryItemSummaryResponse>> listItems(@PathVariable Long clubId) {
        return ResponseEntity.ok(inventoryService.listItems(clubId));
    }

    /** Get full item detail, including checkout history. Requires VIEW_INVENTORY. */
    @GetMapping("/api/clubs/{clubId}/inventory/{itemId}")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'VIEW_INVENTORY')")
    public ResponseEntity<InventoryItemResponse> getItem(
            @PathVariable Long clubId, @PathVariable Long itemId) {
        return ResponseEntity.ok(inventoryService.getItem(clubId, itemId));
    }

    /** Add an item to the club's inventory. Requires MANAGE_INVENTORY (club/school/app admin). */
    @PostMapping("/api/clubs/{clubId}/inventory")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'MANAGE_INVENTORY')")
    public ResponseEntity<InventoryItemResponse> createItem(
            @PathVariable Long clubId, @Valid @RequestBody InventoryItemRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventoryService.createItem(clubId, request, auth.getName()));
    }

    /** Edit an item's details. Requires MANAGE_INVENTORY. */
    @PutMapping("/api/clubs/{clubId}/inventory/{itemId}")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'MANAGE_INVENTORY')")
    public ResponseEntity<InventoryItemResponse> updateItem(
            @PathVariable Long clubId, @PathVariable Long itemId,
            @Valid @RequestBody InventoryItemRequest request) {
        return ResponseEntity.ok(inventoryService.updateItem(clubId, itemId, request));
    }

    /** Remove an item. Requires MANAGE_INVENTORY; item must be checked in (service-enforced). */
    @DeleteMapping("/api/clubs/{clubId}/inventory/{itemId}")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'MANAGE_INVENTORY')")
    public ResponseEntity<Void> deleteItem(@PathVariable Long clubId, @PathVariable Long itemId) {
        inventoryService.deleteItem(clubId, itemId);
        return ResponseEntity.noContent().build();
    }

    /** Check an item out. Requires CHECKOUT_INVENTORY (any approved club member or above). */
    @PostMapping("/api/clubs/{clubId}/inventory/{itemId}/check-out")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'CHECKOUT_INVENTORY')")
    public ResponseEntity<InventoryItemResponse> checkOut(
            @PathVariable Long clubId, @PathVariable Long itemId,
            @RequestBody(required = false) @Valid CheckOutRequest request, Authentication auth) {
        CheckOutRequest body = request != null ? request : new CheckOutRequest(null, null);
        return ResponseEntity.ok(inventoryService.checkOut(clubId, itemId, body, auth.getName()));
    }

    /** Check an item back in. Borrower or a club/school/app admin (service-enforced). */
    @PostMapping("/api/clubs/{clubId}/inventory/{itemId}/check-in")
    @PreAuthorize("@sec.hasClubPrivilege(authentication, #clubId, 'CHECKOUT_INVENTORY')")
    public ResponseEntity<InventoryItemResponse> checkIn(
            @PathVariable Long clubId, @PathVariable Long itemId,
            @RequestBody(required = false) @Valid CheckInRequest request, Authentication auth) {
        CheckInRequest body = request != null ? request : new CheckInRequest(null);
        return ResponseEntity.ok(inventoryService.checkIn(clubId, itemId, body, auth.getName()));
    }
}
