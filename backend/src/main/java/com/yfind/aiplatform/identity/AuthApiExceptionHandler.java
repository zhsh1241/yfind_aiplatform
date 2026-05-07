package com.yfind.aiplatform.identity;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthApiExceptionHandler {
  @ExceptionHandler(AuthUnauthorizedException.class)
  @ResponseStatus(HttpStatus.UNAUTHORIZED)
  public Map<String, String> unauthorized(AuthUnauthorizedException exception) {
    return Map.of("error", exception.getMessage(), "errorCode", "AUTH_UNAUTHORIZED", "featureTrace", LocalIdentityService.FEATURE_TRACE);
  }

  @ExceptionHandler(AuthForbiddenException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  public Map<String, String> forbidden(AuthForbiddenException exception) {
    return Map.of("error", exception.getMessage(), "errorCode", "AUTH_FORBIDDEN", "featureTrace", LocalIdentityService.FEATURE_TRACE);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Map<String, String> badRequest(IllegalArgumentException exception) {
    return Map.of("error", exception.getMessage(), "errorCode", "AUTH_INVALID_ARGUMENT", "featureTrace", LocalIdentityService.FEATURE_TRACE);
  }
}
