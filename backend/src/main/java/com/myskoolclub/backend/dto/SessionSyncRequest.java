package com.myskoolclub.backend.dto;

public record SessionSyncRequest(
        Boolean ageConfirmed,
        Boolean acceptedTerms,
        String firstName,
        String lastName,
        Integer graduationYear
) {}
