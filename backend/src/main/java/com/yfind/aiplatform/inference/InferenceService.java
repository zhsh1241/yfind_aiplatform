package com.yfind.aiplatform.inference;

import java.util.ArrayList;
import java.util.List;
import com.yfind.aiplatform.persistence.DomainEventStore;
import org.springframework.stereotype.Service;

@Service
public class InferenceService {
  public static final String FEATURE_TRACE = "TASK-inference-service-integration";
  private static final String DOMAIN_KEY = "inference-service";
  private final DomainEventStore domainEventStore;
  private final List<InferenceServiceSummary> services = new ArrayList<>();

  public InferenceService(DomainEventStore domainEventStore) {
    this.domainEventStore = domainEventStore;
    services.add(new InferenceServiceSummary(
      "bearing-defect-prod", "轴承缺陷检测在线服务", "bearing-defect-detector", "bearing-defect-detector-v1", "RUNNING", 2, 100,
      "https://TODO_CONFIRM_INFERENCE_GATEWAY/bearing-defect-prod", "inference:read",
      List.of(
        new InferenceMetricPoint("08:00", 46, 94, 99.96),
        new InferenceMetricPoint("10:00", 72, 112, 99.94),
        new InferenceMetricPoint("12:00", 64, 108, 99.95),
        new InferenceMetricPoint("14:00", 93, 128, 99.90),
        new InferenceMetricPoint("16:00", 81, 119, 99.92),
        new InferenceMetricPoint("18:00", 58, 101, 99.97)
      )
    ));
    domainEventStore.load(DOMAIN_KEY, InferenceMutationEvent.class).forEach(this::applyEvent);
  }

  public InferenceServiceListResponse list() {
    return new InferenceServiceListResponse(List.copyOf(services), FEATURE_TRACE);
  }

  public InferenceDeployResponse deploy(InferenceDeployRequest request) {
    String serviceKey = request.modelKey() + "-canary";
    InferenceMutationEvent event = InferenceMutationEvent.deployed(serviceKey, request);
    domainEventStore.append(DOMAIN_KEY, serviceKey, event.type(), event);
    applyEvent(event);
    return new InferenceDeployResponse(serviceKey, "DEPLOYING", "https://TODO_CONFIRM_INFERENCE_GATEWAY/" + serviceKey, FEATURE_TRACE);
  }

  private void applyEvent(InferenceMutationEvent event) {
    if (!"DEPLOYED".equals(event.type()) || services.stream().anyMatch(service -> service.serviceKey().equals(event.serviceKey()))) {
      return;
    }
    services.add(new InferenceServiceSummary(
      event.serviceKey(), "灰度服务-" + event.versionKey(), event.modelKey(), event.versionKey(), "DEPLOYING", Math.max(event.replicas(), 1), Math.max(event.trafficPercent(), 10),
      "https://TODO_CONFIRM_INFERENCE_GATEWAY/" + event.serviceKey(), "inference:deploy", services.get(0).metrics()
    ));
  }
}
