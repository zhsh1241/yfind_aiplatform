package com.yf.smp.app.foundation;

import java.util.List;

public record FoundationStatusResponse(
    String service,
    String status,
    List<String> domains,
    List<String> enabledCapabilities
) {
}
