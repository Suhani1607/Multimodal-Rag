package com.knowledge.platform.repository;

import com.knowledge.platform.model.ProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<ProjectEntity, String> {
    List<ProjectEntity> findAllByOwnerIdOrderByUpdatedAtDesc(String ownerId);
    Optional<ProjectEntity> findByIdAndOwnerId(String id, String ownerId);
}
