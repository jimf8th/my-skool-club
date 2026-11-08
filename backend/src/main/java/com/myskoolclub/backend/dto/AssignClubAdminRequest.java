package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.NotNull;

public record AssignClubAdminRequest(@NotNull Long userId) {}
