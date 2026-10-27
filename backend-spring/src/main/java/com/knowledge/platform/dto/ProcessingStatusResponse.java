package com.knowledge.platform.dto;

import java.util.List;

public record ProcessingStatusResponse(
    String job_id,
    String document_id,
    String overall_status,
    String current_stage,
    List<StageStatusDto> stages,
    String error,
    String created_at,
    String updated_at
) {}
