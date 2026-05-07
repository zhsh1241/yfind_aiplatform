package com.yfind.aiplatform.model;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ModelRegistryControllerTest {

  private static final String AUTHORIZATION = "Bearer " + ModelRegistryAuthorizationService.LOCAL_DEV_TOKEN;

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("TASK-model-registry-mvp AC-01 AC-04 lists models with read permission trace")
  void listModels() throws Exception {
    mockMvc.perform(get("/api/models").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.featureTrace", is("TASK-model-registry-mvp")))
      .andExpect(jsonPath("$.items[0].permission", is("model:read")))
      .andExpect(jsonPath("$.items[*].modelKey", hasItem("bearing-defect-detector")));
  }

  @Test
  @DisplayName("TASK-model-registry-mvp AC-02 AC-03 detail includes lineage metrics checksum and deployable")
  void detailIncludesVersionLineageAndMetrics() throws Exception {
    mockMvc.perform(get("/api/models/bearing-defect-detector").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.featureTrace", is("TASK-model-registry-mvp")))
      .andExpect(jsonPath("$.versions[*].trainingJobKey", hasItem("train-bearing-v1")))
      .andExpect(jsonPath("$.versions[*].artifactUri", hasItem("TODO_CONFIRM_MODEL_ARTIFACT_URI/train-bearing-v1")))
      .andExpect(jsonPath("$.versions[*].checksum", hasItem("sha256:train-bearing-v1")))
      .andExpect(jsonPath("$.versions[*].deployable", hasItem(true)))
      .andExpect(jsonPath("$.versions[*].metrics[?(@.metricName == 'accuracy')].metricValue", hasItem(0.9)));
  }

  @Test
  @DisplayName("TASK-model-registry-mvp AC-01 AC-02 registers version from F005 artifact")
  void registerVersion() throws Exception {
    String payload = """
      {
        "versionName":"v1.1.0",
        "trainingJobKey":"train-bearing-v1",
        "artifactUri":"TODO_CONFIRM_MODEL_ARTIFACT_URI/train-bearing-v1",
        "checksum":"sha256:new-version",
        "accuracy":0.93,
        "latencyMs":39,
        "modelSizeMb":19.4
      }
      """;

    mockMvc.perform(post("/api/models/bearing-defect-detector/versions")
        .header("Authorization", AUTHORIZATION)
        .contentType(MediaType.APPLICATION_JSON)
        .content(payload))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("REGISTERED")))
      .andExpect(jsonPath("$.approvalStatus", is("APPROVAL_PENDING")))
      .andExpect(jsonPath("$.deployable", is(false)))
      .andExpect(jsonPath("$.featureTrace", is("TASK-model-registry-mvp")));
  }

  @Test
  @DisplayName("TASK-model-registry-mvp AC-01 AC-03 approves version as deployable")
  void approveVersion() throws Exception {
    mockMvc.perform(post("/api/models/bearing-defect-detector/versions/bearing-defect-detector-v0/approve").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("APPROVED")))
      .andExpect(jsonPath("$.approvalStatus", is("APPROVED")))
      .andExpect(jsonPath("$.deployable", is(true)));
  }

  @Test
  @DisplayName("TASK-model-registry-mvp AC-01 AC-03 rejects and archives version as not deployable")
  void rejectAndArchiveVersion() throws Exception {
    mockMvc.perform(post("/api/models/audio-anomaly-lite/versions/audio-anomaly-lite-v1/reject").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("REJECTED")))
      .andExpect(jsonPath("$.deployable", is(false)));

    mockMvc.perform(post("/api/models/audio-anomaly-lite/versions/audio-anomaly-lite-v1/archive").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("ARCHIVED")))
      .andExpect(jsonPath("$.deployable", is(false)));
  }

  @Test
  @DisplayName("TASK-model-registry-mvp AC-04 rejects unauthorized and forbidden requests")
  void rejectsUnauthorizedAndForbiddenRequests() throws Exception {
    mockMvc.perform(get("/api/models"))
      .andExpect(status().isUnauthorized())
      .andExpect(jsonPath("$.errorCode", is("AUTH_UNAUTHORIZED")));

    mockMvc.perform(post("/api/models/bearing-defect-detector/versions/bearing-defect-detector-v1/approve")
        .header("Authorization", AUTHORIZATION)
        .header("X-Platform-Permissions", "model:read"))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode", is("MODEL_FORBIDDEN")));
  }

  @Test
  @DisplayName("TASK-model-registry-mvp AC-03 AC-07 lists deployable model versions")
  void listDeployableModels() throws Exception {
    mockMvc.perform(get("/api/models/deployable").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items[0].deployable", is(true)))
      .andExpect(jsonPath("$.items[0].latestVersionKey", notNullValue()));
  }
}