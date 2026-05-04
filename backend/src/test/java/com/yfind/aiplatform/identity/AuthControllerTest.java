package com.yfind.aiplatform.identity;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {
  /*
   * TASK-identity-org-permission traceability:
   * AC-01 planning gate, AC-02 backend boundaries, AC-03 auth APIs,
   * AC-04 permission/default-deny, AC-06 frontend seam, AC-07 TODO IAM placeholders,
   * AC-08 quality gates.
   */

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("TASK-identity-org-permission AC-03 exposes auth status with TODO IAM seam")
  void authStatusExposesLocalPrincipalAndIamPlaceholders() throws Exception {
    mockMvc.perform(get("/api/auth/status"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.authenticated", is(true)))
      .andExpect(jsonPath("$.authMethod", is("LOCAL_DEV_PRINCIPAL")))
      .andExpect(jsonPath("$.iamProvider", is("TODO_CONFIRM_IAM_PROVIDER")))
      .andExpect(jsonPath("$.featureTrace", is("TASK-identity-org-permission")));
  }

  @Test
  @DisplayName("TASK-identity-org-permission AC-03 exposes current user org roles and permissions")
  void currentUserIncludesOrganizationRolesAndPermissions() throws Exception {
    mockMvc.perform(get("/api/auth/me"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.username", is("local.admin")))
      .andExpect(jsonPath("$.organization.code", is("YFI-LOCAL")))
      .andExpect(jsonPath("$.roles[0].key", is("platform-admin")))
      .andExpect(jsonPath("$.permissions", hasItem("inference:deploy")))
      .andExpect(jsonPath("$.permissions", hasItem("audit:read")));
  }

  @Test
  @DisplayName("TASK-identity-org-permission AC-04 lists MVP permission vocabulary")
  void permissionVocabularyIncludesMvpModules() throws Exception {
    mockMvc.perform(get("/api/auth/permissions"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[?(@.key == 'dataset:manage')].module", hasItem("dataset")))
      .andExpect(jsonPath("$[?(@.key == 'training:execute')].highRisk", hasItem(true)))
      .andExpect(jsonPath("$[?(@.key == 'audit:read')].action", hasItem("read")));
  }

  @Test
  @DisplayName("TASK-identity-org-permission AC-04 unknown permission is default denied")
  void unknownPermissionDefaultsToDeny() throws Exception {
    mockMvc.perform(get("/api/auth/check").param("permission", "unknown:permission"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.known", is(false)))
      .andExpect(jsonPath("$.granted", is(false)))
      .andExpect(jsonPath("$.decision", is("DENY")))
      .andExpect(jsonPath("$.reason", is("未知权限默认拒绝，并应写入高风险访问审计")));
  }
}
