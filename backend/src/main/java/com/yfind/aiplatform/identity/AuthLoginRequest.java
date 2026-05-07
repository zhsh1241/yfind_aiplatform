package com.yfind.aiplatform.identity;

public record AuthLoginRequest(
    String username,
    String password
) {}
