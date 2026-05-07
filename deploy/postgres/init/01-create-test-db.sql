-- 本地 Docker PostgreSQL 初始化脚本。
-- 主库由 POSTGRES_DB 创建；这里额外创建脚手架/集成测试库。
SELECT 'CREATE DATABASE yfind_aiplatform_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'yfind_aiplatform_test')\gexec
