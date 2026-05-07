package com.yfind.aiplatform.integration;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yfind.aiplatform.training.TrainingAuthorizationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class RemainingIntegrationControllerTest {
  private static final String AUTHORIZATION = "Bearer " + TrainingAuthorizationService.LOCAL_DEV_TOKEN;

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("TASK-platform-overview-integration lists all connected module APIs")
  void overviewListsConnectedApis() throws Exception {
    mockMvc.perform(get("/api/overview"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.featureTrace", is("TASK-platform-overview-integration")))
      .andExpect(jsonPath("$.nodes[*].apiPath", hasItem("/api/inference-services")))
      .andExpect(jsonPath("$.nodes[*].apiPath", hasItem("/api/labeling-tasks")))
      .andExpect(jsonPath("$.nodes[*].apiPath", hasItem("/api/edge-nodes")));
  }

  @Test
  @DisplayName("TASK-inference-service-integration lists and deploys inference services")
  void inferenceServiceIntegration() throws Exception {
    mockMvc.perform(get("/api/inference-services").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.featureTrace", is("TASK-inference-service-integration")))
      .andExpect(jsonPath("$.items[0].permission", is("inference:read")))
      .andExpect(jsonPath("$.items[0].metrics[*].label", hasItem("14:00")));

    mockMvc.perform(post("/api/inference-services/deployments")
        .header("Authorization", AUTHORIZATION)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"modelKey\":\"bearing-defect-detector\",\"versionKey\":\"bearing-defect-detector-v1\",\"replicas\":2,\"trafficPercent\":10}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("DEPLOYING")))
      .andExpect(jsonPath("$.featureTrace", is("TASK-inference-service-integration")));
  }

  @Test
  @DisplayName("TASK-labeling-workflow-integration lists and approves labeling tasks")
  void labelingTaskIntegration() throws Exception {
    mockMvc.perform(get("/api/labeling-tasks").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items[*].taskKey", hasItem("label-welding-v2")))
      .andExpect(jsonPath("$.featureTrace", is("TASK-labeling-workflow-integration")));

    mockMvc.perform(post("/api/labeling-tasks/label-welding-v2/approve").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("APPROVED")));
  }

  @Test
  @DisplayName("TASK-edge-dispatch-integration lists and dispatches edge nodes")
  void edgeDispatchIntegration() throws Exception {
    mockMvc.perform(get("/api/edge-nodes").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items[*].nodeKey", hasItem("edge-suzhou-line-01")))
      .andExpect(jsonPath("$.featureTrace", is("TASK-edge-dispatch-integration")));

    mockMvc.perform(post("/api/edge-nodes/dispatches")
        .header("Authorization", AUTHORIZATION)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"nodeKey\":\"edge-suzhou-line-01\",\"modelVersionKey\":\"bearing-defect-detector-v1\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("SYNCING")));
  }

  @Test
  @DisplayName("TASK-platform-api-auth protects remaining business APIs")
  void protectsRemainingBusinessApis() throws Exception {
    mockMvc.perform(get("/api/inference-services"))
      .andExpect(status().isUnauthorized())
      .andExpect(jsonPath("$.errorCode", is("AUTH_UNAUTHORIZED")));

    mockMvc.perform(post("/api/edge-nodes/dispatches")
        .header("Authorization", AUTHORIZATION)
        .header("X-Platform-Permissions", "edge:read")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"nodeKey\":\"edge-suzhou-line-01\",\"modelVersionKey\":\"bearing-defect-detector-v1\"}"))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode", is("PLATFORM_FORBIDDEN")));
  }
}