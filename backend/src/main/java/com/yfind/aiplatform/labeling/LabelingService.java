package com.yfind.aiplatform.labeling;

import java.util.ArrayList;
import java.util.List;
import com.yfind.aiplatform.persistence.DomainEventStore;
import org.springframework.stereotype.Service;

@Service
public class LabelingService {
  public static final String FEATURE_TRACE = "TASK-labeling-workflow-integration";
  private static final String DOMAIN_KEY = "labeling-task";
  private final DomainEventStore domainEventStore;
  private final List<LabelingTaskSummary> tasks = new ArrayList<>(List.of(
    new LabelingTaskSummary("label-welding-v2", "焊点外观缺陷复核", "welding-vision", "REVIEWING", 8920, 6410, 96.2, "质检组", "labeling:read"),
    new LabelingTaskSummary("label-bearing-audio-v1", "轴承异响音频标注", "bearing-audio", "LABELING", 6200, 2180, 91.5, "设备组", "labeling:read")
  ));

  public LabelingService(DomainEventStore domainEventStore) {
    this.domainEventStore = domainEventStore;
    domainEventStore.load(DOMAIN_KEY, LabelingMutationEvent.class).forEach(this::applyEvent);
  }

  public LabelingTaskListResponse list() { return new LabelingTaskListResponse(List.copyOf(tasks), FEATURE_TRACE); }

  public LabelingActionResponse approve(String taskKey) {
    LabelingMutationEvent event = LabelingMutationEvent.approved(taskKey);
    domainEventStore.append(DOMAIN_KEY, taskKey, event.type(), event);
    applyEvent(event);
    return new LabelingActionResponse(taskKey, "APPROVED", FEATURE_TRACE);
  }

  private void applyEvent(LabelingMutationEvent event) {
    if ("APPROVED".equals(event.type())) {
      tasks.replaceAll(task -> task.taskKey().equals(event.taskKey()) ? new LabelingTaskSummary(task.taskKey(), task.name(), task.datasetKey(), "APPROVED", task.totalItems(), task.totalItems(), 98.0, task.assignee(), "labeling:manage") : task);
    }
  }
}
