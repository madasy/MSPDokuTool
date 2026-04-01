CREATE TABLE public_ip_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cidr VARCHAR(50) NOT NULL,
    description TEXT,
    assigned_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    provider VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_public_ip_ranges_tenant ON public_ip_ranges(assigned_tenant_id);
