package com.yf.smp.app.platform;

public class PlatformException extends RuntimeException {
    private final PlatformError error;
    private final int businessCode;
    private final int httpStatus;

    public PlatformException(PlatformError error, String message) {
        super(message);
        this.error = error;
        this.businessCode = error.businessCode();
        this.httpStatus = error.httpStatus();
    }

    public PlatformException(int businessCode, int httpStatus, String message) {
        super(message);
        this.error = null;
        this.businessCode = businessCode;
        this.httpStatus = httpStatus;
    }

    public PlatformError error() {
        return error;
    }

    public int businessCode() {
        return businessCode;
    }

    public int httpStatus() {
        return httpStatus;
    }
}
