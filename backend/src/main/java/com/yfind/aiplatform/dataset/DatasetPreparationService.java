package com.yfind.aiplatform.dataset;

import static com.yfind.aiplatform.dataset.DatasetPreparationDtos.FEATURE_TRACE;

import com.yfind.aiplatform.dataset.DatasetPreparationDtos.AuditEvent;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.CreatePreparationJobRequest;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.OutputSnapshot;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.PreparationJobActionResponse;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.PreparationJobDetailResponse;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.PreparationJobListResponse;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.PreparationJobSummary;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.QualityGate;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.RerunBlockedStageRequest;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.RerunRecord;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.RuleSnapshot;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.RunStageRequest;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.SourceConfig;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.StageResult;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.StageSummary;
import com.yfind.aiplatform.dataset.DatasetPreparationDtos.TrainingDatasetArtifactResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DatasetPreparationService {
  private final List<PreparationJobRecord> jobs = new ArrayList<>();

  public DatasetPreparationService() {
    jobs.add(seedBlockedJob());
  }

  public PreparationJobListResponse list(String datasetKey, String status) {
    String normalizedDataset = normalize(datasetKey);
    String normalizedStatus = normalize(status);
    List<PreparationJobSummary> items = jobs.stream()
      .filter(job -> normalizedDataset.isBlank() || normalize(job.datasetKey).equals(normalizedDataset))
      .filter(job -> normalizedStatus.isBlank() || normalize(job.status).equals(normalizedStatus))
      .map(this::toSummary)
      .toList();
    return new PreparationJobListResponse(items, FEATURE_TRACE);
  }

  public PreparationJobDetailResponse detail(String jobId) {
    return toDetail(find(jobId));
  }

  public PreparationJobActionResponse create(CreatePreparationJobRequest request) {
    validateCreate(request);
    String jobId = "prep-" + request.datasetKey() + "-" + UUID.randomUUID().toString().substring(0, 8);
    PreparationJobRecord job = new PreparationJobRecord(
      jobId,
      request.datasetKey(),
      datasetName(request.datasetKey()),
      request.operator() == null || request.operator().isBlank() ? "local.admin" : request.operator(),
      "RUNNING",
      "COLLECTION",
      0,
      false,
      "",
      request.minQualityScore(),
      0,
      new SourceConfig(request.sourceType(), request.sourceName(), request.sourceUri(), "受控来源登记，不含真实凭据"),
      new RuleSnapshot("DEDUP_AND_MISSING_VALUE_BLOCK", request.splitRatio(), "IMAGE_RESIZE_224_NORMALIZE", "ROTATE_AND_CROP_LIGHT", request.targetFormat()),
      new QualityGate(request.minQualityScore(), request.minLabelAgreement(), request.maxDuplicateRate()),
      initialStages(),
      new OutputSnapshot(jobId + "-snapshot", request.datasetKey() + "-prepared-v1", "PAI_DLC_DATA_LOADER", "TODO_CONFIRM_OBJECT_STORAGE_URI", 0, 0, 0, false),
      new ArrayList<>(),
      new ArrayList<>(List.of(new AuditEvent("DATASET_PREPARATION_JOB_CREATED", request.operator(), "创建数据准备任务", Instant.now().toString())))
    );
    jobs.add(job);
    return new PreparationJobActionResponse(job.jobId, job.datasetKey, job.status, job.currentStage, false, "", "RUN_STAGE", job.rerunCount, null, FEATURE_TRACE);
  }

  public PreparationJobActionResponse runNextStage(String jobId, RunStageRequest request) {
    PreparationJobRecord job = find(jobId);
    if (job.blocked || "BLOCKED".equals(job.status)) {
      throw new DatasetPreparationConflictException("当前阶段已阻断，请人工修正后重跑");
    }
    int index = stageIndex(job.currentStage);
    StageSummary stage = job.stages.get(index);
    StageSummary succeeded = new StageSummary(stage.stageKey(), stage.stageName(), "SUCCEEDED", score(request), true, stage.stageName() + "完成", Instant.now().toString(), Instant.now().toString());
    job.stages.set(index, succeeded);
    if (index == job.stages.size() - 1) {
      job.status = "READY_FOR_TRAINING";
      job.currentStage = "FORMAT_LOADING";
      job.progressPercent = 100;
      job.outputSnapshot = new OutputSnapshot(job.outputSnapshot.snapshotKey(), job.outputSnapshot.trainVersionKey(), job.outputSnapshot.loaderType(), job.outputSnapshot.manifestUri(), 8988, 1926, 1926, true);
    } else {
      job.currentStage = job.stages.get(index + 1).stageKey();
      job.progressPercent = Math.round(((index + 1) * 100f) / job.stages.size());
    }
    job.auditTrail.add(new AuditEvent("DATASET_PREPARATION_STAGE_SUCCEEDED", operator(request.operator()), stage.stageKey() + " 阶段完成", Instant.now().toString()));
    return new PreparationJobActionResponse(job.jobId, job.datasetKey, job.status, job.currentStage, false, "", "RUN_STAGE", job.rerunCount, new StageResult(stage.stageKey(), "SUCCEEDED", succeeded.qualityScore(), true, succeeded.message()), FEATURE_TRACE);
  }

  public PreparationJobActionResponse rerunBlockedStage(String jobId, RerunBlockedStageRequest request) {
    PreparationJobRecord job = find(jobId);
    if (!job.blocked && !"BLOCKED".equals(job.status)) {
      throw new DatasetPreparationConflictException("仅允许重跑被阻断阶段");
    }
    if (request == null || request.reason() == null || request.reason().isBlank()) {
      throw new IllegalArgumentException("重跑原因不能为空");
    }
    int index = stageIndex(job.currentStage);
    StageSummary old = job.stages.get(index);
    int qualityScore = request.qualityScoreOverride() == null ? Math.max(job.minQualityScore, 90) : request.qualityScoreOverride();
    StageSummary succeeded = new StageSummary(old.stageKey(), old.stageName(), "SUCCEEDED", qualityScore, true, "人工修正后重跑通过", old.startedAt(), Instant.now().toString());
    job.stages.set(index, succeeded);
    job.rerunCount++;
    job.rerunRecords.add(new RerunRecord("rerun-" + String.format(Locale.ROOT, "%03d", job.rerunCount), old.stageKey(), operator(request.operator()), request.reason(), Instant.now().toString()));
    job.auditTrail.add(new AuditEvent("DATASET_PREPARATION_RERUN_TRIGGERED", operator(request.operator()), "人工修正后重跑 " + old.stageKey() + " 阶段", Instant.now().toString()));
    job.blocked = false;
    job.blockedReason = "";
    job.status = "RUNNING";
    job.currentStage = job.stages.get(index + 1).stageKey();
    job.progressPercent = Math.round(((index + 1) * 100f) / job.stages.size());
    return new PreparationJobActionResponse(job.jobId, job.datasetKey, job.status, job.currentStage, false, "", "RUN_STAGE", job.rerunCount, new StageResult(old.stageKey(), "SUCCEEDED", qualityScore, true, "人工修正后重跑通过"), FEATURE_TRACE);
  }

  public TrainingDatasetArtifactResponse artifact(String artifactKey) {
    PreparationJobRecord job = jobs.stream()
      .filter(candidate -> candidate.outputSnapshot.snapshotKey().equals(artifactKey))
      .findFirst()
      .orElseThrow(() -> new DatasetNotFoundException("未找到训练数据集产物: " + artifactKey));
    return new TrainingDatasetArtifactResponse(job.outputSnapshot.snapshotKey(), job.datasetKey, job.jobId, job.outputSnapshot.trainVersionKey(), job.outputSnapshot.readyForTraining() ? "READY" : "PENDING", job.outputSnapshot.loaderType(), job.outputSnapshot.manifestUri(), job.outputSnapshot.trainSplitCount(), job.outputSnapshot.validationSplitCount(), job.outputSnapshot.testSplitCount(), job.outputSnapshot.readyForTraining(), FEATURE_TRACE);
  }

  private PreparationJobRecord seedBlockedJob() {
    List<StageSummary> stages = new ArrayList<>(List.of(
      new StageSummary("COLLECTION", "数据收集", "SUCCEEDED", 96, true, "来源登记与样本清单完成", "2026-05-08T08:00:00Z", "2026-05-08T08:05:00Z"),
      new StageSummary("CLEANING", "数据清洗", "SUCCEEDED", 93, true, "去重和缺失值处理完成", "2026-05-08T08:05:00Z", "2026-05-08T08:20:00Z"),
      new StageSummary("LABELING", "数据标注", "FAILED", 72, false, "标注一致性低于阈值", "2026-05-08T08:20:00Z", "2026-05-08T09:00:00Z"),
      new StageSummary("SPLIT", "数据划分", "PENDING", 0, false, "等待标注通过", null, null),
      new StageSummary("PREPROCESSING", "数据预处理", "PENDING", 0, false, "等待数据划分", null, null),
      new StageSummary("AUGMENTATION", "数据增强", "PENDING", 0, false, "等待预处理", null, null),
      new StageSummary("FORMAT_LOADING", "格式转换与加载", "PENDING", 0, false, "等待增强", null, null)
    ));
    return new PreparationJobRecord(
      "prep-motor-thermal-v3", "motor-thermal", "电机温升异常图像集", "算法组", "BLOCKED", "LABELING", 38, true, "标注一致性低于阈值", 85, 1,
      new SourceConfig("PUBLIC_DATASET", "motor-quality-open", "TODO_CONFIRM_SOURCE_URI", "受控来源登记，不含真实凭据"),
      new RuleSnapshot("DEDUP_AND_MISSING_VALUE_BLOCK", "70/15/15", "IMAGE_RESIZE_224_NORMALIZE", "ROTATE_AND_CROP_LIGHT", "PAI_DLC_IMAGE_FOLDER"),
      new QualityGate(85, 0.9, 0.02),
      stages,
      new OutputSnapshot("motor-thermal-train-snapshot-v4", "motor-thermal-v4-prepared", "PAI_DLC_DATA_LOADER", "TODO_CONFIRM_OBJECT_STORAGE_URI", 8988, 1926, 1926, false),
      new ArrayList<>(List.of(new RerunRecord("rerun-001", "LABELING", "local.admin", "补充人工复核后重跑标注一致性检查", "2026-05-08T09:10:00Z"))),
      new ArrayList<>(List.of(new AuditEvent("QUALITY_GATE_BLOCKED", "system", "LABELING gate failed: agreement 0.82 < 0.9", "2026-05-08T09:00:00Z")))
    );
  }

  private List<StageSummary> initialStages() {
    return new ArrayList<>(List.of(
      new StageSummary("COLLECTION", "数据收集", "PENDING", 0, false, "等待执行", null, null),
      new StageSummary("CLEANING", "数据清洗", "PENDING", 0, false, "等待执行", null, null),
      new StageSummary("LABELING", "数据标注", "PENDING", 0, false, "等待执行", null, null),
      new StageSummary("SPLIT", "数据划分", "PENDING", 0, false, "等待执行", null, null),
      new StageSummary("PREPROCESSING", "数据预处理", "PENDING", 0, false, "等待执行", null, null),
      new StageSummary("AUGMENTATION", "数据增强", "PENDING", 0, false, "等待执行", null, null),
      new StageSummary("FORMAT_LOADING", "格式转换与加载", "PENDING", 0, false, "等待执行", null, null)
    ));
  }

  private PreparationJobSummary toSummary(PreparationJobRecord job) {
    return new PreparationJobSummary(job.jobId, job.datasetKey, job.datasetName, job.status, job.currentStage, job.progressPercent, job.blocked, job.blockedReason, currentQuality(job), job.rerunCount, job.outputSnapshot.snapshotKey(), FEATURE_TRACE);
  }

  private PreparationJobDetailResponse toDetail(PreparationJobRecord job) {
    return new PreparationJobDetailResponse(job.jobId, job.datasetKey, job.datasetName, job.owner, job.status, job.currentStage, job.progressPercent, job.sourceConfig, job.ruleSnapshot, job.qualityGate, job.stages, job.outputSnapshot, job.rerunRecords, job.auditTrail, FEATURE_TRACE);
  }

  private PreparationJobRecord find(String jobId) {
    return jobs.stream().filter(job -> job.jobId.equals(jobId)).findFirst()
      .orElseThrow(() -> new DatasetNotFoundException("未找到数据准备任务: " + jobId));
  }

  private void validateCreate(CreatePreparationJobRequest request) {
    if (request == null || isBlank(request.datasetKey())) throw new IllegalArgumentException("数据集键不能为空");
    if (isBlank(request.sourceType())) throw new IllegalArgumentException("来源类型不能为空");
    if (isBlank(request.sourceName())) throw new IllegalArgumentException("来源名称不能为空");
    if (isBlank(request.splitRatio()) || !request.splitRatio().matches("\\d+/\\d+/\\d+")) throw new IllegalArgumentException("划分比例必须为训练/验证/测试");
    if (request.minQualityScore() == null || request.minQualityScore() < 0 || request.minQualityScore() > 100) throw new IllegalArgumentException("质量门槛必须在 0 到 100 之间");
    if (request.minLabelAgreement() == null || request.minLabelAgreement() < 0 || request.minLabelAgreement() > 1) throw new IllegalArgumentException("标注一致性门槛必须在 0 到 1 之间");
    if (request.maxDuplicateRate() == null || request.maxDuplicateRate() < 0 || request.maxDuplicateRate() > 1) throw new IllegalArgumentException("重复率门槛必须在 0 到 1 之间");
  }

  private int stageIndex(String stageKey) {
    return switch (stageKey) {
      case "COLLECTION" -> 0;
      case "CLEANING" -> 1;
      case "LABELING" -> 2;
      case "SPLIT" -> 3;
      case "PREPROCESSING" -> 4;
      case "AUGMENTATION" -> 5;
      case "FORMAT_LOADING" -> 6;
      default -> throw new DatasetNotFoundException("未找到阶段: " + stageKey);
    };
  }

  private int currentQuality(PreparationJobRecord job) {
    return job.stages.stream().filter(stage -> stage.stageKey().equals(job.currentStage)).findFirst().map(StageSummary::qualityScore).orElse(0);
  }

  private int score(RunStageRequest request) {
    return request == null || request.qualityScoreOverride() == null ? 90 : request.qualityScoreOverride();
  }

  private String operator(String operator) {
    return operator == null || operator.isBlank() ? "local.admin" : operator;
  }

  private String datasetName(String datasetKey) {
    return "motor-thermal".equals(datasetKey) ? "电机温升异常图像集" : datasetKey;
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private static final class PreparationJobRecord {
    private final String jobId;
    private final String datasetKey;
    private final String datasetName;
    private final String owner;
    private String status;
    private String currentStage;
    private int progressPercent;
    private boolean blocked;
    private String blockedReason;
    private final int minQualityScore;
    private int rerunCount;
    private final SourceConfig sourceConfig;
    private final RuleSnapshot ruleSnapshot;
    private final QualityGate qualityGate;
    private final List<StageSummary> stages;
    private OutputSnapshot outputSnapshot;
    private final List<RerunRecord> rerunRecords;
    private final List<AuditEvent> auditTrail;

    private PreparationJobRecord(String jobId, String datasetKey, String datasetName, String owner, String status, String currentStage, int progressPercent, boolean blocked, String blockedReason, int minQualityScore, int rerunCount, SourceConfig sourceConfig, RuleSnapshot ruleSnapshot, QualityGate qualityGate, List<StageSummary> stages, OutputSnapshot outputSnapshot, List<RerunRecord> rerunRecords, List<AuditEvent> auditTrail) {
      this.jobId = jobId;
      this.datasetKey = datasetKey;
      this.datasetName = datasetName;
      this.owner = owner;
      this.status = status;
      this.currentStage = currentStage;
      this.progressPercent = progressPercent;
      this.blocked = blocked;
      this.blockedReason = blockedReason;
      this.minQualityScore = minQualityScore;
      this.rerunCount = rerunCount;
      this.sourceConfig = sourceConfig;
      this.ruleSnapshot = ruleSnapshot;
      this.qualityGate = qualityGate;
      this.stages = stages;
      this.outputSnapshot = outputSnapshot;
      this.rerunRecords = rerunRecords;
      this.auditTrail = auditTrail;
    }
  }
}