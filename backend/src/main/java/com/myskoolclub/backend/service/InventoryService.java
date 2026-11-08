package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.CheckInRequest;
import com.myskoolclub.backend.dto.CheckOutRequest;
import com.myskoolclub.backend.dto.InventoryItemRequest;
import com.myskoolclub.backend.dto.InventoryItemResponse;
import com.myskoolclub.backend.dto.InventoryItemSummaryResponse;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.AppRole;
import com.myskoolclub.backend.model.Club;
import com.myskoolclub.backend.model.InventoryCheckout;
import com.myskoolclub.backend.model.InventoryItem;
import com.myskoolclub.backend.model.InventoryStatus;
import com.myskoolclub.backend.model.MembershipRole;
import com.myskoolclub.backend.model.MembershipStatus;
import com.myskoolclub.backend.model.NotificationType;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.ClubMembershipRepository;
import com.myskoolclub.backend.repository.ClubRepository;
import com.myskoolclub.backend.repository.InventoryCheckoutRepository;
import com.myskoolclub.backend.repository.InventoryItemRepository;
import com.myskoolclub.backend.repository.SchoolMembershipRepository;
import com.myskoolclub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryCheckoutRepository inventoryCheckoutRepository;
    private final ClubRepository clubRepository;
    private final ClubMembershipRepository clubMembershipRepository;
    private final SchoolMembershipRepository schoolMembershipRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // ---- Reads ----

    @Transactional(readOnly = true)
    public List<InventoryItemSummaryResponse> listItems(Long clubId) {
        Map<Long, InventoryCheckout> activeByItemId = inventoryCheckoutRepository.findActiveByClubId(clubId)
                .stream()
                .collect(Collectors.toMap(c -> c.getItem().getId(), Function.identity()));
        return inventoryItemRepository.findByClubIdOrderByNameAsc(clubId).stream()
                .map(item -> InventoryItemSummaryResponse.from(item, activeByItemId.get(item.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public InventoryItemResponse getItem(Long clubId, Long itemId) {
        InventoryItem item = requireItemInClub(clubId, itemId);
        return toResponse(item);
    }

    // ---- Item management (MANAGE_INVENTORY — admins) ----

    @Transactional
    public InventoryItemResponse createItem(Long clubId, InventoryItemRequest request, String requesterEmail) {
        Club club = requireClub(clubId);
        User creator = requireUser(requesterEmail);

        InventoryItem item = InventoryItem.builder()
                .club(club)
                .createdBy(creator)
                .name(request.name())
                .description(request.description())
                .category(request.category())
                .serialNumber(request.serialNumber())
                .status(InventoryStatus.CHECKED_IN)
                .build();

        return toResponse(inventoryItemRepository.save(item));
    }

    @Transactional
    public InventoryItemResponse updateItem(Long clubId, Long itemId, InventoryItemRequest request) {
        InventoryItem item = requireItemInClub(clubId, itemId);
        item.setName(request.name());
        item.setDescription(request.description());
        item.setCategory(request.category());
        item.setSerialNumber(request.serialNumber());
        return toResponse(item);
    }

    @Transactional
    public void deleteItem(Long clubId, Long itemId) {
        InventoryItem item = requireItemInClub(clubId, itemId);
        if (item.getStatus() == InventoryStatus.CHECKED_OUT) {
            throw new AppException(HttpStatus.CONFLICT,
                    "This item is currently checked out — check it in before deleting it");
        }
        inventoryItemRepository.delete(item);
    }

    // ---- Check-out / check-in (CHECKOUT_INVENTORY — any approved member) ----

    @Transactional
    public InventoryItemResponse checkOut(Long clubId, Long itemId, CheckOutRequest request, String requesterEmail) {
        InventoryItem item = requireItemInClub(clubId, itemId);
        User requester = requireUser(requesterEmail);

        if (item.getStatus() == InventoryStatus.CHECKED_OUT) {
            throw new AppException(HttpStatus.CONFLICT, "This item is already checked out");
        }
        if (request.dueDate() != null && request.dueDate().isBefore(LocalDate.now())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Due date cannot be in the past");
        }

        InventoryCheckout checkout = InventoryCheckout.builder()
                .item(item)
                .checkedOutBy(requester)
                .dueDate(request.dueDate())
                .checkoutNotes(request.notes())
                .build();
        inventoryCheckoutRepository.save(checkout);
        item.setStatus(InventoryStatus.CHECKED_OUT);

        return toResponse(item);
    }

    @Transactional
    public InventoryItemResponse checkIn(Long clubId, Long itemId, CheckInRequest request, String requesterEmail) {
        InventoryItem item = requireItemInClub(clubId, itemId);
        User requester = requireUser(requesterEmail);

        InventoryCheckout active = inventoryCheckoutRepository.findActiveByItemId(itemId)
                .orElseThrow(() -> new AppException(HttpStatus.CONFLICT, "This item is not checked out"));

        boolean isBorrower = active.getCheckedOutBy().getId().equals(requester.getId());
        if (!isBorrower && !isClubOrSchoolAdmin(item.getClub(), requester)) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Only the member who checked this item out (or an admin) can check it in");
        }

        active.setCheckedInBy(requester);
        active.setCheckedInAt(LocalDateTime.now());
        active.setCheckinNotes(request.notes());
        item.setStatus(InventoryStatus.CHECKED_IN);

        if (!isBorrower) {
            notificationService.notify(active.getCheckedOutBy(), NotificationType.INVENTORY_CHECKED_IN,
                    itemId.toString(),
                    "\"" + item.getName() + "\" was checked back in on your behalf by "
                            + requester.getFirstName() + " " + requester.getLastName());
        }

        return toResponse(item);
    }

    // ---- Helpers ----

    /** APP_ADMIN, SCHOOL_ADMIN of the club's school, or CLUB_ADMIN of this club. */
    private boolean isClubOrSchoolAdmin(Club club, User user) {
        if (user.getAppRole() == AppRole.APP_ADMIN) return true;

        var schoolMembership = schoolMembershipRepository
                .findByUserIdAndSchoolId(user.getId(), club.getSchool().getId())
                .orElse(null);
        if (schoolMembership != null
                && schoolMembership.getStatus() == MembershipStatus.APPROVED
                && schoolMembership.getRole() == MembershipRole.ADMIN) {
            return true;
        }

        var clubMembership = clubMembershipRepository
                .findByUserIdAndClubId(user.getId(), club.getId())
                .orElse(null);
        return clubMembership != null
                && clubMembership.getStatus() == MembershipStatus.APPROVED
                && clubMembership.getRole() == MembershipRole.ADMIN;
    }

    private InventoryItemResponse toResponse(InventoryItem item) {
        InventoryCheckout active = inventoryCheckoutRepository.findActiveByItemId(item.getId()).orElse(null);
        List<InventoryCheckout> history = inventoryCheckoutRepository.findByItemIdOrderByCheckedOutAtDesc(item.getId());
        return InventoryItemResponse.from(item, active, history);
    }

    private InventoryItem requireItemInClub(Long clubId, Long itemId) {
        InventoryItem item = inventoryItemRepository.findByIdWithDetails(itemId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Inventory item not found"));
        if (!item.getClub().getId().equals(clubId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Inventory item not found");
        }
        return item;
    }

    private Club requireClub(Long clubId) {
        return clubRepository.findById(clubId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Club not found"));
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
