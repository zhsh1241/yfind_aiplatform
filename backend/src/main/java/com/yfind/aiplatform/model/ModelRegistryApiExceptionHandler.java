package com.yfind.aiplatform.model;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = ModelRegistryController.class)
public class ModelRegistryApiExceptionHandler {

  @ExceptionHandler(ModelRegistryNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public Map<String, String> notFound(ModelRegistryNotFoundException exception) {
    return Map.of("error", exception.getMessage(), "errorCode", "MODEL_NOT_FOUND", "featureTrace", ModelRegistryService.FEATURE_TRACE);
  }

  @ExceptionHandler(ModelRegistryUnauthorizedException.class)
  @ResponseStatus(HttpStatus.UNAUTHORIZED)
  public Map<String, String> unauthorized(ModelRegistryUnauthorizedException exception) {
    return Map.of("error", exception.getMessage(), "errorCode", "AUTH_UNAUTHORIZED", "featureTrace", ModelRegistryService.FEATURE_TRACE);
  }

  @ExceptionHandler(ModelRegistryForbiddenException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  public Map<String, String> forbidden(ModelRegistryForbiddenException exception) {
    return Map.of("error", exception.getMessage(), "errorCode", "MODEL_FORBIDDEN", "featureTrace", ModelRegistryService.FEATURE_TRACE);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Map<String, String> badRequest(IllegalArgumentException exception) {
    return Map.of("error", exception.getMessage(), "errorCode", "MODEL_INVALID_ARGUMENT", "featureTrace", ModelRegistryService.FEATURE_TRACE);
  }
}