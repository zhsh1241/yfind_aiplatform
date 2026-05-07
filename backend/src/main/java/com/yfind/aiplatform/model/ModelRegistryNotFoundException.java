package com.yfind.aiplatform.model;

public class ModelRegistryNotFoundException extends RuntimeException {
  public ModelRegistryNotFoundException(String message) {
    super(message);
  }
}