CREATE TABLE public_ip_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    range_id UUID NOT NULL REFERENCES public_ip_ranges(id) ON DELETE CASCADE,
    ip_address VARCHAR(50) NOT NULL,
    assigned_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    assigned_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'free',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT unique_ip_per_range UNIQUE (range_id, ip_address)
);

CREATE INDEX idx_ip_assignments_range ON public_ip_assignments(range_id);
CREATE INDEX idx_ip_assignments_tenant ON public_ip_assignments(assigned_tenant_id);
