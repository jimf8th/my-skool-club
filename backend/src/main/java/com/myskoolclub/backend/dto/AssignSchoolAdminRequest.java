package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.NotNull;

public record AssignSchoolAdminRequest(@NotNull Long userId) {}
