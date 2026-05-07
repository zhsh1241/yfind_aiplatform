package com.yfind.aiplatform.edge;

import java.util.ArrayList;
import java.util.List;
import com.yfind.aiplatform.persistence.DomainEventStore;
import org.springframework.stereotype.Service;

@Service
public class EdgeService {
  public static final String FEATURE_TRACE = "TASK-edge-dispatch-integration";
  private static final String DOMAIN_KEY = "edge-node";
  private final DomainEventStore domainEventStore;
  private final List<EdgeNodeSummary> nodes = new ArrayList<>(List.of(
    new EdgeNodeSummary("edge-suzhou-line-01", "苏州一号线边缘盒", "苏州工厂", "ONLINE", "bearing-defect-detector-v1", 7, "2026-05-06T08:40:00+08:00", "edge:read"),
    new EdgeNodeSummary("edge-ningbo-line-02", "宁波二号线边缘盒", "宁波工厂", "SYNCING", "audio-anomaly-lite-v1", 3, "2026-05-06T08:25:00+08:00", "edge:read")
  ));

  public EdgeService(DomainEventStore domainEventStore) {
    this.domainEventStore = domainEventStore;
    domainEventStore.load(DOMAIN_KEY, EdgeMutationEvent.class).forEach(this::applyEvent);
  }

  public EdgeNodeListResponse list() { return new EdgeNodeListResponse(List.copyOf(nodes), FEATURE_TRACE); }

  public EdgeDispatchResponse dispatch(EdgeDispatchRequest request) {
    EdgeMutationEvent event = EdgeMutationEvent.dispatched(request);
    domainEventStore.append(DOMAIN_KEY, request.nodeKey(), event.type(), event);
    applyEvent(event);
    return new EdgeDispatchResponse(request.nodeKey(), "SYNCING", request.modelVersionKey(), FEATURE_TRACE);
  }

  private void applyEvent(EdgeMutationEvent event) {
    if ("DISPATCHED".equals(event.type())) {
      nodes.replaceAll(node -> node.nodeKey().equals(event.nodeKey()) ? new EdgeNodeSummary(node.nodeKey(), node.name(), node.plant(), "SYNCING", event.modelVersionKey(), node.packageVersion() + 1, "2026-05-06T09:00:00+08:00", "edge:deploy") : node);
    }
  }
}
