package com.yfind.aiplatform.dataset;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
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
class DatasetControllerTest {
  /*
   * TASK-dataset-asset-mvp traceability:
   * AC-01 backend list/detail/upload/request/approve APIs
   * AC-02 dataset-view and version-download permissions
   * AC-03 hash / dedup / processing status
   * AC-05 automated trace coverage
   */

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("TASK-dataset-asset-mvp AC-01 lists dataset summaries with permissions")
  void listDatasetsReturnsSummaries() throws Exception {
    mockMvc.perform(get("/api/datasets").param("query", "电机"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.featureTrace", is("TASK-dataset-asset-mvp")))
      .andExpect(jsonPath("$.items[0].key", is("motor-thermal")))
      .andExpect(jsonPath("$.items[0].canView", is(true)))
      .andExpect(jsonPath("$.items[0].canManage", is(true)));
  }

  @Test
  @DisplayName("TASK-dataset-asset-mvp AC-01 AC-02 detail returns versions files requests and jobs")
  void datasetDetailReturnsNestedState() throws Exception {
    mockMvc.perform(get("/api/datasets/motor-thermal"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.key", is("motor-thermal")))
      .andExpect(jsonPath("$.canView", is(true)))
      .andExpect(jsonPath("$.canDownloadLatestVersion", is(true)))
      .andExpect(jsonPath("$.versions[0].dedupStrategy", is("SKIP_DUPLICATE")))
      .andExpect(jsonPath("$.sampleFiles[0].previewAvailable", is(true)))
      .andExpect(jsonPath("$.accessRequests[*].status", hasItem("PENDING")))
      .andExpect(jsonPath("$.processingJobs[0].status", is("SUCCEEDED")));
  }

  @Test
  @DisplayName("TASK-dataset-asset-mvp AC-01 AC-03 upload creates version with hash and queued job")
  void uploadCreatesNewVersion() throws Exception {
    mockMvc.perform(post("/api/datasets/upload")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {
            "datasetName": "Rotor Thermal Images",
            "owner": "算法组",
            "tags": ["图片", "转子"],
            "files": [
              {
                "name": "rotor-001.jpg",
                "contentType": "image/jpeg",
                "sizeBytes": 123456,
                "sha256": "sha256:rotor-001"
              }
            ]
          }
        """))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.datasetKey", is("rotor-thermal-images")))
      .andExpect(jsonPath("$.versionKey", is("rotor-thermal-images-v1")))
      .andExpect(jsonPath("$.dedupStrategy", is("SKIP_DUPLICATE")))
      .andExpect(jsonPath("$.jobStatus", is("QUEUED")));

    mockMvc.perform(get("/api/datasets/rotor-thermal-images"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.sampleFiles[0].sha256", is("sha256:rotor-001")))
      .andExpect(jsonPath("$.processingJobs[0].status", is("QUEUED")));
  }

  @Test
  @DisplayName("TASK-dataset-asset-mvp AC-01 AC-02 access request approve grants download")
  void approveRequestGrantsDownload() throws Exception {
    String requestId = mockMvc.perform(post("/api/datasets/motor-thermal/access-requests")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {
            "requester": "data.user",
            "versionKey": "motor-thermal-v2",
            "reason": "需要下载历史版本"
          }
        """))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("PENDING")))
      .andReturn()
      .getResponse()
      .getContentAsString()
      .replaceAll(".*\"requestId\":\"([^\"]+)\".*", "$1");

    mockMvc.perform(post("/api/datasets/access-requests/{requestId}/approve", requestId))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("APPROVED")))
      .andExpect(jsonPath("$.downloadGranted", is(true)));

    mockMvc.perform(get("/api/datasets/motor-thermal"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.accessRequests[*].status", hasItem("APPROVED")));
  }

  @Test
  @DisplayName("TASK-dataset-asset-mvp AC-01 exposes request list")
  void requestListIsAvailable() throws Exception {
    mockMvc.perform(get("/api/datasets/access-requests"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.featureTrace", is("TASK-dataset-asset-mvp")))
      .andExpect(jsonPath("$.items.length()", greaterThanOrEqualTo(1)));
  }
}

