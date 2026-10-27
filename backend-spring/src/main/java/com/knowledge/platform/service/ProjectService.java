package com.knowledge.platform.service;

import com.knowledge.platform.dto.CreateProjectRequest;
import com.knowledge.platform.dto.ProjectResponse;
import com.knowledge.platform.dto.UpdateProjectRequest;
import com.knowledge.platform.model.ProjectEntity;
import com.knowledge.platform.repository.ConversationRepository;
import com.knowledge.platform.repository.DocumentRepository;
import com.knowledge.platform.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final DocumentRepository documentRepository;
    private final ConversationRepository conversationRepository;

    public ProjectService(
            ProjectRepository projectRepository,
            DocumentRepository documentRepository,
            ConversationRepository conversationRepository) {
        this.projectRepository = projectRepository;
        this.documentRepository = documentRepository;
        this.conversationRepository = conversationRepository;
    }

    public List<ProjectResponse> getProjectsForOwner(String ownerId) {
        return projectRepository.findAllByOwnerIdOrderByUpdatedAtDesc(ownerId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public ProjectResponse getProjectById(String projectId, String ownerId) {
        ProjectEntity project = projectRepository.findByIdAndOwnerId(projectId, ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found or unauthorized"));
        return mapToResponse(project);
    }

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request, String ownerId) {
        ProjectEntity project = new ProjectEntity(ownerId, request.name(), request.description());
        ProjectEntity saved = projectRepository.save(project);
        return mapToResponse(saved);
    }

    @Transactional
    public ProjectResponse updateProject(String projectId, UpdateProjectRequest request, String ownerId) {
        ProjectEntity project = projectRepository.findByIdAndOwnerId(projectId, ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found or unauthorized"));

        if (request.name() != null && !request.name().isBlank()) {
            project.setName(request.name());
        }
        if (request.description() != null) {
            project.setDescription(request.description());
        }
        project.setUpdatedAt(Instant.now());

        ProjectEntity updated = projectRepository.save(project);
        return mapToResponse(updated);
    }

    @Transactional
    public void deleteProject(String projectId, String ownerId) {
        ProjectEntity project = projectRepository.findByIdAndOwnerId(projectId, ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found or unauthorized"));

        conversationRepository.deleteAllByProjectId(projectId);
        documentRepository.deleteAllByProjectId(projectId);
        projectRepository.delete(project);
    }

    private ProjectResponse mapToResponse(ProjectEntity entity) {
        long docsCount = documentRepository.findAllByProjectIdOrderByCreatedAtDesc(entity.getId()).size();
        long convsCount = conversationRepository.findAllByProjectIdOrderByUpdatedAtDesc(entity.getId()).size();

        return new ProjectResponse(
                entity.getId(),
                entity.getOwnerId(),
                entity.getName(),
                entity.getDescription(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                docsCount,
                convsCount
        );
    }
}
