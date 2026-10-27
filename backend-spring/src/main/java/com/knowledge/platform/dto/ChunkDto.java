package com.knowledge.platform.dto;

import java.util.List;
import java.util.Map;

public record ChunkDto(
    String chunk_id,
    String document_id,
    String project_id,
    int sequence,
    String content,
    String enhanced_content,
    Integer page_number,
    String element_type,
    String section_title,
    List<String> tables_html,
    List<String> images_base64,
    Map<String, Object> metadata,
    Double score
) {}
