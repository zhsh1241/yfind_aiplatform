package com.yfind.aiplatform.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DomainEventStore {
  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public DomainEventStore(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
  }

  public <T> List<T> load(String domainKey, Class<T> eventType) {
    return jdbcTemplate.query(
      "SELECT payload FROM platform_domain_events WHERE domain_key = ? ORDER BY event_id ASC",
      (rs, rowNum) -> read(rs.getString("payload"), eventType),
      domainKey
    );
  }

  public void append(String domainKey, String aggregateKey, String eventType, Object payload) {
    jdbcTemplate.update(
      "INSERT INTO platform_domain_events(domain_key, aggregate_key, event_type, payload) VALUES (?, ?, ?, ?)",
      domainKey,
      aggregateKey,
      eventType,
      write(payload)
    );
  }

  private <T> T read(String payload, Class<T> eventType) {
    try {
      return objectMapper.readValue(payload, eventType);
    } catch (Exception exception) {
      throw new IllegalStateException("读取数据库领域事件失败", exception);
    }
  }

  private String write(Object payload) {
    try {
      return objectMapper.writeValueAsString(payload);
    } catch (Exception exception) {
      throw new IllegalStateException("写入数据库领域事件失败", exception);
    }
  }
}