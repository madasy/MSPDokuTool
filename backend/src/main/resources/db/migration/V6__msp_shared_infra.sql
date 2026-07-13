-- Tenant type: the MSP documents itself as a tenant
ALTER TABLE tenants ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER';

-- Shared resources: owned by the MSP hierarchy, optionally assigned to a consuming customer
ALTER TABLE vlans ADD COLUMN assigned_tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
ALTER TABLE subnets ADD COLUMN assigned_tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
ALTER TABLE ip_addresses ADD COLUMN assigned_tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
ALTER TABLE devices ADD COLUMN assigned_tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

-- Public IP ranges are subnets flagged public
ALTER TABLE subnets ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- VPN / IPsec tunnels (documentation only; secret_ref names a Bitwarden entry)
CREATE TABLE vpn_tunnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    local_device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    remote_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    ike_version VARCHAR(10),
    encryption VARCHAR(20),
    hash VARCHAR(20),
    dh_group INTEGER,
    secret_ref VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vpn_tunnel_local_subnets (
    tunnel_id UUID NOT NULL REFERENCES vpn_tunnels(id) ON DELETE CASCADE,
    subnet_id UUID NOT NULL REFERENCES subnets(id) ON DELETE CASCADE,
    PRIMARY KEY (tunnel_id, subnet_id)
);

CREATE TABLE vpn_tunnel_remote_subnets (
    tunnel_id UUID NOT NULL REFERENCES vpn_tunnels(id) ON DELETE CASCADE,
    subnet_id UUID NOT NULL REFERENCES subnets(id) ON DELETE CASCADE,
    PRIMARY KEY (tunnel_id, subnet_id)
);

-- Free-form documentation attachable to any entity
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content_markdown TEXT NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);

CREATE TABLE custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    value VARCHAR(1000) NOT NULL,
    field_type VARCHAR(10) NOT NULL DEFAULT 'TEXT',
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_custom_field UNIQUE (entity_type, entity_id, name)
);
CREATE INDEX idx_custom_fields_entity ON custom_fields(entity_type, entity_id);
