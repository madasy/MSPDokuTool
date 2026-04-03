-- Security fields
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS reboot_required BOOLEAN DEFAULT false;
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS av_product VARCHAR(255);
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS av_version VARCHAR(255);
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS firewall_enabled BOOLEAN DEFAULT false;
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS firewall_product VARCHAR(255);

-- Network fields
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS is_static_ip BOOLEAN DEFAULT false;
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS default_gateway VARCHAR(50);
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS dns_servers TEXT;

-- Network scan results (stored as JSON text)
CREATE TABLE IF NOT EXISTS network_scan_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_report_id UUID NOT NULL REFERENCES agent_reports(id) ON DELETE CASCADE,
    ip_address VARCHAR(50) NOT NULL,
    hostname VARCHAR(255),
    mac_address VARCHAR(17),
    open_ports TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'up',
    scanned_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_results_report ON network_scan_results(agent_report_id);
