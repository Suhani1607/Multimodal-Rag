package com.knowledge.platform.dto;

public record CitationDto(
    String chunk_id,
    String document_id,
    Integer page_number,
    String element_type,
    String snippet,
    Double score
) {}
