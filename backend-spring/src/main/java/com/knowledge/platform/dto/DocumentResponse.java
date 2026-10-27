package com.knowledge.platform.dto;

import java.time.Instant;

public record DocumentResponse(
    String id,
    String projectId,
    String filename,
    String mimeType,
    Long sizeBytes,
    String status,
    String errorDetails,
    Integer chunksCount,
    String folderName,
    Instant createdAt,
    Instant updatedAt
) {}
