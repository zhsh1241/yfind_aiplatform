package com.yf.smp.app.foundation;

import com.yf.smp.common.api.ApiResponse;
import com.yf.smp.app.web.TraceIdFilter;
import com.yf.smp.platform.PlatformDomainModules;
import java.util.List;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/foundation")
public class FoundationController {
    @GetMapping("/status")
    ApiResponse<FoundationStatusResponse> status() {
        var response = new FoundationStatusResponse(
            "smp-backend",
            "READY",
            PlatformDomainModules.DOMAINS,
            List.of("api-envelope", "trace-id", "openapi", "flyway", "domain-modules")
        );
        return ApiResponse.success(response, MDC.get(TraceIdFilter.TRACE_ID));
    }
}
