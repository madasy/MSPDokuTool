# Datenmodell & Architektur für MSP-Dokumentationssystem

## 1. Architektur-Empfehlung: Relational vs. Graph

**Empfehlung:** **Relationales Datenbankmodell (PostgreSQL)** mit rekursiven Abfragen (Recursive CTEs) für Kabelwege.

**Begründung:**
1.  **Multi-Tenancy & Datensicherheit:** Relationale Datenbanken (RDBMS) bieten ausgereifte Mechanismen zur strikten Datentrennung (Row-Level Security, Schemas), die für ein mandantenfähiges MSP-Tool essenziell sind. Graph-Datenbanken (z.B. Neo4j) haben hier oft komplexere Zugriffsmodelle.
2.  **Datenintegrität:** Strenge Typisierung und Constraints (`FOREIGN KEY`, `NOT NULL`, `CHECK`) sind entscheidend, um die Qualität der Dokumentation zu sichern. Ein "toter Link" auf einen nicht mehr existierenden Switch-Port darf nicht passieren.
3.  **Abfrage-Komplexität:** Die Vernetzungstiefe in KMU-Netzwerken ist meist überschaubar (Gerät -> Dose -> Patchfeld -> Switch). Dies lässt sich performant mit SQL abbilden. Echte Graph-Use-Cases (Social Networks, Routing über 100 Hops) liegen hier selten vor.
4.  **Reporting & Listen:** Die meisten Views sind Listen (alle Assets, alle Verträge, alle Subnetze), was RDBMS optimiert bedienen.
5.  **Historisierung:** Temporale Datenhaltung (Temporal Tables) ist im SQL-Standard gut definiert.

---

## 2. Kern-Entitäten & Schema (ERD-Entwurf)

Alle Tabellen haben implizit:
*   `id`: UUID (Primary Key)
*   `tenant_id`: UUID (Foreign Key auf `tenants`, Partitionierungsschlüssel)
*   `created_at`, `updated_at`: Timestamps

### Globale Struktur/Organisation
*   **Tenants** (`tenants`): Mandaten (Kunden).
    *   `name`, `identifier` (für Subdomain/URL), `sso_config_id`.
*   **Sites** (`sites`): Standorte.
    *   `name`, `address`, `city`, `country`.
*   **Rooms** (`rooms`): Räume innerhalb eines Standortes.
    *   `site_id`, `name`, `floor`.

### Physische Infrastruktur (Rack & Devices)
*   **Racks** (`racks`): Serverschränke.
    *   `room_id`, `name`, `height_units` (z.B. 42), `width_standard` (19").
*   **Devices** (`devices`): Physische Geräte (Server, Switch, Router, Firewall, PDU, Patchpanel).
    *   `rack_id` (nullable), `site_id` (wenn nicht im Rack), `name`, `model`, `serial_number`, `asset_tag`.
    *   `position_u` (Unterkante in HE), `height_u` (Höhe in HE), `facing` (Front/Rear).
    *   `device_type` (Enum: 'server', 'switch', 'router', 'firewall', 'patchpanel', 'pdu', 'wifi_ap', 'other').
    *   `status` (Enum: 'active', 'planned', 'storage', 'retired').

### Vernetzung (Layer 1 & 2)
*   **Interfaces** (`interfaces`): Physische oder logische Schnittstellen an Geräten.
    *   `device_id`, `name` (z.B. "eth0", "Gi1/0/1"), `mac_address`.
    *   `type` (Enum: 'copper', 'fiber', 'wifi', 'virtual').
*   **Cables/Connections** (`connections`): Physische Kabelverbindung.
    *   `endpoint_a_id` (FK `interfaces`), `endpoint_b_id` (FK `interfaces`).
    *   `cable_type` (z.B. "Cat6a", "OM4").
    *   `status` (Enum: 'active', 'planned').
    *   **Wichtig:** Modelliert als Link zwischen zwei Interfaces. Ein Patchkabel verbindet z.B. `Server:eth0` <-> `Patchpanel:Port1`. Ein weiteres Kabel verbindet `Patchpanel:Port1-Rear` <-> `Switch:Port24`.
*   **Connection History** (`connection_history`): Historisierung der Port-Belegung.
    *   `interface_id`, `connected_device_name`, `connected_mac`, `vlan_id`.
    *   `valid_from` (Timestamp), `valid_to` (Timestamp, NULL = aktuell).
    *   *Trigger-basiert gefüllt bei Änderungen an `connections` oder via SNMP-Scan.*

### Logische Netzwerke (Layer 3) & IPAM
*   **VLANs** (`vlans`):
    *   `site_id` (oder global pro Tenant), `vlan_id` (Tag), `name`, `description`.
*   **Subnets** (`subnets`):
    *   `vlan_id` (nullable), `network_address` (CIDR, z.B. 192.168.10.0/24), `gateway`, `dhcp_start`, `dhcp_end`, `dns_servers`.
*   **IP Addresses** (`ip_addresses`):
    *   `subnet_id`, `address` (Inet), `status` (active, reserved, dhcp), `description`.
    *   `interface_id` (FK auf `interfaces`, nullable -> Verknüpfung Gerät <-> IP).

### Verträge & Lizenzen
*   **Contacts** (`contacts`): Ansprechpartner (intern/extern).
    *   `name`, `email`, `phone`, `role`.
*   **Contracts** (`contracts`): Verträge (Wartung, Internet, Leasing).
    *   `provider_name`, `contract_number`, `start_date`, `end_date`, `notice_period_days`.
    *   `sla_description`, `support_contact_id`.
*   **Licenses** (`licenses`): Software-Lizenzen.
    *   `name`, `key`, `quantity`, `expiration_date`.
*   **Asset-Contract-Links** (`asset_contracts`): M:N Beziehung.
    *   `contract_id`, `asset_id` (polymorph auf `devices` oder `licenses`).

### WiFi & Cloud
*   **WiFi Networks** (`wifi_networks`): SSIDs.
    *   `site_id`, `ssid`, `security_type`, `psk_encrypted` (oder Radius-Ref).
*   **Cloud Services** (`cloud_services`): SaaS/IaaS Abos.
    *   `name`, `provider` (AWS, Azure, O365), `account_id`, `url`.

---

## 3. SQL Constraints & Logik

*   **Unique Rack Units:** Einem `rack_id` darf keine zwei `devices` zugeordnet sein, deren `position_u` + `height_u` sich überschneiden (muss applikationsseitig oder über komplexe Constraints/Trigger geprüft werden).
*   **MAC Address Format:** `CHECK (mac_address ~* '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')`
*   **IP Address:** Nutzung von nativen PostgreSQL Network Types (`inet`, `cidr`) für performante Subnetz-Berechnungen (`inet '192.168.1.5' << inet '192.168.1.0/24'`).
*   **Foreign Keys:** `ON DELETE RESTRICT` für kritische Infrastruktur (Löschen eines Racks nicht erlaubt, wenn Geräte drin sind).

---

## 4. Beispiel-Daten (Tenant: "Acme Corp")

### Tabelle `racks`
| id | tenant_id | name | height_units | location |
|----|-----------|------|--------------|----------|
| r1 | t_acme | Rz-01 | 42 | Serverraum EG |

### Tabelle `devices`
| id | rack_id | name | type | position_u | height_u |
|----|---------|------|------|------------|----------|
| d1 | r1 | Firewall-XG | firewall | 40 | 1 |
| d2 | r1 | Core-Switch | switch | 38 | 2 |
| d3 | r1 | SRV-HyperV-01 | server | 10 | 2 |
| d4 | r1 | Patch-Panel-A | patchpanel | 42 | 1 |

### Tabelle `interfaces`
| id | device_id | name | mac |
|----|-----------|------|-----|
| i1 (d1) | d1 | LAN | AA:BB:CC:DD:EE:01 |
| i2 (d2) | d2 | Gi1/0/24 | AA:BB:CC:DD:EE:02 |
| i3 (d3) | d3 | eth0 | AA:BB:CC:DD:EE:03 |
| i4 (d4) | d4 | Port 1 | - |

### Tabelle `connections` (Kabel)
*Verbindung Server -> Patchpanel -> Switch*
1.  **Server zu Patchpanel:** `endpoint_a`: i3 (SRV eth0) <-> `endpoint_b`: i4 (Patchpanel Port 1 Cost-Side)
2.  **Patchpanel zu Switch:** `endpoint_a`: i4_rear (Patchpanel Port 1 Switch-Side) <-> `endpoint_b`: i2 (Switch Port 24)

### Tabelle `connection_history` (für Switch Port)
| interface_id | connected_device | connected_mac | valid_from | valid_to |
|--------------|------------------|---------------|------------|----------|
| i2 (Sw Port 24)| SRV-Old-01 | AA:00:00:11:22 | 2023-01-01 | 2023-06-30 |
| i2 (Sw Port 24)| SRV-HyperV-01 | AA:BB:CC:DD:EE | 2023-07-01 | NULL (aktuell) |
