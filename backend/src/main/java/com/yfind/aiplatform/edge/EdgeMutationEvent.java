package com.yfind.aiplatform.edge;

public record EdgeMutationEvent(String type, String nodeKey, String modelVersionKey) {
  public static EdgeMutationEvent dispatched(EdgeDispatchRequest request) { return new EdgeMutationEvent("DISPATCHED", request.nodeKey(), request.modelVersionKey()); }
}