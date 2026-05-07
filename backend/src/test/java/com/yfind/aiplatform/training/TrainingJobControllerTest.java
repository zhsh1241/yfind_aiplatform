package com.yfind.aiplatform.training;

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
class TrainingJobControllerTest {

  private static final String AUTHORIZATION = "Bearer " + TrainingAuthorizationService.LOCAL_DEV_TOKEN;

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("TASK-training-job-mvp AC-01 lists training jobs with trace and permission")
  void listTrainingJobs() throws Exception {
    mockMvc.perform(get("/api/training-jobs").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.featureTrace", is("TASK-training-job-mvp")))
      .andExpect(jsonPath("$.items[0].permission", is("training:read")))
      .andExpect(jsonPath("$.items[*].status", hasItem("RUNNING")));
  }

  @Test
  @DisplayName("TASK-training-job-mvp AC-02 AC-03 exposes detail metrics logs and artifacts")
  void detailIncludesMetricsLogsAndArtifacts() throws Exception {
    mockMvc.perform(get("/api/training-jobs/train-bearing-v1").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.datasetKey", is("motor-thermal")))
      .andExpect(jsonPath("$.queueStatus", is("SUBMITTED_TO_ADAPTER")))
      .andExpect(jsonPath("$.metrics[0].loss", notNullValue()))
      .andExpect(jsonPath("$.artifacts[0].uri", is("TODO_CONFIRM_MODEL_ARTIFACT_URI/train-bearing-v1")))
      .andExpect(jsonPath("$.logs[0].message", notNullValue()));
  }

  @Test
  @DisplayName("TASK-training-job-mvp AC-01 AC-04 creates job after validating dataset and template")
  void createTrainingJob() throws Exception {
    String payload = """
      {
        "name":"焊点外观训练 v1",
        "datasetKey":"motor-thermal",
        "datasetVersionKey":"motor-thermal-v3",
        "templateKey":"small-cnn-vision",
        "accelerator":"GPU",
        "cpuCores":4,
        "gpuCount":1,
        "npuCount":0,
        "maxEpochs":30
      }
      """;

    mockMvc.perform(post("/api/training-jobs").header("Authorization", AUTHORIZATION).contentType(MediaType.APPLICATION_JSON).content(payload))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("QUEUED")))
      .andExpect(jsonPath("$.queueStatus", is("SUBMITTED_TO_ADAPTER")))
      .andExpect(jsonPath("$.adapterSubmissionId", notNullValue()))
      .andExpect(jsonPath("$.featureTrace", is("TASK-training-job-mvp")));
  }

  @Test
  @DisplayName("TASK-training-job-mvp AC-04 AC-07 exposes adapter-ready templates and feature traceability")
  void templatesExposeAdapterReadyOptions() throws Exception {
    mockMvc.perform(get("/api/training-jobs/templates").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[?(@.templateKey == 'small-cnn-vision')].framework", hasItem("PyTorch")));
  }

  @Test
  @DisplayName("TASK-training-job-mvp AC-01 supports cancellation")
  void cancelTrainingJob() throws Exception {
    mockMvc.perform(post("/api/training-jobs/train-audio-poc/cancel").header("Authorization", AUTHORIZATION))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("CANCELLED")))
      .andExpect(jsonPath("$.queueStatus", is("CANCEL_REQUESTED")));
  }

  @Test
  @DisplayName("TASK-training-job-mvp AC-01 AC-07 rejects missing training authorization")
  void rejectsMissingAuthorization() throws Exception {
    mockMvc.perform(get("/api/training-jobs"))
      .andExpect(status().isUnauthorized())
      .andExpect(jsonPath("$.errorCode", is("AUTH_UNAUTHORIZED")))
      .andExpect(jsonPath("$.featureTrace", is("TASK-training-job-mvp")));
  }

  @Test
  @DisplayName("TASK-training-job-mvp AC-01 AC-07 rejects missing execute permission on create")
  void rejectsMissingExecutePermission() throws Exception {
    String payload = """
      {
        "name":"越权训练",
        "datasetKey":"motor-thermal",
        "datasetVersionKey":"motor-thermal-v3",
        "templateKey":"small-cnn-vision",
        "accelerator":"GPU",
        "cpuCores":4,
        "gpuCount":1,
        "npuCount":0,
        "maxEpochs":30
      }
      """;

    mockMvc.perform(post("/api/training-jobs")
        .header("Authorization", AUTHORIZATION)
        .header("X-Platform-Permissions", "training:read")
        .contentType(MediaType.APPLICATION_JSON)
        .content(payload))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.errorCode", is("TRAINING_FORBIDDEN")));
  }

}

