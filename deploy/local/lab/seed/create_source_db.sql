SELECT 'CREATE DATABASE smp_source_mes'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'smp_source_mes')\gexec
