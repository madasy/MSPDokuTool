CREATE TABLE switch_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    port_number INTEGER NOT NULL,
    port_name VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'down',
    mode VARCHAR(20) NOT NULL DEFAULT 'access',
    access_vlan_id INTEGER,
    tagged_vlans TEXT,
    speed VARCHAR(20),
    connected_device VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT unique_port_per_device UNIQUE (device_id, port_number)
);

CREATE INDEX idx_switch_ports_device ON switch_ports(device_id);
