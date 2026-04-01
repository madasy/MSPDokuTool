# MSP DokuTool

IT infrastructure documentation tool for Managed Service Providers. Built to fill the gap that SDP MSP doesn't cover: **network documentation (IPAM)** and **visual infrastructure views (rack diagrams)**.

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

That's it. PostgreSQL, backend, frontend, and Authelia all start automatically.

### Test Login

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin + Technician |
| `technician` | `admin123` | Technician |

Authelia handles authentication at **https://localhost:9443**. On first access you'll be redirected to the Authelia login page.

### Using Trusted Certificates

Replace the self-signed certs in `certs/` with your own:

```bash
cp /path/to/your/cert.crt certs/server.crt
cp /path/to/your/cert.key certs/server.key
docker compose restart frontend authelia
```

### Trust Self-Signed Cert (macOS)

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/server.crt
```

## What It Does

- **Multi-tenant** -- switch between customers via the sidebar dropdown
- **Network / IPAM** -- subnets, VLANs, IP addresses with utilization tracking
- **Rack Diagrams** -- visual rack layouts with device positioning
- **Hardware Inventory** -- servers, switches, firewalls, APs with search and filtering
- **Datacenter / Public IPs** -- manage public IP ranges across all customers
- **Dashboard** -- aggregate stats and recent activity across all tenants

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, React Query 5 |
| Backend | Kotlin, Spring Boot 3.3, Spring Data JPA |
| Database | PostgreSQL 16 |
| Migrations | Flyway |
| Containerization | Docker, nginx |

## Architecture

```
Browser :3000 --> nginx (frontend)
                    |
                    |--> /api/* --> Spring Boot :8080 --> PostgreSQL :5432
                    |
                    |--> /*    --> React SPA (static files)
```

Three Docker containers:
- **mspdoku-frontend** -- nginx serving the React build + proxying `/api` to backend
- **mspdoku-backend** -- Spring Boot REST API
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

### Global

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/stats` | Aggregate counts (tenants, devices, subnets, IPs) |
| GET | `/api/v1/dashboard/activity?limit=20` | Recent changes across all tenants |
| GET | `/api/v1/tenants` | List all tenants |
| POST | `/api/v1/tenants` | Create tenant |
| GET | `/api/v1/datacenter/ip-ranges` | List public IP ranges |
| POST | `/api/v1/datacenter/ip-ranges` | Create public IP range |

### Tenant-scoped

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tenants/{id}/summary` | Infrastructure summary for tenant |
| GET | `/api/v1/devices?tenantId={id}` | Devices for tenant |
| GET | `/api/v1/racks?tenantId={id}` | Racks with devices for tenant |
| GET | `/api/v1/network/subnets?tenantId={id}` | Subnets for tenant |
| GET | `/api/v1/network/subnets/{id}/ips` | IP addresses in subnet |

## Project Structure

```
MSPDokuTool/
  backend/
    src/main/kotlin/com/msp/doku/
      controller/     # REST endpoints
      service/        # Business logic
      repository/     # JPA repositories
      domain/         # Entities
      dto/            # Data transfer objects
      config/         # Security, CORS
    src/main/resources/
      db/migration/   # Flyway SQL migrations (V1-V6)
  frontend/
    src/
      pages/          # Page components
      components/     # Reusable UI components
      services/       # API client wrappers
      hooks/          # Custom React hooks
  docker-compose.yml
```

## Complements (not replaces)

- **ServiceDesk Plus MSP** -- contracts, licenses, asset tracking, ticketing
- **Confluence** -- knowledge base, procedures, documentation
- **Bitwarden** -- password and credential management
