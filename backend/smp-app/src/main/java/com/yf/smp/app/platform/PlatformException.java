package com.yf.smp.app.platform;

public class PlatformException extends RuntimeException {
    private final PlatformError error;

    public PlatformException(PlatformError error, String message) {
        super(message);
        this.error = error;
    }

    public PlatformError error() {
        return error;
    }
}
