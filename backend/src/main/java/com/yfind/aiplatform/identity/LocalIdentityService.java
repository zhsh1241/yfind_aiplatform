package com.yfind.aiplatform.identity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.yfind.aiplatform.organization.OrganizationSummary;
import com.yfind.aiplatform.permission.PermissionCheckResponse;
import com.yfind.aiplatform.permission.PermissionService;

@Service
public class LocalIdentityService {

  public static final String FEATURE_TRACE = "TASK-identity-org-permission";
  private static final Duration SESSION_TTL = Duration.ofHours(8);
  private static final DateTimeFormatter DISPLAY_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    .withZone(ZoneId.of("Asia/Shanghai"));
  private final PermissionService permissionService;
  private final IdentityEventStore identityEventStore;
  private final Map<String, UserAccount> userAccounts;
  private final SecureRandom secureRandom = new SecureRandom();
  private final Map<String, AuthSession> sessions = new LinkedHashMap<>();

  public LocalIdentityService(
      PermissionService permissionService,
      IdentityEventStore identityEventStore,
      @Value("${security.bootstrap.admin-password:${YFIND_BOOTSTRAP_ADMIN_PASSWORD:admin123!}}") String adminPassword,
      @Value("${security.bootstrap.reviewer-password:${YFIND_BOOTSTRAP_REVIEWER_PASSWORD:reviewer123!}}") String reviewerPassword,
      @Value("${security.bootstrap.engineer-password:${YFIND_BOOTSTRAP_ENGINEER_PASSWORD:engineer123!}}") String engineerPassword
  ) {
    this.permissionService = permissionService;
    this.identityEventStore = identityEventStore;
    this.userAccounts = Map.of(
      "admin@yfind.local", new UserAccount(
        "usr-admin",
        "admin@yfind.local",
        "平台管理员",
        "platform-admin",
        "平台管理员",
        adminPassword,
        Set.of("platform-admin"),
        null
      ),
      "reviewer@yfind.local", new UserAccount(
        "usr-reviewer",
        "reviewer@yfind.local",
        "质检复核员",
        "quality-reviewer",
        "质检复核员",
        reviewerPassword,
        Set.of("quality-reviewer"),
        List.of("dataset:manage", "labeling:manage", "model:manage", "audit:read")
      ),
      "engineer@yfind.local", new UserAccount(
        "usr-engineer",
        "engineer@yfind.local",
        "算法工程师",
        "algorithm-engineer",
        "算法工程师",
        engineerPassword,
        Set.of("algorithm-engineer"),
        List.of("training:read", "training:execute", "training:manage", "model:read", "inference:read", "audit:read")
      )
    );
  }

  public AuthStatusResponse status(String authorizationHeader) {
    Optional<AuthPrincipal> principal = resolvePrincipal(authorizationHeader);
    return new AuthStatusResponse(
      principal.isPresent(),
      principal.isPresent() ? "BACKEND_SESSION_TOKEN" : "NONE",
      principal.map(AuthPrincipal::username).orElse("anonymous"),
      "YFIND_LOCAL_IAM",
      "YFIND_BACKEND_SESSION",
      FEATURE_TRACE
    );
  }

  public AuthLoginResponse login(AuthLoginRequest request) {
    String username = normalize(request.username());
    UserAccount account = userAccounts.get(username);
    if (account == null || !MessageDigest.isEqual(
        account.password().getBytes(StandardCharsets.UTF_8),
        String.valueOf(request.password()).getBytes(StandardCharsets.UTF_8))) {
      throw new AuthUnauthorizedException("账号或密码错误");
    }

    AuthSession session = createSession(account, "LOGIN", "system-login");
    sessions.put(session.token(), session);
    return new AuthLoginResponse(session.token(), currentUserForToken(session.token()), DISPLAY_TIME.format(session.expiresAt()), FEATURE_TRACE);
  }

  public void logout(String authorizationHeader) {
    String token = bearerToken(authorizationHeader).orElseThrow(() -> new AuthUnauthorizedException("缺少登录会话"));
    sessions.remove(token);
  }

  public CurrentUserResponse currentUser(String authorizationHeader) {
    AuthPrincipal principal = requirePrincipal(authorizationHeader);
    return currentUserForToken(principal.token());
  }

  public CurrentUserResponse currentUser() {
    AuthSession session = defaultAdminSession();
    return currentUserForToken(session.token());
  }

  private CurrentUserResponse currentUserForToken(String token) {
    AuthSession session = sessions.get(token);
    if (session == null) {
      session = defaultAdminSession();
    }
    return new CurrentUserResponse(
      session.userId(),
      session.username(),
      session.displayName(),
      currentOrganization(),
      List.of(
        new RoleSummary(session.roleKey(), session.roleName(), "由后端会话签发的生产可用角色")
      ),
      session.permissions(),
      "BACKEND_SESSION_TOKEN",
      "YFIND_LOCAL_IAM",
      FEATURE_TRACE
    );
  }

  public AuthPrincipal requirePrincipal(String authorizationHeader) {
    return resolvePrincipal(authorizationHeader)
      .orElseThrow(() -> new AuthUnauthorizedException("缺少有效登录会话，请先登录"));
  }

  public void requirePermission(String authorizationHeader, String permission) {
    AuthPrincipal principal = requirePrincipal(authorizationHeader);
    if (!principal.hasPermission(permission)) {
      throw new AuthForbiddenException("当前用户缺少权限: " + permission);
    }
  }

  public PermissionCheckResponse check(String authorizationHeader, String permission) {
    Optional<AuthPrincipal> principal = resolvePrincipal(authorizationHeader);
    return permissionService.check(permission, principal.map(AuthPrincipal::permissions).orElse(List.of()));
  }

  public AuthorizationRequestActionResponse createAuthorizationRequest(String authorizationHeader, AuthorizationRequestCreateRequest request) {
    AuthPrincipal principal = requirePrincipal(authorizationHeader);
    if (request.reason() == null || request.reason().isBlank() || request.reason().length() > 300) {
      throw new IllegalArgumentException("授权原因不能为空且不能超过 300 字");
    }
    UserAccount target = accountByRole(request.requestedRole())
      .orElseThrow(() -> new IllegalArgumentException("不支持的目标角色: " + request.requestedRole()));
    String requestId = "AUTH-" + Instant.now().toEpochMilli();
    identityEventStore.append(new IdentityMutationEvent(
      "AUTHORIZATION_REQUEST_CREATED",
      requestId,
      target.roleKey(),
      request.reason().trim(),
      "PENDING",
      principal.username(),
      null,
      Instant.now()
    ));
    return new AuthorizationRequestActionResponse(requestId, "PENDING", target.roleKey(), principal.username(), null, FEATURE_TRACE);
  }

  public AuthorizationRequestActionResponse approveAuthorizationRequest(String authorizationHeader, String requestId) {
    AuthPrincipal principal = requirePrincipal(authorizationHeader);
    if (!principal.hasPermission("identity:role:manage")) {
      throw new AuthForbiddenException("当前用户缺少权限: identity:role:manage");
    }
    AuthorizationRequestResponse target = listAuthorizationRequests().items().stream()
      .filter(request -> request.requestId().equals(requestId))
      .findFirst()
      .orElseThrow(() -> new IllegalArgumentException("授权申请不存在: " + requestId));
    if (!"PENDING".equals(target.status())) {
      return new AuthorizationRequestActionResponse(requestId, target.status(), target.requestedRole(), target.submittedBy(), target.approvedBy(), FEATURE_TRACE);
    }
    identityEventStore.append(new IdentityMutationEvent(
      "AUTHORIZATION_REQUEST_APPROVED",
      requestId,
      target.requestedRole(),
      target.reason(),
      "APPROVED",
      target.submittedBy(),
      principal.username(),
      Instant.now()
    ));
    return new AuthorizationRequestActionResponse(requestId, "APPROVED", target.requestedRole(), target.submittedBy(), principal.username(), FEATURE_TRACE);
  }

  public AuthLoginResponse loginWithApprovedAuthorization(String requestId) {
    AuthorizationRequestResponse request = listAuthorizationRequests().items().stream()
      .filter(item -> item.requestId().equals(requestId))
      .findFirst()
      .orElseThrow(() -> new AuthUnauthorizedException("授权申请不存在"));
    if (!"APPROVED".equals(request.status())) {
      throw new AuthForbiddenException("授权申请尚未批准");
    }
    UserAccount account = accountByRole(request.requestedRole())
      .orElseThrow(() -> new AuthUnauthorizedException("授权角色无可登录账号"));
    AuthSession session = createSession(account, requestId, request.approvedBy());
    sessions.put(session.token(), session);
    return new AuthLoginResponse(session.token(), currentUserForToken(session.token()), DISPLAY_TIME.format(session.expiresAt()), FEATURE_TRACE);
  }

  public AuthorizationRequestListResponse listAuthorizationRequests() {
    Map<String, AuthorizationAggregate> aggregates = new LinkedHashMap<>();
    for (IdentityMutationEvent event : identityEventStore.load()) {
      if (event.requestId() == null) {
        continue;
      }
      AuthorizationAggregate current = aggregates.getOrDefault(event.requestId(), new AuthorizationAggregate(
        event.requestId(),
        event.requestedRole(),
        labelForRole(event.requestedRole()),
        event.reason(),
        event.status(),
        event.submittedBy(),
        DISPLAY_TIME.format(event.occurredAt()),
        null,
        null
      ));
      if ("AUTHORIZATION_REQUEST_APPROVED".equals(event.type())) {
        current = new AuthorizationAggregate(
          current.requestId(),
          current.requestedRole(),
          current.requestedRoleLabel(),
          current.reason(),
          "APPROVED",
          current.submittedBy(),
          current.submittedAt(),
          event.approvedBy(),
          DISPLAY_TIME.format(event.occurredAt())
        );
      }
      aggregates.put(event.requestId(), current);
    }
    List<AuthorizationRequestResponse> items = new ArrayList<>(aggregates.values()).stream()
      .map(aggregate -> new AuthorizationRequestResponse(
        aggregate.requestId(),
        aggregate.requestedRole(),
        aggregate.requestedRoleLabel(),
        aggregate.reason(),
        aggregate.status(),
        aggregate.submittedBy(),
        aggregate.submittedAt(),
        aggregate.approvedBy(),
        aggregate.approvedAt(),
        FEATURE_TRACE
      ))
      .sorted((left, right) -> right.submittedAt().compareTo(left.submittedAt()))
      .toList();
    return new AuthorizationRequestListResponse(items, FEATURE_TRACE);
  }

  private AuthSession defaultAdminSession() {
    AuthSession existing = sessions.values().stream().filter(session -> "admin@yfind.local".equals(session.username())).findFirst().orElse(null);
    if (existing != null) {
      return existing;
    }
    AuthSession session = createSession(userAccounts.get("admin@yfind.local"), "BOOTSTRAP", "system-bootstrap");
    sessions.put(session.token(), session);
    return session;
  }

  private Optional<AuthPrincipal> resolvePrincipal(String authorizationHeader) {
    return bearerToken(authorizationHeader)
      .map(sessions::get)
      .filter(session -> "ACTIVE".equals(session.status()))
      .filter(session -> session.expiresAt().isAfter(Instant.now()))
      .map(session -> new AuthPrincipal(
        session.userId(),
        session.username(),
        session.displayName(),
        session.organizationCode(),
        session.organizationName(),
        session.roleKey(),
        session.roleName(),
        session.permissions(),
        session.token(),
        session.approvedBy()
      ));
  }

  private Optional<String> bearerToken(String authorizationHeader) {
    if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
      return Optional.empty();
    }
    return Optional.of(authorizationHeader.substring("Bearer ".length()).trim()).filter(value -> !value.isBlank());
  }

  private AuthSession createSession(UserAccount account, String approvalSource, String approvedBy) {
    Instant now = Instant.now();
    return new AuthSession(
      randomToken(),
      account.userId(),
      account.username(),
      account.displayName(),
      "YFI-LOCAL",
      "YFI 智造中心（本地生产可用）",
      account.roleKey(),
      account.roleName(),
      account.permissions() == null ? permissionService.localAdminPermissionKeys() : account.permissions(),
      now,
      now.plus(SESSION_TTL),
      "ACTIVE",
      approvedBy + "/" + approvalSource,
      FEATURE_TRACE
    );
  }

  private String randomToken() {
    byte[] bytes = new byte[32];
    secureRandom.nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }

  private String normalize(String username) {
    return username == null ? "" : username.trim().toLowerCase();
  }

  private Optional<UserAccount> accountByRole(String roleKey) {
    return userAccounts.values().stream().filter(account -> account.roleKey().equals(roleKey) || account.roleAliases().contains(roleKey)).findFirst();
  }

  private String labelForRole(String roleKey) {
    return accountByRole(roleKey).map(UserAccount::roleName).orElse(roleKey);
  }

  public OrganizationSummary currentOrganization() {
    return new OrganizationSummary(
      "org-yfi-local",
      "YFI-LOCAL",
      "YFI 智造中心（本地生产可用）",
      "tenant",
      null
    );
  }

  private record UserAccount(
      String userId,
      String username,
      String displayName,
      String roleKey,
      String roleName,
      String password,
      Set<String> roleAliases,
      List<String> permissions
  ) {}

  private record AuthorizationAggregate(
      String requestId,
      String requestedRole,
      String requestedRoleLabel,
      String reason,
      String status,
      String submittedBy,
      String submittedAt,
      String approvedBy,
      String approvedAt
  ) {}
}
