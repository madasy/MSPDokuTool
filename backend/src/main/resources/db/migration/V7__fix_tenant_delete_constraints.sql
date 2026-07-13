-- V1 defined sites.tenant_id twice: inline with ON DELETE CASCADE and a duplicate
-- fk_sites_tenant with default NO ACTION that blocks every tenant delete.
ALTER TABLE sites DROP CONSTRAINT IF EXISTS fk_sites_tenant;
