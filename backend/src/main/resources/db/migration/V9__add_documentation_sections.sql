CREATE TABLE documentation_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_type VARCHAR(100) NOT NULL,
    structured_data JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    updated_by VARCHAR(255),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT unique_section_per_tenant UNIQUE (tenant_id, section_type)
);

CREATE INDEX idx_doc_sections_tenant ON documentation_sections(tenant_id);
