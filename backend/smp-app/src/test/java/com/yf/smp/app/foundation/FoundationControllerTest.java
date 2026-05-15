package com.yf.smp.app.foundation;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yf.smp.app.web.TraceIdFilter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class FoundationControllerTest {
    @LocalServerPort
    private int port;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void foundationStatusUsesEnvelopeAndTraceId() throws Exception {
        // TASK-backend-foundation AC-01 AC-02 AC-03 AC-06
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/foundation/status"))
            .header(TraceIdFilter.TRACE_HEADER, "trace-f003")
            .GET()
            .build();

        var response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode body = objectMapper.readTree(response.body());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue(TraceIdFilter.TRACE_HEADER)).contains("trace-f003");
        assertThat(body.at("/code").asInt()).isZero();
        assertThat(body.at("/message").asText()).isEqualTo("success");
        assertThat(body.at("/traceId").asText()).isEqualTo("trace-f003");
        assertThat(body.at("/data/service").asText()).isEqualTo("smp-backend");
        assertThat(body.at("/data/domains/0").asText()).isEqualTo("DATA");
    }

    @Test
    void domainModulesExposeFiveBusinessDomains() {
        // TASK-backend-foundation AC-04
        assertThat(com.yf.smp.platform.PlatformDomainModules.DOMAINS)
            .containsExactly("DATA", "MODEL", "INFERENCE", "RESOURCE", "PLATFORM");
    }
}
