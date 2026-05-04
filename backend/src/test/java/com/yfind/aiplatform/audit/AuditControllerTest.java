package com.yfind.aiplatform.audit;

import static org.hamcrest.Matchers.hasItem;
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
class AuditControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("TASK-identity-org-permission AC-05 exposes audit obligations")
  void auditEventsExposeSecurityObligations() throws Exception {
    mockMvc.perform(get("/api/audit/events"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[?(@.type == 'LOGIN')].featureTrace", hasItem("TASK-identity-org-permission")))
      .andExpect(jsonPath("$[?(@.type == 'ROLE_PERMISSION_CHANGE')].highRisk", hasItem(true)))
      .andExpect(jsonPath("$[?(@.type == 'DENIED_HIGH_RISK_ACCESS')].result", hasItem("DENY")));
  }
}
