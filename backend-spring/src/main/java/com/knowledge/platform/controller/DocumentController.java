package com.knowledge.platform.controller;

import com.knowledge.platform.dto.DocumentChunksResponse;
import com.knowledge.platform.dto.DocumentResponse;
import com.knowledge.platform.dto.IngestUrlRequest;
import com.knowledge.platform.dto.ProcessingStatusResponse;
import com.knowledge.platform.service.DocumentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/api/v1/projects/{projectId}/documents")
    public ResponseEntity<List<DocumentResponse>> getDocuments(
            @PathVariable String projectId,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(documentService.getDocumentsForProject(projectId, userId));
    }

    @PostMapping(value = "/api/v1/projects/{projectId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @PathVariable String projectId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderName", required = false, defaultValue = "General") String folderName,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(documentService.uploadDocument(projectId, file, folderName, userId));
    }

    @PostMapping("/api/v1/projects/{projectId}/documents/url")
    public ResponseEntity<DocumentResponse> ingestUrl(
            @PathVariable String projectId,
            @RequestBody IngestUrlRequest request,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(documentService.ingestUrl(projectId, request.url(), request.folderName(), userId));
    }

    @PatchMapping("/api/v1/documents/{documentId}/folder")
    public ResponseEntity<DocumentResponse> updateFolder(
            @PathVariable String documentId,
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal String userId) {
        String folderName = body.getOrDefault("folderName", "General");
        return ResponseEntity.ok(documentService.updateDocumentFolder(documentId, folderName, userId));
    }

    @GetMapping("/api/v1/documents/{documentId}")
    public ResponseEntity<DocumentResponse> getDocument(
            @PathVariable String documentId,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(documentService.getDocumentById(documentId, userId));
    }

    @DeleteMapping("/api/v1/documents/{documentId}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable String documentId,
            @AuthenticationPrincipal String userId) {
        documentService.deleteDocument(documentId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/documents/{documentId}/processing-status")
    public ResponseEntity<ProcessingStatusResponse> getProcessingStatus(
            @PathVariable String documentId,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(documentService.getProcessingStatus(documentId, userId));
    }

    @GetMapping("/api/v1/documents/{documentId}/chunks")
    public ResponseEntity<DocumentChunksResponse> getChunks(
            @PathVariable String documentId,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(documentService.getChunks(documentId, userId));
    }

    @PostMapping("/api/v1/documents/{documentId}/retry")
    public ResponseEntity<DocumentResponse> retryIngestion(
            @PathVariable String documentId,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(documentService.retryIngestion(documentId, userId));
    }
}
