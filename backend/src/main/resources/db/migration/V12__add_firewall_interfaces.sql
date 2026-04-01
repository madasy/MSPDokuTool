CREATE TABLE firewall_interfaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    interface_name VARCHAR(50) NOT NULL,
    interface_type VARCHAR(30) NOT NULL DEFAULT 'lan',
    zone VARCHAR(50),
    ip_address VARCHAR(50),
    subnet_mask VARCHAR(50),
    vlan_id INTEGER,
    dhcp_enabled BOOLEAN DEFAULT false,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'enabled',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT unique_fw_interface UNIQUE (device_id, interface_name)
);

CREATE INDEX idx_fw_interfaces_device ON firewall_interfaces(device_id);
