-- Change network types to VARCHAR to avoid Hibernate mapping issues with inet/cidr types
-- We must cast old values to text explicitly
ALTER TABLE subnets ALTER COLUMN cidr TYPE VARCHAR(50) USING cidr::varchar;
ALTER TABLE subnets ALTER COLUMN gateway TYPE VARCHAR(50) USING gateway::varchar;
ALTER TABLE subnets ALTER COLUMN dhcp_start TYPE VARCHAR(50) USING dhcp_start::varchar;
ALTER TABLE subnets ALTER COLUMN dhcp_end TYPE VARCHAR(50) USING dhcp_end::varchar;

ALTER TABLE ip_addresses ALTER COLUMN address TYPE VARCHAR(50) USING address::varchar;
