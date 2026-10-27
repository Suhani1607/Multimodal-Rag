package com.knowledge.platform.dto;

import jakarta.validation.constraints.NotBlank;

public record SendMessageRequest(
    @NotBlank(message = "Message content is required")
    String content,
    String folderName
) {
    public SendMessageRequest(String content) {
        this(content, null);
    }
}
