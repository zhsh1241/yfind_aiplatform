package com.yfind.aiplatform.model;

import org.springframework.stereotype.Service;
import com.yfind.aiplatform.identity.AuthForbiddenException;
import com.yfind.aiplatform.identity.AuthUnauthorizedException;
import com.yfind.aiplatform.identity.PlatformAuthorizationService;

@Service
public class ModelRegistryAuthorizationService {

  public static final String LOCAL_DEV_TOKEN = "LOCAL_DEV_TOKEN";

  private final PlatformAuthorizationService platformAuthorizationService;

  public ModelRegistryAuthorizationService(PlatformAuthorizationService platformAuthorizationService) {
    this.platformAuthorizationService = platformAuthorizationService;
  }

  public void require(String authorizationHeader, String permissionHeader, String requiredPermission) {
    try {
      platformAuthorizationService.require(authorizationHeader, requiredPermission);
    } catch (AuthUnauthorizedException exception) {
      throw new ModelRegistryUnauthorizedException(exception.getMessage());
    } catch (AuthForbiddenException exception) {
      throw new ModelRegistryForbiddenException(exception.getMessage());
    }
  }
}
