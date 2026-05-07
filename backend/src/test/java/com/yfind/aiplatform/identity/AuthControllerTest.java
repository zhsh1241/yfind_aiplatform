package com.yfind.aiplatform.identity;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;

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

  private String loginAsAdmin() throws Exception {
    return com.jayway.jsonpath.JsonPath.read(
      mockMvc.perform(post("/api/auth/login")
          .contentType(MediaType.APPLICATION_JSON)
          .content("{\"username\":\"admin@yfind.local\",\"password\":\"admin123!\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.username", is("admin@yfind.local")))
        .andReturn()
        .getResponse()
        .getContentAsString(),
      "$.accessToken"
    );
  }

  @Test
  @DisplayName("TASK-identity-org-permission AC-03 exposes auth status with TODO IAM seam")
  void authStatusExposesLocalPrincipalAndIamPlaceholders() throws Exception {
    String token = loginAsAdmin();
    mockMvc.perform(get("/api/auth/status").header("Authorization", "Bearer " + token))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.authenticated", is(true)))
      .andExpect(jsonPath("$.authMethod", is("BACKEND_SESSION_TOKEN")))
      .andExpect(jsonPath("$.iamProvider", is("YFIND_LOCAL_IAM")))
      .andExpect(jsonPath("$.featureTrace", is("TASK-identity-org-permission")));
  }

  @Test
  @DisplayName("TASK-identity-org-permission AC-03 exposes current user org roles and permissions")
  void currentUserIncludesOrganizationRolesAndPermissions() throws Exception {
    String token = loginAsAdmin();
    mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.username", is("admin@yfind.local")))
      .andExpect(jsonPath("$.organization.code", is("YFI-LOCAL")))
      .andExpect(jsonPath("$.roles[0].key", is("platform-admin")))
      .andExpect(jsonPath("$.permissions", hasItem("inference:deploy")))
      .andExpect(jsonPath("$.permissions", hasItem("audit:read")));
  }

  @Test
  @DisplayName("TASK-identity-org-permission production login rejects invalid credentials")
  void loginRejectsInvalidCredentials() throws Exception {
    mockMvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"username\":\"admin@yfind.local\",\"password\":\"bad\"}"))
      .andExpect(status().isUnauthorized())
      .andExpect(jsonPath("$.errorCode", is("AUTH_UNAUTHORIZED")));
  }

  @Test
  @DisplayName("TASK-identity-org-permission protected current user requires bearer token")
  void currentUserRequiresBearerToken() throws Exception {
    mockMvc.perform(get("/api/auth/me"))
      .andExpect(status().isUnauthorized())
      .andExpect(jsonPath("$.errorCode", is("AUTH_UNAUTHORIZED")));
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
    String token = loginAsAdmin();
    mockMvc.perform(get("/api/auth/check").param("permission", "unknown:permission").header("Authorization", "Bearer " + token))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.known", is(false)))
      .andExpect(jsonPath("$.granted", is(false)))
      .andExpect(jsonPath("$.decision", is("DENY")))
      .andExpect(jsonPath("$.reason", is("未知权限默认拒绝，并应写入高风险访问审计")));
  }

  @Test
  @DisplayName("TASK-identity-org-permission supports authorization request approval and approved login")
  void authorizationRequestCanBeApprovedAndUsedForLogin() throws Exception {
    String token = loginAsAdmin();
    String requestId = com.jayway.jsonpath.JsonPath.read(
      mockMvc.perform(post("/api/auth/authorization-requests")
          .header("Authorization", "Bearer " + token)
          .contentType(MediaType.APPLICATION_JSON)
          .content("{\"requestedRole\":\"quality-reviewer\",\"reason\":\"生产质检复核\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("PENDING")))
        .andReturn()
        .getResponse()
        .getContentAsString(),
      "$.requestId"
    );

    mockMvc.perform(post("/api/auth/authorization-requests/" + requestId + "/approve").header("Authorization", "Bearer " + token))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("APPROVED")));

    mockMvc.perform(post("/api/auth/authorization-requests/" + requestId + "/login"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.user.username", is("reviewer@yfind.local")))
      .andExpect(jsonPath("$.user.permissions", hasItem("model:manage")));
  }
}
