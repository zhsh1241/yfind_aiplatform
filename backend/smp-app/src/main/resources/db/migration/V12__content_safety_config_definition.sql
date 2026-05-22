INSERT INTO platform_config_definition (config_key, group_name, display_name, value_type, default_value, sensitive, scope_allowed, validation_rule, status, created_at)
VALUES ('content_safety.endpoint', 'security', '内容安全服务 Endpoint', 'STRING', 'TODO_CONFIRM_CONTENT_SAFETY_ENDPOINT', TRUE, 'GLOBAL,BU', 'todoConfirm', 'ACTIVE', CURRENT_TIMESTAMP);
