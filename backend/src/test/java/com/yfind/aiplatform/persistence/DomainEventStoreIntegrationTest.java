package com.yfind.aiplatform.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.yfind.aiplatform.training.TrainingJobCreateRequest;
import com.yfind.aiplatform.training.TrainingJobService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class DomainEventStoreIntegrationTest {
  @Autowired
  private TrainingJobService trainingJobService;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Test
  @DisplayName("TASK-platform-database-integration persists mutable platform state into SQL domain event table")
  void persistsMutableStateIntoSqlDomainEventTable() {
    trainingJobService.create(new TrainingJobCreateRequest(
      "数据库持久化训练验证",
      "motor-thermal",
      "motor-thermal-v3",
      "small-cnn-vision",
      "GPU",
      4,
      1,
      0,
      12
    ));

    Integer count = jdbcTemplate.queryForObject(
      "SELECT COUNT(*) FROM platform_domain_events WHERE domain_key = ? AND event_type = ?",
      Integer.class,
      "training-job",
      "CREATED"
    );

    assertThat(count).isNotNull().isGreaterThan(0);
  }
}