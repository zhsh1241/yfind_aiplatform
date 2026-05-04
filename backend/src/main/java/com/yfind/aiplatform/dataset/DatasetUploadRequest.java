package com.yfind.aiplatform.dataset;

import java.util.List;

public record DatasetUploadRequest(
  String datasetName,
  String owner,
  List<String> tags,
  List<DatasetUploadFileRequest> files
) {}
