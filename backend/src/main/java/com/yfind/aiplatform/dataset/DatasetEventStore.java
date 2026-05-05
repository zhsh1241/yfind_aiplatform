package com.yfind.aiplatform.dataset;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class DatasetEventStore {

  private final ObjectMapper objectMapper;
  private final Path eventLogPath;

  public DatasetEventStore(
    ObjectMapper objectMapper,
    @Value("${dataset.storage.event-log:${user.home}/.yfind-aiplatform/dataset-events.jsonl}") String eventLogPath
  ) {
    this.objectMapper = objectMapper;
    this.eventLogPath = Path.of(eventLogPath);
  }

  List<DatasetMutationEvent> load() {
    if (!Files.exists(eventLogPath)) {
      return List.of();
    }

    try {
      List<DatasetMutationEvent> events = new ArrayList<>();
      for (String line : Files.readAllLines(eventLogPath, StandardCharsets.UTF_8)) {
        if (!line.isBlank()) {
          events.add(objectMapper.readValue(line, DatasetMutationEvent.class));
        }
      }
      return events;
    } catch (IOException exception) {
      throw new IllegalStateException("读取数据集事件日志失败: " + eventLogPath, exception);
    }
  }

  void append(DatasetMutationEvent event) {
    try {
      Path parent = eventLogPath.getParent();
      if (parent != null) {
        Files.createDirectories(parent);
      }
      Files.writeString(
        eventLogPath,
        objectMapper.writeValueAsString(event) + System.lineSeparator(),
        StandardCharsets.UTF_8,
        Files.exists(eventLogPath)
          ? java.nio.file.StandardOpenOption.APPEND
          : java.nio.file.StandardOpenOption.CREATE
      );
    } catch (IOException exception) {
      throw new IllegalStateException("写入数据集事件日志失败: " + eventLogPath, exception);
    }
  }
}
