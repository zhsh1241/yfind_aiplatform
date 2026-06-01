package com.yf.smp.app.platform;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class StorageConfiguration {

    @Bean
    @ConditionalOnProperty(prefix = "smp.storage", name = "enabled", havingValue = "true")
    MinioClient minioClient(
        @Value("${smp.storage.endpoint:}") String endpoint,
        @Value("${smp.storage.access-key:}") String accessKey,
        @Value("${smp.storage.secret-key:}") String secretKey
    ) {
        if (!hasText(endpoint) || !hasText(accessKey) || !hasText(secretKey)) {
            throw new IllegalStateException("smp.storage.enabled=true 时必须显式配置 endpoint、access-key 与 secret-key");
        }
        return MinioClient.builder()
            .endpoint(endpoint.trim())
            .credentials(accessKey.trim(), secretKey.trim())
            .build();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
