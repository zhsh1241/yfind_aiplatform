package com.yfind.aiplatform.organization;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import com.yfind.aiplatform.identity.LocalIdentityService;

@RestController
public class OrganizationController {

  private final LocalIdentityService identityService;

  public OrganizationController(LocalIdentityService identityService) {
    this.identityService = identityService;
  }

  @GetMapping("/api/organizations/current")
  public OrganizationSummary current() {
    return identityService.currentOrganization();
  }
}
