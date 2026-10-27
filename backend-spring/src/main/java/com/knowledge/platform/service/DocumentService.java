package com.knowledge.platform.service;

import com.knowledge.platform.dto.DocumentChunksResponse;
import com.knowledge.platform.dto.DocumentResponse;
import com.knowledge.platform.dto.ProcessingStatusResponse;
import com.knowledge.platform.dto.StageStatusDto;
import com.knowledge.platform.model.DocumentEntity;
import com.knowledge.platform.model.ProjectEntity;
import com.knowledge.platform.repository.DocumentRepository;
import com.knowledge.platform.repository.ProjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".pdf", ".docx", ".doc", ".csv", ".txt");
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    private final DocumentRepository documentRepository;
    private final ProjectRepository projectRepository;
    private final StorageService storageService;
    private final AiServiceClient aiServiceClient;

    public DocumentService(
            DocumentRepository documentRepository,
            ProjectRepository projectRepository,
            StorageService storageService,
            AiServiceClient aiServiceClient) {
        this.documentRepository = documentRepository;
        this.projectRepository = projectRepository;
        this.storageService = storageService;
        this.aiServiceClient = aiServiceClient;
    }

    public List<DocumentResponse> getDocumentsForProject(String projectId, String ownerId) {
        validateProjectAccess(projectId, ownerId);
        return documentRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public DocumentResponse getDocumentById(String documentId, String ownerId) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        validateProjectAccess(doc.getProjectId(), ownerId);
        return mapToResponse(doc);
    }

    @Transactional
    public DocumentResponse uploadDocument(String projectId, MultipartFile file, String folderName, String ownerId) {
        validateProjectAccess(projectId, ownerId);

        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File cannot be empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File size exceeds 50MB limit");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) originalFilename = "document";
        String ext = originalFilename.contains(".") ? originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase() : "";
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file format. Supported: PDF, DOCX, CSV, TXT");
        }

        try {
            StorageService.StorageResult stored = storageService.storeFile(file);
            DocumentEntity doc = new DocumentEntity(
                    projectId,
                    originalFilename,
                    stored.relativeStorageKey(),
                    file.getContentType(),
                    stored.sizeBytes()
            );
            doc.setContentHash(stored.sha256Hash());
            doc.setFolderName(folderName != null && !folderName.isBlank() ? folderName : "General");
            doc.setStatus("QUEUED");
            DocumentEntity saved = documentRepository.save(doc);

            // Trigger AI ingestion asynchronously
            aiServiceClient.triggerIngestion(
                    saved.getId(),
                    projectId,
                    stored.absolutePath(),
                    saved.getFilename(),
                    saved.getMimeType(),
                    saved.getFolderName()
            );

            return mapToResponse(saved);
        } catch (IOException e) {
            log.error("Failed to store file: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file: " + e.getMessage());
        }
    }

    @Transactional
    public DocumentResponse ingestUrl(String projectId, String url, String folderName, String ownerId) {
        validateProjectAccess(projectId, ownerId);

        if (url == null || !url.startsWith("http")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid HTTP/HTTPS URL is required");
        }

        DocumentEntity doc = new DocumentEntity(
                projectId,
                url,
                url,
                "text/html",
                0L
        );
        doc.setFolderName(folderName != null && !folderName.isBlank() ? folderName : "General");
        doc.setStatus("QUEUED");
        DocumentEntity saved = documentRepository.save(doc);

        aiServiceClient.triggerUrlIngestion(saved.getId(), projectId, url, saved.getFolderName());
        return mapToResponse(saved);
    }

    @Transactional
    public DocumentResponse updateDocumentFolder(String documentId, String folderName, String ownerId) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        validateProjectAccess(doc.getProjectId(), ownerId);
        doc.setFolderName(folderName != null && !folderName.isBlank() ? folderName : "General");
        doc.setUpdatedAt(Instant.now());
        DocumentEntity saved = documentRepository.save(doc);
        return mapToResponse(saved);
    }

    public ProcessingStatusResponse getProcessingStatus(String documentId, String ownerId) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        validateProjectAccess(doc.getProjectId(), ownerId);

        ProcessingStatusResponse status = aiServiceClient.getProcessingStatus(documentId);
        if (status != null) {
            // Sync database status if completed or failed
            if ("completed".equalsIgnoreCase(status.overall_status()) && !"COMPLETED".equals(doc.getStatus())) {
                doc.setStatus("COMPLETED");
                if (status.stages() != null && !status.stages().isEmpty()) {
                    StageStatusDto lastStage = status.stages().get(status.stages().size() - 1);
                    if (lastStage.metrics() != null && lastStage.metrics().containsKey("total_chunks")) {
                        Object tc = lastStage.metrics().get("total_chunks");
                        if (tc instanceof Number n) {
                            doc.setChunksCount(n.intValue());
                        }
                    }
                }
                doc.setUpdatedAt(Instant.now());
                documentRepository.save(doc);
            } else if ("failed".equalsIgnoreCase(status.overall_status()) && !"FAILED".equals(doc.getStatus())) {
                doc.setStatus("FAILED");
                doc.setErrorDetails(status.error());
                doc.setUpdatedAt(Instant.now());
                documentRepository.save(doc);
            }
            return status;
        }

        // Fallback default status structure
        String nowStr = Instant.now().toString();
        List<StageStatusDto> defaultStages = List.of(
                new StageStatusDto("Upload to storage", "completed", nowStr, nowStr, 100.0, Map.of("filename", doc.getFilename()), null),
                new StageStatusDto("Queued", "completed", nowStr, nowStr, 100.0, Map.of(), null),
                new StageStatusDto("Partitioning", "in_progress", nowStr, null, 50.0, Map.of(), null),
                new StageStatusDto("Chunking", "pending", null, null, 0.0, Map.of(), null),
                new StageStatusDto("Summarization", "pending", null, null, 0.0, Map.of(), null),
                new StageStatusDto("Vectorization and storage", "pending", null, null, 0.0, Map.of(), null),
                new StageStatusDto("View Chunks", "pending", null, null, 0.0, Map.of(), null)
        );

        return new ProcessingStatusResponse(
                "job_" + doc.getId(),
                doc.getId(),
                doc.getStatus().toLowerCase(),
                "Partitioning",
                defaultStages,
                doc.getErrorDetails(),
                doc.getCreatedAt().toString(),
                doc.getUpdatedAt().toString()
        );
    }

    public DocumentChunksResponse getChunks(String documentId, String ownerId) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        validateProjectAccess(doc.getProjectId(), ownerId);

        return aiServiceClient.getDocumentChunks(documentId);
    }

    @Transactional
    public DocumentResponse retryIngestion(String documentId, String ownerId) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        validateProjectAccess(doc.getProjectId(), ownerId);

        doc.setStatus("PROCESSING");
        doc.setErrorDetails(null);
        doc.setUpdatedAt(Instant.now());
        DocumentEntity saved = documentRepository.save(doc);

        String fullPath = storageService.getStoragePath(doc.getStorageKey()).toString();
        if (doc.getStorageKey().startsWith("http")) {
            aiServiceClient.triggerUrlIngestion(doc.getId(), doc.getProjectId(), doc.getStorageKey());
        } else {
            aiServiceClient.triggerIngestion(doc.getId(), doc.getProjectId(), fullPath, doc.getFilename(), doc.getMimeType());
        }

        return mapToResponse(saved);
    }

    @Transactional
    public void deleteDocument(String documentId, String ownerId) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        validateProjectAccess(doc.getProjectId(), ownerId);

        storageService.deleteFile(doc.getStorageKey());
        documentRepository.delete(doc);
    }

    private void validateProjectAccess(String projectId, String ownerId) {
        if (projectRepository.findByIdAndOwnerId(projectId, ownerId).isEmpty()) {
            if (projectRepository.existsById(projectId)) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to project documents");
        }
    }

    private DocumentResponse mapToResponse(DocumentEntity d) {
        return new DocumentResponse(
                d.getId(),
                d.getProjectId(),
                d.getFilename(),
                d.getMimeType(),
                d.getSizeBytes(),
                d.getStatus(),
                d.getErrorDetails(),
                d.getChunksCount(),
                d.getFolderName(),
                d.getCreatedAt(),
                d.getUpdatedAt()
        );
    }
}
