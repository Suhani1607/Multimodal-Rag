package com.knowledge.platform.dto;

import java.time.Instant;

public record ConversationResponse(
    String id,
    String projectId,
    String userId,
    String title,
    Instant createdAt,
    Instant updatedAt,
    long messageCount
) {}
