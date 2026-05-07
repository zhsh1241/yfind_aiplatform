package com.yfind.aiplatform.edge;

import com.yfind.aiplatform.training.TrainingAuthorizationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/edge-nodes")
public class EdgeController {
  private final EdgeService edgeService;
  private final TrainingAuthorizationService authorizationService;

  public EdgeController(EdgeService edgeService, TrainingAuthorizationService authorizationService) {
    this.edgeService = edgeService;
    this.authorizationService = authorizationService;
  }

  @GetMapping
  public EdgeNodeListResponse list(@RequestHeader(value = "Authorization", required = false) String authorization, @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, "edge:read");
    return edgeService.list();
  }

  @PostMapping("/dispatches")
  public EdgeDispatchResponse dispatch(@RequestBody EdgeDispatchRequest request, @RequestHeader(value = "Authorization", required = false) String authorization, @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, "edge:deploy");
    return edgeService.dispatch(request);
  }
}