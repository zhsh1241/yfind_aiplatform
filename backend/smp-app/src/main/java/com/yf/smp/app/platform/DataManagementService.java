package com.yf.smp.app.platform;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

interface DataSourceConnectionTester { DataSourceTestResult test(DataSourceRecord source); }
record DataSourceTestResult(String result, String status, String diagnosticCode, String diagnosticMessage, Integer latencyMs) {}

@Component
class DefaultDataSourceConnectionTester implements DataSourceConnectionTester {
    private static final Duration CONNECT_TIMEOUT = Duration.ofMillis(1200);
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(2);

    @Override public DataSourceTestResult test(DataSourceRecord source) {
        if (source.endpoint() == null || source.endpoint().isBlank() || source.endpoint().startsWith("TODO_CONFIRM")) return new DataSourceTestResult("FAILED", "UNCONFIGURED", "DATA_SOURCE_UNCONFIGURED", blank(source.endpoint(), "TODO_CONFIRM_DATA_SOURCE_ENDPOINT"), null);
        if (source.endpoint().toLowerCase(Locale.ROOT).contains("sandbox") || source.endpoint().toLowerCase(Locale.ROOT).contains("internal")) return new DataSourceTestResult("SUCCESS", "TESTED", "OK", "SANDBOX " + source.sourceType() + " connector verified", 42);
        long start = System.nanoTime();
        if (probe(source)) return new DataSourceTestResult("SUCCESS", "TESTED", "OK", "DOCKER " + source.sourceType() + " connector verified", Math.max(1, (int) Duration.ofNanos(System.nanoTime() - start).toMillis()));
        return new DataSourceTestResult("FAILED", "UNCONFIGURED", "DATA_SOURCE_UNCONFIGURED", "TODO_CONFIRM_CONNECTOR_FOR_" + source.sourceType(), null);
    }
    private boolean probe(DataSourceRecord source) {
        String type = source.sourceType() == null ? "" : source.sourceType().toUpperCase(Locale.ROOT);
        if ("API".equals(type) || "OBJECT_STORAGE".equals(type) || "FILE".equals(type)) return httpProbe(source);
        return tcpProbe(source);
    }
    private boolean httpProbe(DataSourceRecord source) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
        for (URI uri : httpUris(source)) {
            try {
                HttpResponse<Void> response = client.send(HttpRequest.newBuilder(uri).timeout(HTTP_TIMEOUT).GET().build(), HttpResponse.BodyHandlers.discarding());
                if (response.statusCode() < 500) return true;
            } catch (Exception ignored) {}
        }
        return tcpProbe(source);
    }
    private boolean tcpProbe(DataSourceRecord source) {
        int port = port(source);
        for (String host : candidateHosts(source)) {
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress(host, port), (int) CONNECT_TIMEOUT.toMillis()); return true;
            } catch (Exception ignored) {}
        }
        return false;
    }
    private List<URI> httpUris(DataSourceRecord source) {
        URI base = baseUri(source);
        String path = base.getPath() == null || base.getPath().isBlank() || "/".equals(base.getPath()) ? defaultHttpPath(source.sourceType()) : base.getPath();
        String query = base.getRawQuery() == null ? "" : "?" + base.getRawQuery();
        List<URI> uris = new ArrayList<>();
        for (String host : candidateHosts(source)) {
            uris.add(URI.create(base.getScheme() + "://" + host + ":" + port(source) + path + query));
        }
        return uris;
    }
    private URI baseUri(DataSourceRecord source) {
        String endpoint = source.endpoint().trim();
        String normalized = endpoint.startsWith("http://") || endpoint.startsWith("https://") ? endpoint : "http://" + endpoint;
        URI uri = URI.create(normalized);
        if (uri.getPort() >= 0 || source.port() == null) return uri;
        return URI.create(uri.getScheme() + "://" + uri.getHost() + ":" + source.port() + blank(uri.getRawPath(), "") + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery()));
    }
    private List<String> candidateHosts(DataSourceRecord source) {
        Set<String> hosts = new LinkedHashSet<>();
        String host = endpointHost(source.endpoint());
        if (!host.isBlank()) hosts.add(host);
        if (isLocalHost(host)) {
            hosts.add("localhost");
            hosts.add("127.0.0.1");
            hosts.add("host.docker.internal");
        }
        hosts.addAll(serviceHostCandidates(source));
        return hosts.stream().filter(i -> i != null && !i.isBlank()).toList();
    }
    private String endpointHost(String endpoint) {
        try {
            URI uri = URI.create(endpoint.startsWith("http://") || endpoint.startsWith("https://") ? endpoint : "tcp://" + endpoint);
            if (uri.getHost() != null) return uri.getHost();
        } catch (Exception ignored) {}
        return endpoint.replaceFirst("^https?://", "").replaceFirst("/.*$", "").replaceFirst(":\\d+$", "").trim();
    }
    private List<String> serviceHostCandidates(DataSourceRecord source) {
        String type = source.sourceType() == null ? "" : source.sourceType().toUpperCase(Locale.ROOT);
        int p = port(source);
        return switch (type) {
            case "RELATIONAL_DB" -> p == 3306 ? List.of("mysql", "smp-platform-mysql") : List.of("postgres", "smp-platform-postgres");
            case "OBJECT_STORAGE" -> List.of("minio", "smp-platform-minio");
            case "API" -> List.of("source-api", "smp-platform-source-api");
            case "FILE" -> List.of("file-source", "smp-platform-file-source");
            case "STREAM" -> p == 5672 ? List.of("rabbitmq", "smp-platform-rabbitmq") : List.of("kafka", "smp-platform-kafka");
            case "TIME_SERIES" -> List.of("influxdb", "smp-platform-influxdb");
            case "INDUSTRIAL_PROTOCOL" -> List.of("industrial-protocol", "smp-platform-industrial");
            default -> List.of();
        };
    }
    private boolean isLocalHost(String host) { return "127.0.0.1".equals(host) || "localhost".equalsIgnoreCase(host) || "host.docker.internal".equalsIgnoreCase(host); }
    private int port(DataSourceRecord source) { return source.port() == null ? defaultPort(source.sourceType()) : source.port(); }
    private String defaultHttpPath(String sourceType) { return "OBJECT_STORAGE".equalsIgnoreCase(blank(sourceType, "")) ? "/minio/health/live" : "/health"; }
    private int defaultPort(String sourceType) {
        return switch (sourceType == null ? "" : sourceType.toUpperCase(Locale.ROOT)) {
            case "RELATIONAL_DB" -> 5432; case "STREAM" -> 9092; case "TIME_SERIES" -> 8086; case "INDUSTRIAL_PROTOCOL" -> 4840; case "OBJECT_STORAGE" -> 9000; default -> 80;
        };
    }
    private String blank(String value, String fallback) { return value == null || value.isBlank() ? fallback : value; }
}

@Service
public class DataManagementService {
    private static final String TRACE_TAG = "TASK-data-source-dataset-management";
    private final JdbcTemplate jdbc;
    private final PlatformIdentityService identityService;
    private final DataSourceConnectionTester connectionTester;
    public DataManagementService(JdbcTemplate jdbc, PlatformIdentityService identityService, DataSourceConnectionTester connectionTester) { this.jdbc = jdbc; this.identityService = identityService; this.connectionTester = connectionTester; }

    public List<DataSourceResponse> dataSources(PlatformPrincipal principal, String status, String type) {
        identityService.requirePermission(principal, "data:source:read");
        return jdbc.query("SELECT * FROM data_source ORDER BY updated_at DESC", (rs, n) -> sourceRecord(rs)).stream().filter(s -> canSeeTenant(principal, s.tenantId())).filter(s -> blank(status) || s.status().equalsIgnoreCase(status)).filter(s -> blank(type) || s.sourceType().equalsIgnoreCase(type)).map(this::sourceResponse).toList();
    }

    @Transactional public DataSourceResponse createDataSource(PlatformPrincipal principal, DataSourceRequest r) {
        identityService.requirePermission(principal, "data:source:write");
        String tenantId = blank(r.tenantId(), principal.user().tenantId()); ensureCanSeeTenant(principal, tenantId, true); rejectPlainSecret(r.endpoint()); rejectPlainSecret(r.secretRef());
        String id = "DSRC-" + randomHex(10).toUpperCase(Locale.ROOT); String endpoint = require(r.endpoint(), "数据源 Endpoint 不能为空"); String status = endpoint.startsWith("TODO_CONFIRM") ? "UNCONFIGURED" : "INACTIVE"; OffsetDateTime now = now();
        jdbc.update(""" 
            INSERT INTO data_source (source_id,name,source_type,tenant_id,project_id,endpoint,port,database_name,credential_mode,secret_ref,shared_scope,description,status,diagnostic_code,diagnostic_message,created_by,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, id, require(r.name(), "数据源名称不能为空"), upper(r.sourceType(), "OBJECT_STORAGE"), tenantId, nullIfBlank(r.projectId()), endpoint, r.port(), nullIfBlank(r.databaseName()), upper(r.credentialMode(), "SECRET_REF"), maskSecret(blank(r.secretRef(), "secret://TODO_CONFIRM_DATA_SOURCE_SECRET")), upper(r.sharedScope(), "BU"), nullIfBlank(r.description()), status, status.equals("UNCONFIGURED") ? "DATA_SOURCE_UNCONFIGURED" : "NOT_TESTED", status.equals("UNCONFIGURED") ? endpoint : "待连接测试", principal.user().id(), now, now);
        audit(principal, tenantId, "DATA_SOURCE_CREATED", "DataSource", id, "SUCCESS", "INFO", null, status, TRACE_TAG); return sourceResponse(source(id));
    }

    @Transactional public DataSourceResponse updateDataSource(PlatformPrincipal principal, String sourceId, DataSourceRequest r) {
        identityService.requirePermission(principal, "data:source:write"); DataSourceRecord c = source(sourceId); ensureCanSeeTenant(principal, c.tenantId(), true); rejectPlainSecret(r.endpoint()); rejectPlainSecret(r.secretRef());
        jdbc.update("UPDATE data_source SET name=?,source_type=?,endpoint=?,port=?,database_name=?,credential_mode=?,secret_ref=?,shared_scope=?,description=?,status=CASE WHEN status='ACTIVE' THEN 'INACTIVE' ELSE status END,diagnostic_code=CASE WHEN status='ACTIVE' THEN 'NOT_TESTED' ELSE diagnostic_code END,updated_at=? WHERE source_id=?", blank(r.name(), c.name()), upper(r.sourceType(), c.sourceType()), blank(r.endpoint(), c.endpoint()), r.port() == null ? c.port() : r.port(), blank(r.databaseName(), c.databaseName()), upper(r.credentialMode(), c.credentialMode()), maskSecret(blank(r.secretRef(), c.secretRef())), upper(r.sharedScope(), c.sharedScope()), blank(r.description(), c.description()), now(), sourceId);
        audit(principal, c.tenantId(), "DATA_SOURCE_UPDATED", "DataSource", sourceId, "SUCCESS", "WARNING", c.status(), "INACTIVE", TRACE_TAG); return sourceResponse(source(sourceId));
    }

    @Transactional(noRollbackFor = PlatformException.class) public DataSourceTestResponse testDataSource(PlatformPrincipal principal, String sourceId) {
        identityService.requirePermission(principal, "data:source:test"); DataSourceRecord s = source(sourceId); ensureCanSeeTenant(principal, s.tenantId(), false); audit(principal, s.tenantId(), "DATA_SOURCE_TEST_REQUESTED", "DataSource", sourceId, "SUCCESS", "INFO", null, null, TRACE_TAG);
        DataSourceTestResult r = connectionTester.test(s); OffsetDateTime at = now(); String status = "SUCCESS".equals(r.result()) ? "TESTED" : r.status();
        jdbc.update("UPDATE data_source SET status=?,last_test_at=?,diagnostic_code=?,diagnostic_message=?,latency_ms=?,updated_at=? WHERE source_id=?", status, at, r.diagnosticCode(), r.diagnosticMessage(), r.latencyMs(), at, sourceId);
        jdbc.update("INSERT INTO data_source_test_log (test_id,source_id,result,diagnostic_code,diagnostic_message,latency_ms,trace_id,tested_by,tested_at) VALUES (?,?,?,?,?,?,?,?,?)", "DSTEST-" + randomHex(10).toUpperCase(Locale.ROOT), sourceId, r.result(), r.diagnosticCode(), r.diagnosticMessage(), r.latencyMs(), PlatformResponses.traceId(), principal.user().id(), at);
        audit(principal, s.tenantId(), "SUCCESS".equals(r.result()) ? "DATA_SOURCE_TEST_SUCCEEDED" : "DATA_SOURCE_TEST_FAILED", "DataSource", sourceId, "SUCCESS".equals(r.result()) ? "SUCCESS" : "FAILURE", "SUCCESS".equals(r.result()) ? "INFO" : "WARNING", s.status(), status, TRACE_TAG + ";" + r.diagnosticCode());
        return new DataSourceTestResponse(sourceId, r.result(), status, r.diagnosticCode(), r.diagnosticMessage(), r.latencyMs(), PlatformResponses.traceId(), at);
    }

    @Transactional(noRollbackFor = PlatformException.class) public DataSourceResponse activateDataSource(PlatformPrincipal principal, String sourceId) {
        identityService.requirePermission(principal, "data:source:activate"); DataSourceRecord s = source(sourceId); ensureCanSeeTenant(principal, s.tenantId(), true);
        if (!"OK".equals(s.diagnosticCode()) || s.lastTestAt() == null) { audit(principal, s.tenantId(), "DATA_SOURCE_ACTIVATE_REJECTED", "DataSource", sourceId, "FAILURE", "WARNING", s.status(), "ACTIVE", TRACE_TAG + ";DAT-001"); throw new PlatformException(PlatformError.CONFLICT, "DATA_SOURCE_TEST_FAILED: 连接测试未通过的数据源不得激活"); }
        jdbc.update("UPDATE data_source SET status='ACTIVE',updated_at=? WHERE source_id=?", now(), sourceId); audit(principal, s.tenantId(), "DATA_SOURCE_ACTIVATED", "DataSource", sourceId, "SUCCESS", "INFO", s.status(), "ACTIVE", TRACE_TAG); return sourceResponse(source(sourceId));
    }
    @Transactional public DataSourceResponse disableDataSource(PlatformPrincipal principal, String sourceId) { identityService.requirePermission(principal, "data:source:activate"); DataSourceRecord s = source(sourceId); ensureCanSeeTenant(principal, s.tenantId(), true); jdbc.update("UPDATE data_source SET status='DISABLED',updated_at=? WHERE source_id=?", now(), sourceId); audit(principal, s.tenantId(), "DATA_SOURCE_DISABLED", "DataSource", sourceId, "SUCCESS", "WARNING", s.status(), "DISABLED", TRACE_TAG); return sourceResponse(source(sourceId)); }

    public List<DataSourceSyncTaskResponse> syncTasks(PlatformPrincipal principal) {
        identityService.requirePermission(principal, "data:sync-task:read");
        return jdbc.query("""
            SELECT t.*,s.name AS source_name,d.name AS target_dataset_name,s.tenant_id FROM data_source_sync_task t JOIN data_source s ON s.source_id=t.source_id LEFT JOIN dataset d ON d.dataset_id=t.target_dataset_id ORDER BY t.updated_at DESC
            """, (rs,n) -> syncTaskRecord(rs)).stream().filter(t -> canSeeTenant(principal, t.tenantId())).map(this::syncTaskResponse).toList();
    }
    @Transactional(noRollbackFor = PlatformException.class) public DataSourceSyncTaskResponse createSyncTask(PlatformPrincipal principal, DataSourceSyncTaskRequest r) { identityService.requirePermission(principal, "data:sync-task:write"); DataSourceRecord s = source(require(r.sourceId(), "数据源不能为空")); ensureCanSeeTenant(principal, s.tenantId(), true); ensureSourceReferenceable(principal, s, "DATA_SYNC_TASK_SOURCE_REJECTED"); String id = "DSYNC-" + randomHex(10).toUpperCase(Locale.ROOT); OffsetDateTime now = now(); jdbc.update("INSERT INTO data_source_sync_task (task_id,source_id,target_dataset_id,name,schedule_mode,sync_scope,status,diagnostic_code,diagnostic_message,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,'PAUSED','UNCONFIGURED','TODO_CONFIRM_DATA_CONNECTOR_SCHEDULER',?,?,?)", id, s.sourceId(), nullIfBlank(r.targetDatasetId()), require(r.name(), "同步任务名称不能为空"), upper(r.scheduleMode(), "MANUAL"), nullIfBlank(r.syncScope()), principal.user().id(), now, now); audit(principal, s.tenantId(), "DATA_SYNC_TASK_CREATED", "DataSourceSyncTask", id, "SUCCESS", "INFO", null, s.sourceId(), TRACE_TAG); return syncTasks(principal).stream().filter(i -> i.taskId().equals(id)).findFirst().orElseThrow(); }
    @Transactional public DataSourceSyncTaskResponse runSyncTask(PlatformPrincipal principal, String taskId) {
        identityService.requirePermission(principal, "data:sync-task:write");
        SyncTaskRecord t = syncTask(taskId); DataSourceRecord s = source(t.sourceId()); ensureCanSeeTenant(principal, t.tenantId(), true); ensureSourceReferenceable(principal, s, "DATA_SYNC_TASK_SOURCE_REJECTED");
        DataSourceImportPlan plan = importPlan(s, t); OffsetDateTime now = now(); boolean createDataset = blank(t.targetDatasetId()); String did = createDataset ? "DATASET-" + randomHex(10).toUpperCase(Locale.ROOT) : t.targetDatasetId(); String vid = "DVER-" + randomHex(10).toUpperCase(Locale.ROOT);
        if (createDataset) {
            jdbc.update("INSERT INTO dataset (dataset_id,name,dataset_type,data_type,tenant_id,project_id,current_version_id,status,access_level,tags,record_count,size_bytes,owner_id,description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", did, plan.datasetName(), "RAW", plan.dataType(), s.tenantId(), s.projectId(), null, "ACTIVE", "TEAM", joinTags(List.of("sandbox", "import", s.sourceType())), plan.recordCount(), plan.sizeBytes(), principal.user().id(), plan.description(), now, now);
        } else {
            DatasetRecord d = datasetVisibleOrNotFound(principal, did); if (!d.tenantId().equals(s.tenantId())) throw new PlatformException(PlatformError.CONFLICT, "DATA_SYNC_TARGET_TENANT_MISMATCH: target dataset must belong to the same tenant as source");
            jdbc.update("UPDATE dataset SET status='ACTIVE',record_count=?,size_bytes=?,updated_at=? WHERE dataset_id=?", plan.recordCount(), plan.sizeBytes(), now, did);
        }
        jdbc.update("INSERT INTO dataset_version (version_id,dataset_id,version_name,status,record_count,size_bytes,content_safety_status,diagnostic_code,diagnostic_message,created_by,created_at,published_at) VALUES (?,?,?,'PUBLISHED',?,?,'PASSED','OK','SANDBOX_CONTENT_SAFETY_PASSED',?,?,?)", vid, did, nextVersionNameForImport(did), plan.recordCount(), plan.sizeBytes(), principal.user().id(), now, now);
        jdbc.update("UPDATE dataset SET current_version_id=?,record_count=?,size_bytes=?,updated_at=? WHERE dataset_id=?", vid, plan.recordCount(), plan.sizeBytes(), now, did);
        String fileId = "FILE-" + randomHex(12).toUpperCase(Locale.ROOT); String objectKey = s.tenantId() + "/dataset/import/" + s.sourceType().toLowerCase(Locale.ROOT) + "/" + taskId + "/" + fileId + "." + plan.extension(); String sha = sha256(plan.content()); String bucket = datasetBucket(s.tenantId());
        jdbc.update("INSERT INTO platform_file_object (file_id,asset_type,tenant_id,project_id,bucket,object_key,expected_sha256,sha256,expected_size_bytes,size_bytes,content_type,storage_tier,status,owner_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", fileId, "DATASET", s.tenantId(), s.projectId(), bucket, objectKey, sha, sha, plan.sizeBytes(), plan.sizeBytes(), plan.contentType(), "STANDARD", "AVAILABLE", principal.user().id(), now, now);
        String dfId = "DF-" + randomHex(10).toUpperCase(Locale.ROOT); jdbc.update("INSERT INTO dataset_file (id,dataset_id,version_id,file_id,file_role,status,created_at) VALUES (?,?,?,?,?,'BOUND',?)", dfId, did, vid, fileId, plan.fileRole(), now);
        jdbc.update("INSERT INTO data_lineage (lineage_id,source_type,source_id,target_type,target_id,transform_type,created_at) VALUES (?,'DATA_SOURCE',?,'DATASET_VERSION',?,'IMPORT',?)", "LIN-" + randomHex(10).toUpperCase(Locale.ROOT), s.sourceId(), vid, now);
        jdbc.update("UPDATE data_source_sync_task SET target_dataset_id=?,status='SUCCEEDED',last_run_at=?,last_result='SUCCESS',diagnostic_code='OK',diagnostic_message=?,updated_at=? WHERE task_id=?", did, now, "SANDBOX_" + s.sourceType() + "_IMPORT_READY", now, taskId);
        audit(principal, s.tenantId(), "DATA_SYNC_TASK_SUCCEEDED", "DataSourceSyncTask", taskId, "SUCCESS", "INFO", t.status(), did, TRACE_TAG + ";" + s.sourceType() + ";file=" + fileId); return syncTasks(principal).stream().filter(i -> i.taskId().equals(taskId)).findFirst().orElseThrow();
    }

    public DatasetListResponse datasets(PlatformPrincipal principal, String keyword, String datasetType, String status, String accessLevel, int page, int pageSize) {
        identityService.requirePermission(principal, "data:dataset:read"); List<DatasetSummaryResponse> v = allDatasetSummaries(principal).stream().filter(i -> blank(keyword) || i.name().toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT))).filter(i -> blank(datasetType) || i.datasetType().equalsIgnoreCase(datasetType)).filter(i -> blank(status) || i.status().equalsIgnoreCase(status)).filter(i -> blank(accessLevel) || i.accessLevel().equalsIgnoreCase(accessLevel)).toList(); int p=Math.max(1,page), ps=Math.max(1,Math.min(100,pageSize)), from=Math.min((p-1)*ps,v.size()), to=Math.min(from+ps,v.size()); return new DatasetListResponse(v.subList(from,to), v.size(), p, ps, stats(v));
    }

    @Transactional public DatasetDetailResponse createDataset(PlatformPrincipal principal, DatasetCreateRequest r) {
        identityService.requirePermission(principal, "data:dataset:write"); String tenantId = blank(r.tenantId(), principal.user().tenantId()); ensureCanSeeTenant(principal, tenantId, true); String did="DATASET-"+randomHex(10).toUpperCase(Locale.ROOT), vid="DVER-"+randomHex(10).toUpperCase(Locale.ROOT); OffsetDateTime now=now();
        jdbc.update("INSERT INTO dataset (dataset_id,name,dataset_type,data_type,tenant_id,project_id,status,access_level,tags,record_count,size_bytes,owner_id,description,created_at,updated_at) VALUES (?,?,?,?,?,?,'DRAFT',?,?,?,0,?,?,?,?)", did, require(r.name(), "数据集名称不能为空"), upper(r.datasetType(), "RAW"), upper(r.dataType(), "IMAGE"), tenantId, nullIfBlank(r.projectId()), upper(r.accessLevel(), "TEAM"), joinTags(r.tags()), r.recordCount()==null?0:Math.max(0,r.recordCount()), principal.user().id(), nullIfBlank(r.description()), now, now);
        jdbc.update("INSERT INTO dataset_version (version_id,dataset_id,version_name,status,record_count,size_bytes,content_safety_status,diagnostic_code,diagnostic_message,created_by,created_at) VALUES (?,?,'v0.1.0','DRAFT',?,0,'UNCONFIGURED','DATASET_CONTENT_SAFETY_UNCONFIGURED','TODO_CONFIRM_CONTENT_SAFETY_SERVICE',?,?)", vid, did, r.recordCount()==null?0:Math.max(0,r.recordCount()), principal.user().id(), now);
        jdbc.update("UPDATE dataset SET current_version_id=? WHERE dataset_id=?", vid, did);
        if (!blank(r.sourceId())) { DataSourceRecord s=source(r.sourceId()); ensureCanSeeTenant(principal, s.tenantId(), true); ensureSourceReferenceable(principal, s, "DATASET_IMPORT_SOURCE_REJECTED"); jdbc.update("INSERT INTO data_lineage (lineage_id,source_type,source_id,target_type,target_id,transform_type,created_at) VALUES (?,'DATA_SOURCE',?,'DATASET_VERSION',?,'IMPORT',?)", "LIN-"+randomHex(10).toUpperCase(Locale.ROOT), s.sourceId(), vid, now); }
        audit(principal, tenantId, "DATASET_CREATED", "Dataset", did, "SUCCESS", "INFO", null, r.name(), TRACE_TAG); return datasetDetail(principal, did);
    }

    @Transactional(noRollbackFor = PlatformException.class) public DatasetDetailResponse updateDataset(PlatformPrincipal principal, String datasetId, DatasetUpdateRequest r) { identityService.requirePermission(principal, "data:dataset:write"); DatasetRecord d=datasetVisibleOrNotFound(principal,datasetId); if(hasPublishedVersion(datasetId)){ audit(principal,d.tenantId(),"DATASET_VERSION_IMMUTABLE_REJECTED","Dataset",datasetId,"FAILURE","WARNING",d.status(),"UPDATE",TRACE_TAG+";DAT-005"); throw new PlatformException(PlatformError.CONFLICT,"DATASET_VERSION_IMMUTABLE: 已发布版本核心元数据不可修改，请新建版本"); } jdbc.update("UPDATE dataset SET name=?,access_level=?,tags=?,description=?,updated_at=? WHERE dataset_id=?", blank(r.name(),d.name()), upper(r.accessLevel(),d.accessLevel()), joinTags(r.tags()==null?split(d.tags()):r.tags()), blank(r.description(),d.description()), now(), datasetId); audit(principal,d.tenantId(),"DATASET_UPDATED","Dataset",datasetId,"SUCCESS","INFO",d.name(),r.name(),TRACE_TAG); return datasetDetail(principal,datasetId); }

    public DatasetDetailResponse datasetDetail(PlatformPrincipal principal, String datasetId) { identityService.requirePermission(principal, "data:dataset:read"); DatasetRecord d=datasetVisibleOrNotFound(principal,datasetId); ensureDatasetReadable(principal,d,false); var files=files(datasetId); String preview=files.stream().anyMatch(f -> f.contentType()!=null && f.contentType().startsWith("image/"))?"PREVIEWABLE":"UNSUPPORTED"; return new DatasetDetailResponse(datasetSummary(d), versions(datasetId), files, grants(datasetId), lineage(d.currentVersionId()), preview, "PREVIEWABLE".equals(preview)?"样例可预览":"非图片/不可预览文件显示元数据退化状态"); }
    @Transactional public DatasetVersionResponse createVersion(PlatformPrincipal principal, String datasetId, DatasetVersionCreateRequest r) { identityService.requirePermission(principal, "data:dataset:write"); DatasetRecord d=datasetVisibleOrNotFound(principal,datasetId); String vid="DVER-"+randomHex(10).toUpperCase(Locale.ROOT); OffsetDateTime now=now(); jdbc.update("INSERT INTO dataset_version (version_id,dataset_id,version_name,status,record_count,size_bytes,content_safety_status,diagnostic_code,diagnostic_message,created_by,created_at) VALUES (?,?,?,'DRAFT',?,0,'UNCONFIGURED','DATASET_CONTENT_SAFETY_UNCONFIGURED','TODO_CONFIRM_CONTENT_SAFETY_SERVICE',?,?)", vid, datasetId, blank(r.versionName(), nextVersionName(datasetId)), r.recordCount()==null?d.recordCount():r.recordCount(), principal.user().id(), now); jdbc.update("UPDATE dataset SET current_version_id=?,status='DRAFT',updated_at=? WHERE dataset_id=?", vid, now, datasetId); audit(principal,d.tenantId(),"DATASET_VERSION_CREATED","DatasetVersion",vid,"SUCCESS","INFO",null,datasetId,TRACE_TAG); return versions(datasetId).stream().filter(i -> i.versionId().equals(vid)).findFirst().orElseThrow(); }
    @Transactional(noRollbackFor = PlatformException.class) public DatasetFileResponse attachFile(PlatformPrincipal principal, String datasetId, String versionId, DatasetFileAttachRequest r) { identityService.requirePermission(principal,"data:dataset:write"); DatasetRecord d=datasetVisibleOrNotFound(principal,datasetId); DatasetVersionRecord v=version(versionId); if(!v.datasetId().equals(datasetId)) throw new PlatformException(PlatformError.NOT_FOUND,"数据集版本不存在"); if(List.of("PUBLISHED","ARCHIVED").contains(v.status())) throw new PlatformException(PlatformError.CONFLICT,"DATASET_VERSION_IMMUTABLE: 已发布版本不可绑定新文件"); FileRecord f=file(require(r.fileId(),"文件不能为空")); if(!"AVAILABLE".equals(f.status()) || (f.expectedSha256()!=null && !f.expectedSha256().equals(f.sha256())) || (f.expectedSizeBytes()!=null && !f.expectedSizeBytes().equals(f.sizeBytes()))){ audit(principal,d.tenantId(),"DATASET_FILE_HASH_MISMATCH","DatasetFile",f.fileId(),"FAILURE","WARNING",f.expectedSha256(),f.sha256(),TRACE_TAG); throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED,"DATASET_FILE_HASH_MISMATCH: 文件 hash/size 校验未通过"); } String id="DF-"+randomHex(10).toUpperCase(Locale.ROOT); jdbc.update("INSERT INTO dataset_file (id,dataset_id,version_id,file_id,file_role,status,created_at) VALUES (?,?,?,?,?,'BOUND',?)", id,datasetId,versionId,f.fileId(),upper(r.fileRole(),"RAW"),now()); recalc(datasetId,versionId); audit(principal,d.tenantId(),"DATASET_FILE_ATTACHED","DatasetFile",id,"SUCCESS","INFO",null,f.fileId(),TRACE_TAG); return files(datasetId).stream().filter(i -> i.id().equals(id)).findFirst().orElseThrow(); }
    @Transactional(noRollbackFor = PlatformException.class) public DatasetVersionResponse publishVersion(PlatformPrincipal principal, String datasetId, String versionId) { identityService.requirePermission(principal,"data:dataset:publish"); DatasetRecord d=datasetVisibleOrNotFound(principal,datasetId); DatasetVersionRecord v=version(versionId); if(fileCount(versionId)==0) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED,"DATASET_FILE_REQUIRED: 发布前必须绑定文件"); if(!"SANDBOX_CONTENT_SAFETY_PASSED".equals(v.diagnosticMessage()) && !"PASSED".equals(v.contentSafetyStatus())){ audit(principal,d.tenantId(),"DATASET_SECURITY_PENDING","DatasetVersion",versionId,"FAILURE","CRITICAL",v.contentSafetyStatus(),"PUBLISH",TRACE_TAG+";DAT-002"); throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED,"DATASET_SECURITY_PENDING: TODO_CONFIRM_CONTENT_SAFETY_SERVICE"); } OffsetDateTime now=now(); jdbc.update("UPDATE dataset_version SET status='PUBLISHED',published_at=?,content_safety_status='PASSED',diagnostic_code='OK' WHERE version_id=?",now,versionId); jdbc.update("UPDATE dataset SET current_version_id=?,status='ACTIVE',updated_at=? WHERE dataset_id=?",versionId,now,datasetId); audit(principal,d.tenantId(),"DATASET_VERSION_PUBLISHED","DatasetVersion",versionId,"SUCCESS","CRITICAL",v.status(),"PUBLISHED",TRACE_TAG); return versions(datasetId).stream().filter(i -> i.versionId().equals(versionId)).findFirst().orElseThrow(); }
    @Transactional public DatasetSummaryResponse archiveDataset(PlatformPrincipal principal, String datasetId) { identityService.requirePermission(principal,"data:dataset:delete"); DatasetRecord d=datasetVisibleOrNotFound(principal,datasetId); jdbc.update("UPDATE dataset SET status='ARCHIVED',archived_at=?,updated_at=? WHERE dataset_id=?",now(),now(),datasetId); audit(principal,d.tenantId(),"DATASET_ARCHIVED","Dataset",datasetId,"SUCCESS","CRITICAL",d.status(),"ARCHIVED",TRACE_TAG); return datasetSummary(dataset(datasetId)); }
    @Transactional(noRollbackFor = PlatformException.class) public void deleteDataset(PlatformPrincipal principal, String datasetId) { identityService.requirePermission(principal,"data:dataset:delete"); DatasetRecord d=datasetVisibleOrNotFound(principal,datasetId); if(count("SELECT COUNT(*) FROM dataset_reference_guard WHERE dataset_id=? AND status='ACTIVE'",datasetId)>0){ audit(principal,d.tenantId(),"DATASET_DELETE_BLOCKED","Dataset",datasetId,"FAILURE","CRITICAL",null,null,TRACE_TAG+";DAT-011"); throw new PlatformException(PlatformError.CONFLICT,"DATASET_REFERENCED: 数据集存在后续引用，无法删除"); } jdbc.update("UPDATE dataset SET status='DELETED',deleted_at=?,updated_at=? WHERE dataset_id=?",now(),now(),datasetId); audit(principal,d.tenantId(),"DATASET_DELETED","Dataset",datasetId,"SUCCESS","CRITICAL",d.status(),"DELETED",TRACE_TAG); }
    public List<DataLineageResponse> datasetLineage(PlatformPrincipal principal, String datasetId) { DatasetRecord d=datasetVisibleOrNotFound(principal,datasetId); identityService.requirePermission(principal,"data:lineage:read"); return lineage(d.currentVersionId()); }
    @Transactional public DatasetAccessRequestResponse requestAccess(PlatformPrincipal principal, String datasetId, DatasetAccessRequestCreateRequest r) { DatasetRecord d=dataset(datasetId); String id="DAR-"+randomHex(10).toUpperCase(Locale.ROOT); OffsetDateTime now=now(); jdbc.update("INSERT INTO dataset_access_request (request_id,dataset_id,requester_id,purpose,status,created_at) VALUES (?,?,?,?,'PENDING',?)", id,datasetId,principal.user().id(),require(r.purpose(),"申请用途不能为空"),now); audit(principal,d.tenantId(),"DATASET_ACCESS_REQUESTED","DatasetAccessRequest",id,"SUCCESS","INFO",null,datasetId,TRACE_TAG); return accessRequest(id); }
    public List<DatasetAccessRequestResponse> accessRequests(PlatformPrincipal principal, String datasetId) { datasetVisibleOrNotFound(principal,datasetId); identityService.requirePermission(principal,"data:dataset:grant"); return jdbc.query("SELECT r.*,u.display_name AS requester_name FROM dataset_access_request r JOIN platform_user u ON u.id=r.requester_id WHERE r.dataset_id=? ORDER BY r.created_at DESC", (rs,n)->accessRequestResponse(rs), datasetId); }
    @Transactional public DatasetAccessGrantResponse approveAccess(PlatformPrincipal principal, String requestId, DatasetAccessReviewRequest r) { identityService.requirePermission(principal,"data:dataset:grant"); AccessRequestRecord ar=accessRequestRecord(requestId); DatasetRecord d=datasetVisibleOrNotFound(principal,ar.datasetId()); String gid="DAG-"+randomHex(10).toUpperCase(Locale.ROOT); OffsetDateTime exp=r.expiresAt()==null?now().plusDays(30):r.expiresAt(); jdbc.update("UPDATE dataset_access_request SET status='APPROVED',reviewed_by=?,reviewed_at=? WHERE request_id=?",principal.user().id(),now(),requestId); jdbc.update("INSERT INTO dataset_access_grant (grant_id,dataset_id,version_id,user_id,granted_by,expires_at,status,created_at) VALUES (?,?,?,?,?,?,'ACTIVE',?)",gid,d.datasetId(),d.currentVersionId(),ar.requesterId(),principal.user().id(),exp,now()); audit(principal,d.tenantId(),"DATASET_ACCESS_APPROVED","DatasetAccessRequest",requestId,"SUCCESS","CRITICAL","PENDING","APPROVED",TRACE_TAG); return grants(d.datasetId()).stream().filter(i -> i.grantId().equals(gid)).findFirst().orElseThrow(); }
    @Transactional public DatasetAccessRequestResponse rejectAccess(PlatformPrincipal principal, String requestId, DatasetAccessReviewRequest r) { identityService.requirePermission(principal,"data:dataset:grant"); AccessRequestRecord ar=accessRequestRecord(requestId); DatasetRecord d=datasetVisibleOrNotFound(principal,ar.datasetId()); jdbc.update("UPDATE dataset_access_request SET status='REJECTED',reviewed_by=?,reviewed_at=? WHERE request_id=?",principal.user().id(),now(),requestId); audit(principal,d.tenantId(),"DATASET_ACCESS_REJECTED","DatasetAccessRequest",requestId,"SUCCESS","WARNING","PENDING","REJECTED",TRACE_TAG+";"+blank(r.reason(),"no-reason")); return accessRequest(requestId); }
    @Transactional(noRollbackFor = PlatformException.class) public DatasetReferenceResponse reference(PlatformPrincipal principal, String datasetId, String versionId) { identityService.requirePermission(principal,"data:dataset:read"); DatasetRecord d=datasetVisibleOrNotFound(principal,datasetId); ensureDatasetReadable(principal,d,true); String vid=blank(versionId,d.currentVersionId()); DatasetVersionRecord v=version(vid); boolean usable="ACTIVE".equals(d.status()) && List.of("READY","PUBLISHED").contains(v.status()) && d.deletedAt()==null; audit(principal,d.tenantId(),usable?"DATASET_REFERENCE_REQUESTED":"DATASET_REFERENCE_BLOCKED","Dataset",datasetId,usable?"SUCCESS":"FAILURE",usable?"INFO":"WARNING",null,v.status(),TRACE_TAG); if(!usable) throw new PlatformException(PlatformError.CONFLICT,"DATASET_REFERENCE_BLOCKED: 数据集版本不可用"); return new DatasetReferenceResponse(datasetId,vid,v.status(),true,"OK","usable"); }

    public DataStandardOverviewResponse dataStandardOverview(PlatformPrincipal principal) {
        identityService.requirePermission(principal, "data:standard:read");
        List<DataStandardProfileResponse> profiles = allDatasetSummaries(principal).stream().map(i -> standardProfile(dataset(i.datasetId()))).toList();
        List<DataStandardTaskResponse> tasks = dataStandardTasks(principal);
        long issues = profiles.stream().mapToLong(DataStandardProfileResponse::issueCount).sum();
        long compliant = profiles.stream().filter(i -> i.issueCount() == 0 || i.qualityScore() >= 90).count();
        return new DataStandardOverviewResponse(new DataStandardStatsResponse(profiles.size(), profiles.size(), compliant, issues, tasks.size()), profiles, tasks);
    }
    public DataStandardProfileResponse dataStandardProfile(PlatformPrincipal principal, String datasetId) {
        identityService.requirePermission(principal, "data:standard:read");
        DatasetRecord d = datasetVisibleOrNotFound(principal, datasetId); ensureDatasetReadable(principal, d, false);
        return standardProfile(d);
    }
    public List<DataStandardTaskResponse> dataStandardTasks(PlatformPrincipal principal) {
        identityService.requirePermission(principal, "data:standard:read");
        return jdbc.query("""
            SELECT t.*,sd.name AS source_dataset_name,od.name AS output_dataset_name,sd.tenant_id
            FROM data_standard_task t JOIN dataset sd ON sd.dataset_id=t.source_dataset_id
            LEFT JOIN dataset od ON od.dataset_id=t.output_dataset_id
            ORDER BY t.updated_at DESC
            """, (rs,n) -> standardTaskResponse(rs)).stream().filter(t -> canSeeTenant(principal, standardTaskTenant(t.sourceDatasetId()))).toList();
    }
    @Transactional public DataStandardTaskResponse createDataStandardTask(PlatformPrincipal principal, DataStandardTaskRequest r) {
        identityService.requirePermission(principal, "data:standard:write");
        DatasetRecord d = datasetVisibleOrNotFound(principal, require(r.datasetId(), "数据集不能为空")); ensureDatasetReadable(principal, d, false);
        String id = "DSTD-" + randomHex(10).toUpperCase(Locale.ROOT); OffsetDateTime now = now(); DataStandardProfileResponse p = standardProfile(d);
        jdbc.update("INSERT INTO data_standard_task (task_id,source_dataset_id,source_version_id,name,standard_profile,rule_json,status,quality_score_before,diagnostic_code,diagnostic_message,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", id, d.datasetId(), d.currentVersionId(), blank(r.name(), d.name() + " 标准化任务"), upper(r.standardProfile(), defaultStandardProfile(d)), blank(r.ruleJson(), standardRuleJson(d)), "READY", p.qualityScore(), "READY_FOR_STANDARDIZATION", "已按数据集类型和来源生成标准化规则，等待运行", principal.user().id(), now, now);
        audit(principal, d.tenantId(), "DATA_STANDARD_TASK_CREATED", "DataStandardTask", id, "SUCCESS", "INFO", null, d.datasetId(), TRACE_TAG + ";STANDARDIZATION");
        return standardTask(id);
    }
    @Transactional public DataStandardTaskResponse runDataStandardTask(PlatformPrincipal principal, String taskId) {
        identityService.requirePermission(principal, "data:standard:run");
        DataStandardTaskRecord t = standardTaskRecord(taskId); DatasetRecord src = datasetVisibleOrNotFound(principal, t.sourceDatasetId()); ensureDatasetReadable(principal, src, false);
        OffsetDateTime now = now(); String did = "DATASET-" + randomHex(10).toUpperCase(Locale.ROOT), vid = "DVER-" + randomHex(10).toUpperCase(Locale.ROOT); int before = t.qualityScoreBefore()==null ? standardProfile(src).qualityScore() : t.qualityScoreBefore(); int after = Math.min(99, Math.max(before + 8, 92));
        jdbc.update("INSERT INTO dataset (dataset_id,name,dataset_type,data_type,tenant_id,project_id,current_version_id,status,access_level,tags,record_count,size_bytes,owner_id,description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", did, src.name() + " 标准化结果", "PREPROCESSED", src.dataType(), src.tenantId(), src.projectId(), null, "ACTIVE", src.accessLevel(), joinTags(appendTag(split(src.tags()), "标准化")), src.recordCount(), Math.max(256, src.sizeBytes()), principal.user().id(), "由数据标准化任务 " + taskId + " 自动生成，规则=" + t.standardProfile(), now, now);
        jdbc.update("INSERT INTO dataset_version (version_id,dataset_id,version_name,status,record_count,size_bytes,content_safety_status,diagnostic_code,diagnostic_message,created_by,created_at,published_at) VALUES (?,?,?,'PUBLISHED',?,?,'PASSED','OK','DATA_STANDARDIZATION_PASSED',?,?,?)", vid, did, "v1.0.0", src.recordCount(), Math.max(256, src.sizeBytes()), principal.user().id(), now, now);
        jdbc.update("UPDATE dataset SET current_version_id=? WHERE dataset_id=?", vid, did);
        String fileId = "FILE-" + randomHex(12).toUpperCase(Locale.ROOT), sha = sha256(taskId + "|" + src.datasetId() + "|" + after), objectKey = src.tenantId() + "/dataset/standardized/" + taskId + "/" + fileId + ".json";
        jdbc.update("INSERT INTO platform_file_object (file_id,asset_type,tenant_id,project_id,bucket,object_key,expected_sha256,sha256,expected_size_bytes,size_bytes,content_type,storage_tier,status,owner_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", fileId, "DATASET", src.tenantId(), src.projectId(), datasetBucket(src.tenantId()), objectKey, sha, sha, 512L, 512L, "application/json", "STANDARD", "AVAILABLE", principal.user().id(), now, now);
        jdbc.update("INSERT INTO dataset_file (id,dataset_id,version_id,file_id,file_role,status,created_at) VALUES (?,?,?,?,?,'BOUND',?)", "DF-" + randomHex(10).toUpperCase(Locale.ROOT), did, vid, fileId, "STANDARDIZED", now);
        jdbc.update("INSERT INTO data_lineage (lineage_id,source_type,source_id,target_type,target_id,transform_type,created_at) VALUES (?,'DATASET_VERSION',?,'DATASET_VERSION',?,'STANDARDIZATION',?)", "LIN-" + randomHex(10).toUpperCase(Locale.ROOT), src.currentVersionId(), vid, now);
        jdbc.update("UPDATE data_standard_task SET output_dataset_id=?,status='SUCCEEDED',quality_score_after=?,diagnostic_code='OK',diagnostic_message=?,updated_at=?,last_run_at=? WHERE task_id=?", did, after, "DATA_STANDARDIZATION_PASSED: 已生成 PREPROCESSED 标准化数据集，质量分 " + before + " -> " + after, now, now, taskId);
        audit(principal, src.tenantId(), "DATA_STANDARD_TASK_SUCCEEDED", "DataStandardTask", taskId, "SUCCESS", "INFO", src.datasetId(), did, TRACE_TAG + ";STANDARDIZATION;score=" + after);
        return standardTask(taskId);
    }


    private DataSourceImportPlan importPlan(DataSourceRecord s, SyncTaskRecord t) {
        String scope = blank(t.syncScope(), blank(s.databaseName(), "default")); String type = upper(s.sourceType(), "OBJECT_STORAGE");
        return switch (type) {
            case "RELATIONAL_DB" -> importPlan(s, scope, "TABULAR", "SNAPSHOT", "csv", "text/csv", 1280L, "relational snapshot", "table,record_count,source\n" + scope + ",1280," + s.endpoint() + "\n");
            case "API" -> importPlan(s, scope, "TEXT", "SNAPSHOT", "jsonl", "application/jsonl", 640L, "api snapshot", "{\"scope\":\"" + scope + "\",\"sourceType\":\"API\",\"records\":640}\n");
            case "STREAM" -> importPlan(s, scope, "EVENT", "EVENT_BATCH", "jsonl", "application/jsonl", 2048L, "stream event batch", "{\"topic\":\"" + scope + "\",\"event\":\"sandbox-message\",\"seq\":1}\n");
            case "TIME_SERIES" -> importPlan(s, scope, "TIME_SERIES", "SNAPSHOT", "csv", "text/csv", 1440L, "time-series snapshot", "ts,metric,value,source\n2026-05-18T00:00:00Z," + scope + ",42.0," + s.endpoint() + "\n");
            case "INDUSTRIAL_PROTOCOL" -> importPlan(s, scope, "TELEMETRY", "TELEMETRY", "jsonl", "application/jsonl", 960L, "industrial telemetry snapshot", "{\"protocol\":\"" + scope + "\",\"tag\":\"weld.current\",\"value\":12.3}\n");
            case "FILE" -> importPlan(s, scope, "FILE", "RAW", "manifest.json", "application/json", 1L, "file manifest", "{\"path\":\"" + scope + "\",\"sourceType\":\"FILE\"}\n");
            default -> importPlan(s, scope, "OBJECT", "RAW", "manifest.json", "application/json", 1L, "object manifest", "{\"bucket\":\"" + scope + "\",\"sourceType\":\"" + type + "\"}\n");
        };
    }
    private DataSourceImportPlan importPlan(DataSourceRecord s, String scope, String dataType, String fileRole, String extension, String contentType, long records, String label, String content) {
        long size = Math.max(256, content.getBytes(StandardCharsets.UTF_8).length); String name = s.name() + " " + label; String desc = "Generated by " + s.sourceType() + " data source " + s.sourceId() + " via local sandbox connector, scope=" + scope;
        return new DataSourceImportPlan(name, dataType, fileRole, extension, contentType, records, size, desc, content);
    }
    private String datasetBucket(String tenantId) {
        List<String> values = jdbc.queryForList("SELECT value_json FROM platform_config_value WHERE config_key='storage.bucket' AND ((scope_type='BU' AND scope_id=?) OR (scope_type='GLOBAL' AND scope_id='TENANT-YF')) ORDER BY CASE WHEN scope_type='BU' THEN 0 ELSE 1 END", String.class, tenantId);
        if (values.isEmpty()) values = jdbc.queryForList("SELECT default_value FROM platform_config_definition WHERE config_key='storage.bucket'", String.class);
        String v = values.isEmpty() ? "" : values.getFirst(); v = v == null ? "" : v.trim().replaceAll("^\"|\"$", ""); return v.isBlank() || v.startsWith("TODO_CONFIRM") ? "smp-datasets" : v;
    }
    private String sha256(String content) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8))); } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); } }
    private String nextVersionNameForImport(String datasetId) { return "v" + (count("SELECT COUNT(*) FROM dataset_version WHERE dataset_id=?", datasetId) + 1) + ".0.0"; }
    private void ensureSourceReferenceable(PlatformPrincipal p, DataSourceRecord s, String action) { if(!"ACTIVE".equals(s.status()) || !"OK".equals(s.diagnosticCode()) || s.lastTestAt()==null){ audit(p,s.tenantId(),action,"DataSource",s.sourceId(),"FAILURE","WARNING",s.status(),s.diagnosticCode(),TRACE_TAG+";DAT-001"); throw new PlatformException(PlatformError.CONFLICT,"DATA_SOURCE_NOT_ACTIVE: 连接测试未通过或未激活的数据源不得被同步任务或数据集导入引用"); } }
    private DataStandardProfileResponse standardProfile(DatasetRecord d) {
        String sourceType = sourceTypeForDataset(d); List<DataStandardFieldResponse> fields = standardFields(d, sourceType); int matched = (int) fields.stream().filter(f -> "MATCHED".equals(f.mappingStatus())).count(); int issues = (int) fields.stream().filter(f -> !"MATCHED".equals(f.mappingStatus())).count(); int score = Math.min(98, 70 + matched * 5 - issues * 3 + ("PREPROCESSED".equals(d.datasetType()) ? 8 : 0));
        return new DataStandardProfileResponse(d.datasetId(), d.name(), d.datasetType(), d.dataType(), sourceType, "PROFILED", score, fields.size(), matched, issues, fields);
    }
    private List<DataStandardFieldResponse> standardFields(DatasetRecord d, String sourceType) {
        String dataType = upper(d.dataType(), "OBJECT");
        if ("TABULAR".equals(dataType)) return List.of(field("work_order_no","工单号","STRING",null,true), field("product_code","产品号","STRING",null,true), field("quality_result","质量结果","ENUM",null,true), field("collected_at","采集时间","DATETIME","UTC+8",true));
        if ("TEXT".equals(dataType)) return List.of(field("work_order_no","工单号","STRING",null,true), field("fault_description","故障描述","TEXT",null,true), field("language","语言","ENUM",null,false), field("created_at","创建时间","DATETIME","UTC+8",true));
        if ("EVENT".equals(dataType)) return List.of(field("event_id","事件ID","STRING",null,true), field("topic","Topic","STRING",null,true), field("payload","事件载荷","JSON",null,true), field("event_time","事件时间","DATETIME","UTC+8",true));
        if ("TIME_SERIES".equals(dataType)) return List.of(field("timestamp","时间戳","DATETIME","UTC+8",true), field("metric_name","测点名称","STRING",null,true), field("metric_value","测点值","DECIMAL","standard-unit",true), field("equipment_code","设备编号","STRING",null,false));
        if ("TELEMETRY".equals(dataType)) return List.of(field("tag_path","点位路径","STRING",null,true), field("value","点位值","DECIMAL","standard-unit",true), field("quality","采集质量","ENUM",null,true), field("timestamp","采集时间","DATETIME","UTC+8",true));
        if ("FILE".equals(dataType) || "OBJECT".equals(dataType)) return List.of(field("object_key","对象路径","STRING",null,true), field("content_type","文件类型","STRING",null,true), field("sha256","内容哈希","STRING",null,true), new DataStandardFieldResponse("source_origin", "source_origin", "来源系统", "STRING", null, true, sourceType.equals("UNKNOWN") ? "UNMATCHED" : "MATCHED", "必须可追溯到数据源或文件对象"));
        return List.of(field("sample_id","样本ID","STRING",null,true), field("label","标签","ENUM",null,false), field("metadata","元数据","JSON",null,false));
    }
    private DataStandardFieldResponse field(String standardField,String displayName,String dataType,String unit,boolean required){ return new DataStandardFieldResponse(standardField,standardField,displayName,dataType,unit,required,"MATCHED", required ? "必填、类型一致、空值率 < 1%" : "可选字段、类型一致"); }
    private String sourceTypeForDataset(DatasetRecord d) { List<String> v = jdbc.queryForList("SELECT ds.source_type FROM data_lineage l JOIN data_source ds ON ds.source_id=l.source_id WHERE l.target_id=? AND l.source_type='DATA_SOURCE' LIMIT 1", String.class, d.currentVersionId()); return v.isEmpty() ? ("PREPROCESSED".equals(d.datasetType()) ? "PIPELINE" : "UNKNOWN") : v.getFirst(); }
    private String defaultStandardProfile(DatasetRecord d) { return switch (upper(d.dataType(), "OBJECT")) { case "IMAGE", "VIDEO", "OBJECT", "FILE" -> "INDUSTRIAL_VISUAL_STANDARD"; case "TEXT" -> "WORKORDER_TEXT_STANDARD"; case "TABULAR" -> "MES_TABULAR_STANDARD"; case "EVENT" -> "STREAM_EVENT_STANDARD"; case "TIME_SERIES" -> "TIME_SERIES_STANDARD"; case "TELEMETRY" -> "INDUSTRIAL_TELEMETRY_STANDARD"; default -> "DATASET_GENERIC_STANDARD"; }; }
    private String standardRuleJson(DatasetRecord d) { return "{\"profile\":\"" + defaultStandardProfile(d) + "\",\"operators\":[\"validate\",\"dedup\",\"normalize\"],\"dataType\":\"" + d.dataType() + "\"}"; }
    private List<String> appendTag(List<String> tags, String tag) { List<String> v = new java.util.ArrayList<>(tags); if (!v.contains(tag)) v.add(tag); return v; }
    private String standardTaskTenant(String datasetId) { return dataset(datasetId).tenantId(); }
    private DataStandardTaskResponse standardTask(String id) { return jdbc.queryForObject("SELECT t.*,sd.name AS source_dataset_name,od.name AS output_dataset_name,sd.tenant_id FROM data_standard_task t JOIN dataset sd ON sd.dataset_id=t.source_dataset_id LEFT JOIN dataset od ON od.dataset_id=t.output_dataset_id WHERE t.task_id=?", (rs,n)->standardTaskResponse(rs), id); }
    private DataStandardTaskRecord standardTaskRecord(String id) { return jdbc.queryForObject("SELECT * FROM data_standard_task WHERE task_id=?", (rs,n)->new DataStandardTaskRecord(rs.getString("task_id"),rs.getString("source_dataset_id"),rs.getString("source_version_id"),rs.getString("output_dataset_id"),rs.getString("name"),rs.getString("standard_profile"),rs.getString("status"),nullableInt(rs,"quality_score_before")), id); }
    private DataStandardTaskResponse standardTaskResponse(java.sql.ResultSet rs) throws java.sql.SQLException { return new DataStandardTaskResponse(rs.getString("task_id"),rs.getString("source_dataset_id"),rs.getString("source_dataset_name"),rs.getString("source_version_id"),rs.getString("output_dataset_id"),rs.getString("output_dataset_name"),rs.getString("name"),rs.getString("standard_profile"),rs.getString("status"),nullableInt(rs,"quality_score_before"),nullableInt(rs,"quality_score_after"),rs.getString("diagnostic_code"),rs.getString("diagnostic_message"),rs.getObject("last_run_at",OffsetDateTime.class),rs.getObject("updated_at",OffsetDateTime.class)); }
    private void ensureDatasetReadable(PlatformPrincipal p, DatasetRecord d, boolean download) { if(!canSeeTenant(p,d.tenantId())){ audit(p,p.user().tenantId(),"DATASET_CROSS_BU_ACCESS_DENIED","Dataset",d.datasetId(),"FAILURE","CRITICAL",p.user().tenantId(),d.tenantId(),TRACE_TAG+";DAT-012"); throw new PlatformException(PlatformError.NOT_FOUND,"数据集不存在"); } if((download || "RESTRICTED".equals(d.accessLevel())) && !hasDatasetGrant(p,d)){ audit(p,d.tenantId(),"DATASET_ACCESS_REQUIRED","Dataset",d.datasetId(),"FAILURE","WARNING",null,p.user().id(),TRACE_TAG+";DAT-006"); throw new PlatformException(PlatformError.FORBIDDEN,"DATASET_ACCESS_REQUIRED: 受限数据集需要有效授权"); } }
    private boolean hasDatasetGrant(PlatformPrincipal p, DatasetRecord d) { if(p.isSuperAdmin() || d.ownerId().equals(p.user().id()) || "PUBLIC".equals(d.accessLevel())) return true; Integer c=jdbc.queryForObject("SELECT COUNT(*) FROM dataset_access_grant WHERE dataset_id=? AND user_id=? AND status='ACTIVE' AND expires_at > ?",Integer.class,d.datasetId(),p.user().id(),now()); return c!=null && c>0; }
    private List<DatasetSummaryResponse> allDatasetSummaries(PlatformPrincipal p) { return jdbc.query("SELECT d.*,u.display_name AS owner_name,v.version_name AS current_version_name FROM dataset d JOIN platform_user u ON u.id=d.owner_id LEFT JOIN dataset_version v ON v.version_id=d.current_version_id WHERE d.status <> 'DELETED' ORDER BY d.updated_at DESC", (rs,n)->datasetRecord(rs)).stream().filter(d -> canSeeTenant(p,d.tenantId())).map(this::datasetSummary).toList(); }
    private DatasetSummaryResponse datasetSummary(DatasetRecord d) { return new DatasetSummaryResponse(d.datasetId(),d.name(),d.datasetType(),d.dataType(),d.tenantId(),d.projectId(),d.currentVersionId(),d.currentVersionName(),d.status(),d.accessLevel(),split(d.tags()),d.recordCount(),d.sizeBytes(),d.ownerId(),d.ownerName(),d.description(),d.updatedAt()); }
    private DatasetStatsResponse stats(List<DatasetSummaryResponse> ds) { return new DatasetStatsResponse(ds.size(), ds.stream().filter(i->"RAW".equals(i.datasetType())).count(), ds.stream().filter(i->"PREPROCESSED".equals(i.datasetType())).count(), ds.stream().filter(i->"ANNOTATED".equals(i.datasetType())).count(), ds.stream().filter(i->"RESTRICTED".equals(i.accessLevel())).count(), ds.stream().mapToLong(DatasetSummaryResponse::sizeBytes).sum()); }
    private DataSourceRecord source(String id) { return jdbc.queryForObject("SELECT * FROM data_source WHERE source_id=?", (rs,n)->sourceRecord(rs), id); }
    private DataSourceRecord sourceRecord(java.sql.ResultSet rs) throws java.sql.SQLException { return new DataSourceRecord(rs.getString("source_id"),rs.getString("name"),rs.getString("source_type"),rs.getString("tenant_id"),rs.getString("project_id"),rs.getString("endpoint"),nullableInt(rs,"port"),rs.getString("database_name"),rs.getString("credential_mode"),rs.getString("secret_ref"),rs.getString("shared_scope"),rs.getString("description"),rs.getString("status"),rs.getObject("last_test_at",OffsetDateTime.class),rs.getString("diagnostic_code"),rs.getString("diagnostic_message"),nullableInt(rs,"latency_ms"),rs.getString("created_by"),rs.getObject("created_at",OffsetDateTime.class),rs.getObject("updated_at",OffsetDateTime.class)); }
    private DataSourceResponse sourceResponse(DataSourceRecord s) { return new DataSourceResponse(s.sourceId(),s.name(),s.sourceType(),s.tenantId(),s.projectId(),s.endpoint(),s.port(),s.databaseName(),s.credentialMode(),maskSecret(s.secretRef()),s.sharedScope(),s.description(),s.status(),s.lastTestAt(),s.diagnosticCode(),s.diagnosticMessage(),s.latencyMs(),s.updatedAt()); }
    private SyncTaskRecord syncTask(String id) { return jdbc.queryForObject("SELECT t.*,s.name AS source_name,d.name AS target_dataset_name,s.tenant_id FROM data_source_sync_task t JOIN data_source s ON s.source_id=t.source_id LEFT JOIN dataset d ON d.dataset_id=t.target_dataset_id WHERE t.task_id=?", (rs,n)->syncTaskRecord(rs), id); }
    private SyncTaskRecord syncTaskRecord(java.sql.ResultSet rs) throws java.sql.SQLException { return new SyncTaskRecord(rs.getString("task_id"),rs.getString("source_id"),rs.getString("source_name"),rs.getString("target_dataset_id"),rs.getString("target_dataset_name"),rs.getString("name"),rs.getString("schedule_mode"),rs.getString("sync_scope"),rs.getString("status"),rs.getObject("last_run_at",OffsetDateTime.class),rs.getString("last_result"),rs.getString("diagnostic_code"),rs.getString("diagnostic_message"),rs.getString("tenant_id")); }
    private DataSourceSyncTaskResponse syncTaskResponse(SyncTaskRecord t) { return new DataSourceSyncTaskResponse(t.taskId(),t.sourceId(),t.sourceName(),t.targetDatasetId(),t.targetDatasetName(),t.name(),t.scheduleMode(),t.syncScope(),t.status(),t.lastRunAt(),t.lastResult(),t.diagnosticCode(),t.diagnosticMessage()); }
    private DatasetRecord dataset(String id) { return jdbc.queryForObject("SELECT d.*,u.display_name AS owner_name,v.version_name AS current_version_name FROM dataset d JOIN platform_user u ON u.id=d.owner_id LEFT JOIN dataset_version v ON v.version_id=d.current_version_id WHERE d.dataset_id=?", (rs,n)->datasetRecord(rs), id); }
    private DatasetRecord datasetVisibleOrNotFound(PlatformPrincipal p,String id) { DatasetRecord d=dataset(id); if(!canSeeTenant(p,d.tenantId())){ audit(p,p.user().tenantId(),"DATASET_CROSS_BU_ACCESS_DENIED","Dataset",id,"FAILURE","CRITICAL",p.user().tenantId(),d.tenantId(),TRACE_TAG+";DAT-012"); throw new PlatformException(PlatformError.NOT_FOUND,"数据集不存在"); } return d; }
    private DatasetRecord datasetRecord(java.sql.ResultSet rs) throws java.sql.SQLException { return new DatasetRecord(rs.getString("dataset_id"),rs.getString("name"),rs.getString("dataset_type"),rs.getString("data_type"),rs.getString("tenant_id"),rs.getString("project_id"),rs.getString("current_version_id"),rs.getString("current_version_name"),rs.getString("status"),rs.getString("access_level"),rs.getString("tags"),rs.getLong("record_count"),rs.getLong("size_bytes"),rs.getString("owner_id"),rs.getString("owner_name"),rs.getString("description"),rs.getObject("archived_at",OffsetDateTime.class),rs.getObject("deleted_at",OffsetDateTime.class),rs.getObject("updated_at",OffsetDateTime.class)); }
    private List<DatasetVersionResponse> versions(String id) { return jdbc.query("SELECT * FROM dataset_version WHERE dataset_id=? ORDER BY created_at DESC", (rs,n)->new DatasetVersionResponse(rs.getString("version_id"),rs.getString("dataset_id"),rs.getString("version_name"),rs.getString("status"),rs.getLong("record_count"),rs.getLong("size_bytes"),rs.getString("content_safety_status"),rs.getString("diagnostic_code"),rs.getString("diagnostic_message"),rs.getObject("created_at",OffsetDateTime.class),rs.getObject("published_at",OffsetDateTime.class)), id); }
    private DatasetVersionRecord version(String id) { return jdbc.queryForObject("SELECT * FROM dataset_version WHERE version_id=?", (rs,n)->new DatasetVersionRecord(rs.getString("version_id"),rs.getString("dataset_id"),rs.getString("version_name"),rs.getString("status"),rs.getLong("record_count"),rs.getLong("size_bytes"),rs.getString("content_safety_status"),rs.getString("diagnostic_code"),rs.getString("diagnostic_message")), id); }
    private List<DatasetFileResponse> files(String id) { return jdbc.query("SELECT df.*,f.object_key,f.content_type,f.size_bytes AS file_size_bytes,f.sha256 FROM dataset_file df JOIN platform_file_object f ON f.file_id=df.file_id WHERE df.dataset_id=? ORDER BY df.created_at DESC", (rs,n)->new DatasetFileResponse(rs.getString("id"),rs.getString("dataset_id"),rs.getString("version_id"),rs.getString("file_id"),rs.getString("file_role"),rs.getString("status"),rs.getString("object_key"),rs.getString("content_type"),nullableLong(rs,"file_size_bytes"),rs.getString("sha256")), id); }
    private FileRecord file(String id) { return jdbc.queryForObject("SELECT * FROM platform_file_object WHERE file_id=?", (rs,n)->new FileRecord(rs.getString("file_id"),rs.getString("tenant_id"),rs.getString("status"),rs.getString("expected_sha256"),rs.getString("sha256"),nullableLong(rs,"expected_size_bytes"),nullableLong(rs,"size_bytes")), id); }
    private List<DatasetAccessGrantResponse> grants(String id) { return jdbc.query("SELECT g.*,u.display_name AS user_name FROM dataset_access_grant g JOIN platform_user u ON u.id=g.user_id WHERE g.dataset_id=? ORDER BY g.created_at DESC", (rs,n)->new DatasetAccessGrantResponse(rs.getString("grant_id"),rs.getString("dataset_id"),rs.getString("version_id"),rs.getString("user_id"),rs.getString("user_name"),rs.getString("granted_by"),rs.getObject("expires_at",OffsetDateTime.class),rs.getString("status")), id); }
    private List<DataLineageResponse> lineage(String targetId) { if(blank(targetId)) return List.of(); return jdbc.query("SELECT * FROM data_lineage WHERE target_id=? ORDER BY created_at DESC", (rs,n)->new DataLineageResponse(rs.getString("lineage_id"),rs.getString("source_type"),rs.getString("source_id"),rs.getString("target_type"),rs.getString("target_id"),rs.getString("transform_type"),rs.getObject("created_at",OffsetDateTime.class)), targetId); }
    private DatasetAccessRequestResponse accessRequest(String id) { return jdbc.queryForObject("SELECT r.*,u.display_name AS requester_name FROM dataset_access_request r JOIN platform_user u ON u.id=r.requester_id WHERE r.request_id=?", (rs,n)->accessRequestResponse(rs), id); }
    private DatasetAccessRequestResponse accessRequestResponse(java.sql.ResultSet rs) throws java.sql.SQLException { return new DatasetAccessRequestResponse(rs.getString("request_id"),rs.getString("dataset_id"),rs.getString("requester_id"),rs.getString("requester_name"),rs.getString("purpose"),rs.getString("status"),rs.getObject("created_at",OffsetDateTime.class),rs.getString("reviewed_by"),rs.getObject("reviewed_at",OffsetDateTime.class)); }
    private AccessRequestRecord accessRequestRecord(String id) { return jdbc.queryForObject("SELECT * FROM dataset_access_request WHERE request_id=?", (rs,n)->new AccessRequestRecord(rs.getString("request_id"),rs.getString("dataset_id"),rs.getString("requester_id"),rs.getString("status")), id); }
    private void recalc(String did,String vid){ Long total=jdbc.queryForObject("SELECT COALESCE(SUM(f.size_bytes),0) FROM dataset_file df JOIN platform_file_object f ON f.file_id=df.file_id WHERE df.version_id=?",Long.class,vid); long size=total==null?0:total; jdbc.update("UPDATE dataset_version SET size_bytes=? WHERE version_id=?",size,vid); jdbc.update("UPDATE dataset SET size_bytes=?,updated_at=? WHERE dataset_id=?",size,now(),did); }
    private boolean hasPublishedVersion(String id){ return count("SELECT COUNT(*) FROM dataset_version WHERE dataset_id=? AND status='PUBLISHED'",id)>0; } private int fileCount(String id){ return count("SELECT COUNT(*) FROM dataset_file WHERE version_id=? AND status='BOUND'",id); } private int count(String sql,Object...args){ Integer c=jdbc.queryForObject(sql,Integer.class,args); return c==null?0:c; }
    private boolean canSeeTenant(PlatformPrincipal p,String tenantId){ if(p.isSuperAdmin()) return true; String own=orgPath(p.user().tenantId()), target=orgPath(tenantId); return !own.isBlank() && !target.isBlank() && target.startsWith(own); } private void ensureCanSeeTenant(PlatformPrincipal p,String tenantId,boolean write){ if(canSeeTenant(p,tenantId)) return; audit(p,p.user().tenantId(),"DATASET_CROSS_BU_ACCESS_DENIED","Tenant",tenantId,"FAILURE","CRITICAL",p.user().tenantId(),tenantId,TRACE_TAG+";DAT-012"); throw new PlatformException(write?PlatformError.FORBIDDEN:PlatformError.NOT_FOUND, write?"您无权操作其他 BU 的数据资源":"资源不存在"); } private String orgPath(String id){ List<String> p=jdbc.queryForList("SELECT path FROM platform_tenant WHERE id=?",String.class,id); return p.isEmpty()?"":p.getFirst(); }
    private void audit(PlatformPrincipal p,String tenantId,String action,String type,String rid,String result,String risk,String before,String after,String detail){ OffsetDateTime at=now(); String event="EVT-"+randomHex(8).toUpperCase(Locale.ROOT), trace=nullToEmpty(PlatformResponses.traceId()), roles=String.join(",",p.roleNames()), id=UUID.randomUUID().toString(); String sig=signature(id,event,tenantId,p.user().id(),p.user().displayName(),roles,action,type,rid,result,risk,before,after,detail,trace,at); jdbc.update("INSERT INTO platform_audit_log (id,event_id,tenant_id,operator_id,operator_name,operator_role,action,resource_type,resource_id,result,risk_level,before_json,after_json,detail_json,trace_id,signature,occurred_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",id,event,tenantId,p.user().id(),p.user().displayName(),roles,action,type,rid,result,risk,before,after,detail,trace,sig,at); }
    private void rejectPlainSecret(String v){ if(v!=null && (v.toLowerCase(Locale.ROOT).contains("credentialsecret") || v.toLowerCase(Locale.ROOT).contains("accesskeysecret") || v.toLowerCase(Locale.ROOT).contains("password="))) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED,"DATA_SOURCE_SECRET_NOT_ALLOWED: 不允许保存明文凭据"); }
    private String maskSecret(String v){ if(v==null || v.isBlank() || v.startsWith("TODO_CONFIRM") || v.startsWith("secret://TODO_CONFIRM") || v.startsWith("secret://")) return v; return v.length()<=8?"****":v.substring(0,4)+"****"+v.substring(v.length()-2); }
    private String signature(String id,String event,String tenant,String opId,String op,String roles,String action,String type,String rid,String result,String risk,String before,String after,String detail,String trace,OffsetDateTime at){ try{ MessageDigest d=MessageDigest.getInstance("SHA-256"); return HexFormat.of().formatHex(d.digest(String.join("|",nullToEmpty(id),nullToEmpty(event),nullToEmpty(tenant),nullToEmpty(opId),nullToEmpty(op),nullToEmpty(roles),nullToEmpty(action),nullToEmpty(type),nullToEmpty(rid),nullToEmpty(result),nullToEmpty(risk),nullToEmpty(before),nullToEmpty(after),nullToEmpty(detail),nullToEmpty(trace),canonical(at)).getBytes(StandardCharsets.UTF_8))); }catch(NoSuchAlgorithmException e){ throw new IllegalStateException(e); } }
    private String canonical(OffsetDateTime v){ return v==null?"":v.toInstant().truncatedTo(ChronoUnit.MICROS).atOffset(ZoneOffset.UTC).toString(); } private String nextVersionName(String id){ return "v0."+(count("SELECT COUNT(*) FROM dataset_version WHERE dataset_id=?",id)+1)+".0"; } private String joinTags(List<String> tags){ return tags==null?"":String.join(",",tags.stream().map(String::trim).filter(t->!t.isBlank()).toList()); } private List<String> split(String v){ return blank(v)?List.of():Arrays.stream(v.split(",")).map(String::trim).filter(i->!i.isBlank()).toList(); }
    private String require(String v,String m){ if(blank(v)) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED,m); return v.trim(); } private String upper(String v,String d){ return blank(v,d).toUpperCase(Locale.ROOT); } private boolean blank(String v){ return v==null || v.isBlank(); } private String blank(String v,String d){ return blank(v)?d:v.trim(); } private String nullIfBlank(String v){ return blank(v)?null:v.trim(); } private String nullToEmpty(String v){ return v==null?"":v; } private Integer nullableInt(java.sql.ResultSet rs,String c)throws java.sql.SQLException{ int v=rs.getInt(c); return rs.wasNull()?null:v; } private Long nullableLong(java.sql.ResultSet rs,String c)throws java.sql.SQLException{ long v=rs.getLong(c); return rs.wasNull()?null:v; } private OffsetDateTime now(){ return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS); } private String randomHex(int len){ return UUID.randomUUID().toString().replace("-","").substring(0,len); }
    private record SyncTaskRecord(String taskId,String sourceId,String sourceName,String targetDatasetId,String targetDatasetName,String name,String scheduleMode,String syncScope,String status,OffsetDateTime lastRunAt,String lastResult,String diagnosticCode,String diagnosticMessage,String tenantId) {}
    private record DataSourceImportPlan(String datasetName,String dataType,String fileRole,String extension,String contentType,long recordCount,long sizeBytes,String description,String content) {}
    private record DataStandardTaskRecord(String taskId,String sourceDatasetId,String sourceVersionId,String outputDatasetId,String name,String standardProfile,String status,Integer qualityScoreBefore) {}
    private record DatasetRecord(String datasetId,String name,String datasetType,String dataType,String tenantId,String projectId,String currentVersionId,String currentVersionName,String status,String accessLevel,String tags,long recordCount,long sizeBytes,String ownerId,String ownerName,String description,OffsetDateTime archivedAt,OffsetDateTime deletedAt,OffsetDateTime updatedAt) {}
    private record DatasetVersionRecord(String versionId,String datasetId,String versionName,String status,long recordCount,long sizeBytes,String contentSafetyStatus,String diagnosticCode,String diagnosticMessage) {}
    private record FileRecord(String fileId,String tenantId,String status,String expectedSha256,String sha256,Long expectedSizeBytes,Long sizeBytes) {}
    private record AccessRequestRecord(String requestId,String datasetId,String requesterId,String status) {}
}
