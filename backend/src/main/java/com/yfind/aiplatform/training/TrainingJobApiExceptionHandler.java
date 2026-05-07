package com.yfind.aiplatform.training;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = TrainingJobController.class)
public class TrainingJobApiExceptionHandler {

  @ExceptionHandler(TrainingJobNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public Map<String, String> notFound(TrainingJobNotFoundException exception) {
    return Map.of("error", exception.getMessage(), "featureTrace", TrainingJobService.FEATURE_TRACE);
  }

  @ExceptionHandler(TrainingUnauthorizedException.class)
  @ResponseStatus(HttpStatus.UNAUTHORIZED)
  public Map<String, String> unauthorized(TrainingUnauthorizedException exception) {
    return Map.of("error", exception.getMessage(), "errorCode", "AUTH_UNAUTHORIZED", "featureTrace", TrainingJobService.FEATURE_TRACE);
  }

  @ExceptionHandler(TrainingForbiddenException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  public Map<String, String> forbidden(TrainingForbiddenException exception) {
    return Map.of("error", exception.getMessage(), "errorCode", "TRAINING_FORBIDDEN", "featureTrace", TrainingJobService.FEATURE_TRACE);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Map<String, String> badRequest(IllegalArgumentException exception) {
    return Map.of("error", exception.getMessage(), "featureTrace", TrainingJobService.FEATURE_TRACE);
  }
}
