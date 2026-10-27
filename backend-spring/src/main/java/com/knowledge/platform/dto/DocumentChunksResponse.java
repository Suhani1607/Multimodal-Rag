package com.knowledge.platform.dto;

import java.util.List;

public record DocumentChunksResponse(
    String document_id,
    int count,
    List<ChunkDto> chunks
) {}
