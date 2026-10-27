package com.knowledge.platform.dto;

import java.time.Instant;

public record ProjectResponse(
    String id,
    String ownerId,
    String name,
    String description,
    Instant createdAt,
    Instant updatedAt,
    long documentCount,
    long conversationCount
) {}
