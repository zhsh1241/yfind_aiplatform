package com.yfind.aiplatform.dataset;

import java.util.List;

public record DatasetUploadFileRequest(
  String name,
  String contentType,
  long sizeBytes,
  String sha256
) {}
