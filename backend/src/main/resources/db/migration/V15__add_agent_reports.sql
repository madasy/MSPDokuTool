-- Agent API keys per tenant
CREATE TABLE agent_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_keys_tenant ON agent_keys(tenant_id);

-- Agent reports (latest inventory per hostname)
CREATE TABLE agent_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    hostname VARCHAR(255) NOT NULL,
    os_name VARCHAR(255),
    os_version VARCHAR(255),
    kernel VARCHAR(255),
    cpu_model VARCHAR(255),
    cpu_cores INTEGER,
    ram_total_mb BIGINT,
    ram_used_mb BIGINT,
    disk_total_gb BIGINT,
    disk_used_gb BIGINT,
    uptime_seconds BIGINT,
    ip_addresses TEXT,
    mac_addresses TEXT,
    network_interfaces TEXT,
    installed_software TEXT,
    running_services TEXT,
    pending_updates INTEGER,
    av_status VARCHAR(255),
    domain_joined BOOLEAN,
    domain_name VARCHAR(255),
    last_boot TIMESTAMP,
    agent_version VARCHAR(50),
    reported_at TIMESTAMP NOT NULL DEFAULT now(),
    linked_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT unique_hostname_per_tenant UNIQUE (tenant_id, hostname)
);

CREATE INDEX idx_agent_reports_tenant ON agent_reports(tenant_id);
CREATE INDEX idx_agent_reports_hostname ON agent_reports(hostname);
