package com.yfind.aiplatform.identity;

public record AuthLoginResponse(
    String accessToken,
    CurrentUserResponse user,
    String expiresAt,
    String featureTrace
) {}
