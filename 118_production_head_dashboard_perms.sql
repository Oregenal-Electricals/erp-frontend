INSERT INTO role_permissions (id, "companyId", "roleId", permission, "isActive", "updatedAt")
SELECT gen_random_uuid(), r."companyId", r.id, 'PRODUCTION_DASHBOARD_VIEW', true, now()
FROM roles r WHERE r.name = 'PRODUCTION_HEAD'
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (id, "companyId", "roleId", permission, "isActive", "updatedAt")
SELECT gen_random_uuid(), r."companyId", r.id, 'INVENTORY_DASHBOARD_VIEW', true, now()
FROM roles r WHERE r.name = 'PRODUCTION_HEAD'
ON CONFLICT DO NOTHING;
