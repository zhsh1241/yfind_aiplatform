package com.yfind.aiplatform.platform;

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
class HealthControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("TASK-platform-architecture-baseline AC-02 exposes backend health")
  void healthEndpointReturnsBaselineTrace() throws Exception {
    mockMvc.perform(get("/api/health"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status", is("UP")))
      .andExpect(jsonPath("$.service", is("yfind-aiplatform-backend")))
      .andExpect(jsonPath("$.feature", is(HealthController.FEATURE_TRACE)));
  }
}
