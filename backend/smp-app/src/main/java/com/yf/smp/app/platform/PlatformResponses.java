package com.yf.smp.app.platform;

import com.yf.smp.common.api.ApiResponse;
import com.yf.smp.app.web.TraceIdFilter;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;

final class PlatformResponses {
    private PlatformResponses() {
    }

    static <T> ResponseEntity<ApiResponse<T>> ok(T data) {
        return ResponseEntity.ok(ApiResponse.success(data, traceId()));
    }

    static ResponseEntity<ApiResponse<Void>> fail(PlatformException exception) {
        return ResponseEntity.status(exception.error().httpStatus())
            .body(ApiResponse.failure(exception.error().businessCode(), exception.getMessage(), traceId()));
    }

    static ResponseEntity<ApiResponse<Void>> fail(PlatformError error, String message) {
        return ResponseEntity.status(error.httpStatus())
            .body(ApiResponse.failure(error.businessCode(), message, traceId()));
    }

    static String traceId() {
        return MDC.get(TraceIdFilter.TRACE_ID);
    }
}
