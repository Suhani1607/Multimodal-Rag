package com.knowledge.platform.dto;

public record IngestUrlRequest(
    String url,
    String folderName
) {
    public IngestUrlRequest(String url) {
        this(url, "General");
    }
}
