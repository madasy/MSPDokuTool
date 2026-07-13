-- Add missing audit columns to network_scan_results table
-- BaseEntity requires created_at and updated_at columns, which were missing from V16
ALTER TABLE network_scan_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE network_scan_results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
