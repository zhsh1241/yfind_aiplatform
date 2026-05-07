package com.yfind.aiplatform.identity;

public class AuthForbiddenException extends RuntimeException {
  public AuthForbiddenException(String message) {
    super(message);
  }
}
