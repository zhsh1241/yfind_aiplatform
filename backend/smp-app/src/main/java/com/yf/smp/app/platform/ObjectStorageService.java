package com.yf.smp.app.platform;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.http.Method;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class ObjectStorageService {
    private final JdbcTemplate jdbc;
    private final ObjectProvider<MinioClient> minioClientProvider;
    private final String storageEndpointOverride;
    private final String publicStorageEndpointOverride;
    private final int presignedExpirySeconds;

    ObjectStorageService(
        JdbcTemplate jdbc,
        ObjectProvider<MinioClient> minioClientProvider,
        @Value("${smp.storage.endpoint:}") String storageEndpointOverride,
        @Value("${smp.storage.public-endpoint:}") String publicStorageEndpointOverride,
        @Value("${smp.storage.presigned-expiry-seconds:900}") int presignedExpirySeconds
    ) {
        this.jdbc = jdbc;
        this.minioClientProvider = minioClientProvider;
        this.storageEndpointOverride = storageEndpointOverride;
        this.publicStorageEndpointOverride = publicStorageEndpointOverride;
        this.presignedExpirySeconds = Math.max(60, Math.min(presignedExpirySeconds, 3600));
    }

    String datasetBucket(String tenantId) {
        List<String> values = jdbc.queryForList(
            "SELECT value_json FROM platform_config_value WHERE config_key='storage.bucket' AND ((scope_type='BU' AND scope_id=?) OR (scope_type='GLOBAL' AND scope_id='TENANT-YF')) ORDER BY CASE WHEN scope_type='BU' THEN 0 ELSE 1 END",
            String.class,
            tenantId
        );
        if (values.isEmpty()) {
            values = jdbc.queryForList("SELECT default_value FROM platform_config_definition WHERE config_key='storage.bucket'", String.class);
        }
        String bucket = values.isEmpty() ? "" : sanitize(values.getFirst());
        return bucket.isBlank() || bucket.startsWith("TODO_CONFIRM") ? "smp-datasets" : bucket;
    }

    String objectKey(String tenantId, String domain, String... parts) {
        StringBuilder key = new StringBuilder(storagePrefix(tenantId));
        appendPathSegment(key, domain);
        for (String part : parts) {
            appendPathSegment(key, part);
        }
        return key.toString();
    }

    String presignedDownloadUrl(String bucket, String objectKey, String downloadFilename) {
        return presignedDownloadUrl(bucket, objectKey, downloadFilename, presignedExpirySeconds);
    }

    String presignedDownloadUrl(String bucket, String objectKey, String downloadFilename, int expirySeconds) {
        MinioClient client = minioClientProvider.getIfAvailable();
        if (client == null) {
            return null;
        }
        int normalizedExpiry = Math.max(60, Math.min(expirySeconds, 3600));
        try {
            String signedUrl = client.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucket)
                    .object(objectKey)
                    .expiry(normalizedExpiry)
                    .extraQueryParams(downloadFilename == null || downloadFilename.isBlank() ? Map.of() : Map.of("response-content-disposition", "attachment; filename=\"" + safeDownloadFilename(downloadFilename) + "\""))
                    .build()
            );
            return rewriteToPublicEndpoint(signedUrl);
        } catch (Exception exception) {
            return null;
        }
    }

    void uploadObjectIfConfigured(String bucket, String objectKey, byte[] content, String contentType) {
        if (content == null) {
            return;
        }
        writeLocalObject(bucket, objectKey, content);
        MinioClient client = minioClientProvider.getIfAvailable();
        if (client == null) {
            return;
        }
        try {
            ensureBucket(client, bucket);
            client.putObject(
                PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .stream(new ByteArrayInputStream(content), content.length, -1)
                    .contentType(contentType)
                    .build()
            );
        } catch (Exception exception) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "MinIO 文件上传失败: " + exception.getMessage());
        }
    }

    String downloadDiagnostic() {
        if (minioClientProvider.getIfAvailable() != null) {
            return "PRESIGNED_URL_READY";
        }
        String endpoint = storageEndpoint();
        return endpoint.isBlank() || endpoint.startsWith("TODO_CONFIRM") ? "TODO_CONFIRM_MINIO_ENDPOINT" : "AUTHENTICATED_CONTENT_ENDPOINT_READY";
    }

    byte[] readObject(String bucket, String objectKey) {
        MinioClient client = minioClientProvider.getIfAvailable();
        if (client == null) {
            return readLocalObject(bucket, objectKey, "MinIO 未配置");
        }
        try (InputStream stream = client.getObject(GetObjectArgs.builder().bucket(bucket).object(objectKey).build());
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            stream.transferTo(output);
            return output.toByteArray();
        } catch (Exception exception) {
            return readLocalObject(bucket, objectKey, "MinIO 文件读取失败: " + exception.getMessage());
        }
    }

    void assertObjectExistsIfConfigured(String bucket, String objectKey) {
        MinioClient client = minioClientProvider.getIfAvailable();
        if (client == null) {
            return;
        }
        try {
            client.statObject(StatObjectArgs.builder().bucket(bucket).object(objectKey).build());
        } catch (Exception exception) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "MinIO 文件不存在或无法访问: " + exception.getMessage());
        }
    }

    private String storageEndpoint() {
        if (storageEndpointOverride != null && !storageEndpointOverride.isBlank()) {
            return storageEndpointOverride.trim();
        }
        List<String> values = jdbc.queryForList(
            "SELECT value_json FROM platform_config_value WHERE config_key='storage.endpoint' AND scope_type='GLOBAL' AND scope_id='TENANT-YF'",
            String.class
        );
        if (values.isEmpty()) {
            values = jdbc.queryForList("SELECT default_value FROM platform_config_definition WHERE config_key='storage.endpoint'", String.class);
        }
        return values.isEmpty() ? "" : sanitize(values.getFirst());
    }

    private String publicStorageEndpoint() {
        if (publicStorageEndpointOverride != null && !publicStorageEndpointOverride.isBlank()) {
            return publicStorageEndpointOverride.trim();
        }
        List<String> values = jdbc.queryForList(
            "SELECT value_json FROM platform_config_value WHERE config_key='storage.public-endpoint' AND scope_type='GLOBAL' AND scope_id='TENANT-YF'",
            String.class
        );
        if (!values.isEmpty()) {
            String configured = sanitize(values.getFirst());
            if (!configured.isBlank() && !configured.startsWith("TODO_CONFIRM")) {
                return configured;
            }
        }
        return "";
    }


    private String storagePrefix(String tenantId) {
        List<String> values = jdbc.queryForList(
            "SELECT value_json FROM platform_config_value WHERE config_key='storage.prefix' AND ((scope_type='BU' AND scope_id=?) OR (scope_type='GLOBAL' AND scope_id='TENANT-YF')) ORDER BY CASE WHEN scope_type='BU' THEN 0 ELSE 1 END",
            String.class,
            tenantId
        );
        String configured = values.isEmpty() ? "" : sanitize(values.getFirst());
        String prefix = configured.isBlank() || configured.startsWith("TODO_CONFIRM") ? tenantId : configured;
        return normalizeObjectPath(prefix);
    }

    private void appendPathSegment(StringBuilder key, String value) {
        String segment = normalizeObjectPath(value);
        if (segment.isBlank()) {
            return;
        }
        if (!key.isEmpty()) {
            key.append('/');
        }
        key.append(segment);
    }

    private String rewriteToPublicEndpoint(String signedUrl) {
        String publicEndpoint = publicStorageEndpoint();
        if (publicEndpoint.isBlank()) {
            return signedUrl;
        }
        try {
            java.net.URI signed = java.net.URI.create(signedUrl);
            java.net.URI publicBase = java.net.URI.create(publicEndpoint.replaceAll("/+$", ""));
            return new java.net.URI(publicBase.getScheme(), publicBase.getAuthority(), signed.getPath(), signed.getQuery(), signed.getFragment()).toString();
        } catch (Exception ignored) {
            return signedUrl;
        }
    }

    private String safeDownloadFilename(String value) {
        String filename = value.contains("/") ? value.substring(value.lastIndexOf('/') + 1) : value;
        return filename.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String normalizeObjectPath(String value) {
        return sanitize(value)
            .replace('\\', '/')
            .replaceAll("^/+|/+$", "")
            .replaceAll("/{2,}", "/")
            .replaceAll("\\.\\.", "_");
    }

    private void ensureBucket(MinioClient client, String bucket) throws Exception {
        if (client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
            return;
        }
        client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
    }

    private void writeLocalObject(String bucket, String objectKey, byte[] content) {
        Path path = localObjectPath(bucket, objectKey);
        try {
            Files.createDirectories(path.getParent());
            Files.write(path, content);
        } catch (Exception exception) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "本地对象副本写入失败: " + exception.getMessage());
        }
    }

    private byte[] readLocalObject(String bucket, String objectKey, String fallbackReason) {
        Path path = localObjectPath(bucket, objectKey);
        if (!Files.exists(path)) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, fallbackReason + "；本地对象副本不存在");
        }
        try {
            return Files.readAllBytes(path);
        } catch (Exception exception) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, fallbackReason + "；本地对象副本读取失败: " + exception.getMessage());
        }
    }

    private Path localObjectPath(String bucket, String objectKey) {
        Path base = Paths.get(System.getProperty("java.io.tmpdir"), "yfind-aiplatform-object-store", safePathSegment(bucket));
        Path resolved = base.resolve(Paths.get(objectKey.replace('\\', '/'))).normalize();
        if (!resolved.startsWith(base.normalize())) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "对象存储路径非法");
        }
        return resolved;
    }

    private String safePathSegment(String value) {
        return sanitize(value).replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String sanitize(String value) {
        return value == null ? "" : value.trim().replaceAll("^\"|\"$", "");
    }
}
