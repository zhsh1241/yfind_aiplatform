package com.yfind.aiplatform.model;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:4173"})
@RequestMapping("/api/models")
public class ModelRegistryController {

  private final ModelRegistryService modelRegistryService;
  private final ModelRegistryAuthorizationService authorizationService;

  public ModelRegistryController(ModelRegistryService modelRegistryService, ModelRegistryAuthorizationService authorizationService) {
    this.modelRegistryService = modelRegistryService;
    this.authorizationService = authorizationService;
  }

  @GetMapping
  public ModelListResponse list(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, ModelRegistryService.MODEL_READ);
    return modelRegistryService.list();
  }

  @GetMapping("/deployable")
  public ModelListResponse deployable(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, ModelRegistryService.MODEL_READ);
    return modelRegistryService.deployable();
  }

  @GetMapping("/{modelKey}")
  public ModelDetailResponse detail(
      @PathVariable String modelKey,
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, ModelRegistryService.MODEL_READ);
    return modelRegistryService.detail(modelKey);
  }

  @PostMapping("/{modelKey}/versions")
  public ModelVersionActionResponse register(
      @PathVariable String modelKey,
      @RequestBody ModelVersionRegisterRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, ModelRegistryService.MODEL_MANAGE);
    return modelRegistryService.register(modelKey, request);
  }

  @PostMapping("/{modelKey}/versions/{versionKey}/approve")
  public ModelVersionActionResponse approve(
      @PathVariable String modelKey,
      @PathVariable String versionKey,
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, ModelRegistryService.MODEL_MANAGE);
    return modelRegistryService.approve(modelKey, versionKey);
  }

  @PostMapping("/{modelKey}/versions/{versionKey}/reject")
  public ModelVersionActionResponse reject(
      @PathVariable String modelKey,
      @PathVariable String versionKey,
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, ModelRegistryService.MODEL_MANAGE);
    return modelRegistryService.reject(modelKey, versionKey);
  }

  @PostMapping("/{modelKey}/versions/{versionKey}/archive")
  public ModelVersionActionResponse archive(
      @PathVariable String modelKey,
      @PathVariable String versionKey,
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, ModelRegistryService.MODEL_MANAGE);
    return modelRegistryService.archive(modelKey, versionKey);
  }
}