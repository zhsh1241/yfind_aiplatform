package com.yf.smp.app.config;

import com.yf.smp.app.platform.PlatformError;
import com.yf.smp.app.platform.PlatformSessionAuthenticationFilter;
import com.yf.smp.app.web.TraceIdFilter;
import com.yf.smp.common.api.ApiResponse;
import java.util.Arrays;
import java.util.List;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        PlatformSessionAuthenticationFilter platformSessionAuthenticationFilter,
        CorsConfigurationSource corsConfigurationSource
    ) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint((request, response, authException) -> writePlatformError(request, response, PlatformError.UNAUTHORIZED, "未认证或 Token 缺失"))
                .accessDeniedHandler(accessDeniedHandler())
            )
            .addFilterBefore(platformSessionAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(
                    "/actuator/health/**",
                    "/api/v1/foundation/**",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html"
                ).permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/api/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                .requestMatchers("/api/v1/auth/**", "/api/v1/platform/**").authenticated()
                .anyRequest().authenticated()
            )
            .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
        @Value("${smp.security.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}") String allowedOrigins
    ) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isBlank())
            .toList());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", TraceIdFilter.TRACE_HEADER, "X-Requested-With"));
        configuration.setExposedHeaders(List.of(TraceIdFilter.TRACE_HEADER));
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    private AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> writePlatformError(request, response, PlatformError.FORBIDDEN, "权限不足");
    }

    private void writePlatformError(jakarta.servlet.http.HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response, PlatformError error, String message) throws java.io.IOException {
        String traceId = MDC.get(TraceIdFilter.TRACE_ID);
        if (traceId == null || traceId.isBlank()) {
            traceId = request.getHeader(TraceIdFilter.TRACE_HEADER);
        }
        if (traceId == null || traceId.isBlank()) {
            traceId = java.util.UUID.randomUUID().toString();
        }
        response.setStatus(error.httpStatus());
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader(TraceIdFilter.TRACE_HEADER, traceId);
        response.getWriter().write(toJson(ApiResponse.failure(error.businessCode(), message, traceId)));
    }

    private String toJson(ApiResponse<Void> response) {
        return """
            {"code":%d,"message":"%s","data":null,"traceId":"%s","timestamp":"%s"}
            """.formatted(response.code(), response.message(), response.traceId(), response.timestamp());
    }
}
