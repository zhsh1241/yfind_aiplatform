package com.yfind.aiplatform.dataset;

import java.util.List;

record DatasetMutationEvent(
  String type,
  String datasetKey,
  String datasetName,
  String owner,
  List<String> tags,
  List<DatasetUploadFileRequest> files,
  String requestId,
  String requester,
  String versionKey,
  String reason
) {

  static DatasetMutationEvent upload(String datasetKey, DatasetUploadRequest request) {
    return new DatasetMutationEvent(
      "UPLOAD",
      datasetKey,
      request.datasetName(),
      request.owner(),
      request.tags(),
      request.files(),
      null,
      null,
      null,
      null
    );
  }

  static DatasetMutationEvent accessRequestCreated(String datasetKey, String requestId, DatasetAccessRequestCreateRequest request, String fallbackRequester) {
    String requester = request.requester() == null || request.requester().isBlank() ? fallbackRequester : request.requester();
    return new DatasetMutationEvent(
      "ACCESS_REQUEST_CREATED",
      datasetKey,
      null,
      null,
      null,
      null,
      requestId,
      requester,
      request.versionKey(),
      request.reason()
    );
  }

  static DatasetMutationEvent accessRequestApproved(String requestId) {
    return new DatasetMutationEvent(
      "ACCESS_REQUEST_APPROVED",
      null,
      null,
      null,
      null,
      null,
      requestId,
      null,
      null,
      null
    );
  }
}
