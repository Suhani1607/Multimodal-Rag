package com.knowledge.platform.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateConversationRequest(
    @NotBlank(message = "Conversation title is required")
    String title
) {}
