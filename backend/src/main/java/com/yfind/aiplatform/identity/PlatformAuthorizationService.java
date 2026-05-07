package com.yfind.aiplatform.identity;

import org.springframework.stereotype.Service;

@Service
public class PlatformAuthorizationService {
  public static final String LOCAL_DEV_TOKEN = "LOCAL_DEV_TOKEN";

  private final LocalIdentityService identityService;

  public PlatformAuthorizationService(LocalIdentityService identityService) {
    this.identityService = identityService;
  }

  public void require(String authorizationHeader, String requiredPermission) {
    identityService.requirePermission(authorizationHeader, requiredPermission);
  }
}
