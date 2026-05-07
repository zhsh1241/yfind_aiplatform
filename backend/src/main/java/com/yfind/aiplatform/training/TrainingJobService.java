package com.yfind.aiplatform.training;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.yfind.aiplatform.dataset.DatasetService;
import com.yfind.aiplatform.persistence.DomainEventStore;

@Service
public class TrainingJobService {

  public static final String FEATURE_TRACE = "TASK-training-job-mvp";
  private static final String REQUIRED_PERMISSION = "training:read";
  private static final String DOMAIN_KEY = "training-job";

  private final DatasetService datasetService;
  private final DomainEventStore domainEventStore;
  private final List<TrainingJobRecord> jobs = new ArrayList<>();
  private final List<TrainingTemplateSummary> templates = List.of(
    new TrainingTemplateSummary("small-cnn-vision", "小样本视觉缺陷检测", "PyTorch", "GPU", "适合图片缺陷分类与检测的轻量 CNN 模板"),
    new TrainingTemplateSummary("audio-anomaly-lite", "轻量音频异常检测", "PyTorch", "CPU/GPU", "面向音频频谱特征的异常检测模板"),
    new TrainingTemplateSummary("tabular-quality-baseline", "表格质量基线", "scikit-learn", "CPU", "适合结构化质检数据的基线训练模板")
  );

  public TrainingJobService(DatasetService datasetService, DomainEventStore domainEventStore) {
    this.datasetService = datasetService;
    this.domainEventStore = domainEventStore;
    jobs.add(TrainingJobRecord.seed(
      "train-bearing-v1",
      "轴承缺陷检测 v1",
      "motor-thermal",
      "motor-thermal-v3",
      "small-cnn-vision",
      "RUNNING",
      "GPU",
      4,
      1,
      0,
      30,
      "SUBMITTED_TO_ADAPTER",
      "adapter-run-bearing-v1",
      72
    ));
    jobs.add(TrainingJobRecord.seed(
      "train-audio-poc",
      "声音异常检测 PoC",
      "bearing-audio",
      "bearing-audio-v1",
      "audio-anomaly-lite",
      "QUEUED",
      "CPU",
      8,
      0,
      0,
      20,
      "WAITING_RESOURCE",
      "adapter-run-audio-poc",
      18
    ));
    domainEventStore.load(DOMAIN_KEY, TrainingJobMutationEvent.class).forEach(this::applyEvent);
  }

  public TrainingJobListResponse list(String status) {
    String normalizedStatus = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
    List<TrainingJobSummary> items = jobs.stream()
      .filter(job -> normalizedStatus.isBlank() || job.status().equals(normalizedStatus))
      .sorted(Comparator.comparing(TrainingJobRecord::jobKey))
      .map(this::toSummary)
      .toList();
    return new TrainingJobListResponse(items, FEATURE_TRACE);
  }

  public TrainingJobDetailResponse detail(String jobKey) {
    return toDetail(find(jobKey));
  }

  public List<TrainingTemplateSummary> templates() {
    return templates;
  }

  public TrainingJobActionResponse create(TrainingJobCreateRequest request) {
    validateCreateRequest(request);
    datasetService.detail(request.datasetKey());
    String jobKey = "train-" + slug(request.name()) + "-" + UUID.randomUUID().toString().substring(0, 8);
    String adapterSubmissionId = "adapter-sim-" + jobKey;
    TrainingJobMutationEvent event = TrainingJobMutationEvent.created(jobKey, request, adapterSubmissionId, Instant.now().toString());
    domainEventStore.append(DOMAIN_KEY, jobKey, event.type(), event);
    TrainingJobRecord record = applyCreatedEvent(event);
    return new TrainingJobActionResponse(jobKey, record.status(), record.queueStatus(), adapterSubmissionId, FEATURE_TRACE);
  }

  public TrainingJobActionResponse cancel(String jobKey) {
    find(jobKey);
    TrainingJobMutationEvent event = TrainingJobMutationEvent.cancelled(jobKey, Instant.now().toString());
    domainEventStore.append(DOMAIN_KEY, jobKey, event.type(), event);
    TrainingJobRecord record = applyCancelledEvent(event);
    return new TrainingJobActionResponse(record.jobKey(), record.status(), record.queueStatus(), record.adapterSubmissionId(), FEATURE_TRACE);
  }

  private void applyEvent(TrainingJobMutationEvent event) {
    if ("CREATED".equals(event.type())) {
      applyCreatedEvent(event);
    } else if ("CANCELLED".equals(event.type())) {
      applyCancelledEvent(event);
    }
  }

  private TrainingJobRecord applyCreatedEvent(TrainingJobMutationEvent event) {
    if (jobs.stream().anyMatch(job -> job.jobKey().equals(event.jobKey()))) {
      return find(event.jobKey());
    }
    TrainingJobRecord record = TrainingJobRecord.seed(
      event.jobKey(),
      event.name(),
      event.datasetKey(),
      event.datasetVersionKey(),
      event.templateKey(),
      "QUEUED",
      event.accelerator(),
      event.cpuCores(),
      event.gpuCount(),
      event.npuCount(),
      event.maxEpochs(),
      "SUBMITTED_TO_ADAPTER",
      event.adapterSubmissionId(),
      0
    );
    record.logs().add(0, new TrainingLogEntry(event.occurredAt(), "INFO", "训练任务已提交到 ai-adapter 占位调度接口"));
    jobs.add(0, record);
    return record;
  }

  private TrainingJobRecord applyCancelledEvent(TrainingJobMutationEvent event) {
    TrainingJobRecord record = find(event.jobKey());
    record.status = "CANCELLED";
    record.queueStatus = "CANCEL_REQUESTED";
    record.progress = Math.min(record.progress(), 99);
    record.logs().add(0, new TrainingLogEntry(event.occurredAt(), "WARN", "用户请求取消训练任务"));
    return record;
  }

  private TrainingJobRecord find(String jobKey) {
    return jobs.stream().filter(job -> job.jobKey().equals(jobKey)).findFirst()
      .orElseThrow(() -> new TrainingJobNotFoundException("未找到训练任务: " + jobKey));
  }

  private void validateCreateRequest(TrainingJobCreateRequest request) {
    if (request == null || request.name() == null || request.name().isBlank()) {
      throw new IllegalArgumentException("训练任务名称不能为空");
    }
    if (request.datasetKey() == null || request.datasetKey().isBlank()) {
      throw new IllegalArgumentException("训练数据集不能为空");
    }
    if (request.datasetVersionKey() == null || request.datasetVersionKey().isBlank()) {
      throw new IllegalArgumentException("训练数据集版本不能为空");
    }
    if (request.templateKey() == null || request.templateKey().isBlank() || templates.stream().noneMatch(template -> template.templateKey().equals(request.templateKey()))) {
      throw new IllegalArgumentException("训练模板不存在");
    }
    if (request.cpuCores() <= 0 || request.maxEpochs() <= 0) {
      throw new IllegalArgumentException("CPU 核数和训练轮次必须大于 0");
    }
  }

  private TrainingJobSummary toSummary(TrainingJobRecord record) {
    return new TrainingJobSummary(record.jobKey(), record.name(), record.datasetKey(), record.templateKey(), record.status(), record.accelerator(), record.progress(), REQUIRED_PERMISSION, FEATURE_TRACE);
  }

  private TrainingJobDetailResponse toDetail(TrainingJobRecord record) {
    return new TrainingJobDetailResponse(
      record.jobKey(),
      record.name(),
      record.datasetKey(),
      record.datasetVersionKey(),
      record.templateKey(),
      record.status(),
      record.accelerator(),
      record.cpuCores(),
      record.gpuCount(),
      record.npuCount(),
      record.maxEpochs(),
      record.queueStatus(),
      record.adapterSubmissionId(),
      record.metrics(),
      record.artifacts(),
      record.logs(),
      FEATURE_TRACE
    );
  }

  private String slug(String value) {
    String slug = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    return slug.isBlank() ? "job" : slug;
  }

  private static final class TrainingJobRecord {
    private final String jobKey;
    private final String name;
    private final String datasetKey;
    private final String datasetVersionKey;
    private final String templateKey;
    private String status;
    private final String accelerator;
    private final int cpuCores;
    private final int gpuCount;
    private final int npuCount;
    private final int maxEpochs;
    private String queueStatus;
    private final String adapterSubmissionId;
    private int progress;
    private final List<TrainingMetricSnapshot> metrics;
    private final List<TrainingArtifactSummary> artifacts;
    private final List<TrainingLogEntry> logs;

    private TrainingJobRecord(String jobKey, String name, String datasetKey, String datasetVersionKey, String templateKey, String status, String accelerator, int cpuCores, int gpuCount, int npuCount, int maxEpochs, String queueStatus, String adapterSubmissionId, int progress, List<TrainingMetricSnapshot> metrics, List<TrainingArtifactSummary> artifacts, List<TrainingLogEntry> logs) {
      this.jobKey = jobKey;
      this.name = name;
      this.datasetKey = datasetKey;
      this.datasetVersionKey = datasetVersionKey;
      this.templateKey = templateKey;
      this.status = status;
      this.accelerator = accelerator;
      this.cpuCores = cpuCores;
      this.gpuCount = gpuCount;
      this.npuCount = npuCount;
      this.maxEpochs = maxEpochs;
      this.queueStatus = queueStatus;
      this.adapterSubmissionId = adapterSubmissionId;
      this.progress = progress;
      this.metrics = metrics;
      this.artifacts = artifacts;
      this.logs = logs;
    }

    static TrainingJobRecord seed(String jobKey, String name, String datasetKey, String datasetVersionKey, String templateKey, String status, String accelerator, int cpuCores, int gpuCount, int npuCount, int maxEpochs, String queueStatus, String adapterSubmissionId, int progress) {
      return new TrainingJobRecord(
        jobKey,
        name,
        datasetKey,
        datasetVersionKey,
        templateKey,
        status,
        accelerator,
        cpuCores,
        gpuCount,
        npuCount,
        maxEpochs,
        queueStatus,
        adapterSubmissionId,
        progress,
        new ArrayList<>(List.of(
          new TrainingMetricSnapshot(1, 0.82, 0.61, "2026-05-05T08:00:00Z"),
          new TrainingMetricSnapshot(5, 0.41, 0.82, "2026-05-05T08:20:00Z"),
          new TrainingMetricSnapshot(10, 0.27, 0.9, "2026-05-05T08:40:00Z")
        )),
        new ArrayList<>(List.of(
          new TrainingArtifactSummary(jobKey + "-model", "MODEL", "TODO_CONFIRM_MODEL_ARTIFACT_URI/" + jobKey, "sha256:" + jobKey, status.equals("RUNNING") ? "GENERATING" : "PENDING"),
          new TrainingArtifactSummary(jobKey + "-metrics", "METRICS", "TODO_CONFIRM_METRICS_URI/" + jobKey, "sha256:metrics-" + jobKey, "AVAILABLE")
        )),
        new ArrayList<>(List.of(
          new TrainingLogEntry("2026-05-05T08:00:00Z", "INFO", "训练任务进入调度队列"),
          new TrainingLogEntry("2026-05-05T08:05:00Z", "INFO", "ai-adapter 返回占位提交 ID: " + adapterSubmissionId)
        ))
      );
    }

    String jobKey() { return jobKey; }
    String name() { return name; }
    String datasetKey() { return datasetKey; }
    String datasetVersionKey() { return datasetVersionKey; }
    String templateKey() { return templateKey; }
    String status() { return status; }
    String accelerator() { return accelerator; }
    int cpuCores() { return cpuCores; }
    int gpuCount() { return gpuCount; }
    int npuCount() { return npuCount; }
    int maxEpochs() { return maxEpochs; }
    String queueStatus() { return queueStatus; }
    String adapterSubmissionId() { return adapterSubmissionId; }
    int progress() { return progress; }
    List<TrainingMetricSnapshot> metrics() { return metrics; }
    List<TrainingArtifactSummary> artifacts() { return artifacts; }
    List<TrainingLogEntry> logs() { return logs; }
  }
}
