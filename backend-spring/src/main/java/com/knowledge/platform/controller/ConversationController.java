package com.knowledge.platform.controller;

import com.knowledge.platform.dto.ConversationResponse;
import com.knowledge.platform.dto.CreateConversationRequest;
import com.knowledge.platform.dto.MessageResponse;
import com.knowledge.platform.dto.SendMessageRequest;
import com.knowledge.platform.service.ConversationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;

@RestController
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @GetMapping("/api/v1/projects/{projectId}/conversations")
    public ResponseEntity<List<ConversationResponse>> getConversations(
            @PathVariable String projectId,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(conversationService.getConversationsForProject(projectId, userId));
    }

    @PostMapping("/api/v1/projects/{projectId}/conversations")
    public ResponseEntity<ConversationResponse> createConversation(
            @PathVariable String projectId,
            @Valid @RequestBody CreateConversationRequest request,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(conversationService.createConversation(projectId, request, userId));
    }

    @GetMapping("/api/v1/conversations/{conversationId}")
    public ResponseEntity<ConversationResponse> getConversation(
            @PathVariable String conversationId,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(conversationService.getConversation(conversationId, userId));
    }

    @DeleteMapping("/api/v1/conversations/{conversationId}")
    public ResponseEntity<Void> deleteConversation(
            @PathVariable String conversationId,
            @AuthenticationPrincipal String userId) {
        conversationService.deleteConversation(conversationId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/conversations/{conversationId}/messages")
    public ResponseEntity<List<MessageResponse>> getMessages(
            @PathVariable String conversationId,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(conversationService.getMessages(conversationId, userId));
    }

    @PostMapping("/api/v1/conversations/{conversationId}/messages")
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable String conversationId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(conversationService.sendMessage(conversationId, request, userId));
    }

    @PostMapping(value = "/api/v1/conversations/{conversationId}/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamChat(
            @PathVariable String conversationId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal String userId) {
        return conversationService.streamMessage(conversationId, request, userId);
    }
}
