package com.yfind.aiplatform.identity;

import java.util.List;

public record AuthorizationRequestListResponse(
    List<AuthorizationRequestResponse> items,
    String featureTrace
) {}
