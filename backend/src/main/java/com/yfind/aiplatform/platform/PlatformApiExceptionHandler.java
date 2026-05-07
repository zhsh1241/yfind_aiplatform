package com.yfind.aiplatform.platform;

import com.yfind.aiplatform.edge.EdgeController;
import com.yfind.aiplatform.inference.InferenceController;
import com.yfind.aiplatform.labeling.LabelingController;
import com.yfind.aiplatform.training.TrainingForbiddenException;
import com.yfind.aiplatform.training.TrainingUnauthorizedException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {InferenceController.class, LabelingController.class, EdgeController.class})
public class PlatformApiExceptionHandler {
  @ExceptionHandler(TrainingUnauthorizedException.class)
  @ResponseStatus(HttpStatus.UNAUTHORIZED)
  public Map<String, String> unauthorized(TrainingUnauthorizedException exception) {
    return Map.of("error", exception.getMessage(), "errorCode", "AUTH_UNAUTHORIZED", "featureTrace", "TASK-platform-api-auth");
  }

  @ExceptionHandler(TrainingForbiddenException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  public Map<String, String> forbidden(TrainingForbiddenException exception) {
    return Map.of("error", exception.getMessage(), "errorCode", "PLATFORM_FORBIDDEN", "featureTrace", "TASK-platform-api-auth");
  }
}
