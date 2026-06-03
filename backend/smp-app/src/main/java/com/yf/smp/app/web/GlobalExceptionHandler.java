package com.yf.smp.app.web;

import com.yf.smp.common.api.ApiResponse;
import com.yf.smp.app.platform.PlatformException;
import com.yf.smp.common.error.BusinessException;
import com.yf.smp.common.error.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(PlatformException.class)
    ResponseEntity<ApiResponse<Void>> handlePlatformException(PlatformException exception) {
        return ResponseEntity.status(exception.httpStatus())
            .body(ApiResponse.failure(exception.businessCode(), exception.getMessage(), traceId()));
    }

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException exception) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ApiResponse.failure(exception.errorCode().code(), exception.getMessage(), traceId()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException exception) {
        return ResponseEntity.badRequest()
            .body(ApiResponse.failure(ErrorCode.INVALID_PARAM.code(), ErrorCode.INVALID_PARAM.defaultMessage(), traceId()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(MaxUploadSizeExceededException exception) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(ApiResponse.failure(41300, "DATASET_UPLOAD_FILE_LIMIT_EXCEEDED: 文件大小超出当前阈值", traceId()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception exception) {
        log.error("Unhandled exception, traceId={}", traceId(), exception);
        return ResponseEntity.internalServerError()
            .body(ApiResponse.failure(ErrorCode.INTERNAL_ERROR.code(), ErrorCode.INTERNAL_ERROR.defaultMessage(), traceId()));
    }

    private String traceId() {
        return MDC.get(TraceIdFilter.TRACE_ID);
    }
}
