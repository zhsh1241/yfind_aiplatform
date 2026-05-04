package com.yfind.aiplatform.dataset;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class DatasetService {

  public static final String FEATURE_TRACE = "TASK-dataset-asset-mvp";
  private static final String DEFAULT_REQUESTER = "alg.engineer";
  private static final String DEFAULT_APPROVER = "local.admin";

  private final List<DatasetRecord> datasets = new ArrayList<>();
  private final LocalDatasetStorage storage = new LocalDatasetStorage();

  public DatasetService() {
    datasets.add(DatasetRecord.seed(
      "motor-thermal",
      "电机温升异常图像集",
      "算法组",
      "ACTIVE",
      "IMAGE",
      "用于温升异常识别的已质检图片集",
      List.of("图片", "温升", "质检"),
      true,
      true,
      List.of(
        VersionRecord.create("motor-thermal-v3", "v3", "AVAILABLE", 4, 12840, true, "SKIP_DUPLICATE", "SUCCEEDED"),
        VersionRecord.create("motor-thermal-v2", "v2", "ARCHIVED", 3, 10420, false, "SKIP_DUPLICATE", "SUCCEEDED")
      ),
      List.of(
        FileRecord.image("motor-thermal-file-1", "sample-001.jpg", 204800L, "sha256:motor-001", false),
        FileRecord.image("motor-thermal-file-2", "sample-002.jpg", 198120L, "sha256:motor-002", false),
        FileRecord.other("motor-thermal-file-3", "meta.csv", "text/csv", 8120L, "sha256:motor-meta", false)
      ),
      List.of(
        AccessRequestRecord.create("req-1001", "annotator.li", "motor-thermal", "motor-thermal-v3", "PENDING", "需要查看缺陷样例", null),
        AccessRequestRecord.create("req-1002", "qa.wang", "motor-thermal", "motor-thermal-v2", "APPROVED", "复核历史版本", "local.admin")
      ),
      List.of(
        ProcessingJobRecord.create("job-2001", "THUMBNAIL", "SUCCEEDED", "SKIP_DUPLICATE", "图片缩略图已生成"),
        ProcessingJobRecord.create("job-2002", "METADATA_SCAN", "QUEUED", "SKIP_DUPLICATE", "等待异步元数据抽取")
      )
    ));

    datasets.add(DatasetRecord.seed(
      "bearing-audio",
      "轴承异响音频集",
      "设备组",
      "PROCESSING",
      "FILE",
      "通用文件上传，当前版本仅支持图片样例保障",
      List.of("音频", "预测性维护"),
      true,
      true,
      List.of(VersionRecord.create("bearing-audio-v1", "v1", "PROCESSING", 2, 6200, false, "WARN_DUPLICATE", "RUNNING")),
      List.of(FileRecord.other("bearing-audio-file-1", "bearing-001.wav", "audio/wav", 4128000L, "sha256:bearing-001", false)),
      List.of(),
      List.of(ProcessingJobRecord.create("job-2101", "HASH_SCAN", "RUNNING", "WARN_DUPLICATE", "正在扫描重复音频文件"))
    ));
  }

  public DatasetListResponse list(String query, String status) {
    String normalizedQuery = normalize(query);
    String normalizedStatus = normalize(status);
    List<DatasetSummary> items = datasets.stream()
      .filter(record -> normalizedQuery.isBlank() || normalize(record.name()).contains(normalizedQuery) || normalize(record.owner()).contains(normalizedQuery))
      .filter(record -> normalizedStatus.isBlank() || normalize(record.status()).equals(normalizedStatus))
      .sorted(Comparator.comparing(DatasetRecord::name))
      .map(this::toSummary)
      .toList();
    return new DatasetListResponse(items, FEATURE_TRACE);
  }

  public DatasetDetailResponse detail(String datasetKey) {
    DatasetRecord record = find(datasetKey);
    return toDetail(record);
  }

  public DatasetUploadResponse upload(DatasetUploadRequest request) {
    validateUpload(request);
    String datasetKey = toDatasetKey(request.datasetName());
    DatasetRecord existing = datasets.stream().filter(record -> record.key().equals(datasetKey)).findFirst().orElse(null);
    List<FileRecord> uploadedFiles = request.files().stream()
      .map(file -> new FileRecord(
        UUID.randomUUID().toString(),
        file.name(),
        file.contentType(),
        file.sizeBytes(),
        file.sha256(),
        storage.previewAvailable(file.contentType()),
        storage.previewLabel(file.contentType()),
        existing != null && existing.files().stream().anyMatch(existingFile -> Objects.equals(existingFile.sha256(), file.sha256()))
      ))
      .toList();

    String versionKey;
    if (existing == null) {
      versionKey = datasetKey + "-v1";
      DatasetRecord created = DatasetRecord.seed(
        datasetKey,
        request.datasetName(),
        request.owner(),
        "ACTIVE",
        previewType(uploadedFiles),
        "由上传接口创建的数据集",
        request.tags() == null ? List.of() : request.tags(),
        true,
        true,
        List.of(VersionRecord.create(versionKey, "v1", "AVAILABLE", uploadedFiles.size(), uploadedFiles.size(), false, "SKIP_DUPLICATE", "QUEUED")),
        uploadedFiles,
        List.of(),
        List.of(ProcessingJobRecord.create(UUID.randomUUID().toString(), "METADATA_SCAN", "QUEUED", "SKIP_DUPLICATE", "等待异步预处理"))
      );
      datasets.add(created);
    } else {
      int nextVersion = existing.versions().size() + 1;
      versionKey = datasetKey + "-v" + nextVersion;
      existing.versions().add(0, VersionRecord.create(versionKey, "v" + nextVersion, "AVAILABLE", uploadedFiles.size(), uploadedFiles.size(), false, "SKIP_DUPLICATE", "QUEUED"));
      existing.files().addAll(0, uploadedFiles);
      existing.processingJobs().add(0, ProcessingJobRecord.create(UUID.randomUUID().toString(), "METADATA_SCAN", "QUEUED", "SKIP_DUPLICATE", "等待异步预处理"));
      existing.status = "ACTIVE";
    }

    return new DatasetUploadResponse(datasetKey, versionKey, "SKIP_DUPLICATE", "QUEUED", FEATURE_TRACE);
  }

  public DatasetAccessRequestActionResponse createAccessRequest(String datasetKey, DatasetAccessRequestCreateRequest request) {
    DatasetRecord dataset = find(datasetKey);
    String requestId = UUID.randomUUID().toString();
    dataset.accessRequests().add(0, AccessRequestRecord.create(
      requestId,
      request.requester() == null || request.requester().isBlank() ? DEFAULT_REQUESTER : request.requester(),
      datasetKey,
      request.versionKey(),
      "PENDING",
      request.reason(),
      null
    ));
    return new DatasetAccessRequestActionResponse(requestId, "PENDING", request.versionKey(), false, FEATURE_TRACE);
  }

  public DatasetAccessRequestActionResponse approve(String requestId) {
    for (DatasetRecord dataset : datasets) {
      for (AccessRequestRecord request : dataset.accessRequests()) {
        if (request.requestId().equals(requestId)) {
          request.status = "APPROVED";
          request.approvedBy = DEFAULT_APPROVER;
          dataset.versions().stream()
            .filter(version -> version.versionKey().equals(request.versionKey()))
            .findFirst()
            .ifPresent(version -> version.canDownload = true);
          return new DatasetAccessRequestActionResponse(requestId, "APPROVED", request.versionKey(), true, FEATURE_TRACE);
        }
      }
    }
    throw new DatasetNotFoundException("未找到访问申请: " + requestId);
  }

  public DatasetAccessRequestListResponse listRequests() {
    List<DatasetAccessRequestSummary> items = datasets.stream()
      .flatMap(dataset -> dataset.accessRequests().stream())
      .sorted(Comparator.comparing(AccessRequestRecord::requestId).reversed())
      .map(this::toRequestSummary)
      .toList();
    return new DatasetAccessRequestListResponse(items, FEATURE_TRACE);
  }

  private void validateUpload(DatasetUploadRequest request) {
    if (request == null || request.datasetName() == null || request.datasetName().isBlank()) {
      throw new IllegalArgumentException("数据集名称不能为空");
    }
    if (request.owner() == null || request.owner().isBlank()) {
      throw new IllegalArgumentException("负责人不能为空");
    }
    if (request.files() == null || request.files().isEmpty()) {
      throw new IllegalArgumentException("至少上传一个文件");
    }
  }

  private DatasetRecord find(String datasetKey) {
    return datasets.stream().filter(record -> record.key().equals(datasetKey)).findFirst()
      .orElseThrow(() -> new DatasetNotFoundException("未找到数据集: " + datasetKey));
  }

  private DatasetSummary toSummary(DatasetRecord record) {
    return new DatasetSummary(record.key(), record.name(), record.owner(), record.status(), sampleCount(record), record.versions().size(), record.previewType(), record.canView(), record.canManage());
  }

  private DatasetDetailResponse toDetail(DatasetRecord record) {
    List<DatasetVersionSummary> versions = record.versions().stream()
      .map(version -> new DatasetVersionSummary(version.versionKey(), version.versionLabel(), version.status(), version.fileCount(), version.sampleCount(), version.canDownload(), version.dedupStrategy(), version.processingStatus()))
      .toList();
    List<DatasetFileSummary> files = record.files().stream()
      .limit(6)
      .map(file -> new DatasetFileSummary(file.fileKey(), file.fileName(), file.contentType(), file.sizeBytes(), file.sha256(), file.previewAvailable(), file.duplicate(), file.previewLabel()))
      .toList();
    List<DatasetAccessRequestSummary> requests = record.accessRequests().stream().map(this::toRequestSummary).toList();
    List<DatasetProcessingJobSummary> jobs = record.processingJobs().stream()
      .map(job -> new DatasetProcessingJobSummary(job.jobId(), job.jobType(), job.status(), job.dedupStrategy(), job.message()))
      .toList();
    boolean canDownloadLatest = versions.stream().findFirst().map(DatasetVersionSummary::canDownload).orElse(false);
    return new DatasetDetailResponse(record.key(), record.name(), record.owner(), record.status(), record.description(), record.previewType(), record.canView(), record.canManage(), canDownloadLatest, record.tags(), versions, files, requests, jobs, FEATURE_TRACE);
  }

  private DatasetAccessRequestSummary toRequestSummary(AccessRequestRecord request) {
    return new DatasetAccessRequestSummary(request.requestId(), request.requester(), request.datasetKey(), request.versionKey(), request.status(), request.reason(), request.approvedBy());
  }

  private int sampleCount(DatasetRecord record) {
    return record.versions().stream().mapToInt(VersionRecord::sampleCount).max().orElse(record.files().size());
  }

  private String previewType(List<FileRecord> files) {
    return files.stream().anyMatch(FileRecord::previewAvailable) ? "IMAGE" : "FILE";
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private String toDatasetKey(String datasetName) {
    return datasetName.trim().toLowerCase(Locale.ROOT)
      .replace('（', '(')
      .replace('）', ')')
      .replaceAll("[^a-z0-9]+", "-")
      .replaceAll("^-+|-+$", "");
  }

  private static final class DatasetRecord {
    private final String key;
    private final String name;
    private final String owner;
    private String status;
    private final String previewType;
    private final String description;
    private final List<String> tags;
    private final boolean canView;
    private final boolean canManage;
    private final List<VersionRecord> versions;
    private final List<FileRecord> files;
    private final List<AccessRequestRecord> accessRequests;
    private final List<ProcessingJobRecord> processingJobs;

    private DatasetRecord(String key, String name, String owner, String status, String previewType, String description, List<String> tags, boolean canView, boolean canManage, List<VersionRecord> versions, List<FileRecord> files, List<AccessRequestRecord> accessRequests, List<ProcessingJobRecord> processingJobs) {
      this.key = key;
      this.name = name;
      this.owner = owner;
      this.status = status;
      this.previewType = previewType;
      this.description = description;
      this.tags = new ArrayList<>(tags);
      this.canView = canView;
      this.canManage = canManage;
      this.versions = new ArrayList<>(versions);
      this.files = new ArrayList<>(files);
      this.accessRequests = new ArrayList<>(accessRequests);
      this.processingJobs = new ArrayList<>(processingJobs);
    }

    static DatasetRecord seed(String key, String name, String owner, String status, String previewType, String description, List<String> tags, boolean canView, boolean canManage, List<VersionRecord> versions, List<FileRecord> files, List<AccessRequestRecord> accessRequests, List<ProcessingJobRecord> processingJobs) {
      return new DatasetRecord(key, name, owner, status, previewType, description, tags, canView, canManage, versions, files, accessRequests, processingJobs);
    }

    String key() { return key; }
    String name() { return name; }
    String owner() { return owner; }
    String status() { return status; }
    String previewType() { return previewType; }
    String description() { return description; }
    List<String> tags() { return tags; }
    boolean canView() { return canView; }
    boolean canManage() { return canManage; }
    List<VersionRecord> versions() { return versions; }
    List<FileRecord> files() { return files; }
    List<AccessRequestRecord> accessRequests() { return accessRequests; }
    List<ProcessingJobRecord> processingJobs() { return processingJobs; }
  }

  private record FileRecord(String fileKey, String fileName, String contentType, long sizeBytes, String sha256, boolean previewAvailable, String previewLabel, boolean duplicate) {
    static FileRecord image(String fileKey, String fileName, long sizeBytes, String sha256, boolean duplicate) {
      return new FileRecord(fileKey, fileName, "image/jpeg", sizeBytes, sha256, true, "图片样例可预览", duplicate);
    }
    static FileRecord other(String fileKey, String fileName, String contentType, long sizeBytes, String sha256, boolean duplicate) {
      return new FileRecord(fileKey, fileName, contentType, sizeBytes, sha256, false, "当前仅保证图片预览", duplicate);
    }
  }

  private static final class VersionRecord {
    private final String versionKey;
    private final String versionLabel;
    private final String status;
    private final int fileCount;
    private final int sampleCount;
    private boolean canDownload;
    private final String dedupStrategy;
    private final String processingStatus;

    private VersionRecord(String versionKey, String versionLabel, String status, int fileCount, int sampleCount, boolean canDownload, String dedupStrategy, String processingStatus) {
      this.versionKey = versionKey;
      this.versionLabel = versionLabel;
      this.status = status;
      this.fileCount = fileCount;
      this.sampleCount = sampleCount;
      this.canDownload = canDownload;
      this.dedupStrategy = dedupStrategy;
      this.processingStatus = processingStatus;
    }

    static VersionRecord create(String versionKey, String versionLabel, String status, int fileCount, int sampleCount, boolean canDownload, String dedupStrategy, String processingStatus) {
      return new VersionRecord(versionKey, versionLabel, status, fileCount, sampleCount, canDownload, dedupStrategy, processingStatus);
    }

    String versionKey() { return versionKey; }
    String versionLabel() { return versionLabel; }
    String status() { return status; }
    int fileCount() { return fileCount; }
    int sampleCount() { return sampleCount; }
    boolean canDownload() { return canDownload; }
    String dedupStrategy() { return dedupStrategy; }
    String processingStatus() { return processingStatus; }
  }

  private static final class AccessRequestRecord {
    private final String requestId;
    private final String requester;
    private final String datasetKey;
    private final String versionKey;
    private String status;
    private final String reason;
    private String approvedBy;

    private AccessRequestRecord(String requestId, String requester, String datasetKey, String versionKey, String status, String reason, String approvedBy) {
      this.requestId = requestId;
      this.requester = requester;
      this.datasetKey = datasetKey;
      this.versionKey = versionKey;
      this.status = status;
      this.reason = reason;
      this.approvedBy = approvedBy;
    }

    static AccessRequestRecord create(String requestId, String requester, String datasetKey, String versionKey, String status, String reason, String approvedBy) {
      return new AccessRequestRecord(requestId, requester, datasetKey, versionKey, status, reason, approvedBy);
    }

    String requestId() { return requestId; }
    String requester() { return requester; }
    String datasetKey() { return datasetKey; }
    String versionKey() { return versionKey; }
    String status() { return status; }
    String reason() { return reason; }
    String approvedBy() { return approvedBy; }
  }

  private record ProcessingJobRecord(String jobId, String jobType, String status, String dedupStrategy, String message) {
    static ProcessingJobRecord create(String jobId, String jobType, String status, String dedupStrategy, String message) {
      return new ProcessingJobRecord(jobId, jobType, status, dedupStrategy, message);
    }
  }

  private static final class LocalDatasetStorage {
    boolean previewAvailable(String contentType) {
      return contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("image/");
    }

    String previewLabel(String contentType) {
      return previewAvailable(contentType) ? "图片样例可预览" : "当前仅保证图片预览";
    }
  }
}
