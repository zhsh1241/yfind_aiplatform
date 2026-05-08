package com.yfind.aiplatform.dataset;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class DatasetApiExceptionHandler {

  @ExceptionHandler(IllegalArgumentException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleIllegalArgument(IllegalArgumentException exception) {
    return new ErrorResponse(400, exception.getMessage(), DatasetService.FEATURE_TRACE);
  }

  @ExceptionHandler(DatasetNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public ErrorResponse handleNotFound(DatasetNotFoundException exception) {
    return new ErrorResponse(404, exception.getMessage(), DatasetService.FEATURE_TRACE);
  }

  @ExceptionHandler(DatasetPreparationConflictException.class)
  @ResponseStatus(HttpStatus.CONFLICT)
  public ErrorResponse handlePreparationConflict(DatasetPreparationConflictException exception) {
    return new ErrorResponse(409, exception.getMessage(), DatasetPreparationDtos.FEATURE_TRACE);
  }

  public record ErrorResponse(int code, String message, String featureTrace) {}
}