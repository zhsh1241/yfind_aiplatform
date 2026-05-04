package com.yfind.aiplatform.identity;

public record AuthStatusResponse(
    boolean authenticated,
    String authMethod,
    String principalSource,
    String iamProvider,
    String ssoIssuer,
    String featureTrace
) {}
