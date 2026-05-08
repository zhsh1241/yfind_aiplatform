package com.yfind.aiplatform.dataset;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class DatasetPreparationControllerTest {
  /*
   * TASK-dataset-preparation-pipeline traceability:
   * AC-02 seven-stage preparation pipeline list/detail
   * AC-03 create job with source/rule/gate/artifact config
   * AC-04 gate failure blocks downstream execution
   * AC-05 manual correction rerun records audit trail
   * AC-07 artifact boundary stops at training dataset snapshot
   * AC-08 dataset:read / dataset:manage permissions
   */

  @Autowired
  private MockMvc mockMvc;

  @DynamicPropertySource
  static void datasetProperties(DynamicPropertyRegistry registry) {
    registry.add("dataset.storage.event-log", () -> System.getProperty("java.io.tmpdir") + "/yfind-dataset-events-" + UUID.randomUUID() + ".jsonl");
  }

  private String authHeader() throws Exception {
    String token = JsonPath.read(
      mockMvc.perform(post("/api/auth/login")
          .contentType(MediaType.APPLICATION_JSON)
          .content("{\"username\":\"admin@yfind.local\",\"password\":\"admin123!\"}"))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(),
      "$.accessToken"
    );
    return "Bearer " + token;
  }

  @Test
  @DisplayName("TASK-dataset-preparation-pipeline AC-02 lists preparation jobs with seven-stage trace")
  void listPreparationJobs() throws Exception {
    mockMvc.perform(get("/api/datasets/preparation-jobs").header("Authorization", authHeader()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.featureTrace", is("TASK-dataset-preparation-pipeline")))
      .andExpect(jsonPath("$.items.length()", greaterThanOrEqualTo(1)))
      .andExpect(jsonPath("$.items[0].jobId", is("prep-motor-thermal-v3")))
      .andExpect(jsonPath("$.items[0].blocked", is(true)))
      .andExpect(jsonPath("$.items[0].blockedReason", is("标注一致性低于阈值")));
  }

  @Test
  @DisplayName("TASK-dataset-preparation-pipeline AC-02 AC-04 detail exposes all seven stages and blocked gate")
  void preparationDetailIncludesSevenStagesAndGate() throws Exception {
    mockMvc.perform(get("/api/datasets/preparation-jobs/prep-motor-thermal-v3").header("Authorization", authHeader()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.featureTrace", is("TASK-dataset-preparation-pipeline")))
      .andExpect(jsonPath("$.stages.length()", is(7)))
      .andExpect(jsonPath("$.stages[*].stageKey", hasItem("COLLECTION")))
      .andExpect(jsonPath("$.stages[*].stageKey", hasItem("CLEANING")))
      .andExpect(jsonPath("$.stages[*].stageKey", hasItem("LABELING")))
      .andExpect(jsonPath("$.stages[*].stageKey", hasItem("SPLIT")))
      .andExpect(jsonPath("$.stages[*].stageKey", hasItem("PREPROCESSING")))
      .andExpect(jsonPath("$.stages[*].stageKey", hasItem("AUGMENTATION")))
      .andExpect(jsonPath("$.stages[*].stageKey", hasItem("FORMAT_LOADING")))
      .andExpect(jsonPath("$.status", is("BLOCKED")))
      .andExpect(jsonPath("$.currentStage", is("LABELING")))
      .andExpect(jsonPath("$.stages[2].gatePassed", is(false)))
      .andExpect(jsonPath("$.outputSnapshot.readyForTraining", is(false)));
  }

  @Test
  @DisplayName("TASK-dataset-preparation-pipeline AC-03 creates preparation job with configuration snapshot")
  void createPreparationJob() throws Exception {
    String body = """
      {
        "datasetKey": "motor-thermal",
        "sourceType": "PUBLIC_DATASET",
        "sourceName": "公开温升样例集",
        "sourceUri": "TODO_CONFIRM_PUBLIC_DATASET_URI",
        "splitRatio": "70/15/15",
        "targetFormat": "PAI_DLC_IMAGE_FOLDER",
        "minQualityScore": 85,
        "minLabelAgreement": 0.9,
        "maxDuplicateRate": 0.02,
        "operator": "local.admin"
      }
      """;

    String response = mockMvc.perform(post("/api/datasets/preparation-jobs").header("Authorization", authHeader())
        .contentType(MediaType.APPLICATION_JSON)
        .content(body))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.featureTrace", is("TASK-dataset-preparation-pipeline")))
      .andExpect(jsonPath("$.datasetKey", is("motor-thermal")))
      .andExpect(jsonPath("$.currentStage", is("COLLECTION")))
      .andReturn().getResponse().getContentAsString();

    String jobId = JsonPath.read(response, "$.jobId");
    mockMvc.perform(get("/api/datasets/preparation-jobs/{jobId}", jobId).header("Authorization", authHeader()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.sourceConfig.sourceType", is("PUBLIC_DATASET")))
      .andExpect(jsonPath("$.ruleSnapshot.splitRatio", is("70/15/15")))
      .andExpect(jsonPath("$.qualityGate.minQualityScore", is(85)))
      .andExpect(jsonPath("$.outputSnapshot.loaderType", is("PAI_DLC_DATA_LOADER")));
  }

  @Test
  @DisplayName("TASK-dataset-preparation-pipeline AC-04 AC-05 blocked job requires manual rerun before advancing")
  void blockedJobRerunRestoresPipeline() throws Exception {
    mockMvc.perform(post("/api/datasets/preparation-jobs/prep-motor-thermal-v3/run-next-stage").header("Authorization", authHeader())
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"operator\":\"local.admin\"}"))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.featureTrace", is("TASK-dataset-preparation-pipeline")))
      .andExpect(jsonPath("$.message", is("当前阶段已阻断，请人工修正后重跑")));

    mockMvc.perform(post("/api/datasets/preparation-jobs/prep-motor-thermal-v3/rerun-blocked-stage").header("Authorization", authHeader())
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"operator\":\"local.admin\",\"reason\":\"补充人工复核样本\",\"qualityScoreOverride\":91,\"labelAgreementOverride\":0.95,\"duplicateRateOverride\":0.01}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("RUNNING")))
      .andExpect(jsonPath("$.currentStage", is("SPLIT")))
      .andExpect(jsonPath("$.rerunCount", is(2)))
      .andExpect(jsonPath("$.stageResult.stageKey", is("LABELING")))
      .andExpect(jsonPath("$.stageResult.gatePassed", is(true)));

    mockMvc.perform(get("/api/datasets/preparation-jobs/prep-motor-thermal-v3").header("Authorization", authHeader()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.rerunRecords.length()", is(2)))
      .andExpect(jsonPath("$.auditTrail[*].eventType", hasItem("DATASET_PREPARATION_RERUN_TRIGGERED")));
  }

  @Test
  @DisplayName("TASK-dataset-preparation-pipeline AC-07 returns training dataset artifact without training submission")
  void trainingDatasetArtifactBoundary() throws Exception {
    mockMvc.perform(get("/api/datasets/training-datasets/motor-thermal-train-snapshot-v4").header("Authorization", authHeader()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.featureTrace", is("TASK-dataset-preparation-pipeline")))
      .andExpect(jsonPath("$.artifactKey", is("motor-thermal-train-snapshot-v4")))
      .andExpect(jsonPath("$.loaderType", is("PAI_DLC_DATA_LOADER")))
      .andExpect(jsonPath("$.readyForTraining", is(false)))
      .andExpect(jsonPath("$.trainingJobId").doesNotExist());
  }

  @Test
  @DisplayName("TASK-dataset-preparation-pipeline AC-08 preparation manage endpoints require permission")
  void manageEndpointsRequirePermission() throws Exception {
    mockMvc.perform(post("/api/datasets/preparation-jobs")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{}"))
      .andExpect(status().isUnauthorized());
  }
}
