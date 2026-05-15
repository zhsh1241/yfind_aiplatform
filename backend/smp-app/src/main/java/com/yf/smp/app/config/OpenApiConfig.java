package com.yf.smp.app.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI smpOpenApi() {
        return new OpenAPI().info(new Info()
            .title("YFI SMP 工业 AI 小模型平台 API")
            .version("v1")
            .description("遵循 docs/business/api/01-API接口规范.md 的 /api/v1 契约基线"));
    }
}