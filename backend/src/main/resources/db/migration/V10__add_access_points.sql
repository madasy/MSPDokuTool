CREATE TABLE access_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    mac_address VARCHAR(17),
    ip_address VARCHAR(50),
    location_description VARCHAR(500),
    floor VARCHAR(50),
    room VARCHAR(100),
    mount_type VARCHAR(50) DEFAULT 'ceiling',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    channel VARCHAR(20),
    ssids TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_points_site ON access_points(site_id);
