package com.yfind.aiplatform.identity;

import java.util.List;
import com.yfind.aiplatform.organization.OrganizationSummary;

public record CurrentUserResponse(
    String userId,
    String username,
    String displayName,
    OrganizationSummary organization,
    List<RoleSummary> roles,
    List<String> permissions,
    String authMethod,
    String iamProvider,
    String featureTrace
) {}
