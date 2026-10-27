package com.knowledge.platform.dto;

import java.util.Map;

public record StageStatusDto(
    String stage,
    String status,
    String started_at,
    String completed_at,
    Double progress,
    Map<String, Object> metrics,
    String error_message
) {}
