# MSP DokuTool

> **Status: Under active development** -- This is a side project and has not been tested in production environments. It's the beginning of what will hopefully become a really good documentation tool for MSPs. Feel free to try it out and [send feedback](https://github.com/madasy/MSPDokuTool/issues)!

An open-source IT infrastructure documentation tool built specifically for Managed Service Providers (MSPs). Think of it as an open alternative to tools like Hudu or IT Glue -- focused on network documentation, rack visualization, and structured IT documentation per customer.

## Features

### Multi-Tenant Customer Management
- Global tenant switcher in the sidebar
- Per-customer infrastructure views
- Customer-specific user accounts with 2FA
- Tenant onboarding wizard (7-step guided setup)
- Documentation health scoring per tenant

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
- **Firewall Interfaces** -- WAN/LAN interface documentation
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
- Built-in JWT authentication (no external IdP required)
- First-start admin creation wizard
- Three roles: ADMIN, TECHNICIAN, TENANT_USER
- Optional TOTP 2FA (required for tenant users, optional for admins/techs)
- Admin can create users, reset passwords, and reset 2FA
- Self-service password change and TOTP setup

### Dashboard
- Action-oriented tenant dashboard with documentation health scores
- 7 category scores: Network, Hardware, Access, Monitoring, Backup, Recovery, Security
- Action cards showing what's missing or needs attention
- Aggregate stats and recent activity feed
- Global search across all entities (Cmd+K)

## Quick Start

```bash
docker compose up
```

Open **http://localhost:3000**

On first start, you'll be prompted to create an admin account. After that, just login.

Three containers start automatically: PostgreSQL, Spring Boot backend, and React frontend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, React Query 5 |
| Backend | Kotlin, Spring Boot 3.3, Spring Data JPA, Spring Security |
| Database | PostgreSQL 16 |
| Auth | Built-in JWT + BCrypt + TOTP |
| Migrations | Flyway |
| Containerization | Docker, nginx |

## Architecture

```
Browser :3000 --> nginx (frontend)
                    |
                    |--> /api/v1/*  --> Spring Boot :8080 --> PostgreSQL :5432
                    |--> /*         --> React SPA (static files)
```

Three Docker containers:
- **mspdoku-frontend** -- nginx serving the React build + proxying API
- **mspdoku-backend** -- Spring Boot REST API with JWT auth
- **mspdoku-postgres** -- PostgreSQL 16

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

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/auth/config` | Public | Check if setup is required |
| POST | `/api/v1/auth/setup` | Public | Create first admin (first start only) |
| POST | `/api/v1/auth/login` | Public | Login with email + password |
| POST | `/api/v1/auth/totp/verify` | Public | Verify TOTP code after login |
| GET | `/api/v1/auth/me` | Auth | Get current user info |
| PUT | `/api/v1/auth/me/password` | Auth | Change own password |
| POST | `/api/v1/auth/me/totp/setup` | Auth | Get TOTP QR code |
| POST | `/api/v1/auth/me/totp/confirm` | Auth | Confirm TOTP setup |

### User Management (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List all users |
| POST | `/api/v1/users` | Create user |
| PUT | `/api/v1/users/{id}` | Update user |
| DELETE | `/api/v1/users/{id}` | Deactivate user |
| POST | `/api/v1/users/{id}/reset-password` | Reset password |
| POST | `/api/v1/users/{id}/reset-totp` | Reset 2FA |

### Global

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/stats` | Aggregate counts |
| GET | `/api/v1/dashboard/activity?limit=20` | Recent changes |
| GET | `/api/v1/tenants` | List all tenants |
| POST | `/api/v1/tenants` | Create tenant |
| GET | `/api/v1/tenants/{id}/health` | Tenant health score |
| GET | `/api/v1/search?q=query` | Global search |
| GET | `/api/v1/datacenter/ip-ranges` | Public IP ranges |

### Tenant-Scoped

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tenants/{id}/summary` | Infrastructure summary |
| GET | `/api/v1/devices?tenantId={id}` | Devices |
| GET | `/api/v1/racks?tenantId={id}` | Racks with devices |
| GET | `/api/v1/sites?tenantId={id}` | Sites |
| GET | `/api/v1/rooms?siteId={id}` | Rooms |
| GET | `/api/v1/network/subnets?tenantId={id}` | Subnets |
| GET | `/api/v1/network/subnets/{id}/ips` | IP addresses |
| GET | `/api/v1/devices/{id}/ports` | Switch ports |
| GET | `/api/v1/access-points?tenantId={id}` | Access points |
| GET | `/api/v1/tenants/{id}/docs` | Documentation overview |
| GET | `/api/v1/tenants/{id}/docs/{type}` | Documentation section |
| PUT | `/api/v1/tenants/{id}/docs/{type}` | Update documentation |

## Project Structure

```
MSPDokuTool/
  backend/
    src/main/kotlin/com/msp/doku/
      controller/         # REST endpoints
      service/            # Business logic (Auth, JWT, TOTP, CRUD)
      repository/         # JPA repositories
      domain/             # Entities (Tenant, Device, Rack, Subnet, User, ...)
      dto/                # Data transfer objects
      config/             # Security, JWT filter, CORS
    src/main/resources/
      db/migration/       # Flyway SQL migrations (V1-V13)
  frontend/
    src/
      auth/               # AuthProvider (JWT context)
      pages/              # Page components (Dashboard, Hardware, Racks, ...)
      components/         # Reusable UI (Layout, Toast, CommandPalette, ...)
      services/           # API client wrappers
      hooks/              # Custom React hooks
  docker-compose.yml      # postgres + backend + frontend
```

## Contributing

This project is in its early stages. If you're an MSP looking for a documentation tool, give it a try and let me know what works and what doesn't.

- Report bugs and feature requests via [GitHub Issues](https://github.com/madasy/MSPDokuTool/issues)
- Pull requests are welcome

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE) -- see the LICENSE file for details.
