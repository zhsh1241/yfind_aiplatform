package com.yfind.aiplatform.platform;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

  public static final String FEATURE_TRACE = "TASK-platform-architecture-baseline";

  @GetMapping("/api/health")
  public Map<String, String> health() {
    return Map.of(
      "status", "UP",
      "service", "yfind-aiplatform-backend",
      "feature", FEATURE_TRACE
    );
  }
}
