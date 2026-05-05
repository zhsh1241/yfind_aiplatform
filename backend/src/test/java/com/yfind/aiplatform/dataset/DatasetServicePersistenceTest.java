package com.yfind.aiplatform.dataset;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DatasetServicePersistenceTest {

  @Test
  @DisplayName("TASK-dataset-asset-mvp AC-03 AC-06 replays persisted dataset mutations from local event log")
  void persistsDatasetMutationsAcrossServiceInstances() throws Exception {
    Path eventLog = Files.createTempFile("dataset-events-", ".jsonl");
    DatasetEventStore eventStore = new DatasetEventStore(new ObjectMapper(), eventLog.toString());
    DatasetService firstService = new DatasetService(eventStore);

    firstService.upload(new DatasetUploadRequest(
      "Persistent Dataset",
      "平台测试",
      java.util.List.of("回放"),
      java.util.List.of(new DatasetUploadFileRequest("persist-001.jpg", "image/jpeg", 128L, "sha256:persist-001"))
    ));

    DatasetAccessRequestActionResponse request = firstService.createAccessRequest(
      "persistent-dataset",
      new DatasetAccessRequestCreateRequest("tester", "persistent-dataset-v1", "验证持久化")
    );
    firstService.approve(request.requestId());

    DatasetService secondService = new DatasetService(eventStore);
    DatasetDetailResponse restored = secondService.detail("persistent-dataset");

    assertThat(restored.versions()).hasSize(1);
    assertThat(restored.versions().get(0).versionKey()).isEqualTo("persistent-dataset-v1");
    assertThat(restored.sampleFiles()).extracting(DatasetFileSummary::sha256).contains("sha256:persist-001");
    assertThat(restored.accessRequests()).extracting(DatasetAccessRequestSummary::status).contains("APPROVED");
    assertThat(restored.canDownloadLatestVersion()).isTrue();
  }
}
