package com.yfind.aiplatform.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.yfind.aiplatform.persistence.DomainEventStore;

@Service
public class ModelRegistryService {

  public static final String FEATURE_TRACE = "TASK-model-registry-mvp";
  public static final String MODEL_READ = "model:read";
  public static final String MODEL_MANAGE = "model:manage";
  private static final String EVAL_POLICY = "TODO_CONFIRM_MODEL_EVAL_POLICY";
  private static final String APPROVAL_POLICY = "TODO_CONFIRM_MODEL_APPROVAL_POLICY";
  private static final String DOMAIN_KEY = "model-registry";

  private final DomainEventStore domainEventStore;
  private final List<ModelRecord> models = new ArrayList<>();

  public ModelRegistryService(DomainEventStore domainEventStore) {
    this.domainEventStore = domainEventStore;
    models.add(ModelRecord.seed(
      "bearing-defect-detector",
      "轴承缺陷检测模型",
      "视觉质检",
      "算法组",
      "承接 F005 train-bearing-v1 的轻量视觉缺陷检测模型",
      List.of(
        VersionRecord.create(
          "bearing-defect-detector-v1",
          "v1.0.0",
          "train-bearing-v1",
          "TODO_CONFIRM_MODEL_ARTIFACT_URI/train-bearing-v1",
          "sha256:train-bearing-v1",
          "APPROVED",
          "APPROVED",
          true,
          "local.admin",
          null,
          List.of(metric("accuracy", 0.90, "%"), metric("latency", 42, "ms"), metric("modelSize", 18.5, "MB"))
        ),
        VersionRecord.create(
          "bearing-defect-detector-v0",
          "v0.9.0",
          "train-audio-poc",
          "TODO_CONFIRM_MODEL_ARTIFACT_URI/train-audio-poc",
          "sha256:train-audio-poc",
          "REJECTED",
          "REJECTED",
          false,
          null,
          "accuracy 低于 MVP 示例阈值",
          List.of(metric("accuracy", 0.71, "%"), metric("latency", 61, "ms"), metric("modelSize", 24.1, "MB"))
        )
      )
    ));
    models.add(ModelRecord.seed(
      "audio-anomaly-lite",
      "声音异常检测模型",
      "预测性维护",
      "设备组",
      "承接 F005 声音异常检测 PoC 的轻量音频模型",
      List.of(
        VersionRecord.create(
          "audio-anomaly-lite-v1",
          "v1.0.0-rc1",
          "train-audio-poc",
          "TODO_CONFIRM_MODEL_ARTIFACT_URI/train-audio-poc",
          "sha256:audio-anomaly-lite-v1",
          "APPROVAL_PENDING",
          "APPROVAL_PENDING",
          false,
          null,
          null,
          List.of(metric("accuracy", 0.84, "%"), metric("latency", 55, "ms"), metric("modelSize", 11.2, "MB"))
        )
      )
    ));
    domainEventStore.load(DOMAIN_KEY, ModelRegistryMutationEvent.class).forEach(this::applyEvent);
  }

  public ModelListResponse list() {
    List<ModelSummary> items = models.stream()
      .sorted(Comparator.comparing(ModelRecord::modelKey))
      .map(this::toSummary)
      .toList();
    return new ModelListResponse(items, FEATURE_TRACE);
  }

  public ModelDetailResponse detail(String modelKey) {
    return toDetail(findModel(modelKey));
  }

  public ModelListResponse deployable() {
    List<ModelSummary> items = models.stream()
      .filter(model -> model.versions().stream().anyMatch(VersionRecord::deployable))
      .map(this::toSummary)
      .toList();
    return new ModelListResponse(items, FEATURE_TRACE);
  }

  public ModelVersionActionResponse register(String modelKey, ModelVersionRegisterRequest request) {
    validateRegisterRequest(request);
    ModelRecord model = findModel(modelKey);
    String versionKey = modelKey + "-" + slug(request.versionName()) + "-" + UUID.randomUUID().toString().substring(0, 8);
    ModelRegistryMutationEvent event = ModelRegistryMutationEvent.registered(modelKey, versionKey, request);
    domainEventStore.append(DOMAIN_KEY, modelKey, event.type(), event);
    return action(modelKey, applyRegisterEvent(event));
  }

  public ModelVersionActionResponse approve(String modelKey, String versionKey) {
    VersionRecord version = findVersion(findModel(modelKey), versionKey);
    if ("ARCHIVED".equals(version.status())) {
      throw new IllegalArgumentException("已归档模型版本不能审批");
    }
    ModelRegistryMutationEvent event = ModelRegistryMutationEvent.action("APPROVED", modelKey, versionKey);
    domainEventStore.append(DOMAIN_KEY, modelKey, event.type(), event);
    return action(modelKey, applyApproveEvent(event));
  }

  public ModelVersionActionResponse reject(String modelKey, String versionKey) {
    ModelRegistryMutationEvent event = ModelRegistryMutationEvent.action("REJECTED", modelKey, versionKey);
    domainEventStore.append(DOMAIN_KEY, modelKey, event.type(), event);
    return action(modelKey, applyRejectEvent(event));
  }

  public ModelVersionActionResponse archive(String modelKey, String versionKey) {
    ModelRegistryMutationEvent event = ModelRegistryMutationEvent.action("ARCHIVED", modelKey, versionKey);
    domainEventStore.append(DOMAIN_KEY, modelKey, event.type(), event);
    return action(modelKey, applyArchiveEvent(event));
  }

  private void applyEvent(ModelRegistryMutationEvent event) {
    if ("REGISTERED".equals(event.type())) {
      applyRegisterEvent(event);
    } else if ("APPROVED".equals(event.type())) {
      applyApproveEvent(event);
    } else if ("REJECTED".equals(event.type())) {
      applyRejectEvent(event);
    } else if ("ARCHIVED".equals(event.type())) {
      applyArchiveEvent(event);
    }
  }

  private VersionRecord applyRegisterEvent(ModelRegistryMutationEvent event) {
    ModelRecord model = findModel(event.modelKey());
    if (model.versions().stream().anyMatch(version -> version.versionKey().equals(event.versionKey()))) {
      return findVersion(model, event.versionKey());
    }
    VersionRecord version = VersionRecord.create(
      event.versionKey(),
      event.versionName(),
      event.trainingJobKey(),
      event.artifactUri(),
      event.checksum(),
      "REGISTERED",
      "APPROVAL_PENDING",
      false,
      null,
      null,
      List.of(metric("accuracy", event.accuracy(), "%"), metric("latency", event.latencyMs(), "ms"), metric("modelSize", event.modelSizeMb(), "MB"))
    );
    model.versions().add(0, version);
    return version;
  }

  private VersionRecord applyApproveEvent(ModelRegistryMutationEvent event) {
    VersionRecord version = findVersion(findModel(event.modelKey()), event.versionKey());
    version.status = "APPROVED";
    version.approvalStatus = "APPROVED";
    version.deployable = true;
    version.approvedBy = "local.admin";
    version.rejectReason = null;
    return version;
  }

  private VersionRecord applyRejectEvent(ModelRegistryMutationEvent event) {
    VersionRecord version = findVersion(findModel(event.modelKey()), event.versionKey());
    version.status = "REJECTED";
    version.approvalStatus = "REJECTED";
    version.deployable = false;
    version.rejectReason = "TODO_CONFIRM_MODEL_APPROVAL_POLICY：MVP 手动驳回";
    return version;
  }

  private VersionRecord applyArchiveEvent(ModelRegistryMutationEvent event) {
    VersionRecord version = findVersion(findModel(event.modelKey()), event.versionKey());
    version.status = "ARCHIVED";
    version.approvalStatus = "ARCHIVED";
    version.deployable = false;
    return version;
  }

  private void validateRegisterRequest(ModelVersionRegisterRequest request) {
    if (request == null || request.versionName() == null || request.versionName().isBlank()) {
      throw new IllegalArgumentException("模型版本名称不能为空");
    }
    if (request.trainingJobKey() == null || request.trainingJobKey().isBlank()) {
      throw new IllegalArgumentException("训练任务 key 不能为空");
    }
    if (request.artifactUri() == null || request.artifactUri().isBlank()) {
      throw new IllegalArgumentException("artifact URI 不能为空");
    }
    if (!request.artifactUri().startsWith("TODO_CONFIRM_MODEL_ARTIFACT_URI")) {
      throw new IllegalArgumentException("F006 MVP 仅接受 F005 artifact seam");
    }
    if (request.checksum() == null || request.checksum().isBlank()) {
      throw new IllegalArgumentException("checksum 不能为空");
    }
  }

  private ModelRecord findModel(String modelKey) {
    return models.stream().filter(model -> model.modelKey().equals(modelKey)).findFirst()
      .orElseThrow(() -> new ModelRegistryNotFoundException("未找到模型: " + modelKey));
  }

  private VersionRecord findVersion(ModelRecord model, String versionKey) {
    return model.versions().stream().filter(version -> version.versionKey().equals(versionKey)).findFirst()
      .orElseThrow(() -> new ModelRegistryNotFoundException("未找到模型版本: " + versionKey));
  }

  private ModelSummary toSummary(ModelRecord model) {
    VersionRecord latest = model.versions().get(0);
    return new ModelSummary(model.modelKey(), model.modelName(), model.domain(), model.owner(), latest.versionKey(), latest.approvalStatus(), latest.deployable(), MODEL_READ, FEATURE_TRACE);
  }

  private ModelDetailResponse toDetail(ModelRecord model) {
    String deployableVersion = model.versions().stream().filter(VersionRecord::deployable).map(VersionRecord::versionKey).findFirst().orElse(null);
    return new ModelDetailResponse(
      model.modelKey(),
      model.modelName(),
      model.domain(),
      model.owner(),
      model.description(),
      model.versions().get(0).versionKey(),
      deployableVersion,
      model.versions().stream().map(this::toVersionSummary).toList(),
      EVAL_POLICY,
      APPROVAL_POLICY,
      FEATURE_TRACE
    );
  }

  private ModelVersionSummary toVersionSummary(VersionRecord version) {
    return new ModelVersionSummary(version.versionKey(), version.versionName(), version.trainingJobKey(), version.artifactUri(), version.checksum(), version.status(), version.approvalStatus(), version.deployable(), version.metrics(), version.createdAt(), version.approvedBy(), version.rejectReason());
  }

  private ModelVersionActionResponse action(String modelKey, VersionRecord version) {
    return new ModelVersionActionResponse(modelKey, version.versionKey(), version.status(), version.approvalStatus(), version.deployable(), FEATURE_TRACE);
  }

  private static ModelMetricSummary metric(String name, double value, String unit) {
    return new ModelMetricSummary(name, value, unit);
  }

  private String slug(String value) {
    String slug = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    return slug.isBlank() ? "version" : slug;
  }

  private static final class ModelRecord {
    private final String modelKey;
    private final String modelName;
    private final String domain;
    private final String owner;
    private final String description;
    private final List<VersionRecord> versions;

    private ModelRecord(String modelKey, String modelName, String domain, String owner, String description, List<VersionRecord> versions) {
      this.modelKey = modelKey;
      this.modelName = modelName;
      this.domain = domain;
      this.owner = owner;
      this.description = description;
      this.versions = new ArrayList<>(versions);
    }

    static ModelRecord seed(String modelKey, String modelName, String domain, String owner, String description, List<VersionRecord> versions) {
      return new ModelRecord(modelKey, modelName, domain, owner, description, versions);
    }

    String modelKey() { return modelKey; }
    String modelName() { return modelName; }
    String domain() { return domain; }
    String owner() { return owner; }
    String description() { return description; }
    List<VersionRecord> versions() { return versions; }
  }

  private static final class VersionRecord {
    private final String versionKey;
    private final String versionName;
    private final String trainingJobKey;
    private final String artifactUri;
    private final String checksum;
    private String status;
    private String approvalStatus;
    private boolean deployable;
    private String approvedBy;
    private String rejectReason;
    private final String createdAt;
    private final List<ModelMetricSummary> metrics;

    private VersionRecord(String versionKey, String versionName, String trainingJobKey, String artifactUri, String checksum, String status, String approvalStatus, boolean deployable, String approvedBy, String rejectReason, List<ModelMetricSummary> metrics) {
      this.versionKey = versionKey;
      this.versionName = versionName;
      this.trainingJobKey = trainingJobKey;
      this.artifactUri = artifactUri;
      this.checksum = checksum;
      this.status = status;
      this.approvalStatus = approvalStatus;
      this.deployable = deployable;
      this.approvedBy = approvedBy;
      this.rejectReason = rejectReason;
      this.createdAt = Instant.parse("2026-05-05T08:00:00Z").toString();
      this.metrics = new ArrayList<>(metrics);
    }

    static VersionRecord create(String versionKey, String versionName, String trainingJobKey, String artifactUri, String checksum, String status, String approvalStatus, boolean deployable, String approvedBy, String rejectReason, List<ModelMetricSummary> metrics) {
      return new VersionRecord(versionKey, versionName, trainingJobKey, artifactUri, checksum, status, approvalStatus, deployable, approvedBy, rejectReason, metrics);
    }

    String versionKey() { return versionKey; }
    String versionName() { return versionName; }
    String trainingJobKey() { return trainingJobKey; }
    String artifactUri() { return artifactUri; }
    String checksum() { return checksum; }
    String status() { return status; }
    String approvalStatus() { return approvalStatus; }
    boolean deployable() { return deployable; }
    String approvedBy() { return approvedBy; }
    String rejectReason() { return rejectReason; }
    String createdAt() { return createdAt; }
    List<ModelMetricSummary> metrics() { return metrics; }
  }
}
