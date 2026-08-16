-- Migration: 009_add_tenant_name_to_connections
-- Adds tenant_name column to connections table for friendly display name.

ALTER TABLE connections ADD COLUMN tenant_name VARCHAR(255) NULL AFTER tenant_id;

-- Backfill any tenant names that were stored inside config->>'$.tenant_name'
UPDATE connections 
SET tenant_name = JSON_UNQUOTE(JSON_EXTRACT(config, '$.tenant_name')) 
WHERE JSON_EXTRACT(config, '$.tenant_name') IS NOT NULL;
