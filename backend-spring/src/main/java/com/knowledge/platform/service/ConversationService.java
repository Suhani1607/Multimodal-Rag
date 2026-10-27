package com.knowledge.platform.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.platform.dto.ConversationResponse;
import com.knowledge.platform.dto.CreateConversationRequest;
import com.knowledge.platform.dto.MessageResponse;
import com.knowledge.platform.dto.SendMessageRequest;
import com.knowledge.platform.dto.CitationDto;
import com.knowledge.platform.model.ConversationEntity;
import com.knowledge.platform.model.MessageEntity;
import com.knowledge.platform.repository.ConversationRepository;
import com.knowledge.platform.repository.MessageRepository;
import com.knowledge.platform.repository.ProjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ConversationService {

    private static final Logger log = LoggerFactory.getLogger(ConversationService.class);

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ProjectRepository projectRepository;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ConversationService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            ProjectRepository projectRepository,
            AiServiceClient aiServiceClient) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.projectRepository = projectRepository;
        this.aiServiceClient = aiServiceClient;
    }

    public List<ConversationResponse> getConversationsForProject(String projectId, String userId) {
        validateProjectAccess(projectId, userId);
        return conversationRepository.findAllByProjectIdOrderByUpdatedAtDesc(projectId)
                .stream()
                .map(this::mapToConversationResponse)
                .toList();
    }

    public ConversationResponse getConversation(String conversationId, String userId) {
        ConversationEntity conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        validateProjectAccess(conv.getProjectId(), userId);
        return mapToConversationResponse(conv);
    }

    @Transactional
    public ConversationResponse createConversation(String projectId, CreateConversationRequest request, String userId) {
        validateProjectAccess(projectId, userId);
        ConversationEntity conv = new ConversationEntity(projectId, userId, request.title());
        ConversationEntity saved = conversationRepository.save(conv);
        return mapToConversationResponse(saved);
    }

    @Transactional
    public void deleteConversation(String conversationId, String userId) {
        ConversationEntity conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        validateProjectAccess(conv.getProjectId(), userId);

        messageRepository.deleteAllByConversationId(conversationId);
        conversationRepository.delete(conv);
    }

    public List<MessageResponse> getMessages(String conversationId, String userId) {
        ConversationEntity conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        validateProjectAccess(conv.getProjectId(), userId);

        return messageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(this::mapToMessageResponse)
                .toList();
    }

    @Transactional
    public MessageResponse sendMessage(String conversationId, SendMessageRequest request, String userId) {
        ConversationEntity conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        validateProjectAccess(conv.getProjectId(), userId);

        // 1. Save user message
        MessageEntity userMsg = new MessageEntity(conversationId, "user", request.content(), "[]");
        messageRepository.save(userMsg);

        // 2. Call AI service for RAG grounded answer
        Map<String, Object> ragResult = aiServiceClient.executeRagQuery(conv.getProjectId(), request.content(), conversationId, request.folderName());
        String answer = (String) ragResult.getOrDefault("answer", "I could not find relevant answers.");
        
        String citationsJson = "[]";
        try {
            Object citationsObj = ragResult.get("citations");
            if (citationsObj != null) {
                citationsJson = objectMapper.writeValueAsString(citationsObj);
            }
        } catch (Exception e) {
            log.warn("Failed to serialize citations: {}", e.getMessage());
        }

        // 3. Save assistant message
        MessageEntity assistantMsg = new MessageEntity(conversationId, "assistant", answer, citationsJson);
        MessageEntity savedAssistantMsg = messageRepository.save(assistantMsg);

        // 4. Update conversation timestamp
        conv.setUpdatedAt(Instant.now());
        conversationRepository.save(conv);

        return mapToMessageResponse(savedAssistantMsg);
    }

    public Flux<String> streamMessage(String conversationId, SendMessageRequest request, String userId) {
        ConversationEntity conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        validateProjectAccess(conv.getProjectId(), userId);

        // Save user message synchronously
        MessageEntity userMsg = new MessageEntity(conversationId, "user", request.content(), "[]");
        messageRepository.save(userMsg);

        // Update conv timestamp
        conv.setUpdatedAt(Instant.now());
        conversationRepository.save(conv);

        // Stream from AI service
        return aiServiceClient.streamRagQuery(conv.getProjectId(), request.content(), conversationId, request.folderName());
    }

    private void validateProjectAccess(String projectId, String userId) {
        projectRepository.findByIdAndOwnerId(projectId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to project"));
    }

    private ConversationResponse mapToConversationResponse(ConversationEntity c) {
        long msgCount = messageRepository.findAllByConversationIdOrderByCreatedAtAsc(c.getId()).size();
        return new ConversationResponse(
                c.getId(),
                c.getProjectId(),
                c.getUserId(),
                c.getTitle(),
                c.getCreatedAt(),
                c.getUpdatedAt(),
                msgCount
        );
    }

    private MessageResponse mapToMessageResponse(MessageEntity m) {
        List<CitationDto> citations = new ArrayList<>();
        if (m.getCitations() != null && !m.getCitations().isBlank()) {
            try {
                citations = objectMapper.readValue(m.getCitations(), new TypeReference<List<CitationDto>>() {});
            } catch (Exception e) {
                log.debug("Citation deserialize error: {}", e.getMessage());
            }
        }

        return new MessageResponse(
                m.getId(),
                m.getConversationId(),
                m.getRole(),
                m.getContent(),
                citations,
                m.getCreatedAt()
        );
    }
}
