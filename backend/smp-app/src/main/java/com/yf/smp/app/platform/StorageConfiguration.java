package com.yf.smp.app.platform;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class StorageConfiguration {

    @Bean
    MinioClient minioClient(
        @Value("${smp.storage.endpoint:}") String endpoint,
        @Value("${smp.storage.access-key:}") String accessKey,
        @Value("${smp.storage.secret-key:}") String secretKey
    ) {
        return MinioClient.builder()
            .endpoint(hasText(endpoint) ? endpoint.trim() : "http://localhost:9000")
            .credentials(hasText(accessKey) ? accessKey.trim() : "smpminio", hasText(secretKey) ? secretKey.trim() : "smpminio_local_password")
            .build();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
