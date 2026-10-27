package com.knowledge.platform;

import com.knowledge.platform.dto.CreateProjectRequest;
import com.knowledge.platform.dto.ProjectResponse;
import com.knowledge.platform.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
class KnowledgePlatformApplicationTests {

    @Autowired
    private ProjectService projectService;

    @Test
    void contextLoads() {
        assertNotNull(projectService, "ProjectService should be injected successfully");
    }

    @Test
    void testCreateAndListProjects() {
        String testOwner = "user_test_suite_123";

        // Create project
        CreateProjectRequest req = new CreateProjectRequest("Test Project Alpha", "Automated test description");
        ProjectResponse created = projectService.createProject(req, testOwner);

        assertNotNull(created.id());
        assertEquals("Test Project Alpha", created.name());
        assertEquals(testOwner, created.ownerId());

        // List projects
        List<ProjectResponse> projects = projectService.getProjectsForOwner(testOwner);
        assertFalse(projects.isEmpty());
        assertTrue(projects.stream().anyMatch(p -> p.id().equals(created.id())));

        // Clean up
        projectService.deleteProject(created.id(), testOwner);
        List<ProjectResponse> remaining = projectService.getProjectsForOwner(testOwner);
        assertTrue(remaining.stream().noneMatch(p -> p.id().equals(created.id())));
    }
}
