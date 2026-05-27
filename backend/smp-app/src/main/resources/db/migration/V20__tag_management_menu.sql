INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'menu:tagmgmt', '数据管理', 'Menu', 'READ', 1, '标签管理菜单'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'menu:tagmgmt');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code
FROM platform_permission
WHERE code = 'menu:tagmgmt'
AND NOT EXISTS (
    SELECT 1 FROM platform_role_permission rp
    WHERE rp.id = CONCAT('SUPER_ADMIN::', platform_permission.code)
);

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::menu:tagmgmt', 'BU_ADMIN', 'menu:tagmgmt'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::menu:tagmgmt');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'DATA_ANNOTATOR::menu:tagmgmt', 'DATA_ANNOTATOR', 'menu:tagmgmt'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'DATA_ANNOTATOR::menu:tagmgmt');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'DATA_REVIEWER::menu:tagmgmt', 'DATA_REVIEWER', 'menu:tagmgmt'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'DATA_REVIEWER::menu:tagmgmt');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::menu:tagmgmt', 'MODEL_TRAINER', 'menu:tagmgmt'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::menu:tagmgmt');
