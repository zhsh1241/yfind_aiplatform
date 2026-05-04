package com.yfind.aiplatform.organization;

public record OrganizationSummary(
    String id,
    String code,
    String name,
    String type,
    String parentId
) {}
