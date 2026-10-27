package com.knowledge.platform.repository;

import com.knowledge.platform.model.ConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<ConversationEntity, String> {
    List<ConversationEntity> findAllByProjectIdOrderByUpdatedAtDesc(String projectId);
    Optional<ConversationEntity> findByIdAndProjectId(String id, String projectId);
    void deleteAllByProjectId(String projectId);
}
