package com.knowledge.platform.service;

import com.knowledge.platform.dto.DocumentChunksResponse;
import com.knowledge.platform.dto.ProcessingStatusResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.Map;

@Service
public class AiServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AiServiceClient.class);

    private final WebClient webClient;

    public AiServiceClient(
            @Value("${ai-service.url:http://localhost:8000}") String aiServiceUrl,
            @Value("${ai-service.secret:super-secret-internal-token-change-in-prod}") String secret) {
        this.webClient = WebClient.builder()
                .baseUrl(aiServiceUrl)
                .defaultHeader("X-Internal-Secret", secret)
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(50 * 1024 * 1024))
                .build();
    }

    public Map<String, Object> triggerIngestion(String documentId, String projectId, String filePath, String filename, String mimeType, String folderName) {
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("document_id", documentId);
            payload.put("project_id", projectId);
            payload.put("file_path", filePath);
            payload.put("filename", filename);
            payload.put("mime_type", mimeType);
            payload.put("folder_name", folderName != null && !folderName.isBlank() ? folderName : "General");

            return webClient.post()
                    .uri("/internal/ingest")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(120))
                    .block();
        } catch (Exception e) {
            log.error("Failed to trigger ingestion with AI service: {}", e.getMessage());
            return Map.of("error", e.getMessage(), "status", "failed");
        }
    }

    public Map<String, Object> triggerIngestion(String documentId, String projectId, String filePath, String filename, String mimeType) {
        return triggerIngestion(documentId, projectId, filePath, filename, mimeType, "General");
    }

    public Map<String, Object> triggerUrlIngestion(String documentId, String projectId, String url, String folderName) {
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("document_id", documentId);
            payload.put("project_id", projectId);
            payload.put("url", url);
            payload.put("folder_name", folderName != null && !folderName.isBlank() ? folderName : "General");

            return webClient.post()
                    .uri("/internal/ingest-url")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(120))
                    .block();
        } catch (Exception e) {
            log.error("Failed to trigger URL ingestion with AI service: {}", e.getMessage());
            return Map.of("error", e.getMessage(), "status", "failed");
        }
    }

    public Map<String, Object> triggerUrlIngestion(String documentId, String projectId, String url) {
        return triggerUrlIngestion(documentId, projectId, url, "General");
    }

    public ProcessingStatusResponse getProcessingStatus(String documentId) {
        try {
            return webClient.get()
                    .uri("/internal/documents/{id}/status", documentId)
                    .retrieve()
                    .bodyToMono(ProcessingStatusResponse.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
        } catch (Exception e) {
            log.warn("Could not fetch processing status from AI service for {}: {}", documentId, e.getMessage());
            return null;
        }
    }

    public DocumentChunksResponse getDocumentChunks(String documentId) {
        try {
            return webClient.get()
                    .uri("/internal/documents/{id}/chunks", documentId)
                    .retrieve()
                    .bodyToMono(DocumentChunksResponse.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
        } catch (Exception e) {
            log.warn("Could not fetch chunks from AI service for {}: {}", documentId, e.getMessage());
            return new DocumentChunksResponse(documentId, 0, java.util.List.of());
        }
    }

    public Map<String, Object> executeRagQuery(String projectId, String query, String conversationId, String folderName) {
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("project_id", projectId);
            payload.put("query", query);
            payload.put("conversation_id", conversationId != null ? conversationId : "");
            payload.put("top_k", 4);
            payload.put("use_reranker", false);
            if (folderName != null && !folderName.isBlank() && !folderName.equalsIgnoreCase("all")) {
                payload.put("folder_name", folderName);
            }

            return webClient.post()
                    .uri("/internal/query")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(60))
                    .block();
        } catch (Exception e) {
            log.error("RAG query failed: {}", e.getMessage());
            return Map.of(
                    "answer", "An error occurred while querying the AI service: " + e.getMessage(),
                    "citations", java.util.List.of(),
                    "retrieved_chunks_count", 0
            );
        }
    }

    public Map<String, Object> executeRagQuery(String projectId, String query, String conversationId) {
        return executeRagQuery(projectId, query, conversationId, null);
    }

    public Flux<String> streamRagQuery(String projectId, String query, String conversationId, String folderName) {
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("project_id", projectId);
        payload.put("query", query);
        payload.put("conversation_id", conversationId != null ? conversationId : "");
        payload.put("top_k", 4);
        payload.put("use_reranker", false);
        if (folderName != null && !folderName.isBlank() && !folderName.equalsIgnoreCase("all")) {
            payload.put("folder_name", folderName);
        }

        return webClient.post()
                .uri("/internal/query/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(payload)
                .retrieve()
                .bodyToFlux(String.class);
    }

    public Flux<String> streamRagQuery(String projectId, String query, String conversationId) {
        return streamRagQuery(projectId, query, conversationId, null);
    }
}
