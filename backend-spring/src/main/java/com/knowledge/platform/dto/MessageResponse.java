package com.knowledge.platform.dto;

import java.time.Instant;
import java.util.List;

public record MessageResponse(
    String id,
    String conversationId,
    String role,
    String content,
    List<CitationDto> citations,
    Instant createdAt
) {}
