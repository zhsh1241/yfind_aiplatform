package com.yf.smp.common.api;

import java.time.OffsetDateTime;

public record ApiResponse<T>(
    int code,
    String message,
    T data,
    String traceId,
    OffsetDateTime timestamp
) {
    public static <T> ApiResponse<T> success(T data, String traceId) {
        return new ApiResponse<>(0, "success", data, traceId, OffsetDateTime.now());
    }

    public static <T> ApiResponse<T> failure(int code, String message, String traceId) {
        return new ApiResponse<>(code, message, null, traceId, OffsetDateTime.now());
    }
}
