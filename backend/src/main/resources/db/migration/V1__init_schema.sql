-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants (Clients)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    identifier VARCHAR(64) NOT NULL UNIQUE, -- For URL/Subdomain
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sites (Locations)
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sites_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 3. Rooms
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    floor VARCHAR(50),
    description TEXT
);

-- 4. Racks
CREATE TABLE racks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    height_units INTEGER NOT NULL DEFAULT 42,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Devices (Assets)
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rack_id UUID REFERENCES racks(id) ON DELETE SET NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL, -- If not in rack
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    serial_number VARCHAR(100),
    device_type VARCHAR(50) NOT NULL, -- server, switch, router, firewall, patchpanel, etc.
    position_u INTEGER, -- Bottom U position
    height_u INTEGER DEFAULT 1,
    facing VARCHAR(20) DEFAULT 'front', -- front/rear
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_rack_or_site CHECK (rack_id IS NOT NULL OR site_id IS NOT NULL)
);

-- 6. Interfaces (Physical Ports)
CREATE TABLE interfaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g. "Gi1/0/1" or "eth0"
    mac_address VARCHAR(17),
    type VARCHAR(50) DEFAULT 'copper', -- copper, fiber, virtual
    description TEXT,
    CONSTRAINT unique_interface_per_device UNIQUE (device_id, name)
);

-- 7. Connections (Cables)
-- Represents a physical link between two interfaces
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_a_id UUID NOT NULL REFERENCES interfaces(id) ON DELETE CASCADE,
    endpoint_b_id UUID NOT NULL REFERENCES interfaces(id) ON DELETE CASCADE,
    cable_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_connection_a UNIQUE (endpoint_a_id), -- Port can only have one cable
    CONSTRAINT unique_connection_b UNIQUE (endpoint_b_id),
    CONSTRAINT check_distinct_endpoints CHECK (endpoint_a_id <> endpoint_b_id)
);

-- 8. Connection History (Audit)
CREATE TABLE connection_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interface_id UUID NOT NULL REFERENCES interfaces(id) ON DELETE CASCADE,
    connected_device_name VARCHAR(255),
    connected_port_name VARCHAR(255),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP WITH TIME ZONE
);

-- 9. Networks (VLANs / Subnets)
CREATE TABLE vlans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vlan_id INTEGER NOT NULL,
    name VARCHAR(255),
    description TEXT,
    CONSTRAINT unique_vlan_per_tenant UNIQUE (tenant_id, vlan_id)
);

CREATE TABLE subnets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vlan_id UUID REFERENCES vlans(id) ON DELETE SET NULL,
    cidr CIDR NOT NULL, -- PostgreSQL native CIDR type
    gateway INET,
    dhcp_start INET,
    dhcp_end INET,
    description TEXT
);

CREATE TABLE ip_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subnet_id UUID NOT NULL REFERENCES subnets(id) ON DELETE CASCADE,
    address INET NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, reserved, dhcp
    hostname VARCHAR(255),
    description TEXT,
    interface_id UUID REFERENCES interfaces(id) ON DELETE SET NULL, -- Link to device
    CONSTRAINT unique_ip_per_subnet UNIQUE (subnet_id, address)
);

-- 10. IAM & RBAC (Entra ID Mapping)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    external_id VARCHAR(255) UNIQUE, -- Entra ID Object ID (User)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE group_role_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entra_group_oid VARCHAR(255) NOT NULL,
    role_name VARCHAR(50) NOT NULL, -- ROLE_MSP_ADMIN, ROLE_TENANT_ADMIN, etc.
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = Global
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_mapping UNIQUE (entra_group_oid, role_name, tenant_id)
);

