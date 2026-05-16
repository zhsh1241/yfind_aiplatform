package com.yf.smp.app.platform;

public enum PlatformError {
    UNAUTHORIZED(40100, 401),
    FORBIDDEN(40300, 403),
    NOT_FOUND(40400, 404),
    CONFLICT(40900, 409),
    BUSINESS_RULE_FAILED(42200, 422);

    private final int businessCode;
    private final int httpStatus;

    PlatformError(int businessCode, int httpStatus) {
        this.businessCode = businessCode;
        this.httpStatus = httpStatus;
    }

    public int businessCode() {
        return businessCode;
    }

    public int httpStatus() {
        return httpStatus;
    }
}
