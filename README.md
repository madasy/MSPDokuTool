# MSP DokuTool

> **Status: Under active development** -- This is a side project and has not been tested in production environments. It's the beginning of what will hopefully become a really good documentation tool for MSPs. Feel free to try it out and [send feedback](https://github.com/madasy/MSPDokuTool/issues)!

An open-source IT infrastructure documentation tool built specifically for Managed Service Providers (MSPs). Think of it as an open alternative to tools like Hudu or IT Glue -- focused on network documentation, rack visualization, and structured IT documentation per customer.

## Features

### Multi-Tenant Customer Management
- Global tenant switcher in the sidebar
- Per-customer infrastructure views
- Customer-specific user accounts with 2FA

### Network & IPAM
- Subnet management with VLAN assignment
- IP address tracking with utilization metrics
- Status tracking (active, reserved, DHCP, free)
- Public IP range management in the datacenter view
- Individual IP assignment to customers and devices

### Infrastructure
- **Sites & Rooms** -- manage physical locations per customer
- **Rack Diagrams** -- visual 42U rack layouts with device positioning
- **Hardware Inventory** -- servers, switches, firewalls, APs, patch panels
- **Switch Port Management** -- visual faceplate, VLAN assignment, port status
- **Access Points** -- track APs with location, model, SSIDs, channel

### Structured Documentation (11 Templates)
Pre-built documentation sections per customer with structured fields + free-text notes:

1. **Access & Credentials** -- admin concepts, MFA requirements, break-glass accounts, privileged access paths
2. **Network Architecture** -- VLAN structure, routing design, WAN setup, site-to-site VPN
3. **Critical Services & Dependencies** -- business-critical systems, dependency chains
4. **Backup & Recovery** -- what's backed up, retention policies, RTO/RPO, recovery procedures
5. **Monitoring & Alerting** -- monitored systems, thresholds, alert destinations, escalation
6. **SOPs** -- tenant onboarding, server deployment, VM restore, incident handling
7. **Change & Update Strategy** -- patch management, maintenance windows, change approval
8. **Security Baseline** -- hardening standards, AV/EDR, logging, RBAC
9. **Disaster Recovery** -- datacenter down, ransomware, full tenant loss, recovery order
10. **External Integrations** -- ISPs, cloud providers, SaaS tools, licensing
11. **Naming Conventions** -- server, network, VLAN naming standards

### Authentication & User Management
- **Authelia** integration for authentication (forward-auth via nginx)
- Internal technicians: password-only login
- Customer users: password + TOTP 2FA
- Admin can create/delete tenant users, reset passwords and 2FA
- LDAP-ready for production environments

### Dashboard
- Aggregate stats across all tenants (devices, subnets, IPs)
- Recent activity feed

## Quick Start

```bash
# 1. Generate SSL certs (first time only)
mkdir -p certs
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout certs/server.key -out certs/server.crt \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# 2. Start everything
docker compose up
```

Open **https://localhost:3443** (accept the self-signed cert warning)

PostgreSQL, Spring Boot backend, React frontend, and Authelia all start automatically.

### Test Accounts

| Username | Password | Role | 2FA |
|----------|----------|------|-----|
| `admin` | `admin123` | Admin + Technician | No |
| `technician` | `admin123` | Technician | No |

Customer users can be created from the Benutzer (Users) page within each tenant. They are required to set up TOTP 2FA on first login.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, React Query 5 |
| Backend | Kotlin, Spring Boot 3.3, Spring Data JPA |
| Database | PostgreSQL 16 |
| Auth | Authelia (forward-auth proxy) |
| Migrations | Flyway |
| Containerization | Docker, nginx |

## Architecture

```
Browser :3443 --> nginx (HTTPS + forward-auth)
                    |
                    |--> /authelia/* --> Authelia :9091 (login, 2FA, session)
                    |--> /api/v1/*  --> Spring Boot :8080 --> PostgreSQL :5432
                    |--> /*         --> React SPA (static files)
```

Four Docker containers:
- **mspdoku-frontend** -- nginx with HTTPS, Authelia forward-auth, serves React build, proxies API
- **mspdoku-backend** -- Spring Boot REST API
- **mspdoku-postgres** -- PostgreSQL 16
- **mspdoku-authelia** -- Authentication portal (login, 2FA, session management)

## Development

### Run with Docker (recommended)

```bash
docker compose up --build
```

### Run locally (without Docker)

**Prerequisites:** Java 21, Node.js 22, PostgreSQL 16

```bash
# 1. Start PostgreSQL (or use Docker for just the DB)
docker compose up -d postgres

# 2. Start backend
cd backend
./gradlew bootRun

# 3. Start frontend (in another terminal)
cd frontend
npm install
npm run dev
```

Frontend dev server runs at `http://localhost:5173` with API proxy to `localhost:8080`.

### Reset database

```bash
docker compose down -v
docker compose up
```

### Trust Self-Signed Cert (macOS)

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/server.crt
```

## API Endpoints

### Global

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/stats` | Aggregate counts (tenants, devices, subnets, IPs) |
| GET | `/api/v1/dashboard/activity?limit=20` | Recent changes across all tenants |
| GET | `/api/v1/tenants` | List all tenants |
| POST | `/api/v1/tenants` | Create tenant |
| GET | `/api/v1/datacenter/ip-ranges` | List public IP ranges |
| POST | `/api/v1/datacenter/ip-ranges` | Create public IP range |

### Tenant-Scoped

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tenants/{id}/summary` | Infrastructure summary |
| GET | `/api/v1/devices?tenantId={id}` | Devices for tenant |
| GET | `/api/v1/racks?tenantId={id}` | Racks with devices |
| GET | `/api/v1/network/subnets?tenantId={id}` | Subnets |
| GET | `/api/v1/network/subnets/{id}/ips` | IP addresses in subnet |
| GET | `/api/v1/sites?tenantId={id}` | Sites for tenant |
| GET | `/api/v1/rooms?siteId={id}` | Rooms in site |
| GET | `/api/v1/devices/{id}/ports` | Switch ports |
| GET | `/api/v1/access-points?tenantId={id}` | Access points |
| GET | `/api/v1/tenants/{id}/docs` | Documentation sections overview |
| GET | `/api/v1/tenants/{id}/docs/{type}` | Documentation section detail |
| PUT | `/api/v1/tenants/{id}/docs/{type}` | Update documentation section |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List all users |
| POST | `/api/v1/users` | Create user |
| DELETE | `/api/v1/users/{username}` | Delete user |
| PUT | `/api/v1/users/{username}/password` | Reset password |
| POST | `/api/v1/users/{username}/reset-totp` | Reset 2FA |

## Project Structure

```
MSPDokuTool/
  authelia/               # Authelia config (users, access control)
  certs/                  # SSL certificates (gitignored)
  backend/
    src/main/kotlin/com/msp/doku/
      controller/         # REST endpoints
      service/            # Business logic
      repository/         # JPA repositories
      domain/             # Entities (Tenant, Device, Rack, Subnet, ...)
      dto/                # Data transfer objects
      config/             # Security, CORS
    src/main/resources/
      db/migration/       # Flyway SQL migrations (V1-V10)
  frontend/
    src/
      pages/              # Page components (Dashboard, Hardware, Racks, ...)
      components/         # Reusable UI components (Layout, Toast, ...)
      services/           # API client wrappers
      hooks/              # Custom React hooks
  docker-compose.yml      # Full stack: postgres + backend + frontend + authelia
```

## Contributing

This project is in its early stages. If you're an MSP looking for a documentation tool, give it a try and let me know what works and what doesn't.

- Report bugs and feature requests via [GitHub Issues](https://github.com/madasy/MSPDokuTool/issues)
- Pull requests are welcome

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE) -- see the LICENSE file for details.
