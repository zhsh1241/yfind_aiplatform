package com.yfind.aiplatform.identity;

import com.yfind.aiplatform.persistence.DomainEventStore;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class IdentityEventStore {
  private static final String DOMAIN_KEY = "identity";

  private final DomainEventStore domainEventStore;

  public IdentityEventStore(DomainEventStore domainEventStore) {
    this.domainEventStore = domainEventStore;
  }

  public List<IdentityMutationEvent> load() {
    return domainEventStore.load(DOMAIN_KEY, IdentityMutationEvent.class);
  }

  public void append(IdentityMutationEvent event) {
    domainEventStore.append(DOMAIN_KEY, event.requestId(), event.type(), event);
  }
}
