# Built-in Authentication — Design Spec

**Date:** 2026-04-03
**Approach:** JWT + Spring Security, no external IdP

## Context

Remove ZITADEL/Authelia completely. Implement built-in authentication with own user management, login page, JWT tokens, TOTP 2FA, and first-start admin creation. Zero external auth dependencies.

---

## Section 1: Cleanup — Remove ZITADEL

### Docker
- Remove services: `zitadel-db`, `zitadel-api`, `zitadel-login`, `zitadel-proxy`
- Remove network: `zitadel`
- Remove volumes: `zitadel_data`, `zitadel_bootstrap`
- Remove `ZITADEL_ISSUER` env var from backend service

### Files to delete
- `authelia/` directory (all contents)
- `certs/` directory (SSL certs for old Authelia HTTPS setup)

### Backend files to replace
- `SecurityConfig.kt` — replace OIDC JWT decoder with custom JWT filter
- `AuthController.kt` — replace ZITADEL config endpoint with login/setup endpoints

### Frontend files to replace
- `auth/AuthProvider.tsx` — replace OIDC flow with JWT auth context
- `pages/LoginPage.tsx` — replace OIDC redirect with email/password form
- `pages/SetupPage.tsx` — replace ZITADEL client ID setup with admin creation

### Frontend files to remove
- Remove `oidc-client-ts` from `package.json`

### Config cleanup
- `application.properties` — remove `zitadel.*` and `spring.security.oauth2.resourceserver.*` lines

---

## Section 2: Database Schema

Flyway migration (next version after existing migrations):

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'TENANT_USER';
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
```

### Roles (string enum)
- `ADMIN` — full access to everything
- `TECHNICIAN` — access all tenants, read/write
- `TENANT_USER` — access only assigned tenant, 2FA required

### TOTP fields
- `totp_secret` — encrypted secret key (null = not set up)
- `totp_enabled` — user completed setup
- `totp_required` — forced by role (auto-set true for TENANT_USER)

### First-start detection
If users table has 0 rows → app shows admin setup page.

---

## Section 3: Backend Auth API

### Dependencies
- `io.jsonwebtoken:jjwt-api:0.12.6` + `jjwt-impl` + `jjwt-jackson`
- `dev.samstevens.totp:totp:1.7.1`

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/auth/login` | Public | Password login |
| POST | `/api/v1/auth/totp/verify` | Public* | Verify TOTP after login |
| POST | `/api/v1/auth/setup` | Public** | Create first admin (0 users only) |
| GET | `/api/v1/auth/me` | Auth | Current user info |
| GET | `/api/v1/auth/config` | Public | Returns `{ setupRequired: bool }` |
| POST | `/api/v1/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/v1/auth/logout` | Auth | Invalidate refresh token |

### Login flow

```
POST /auth/login { email, password }
  → OK, no TOTP    → { token, user }  (refresh token in httpOnly cookie)
  → OK, TOTP needed → { pendingToken, requires_totp: true }
  → Bad password    → 401

POST /auth/totp/verify { pendingToken, code }
  → Code valid      → { token, user }  (refresh token in httpOnly cookie)
  → Code invalid    → 401
```

### JWT payload
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "Display Name",
  "role": "ADMIN",
  "tenantId": null,
  "iat": 1234567890,
  "exp": 1234568790
}
```

Access token: 15 min. Refresh token: 7 days (httpOnly cookie).

### Spring Security filter chain
- Permit: `/api/v1/auth/login`, `/api/v1/auth/setup`, `/api/v1/auth/config`, `/api/v1/auth/totp/verify`, `/api/v1/auth/refresh`, `/actuator/**`
- All other `/api/**`: requires valid JWT

### JWT signing
- HMAC-SHA256 with a secret from `application.properties` (`jwt.secret`)
- Secret generated on first start if not set, or from env var `JWT_SECRET`

---

## Section 4: User Management API

### Admin endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/users` | List all users |
| POST | `/api/v1/users` | Create user |
| PUT | `/api/v1/users/{id}` | Update user |
| DELETE | `/api/v1/users/{id}` | Deactivate user |
| POST | `/api/v1/users/{id}/reset-password` | Reset password |
| POST | `/api/v1/users/{id}/reset-totp` | Clear TOTP |

### Self-service endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/api/v1/auth/me/password` | Change own password |
| POST | `/api/v1/auth/me/totp/setup` | Get QR code for TOTP |
| POST | `/api/v1/auth/me/totp/confirm` | Confirm TOTP with first code |
| DELETE | `/api/v1/auth/me/totp` | Disable own 2FA (not for TENANT_USER) |

### Create user request
```json
{
  "email": "user@example.com",
  "displayName": "Name",
  "password": "password",
  "role": "TENANT_USER",
  "tenantId": "uuid"
}
```

TENANT_USER auto-gets `totp_required = true`.

### Authorization
- ADMIN: all endpoints
- TECHNICIAN: manage TENANT_USER only (no admin/tech creation)
- TENANT_USER: self-service only (`/auth/me/*`)

---

## Section 5: Frontend

### Login page (`/login`)
- Email + password form
- On success with `requires_totp` → show 6-digit TOTP input
- On final success → store token in memory → redirect to `/`

### First-start setup (`/setup`)
- Shown when `GET /api/v1/auth/config` returns `{ setupRequired: true }`
- Form: email, display name, password, confirm password
- Creates admin → auto-login → redirect to `/`

### Auth context (replaces OIDC AuthProvider)
- `user` state from decoded JWT
- `isAuthenticated` flag
- `login(email, password)` → API call
- `verifyTotp(code)` → API call
- `logout()` → clear token + API call
- `getAccessToken()` → for apiClient Bearer header
- Auto-refresh on token expiry via refresh cookie

### Protected routes
- `RequireAuth` wrapper → redirects to `/login`
- Same pattern as current, reads from JWT instead of OIDC

### Layout
- User profile shows name + role from JWT
- Logout calls `auth.logout()`
- ADMIN sees user management nav
- TENANT_USER: tenant switcher hidden, only sees assigned tenant

### User management page (`/admin/users`)
- Table: email, name, role badge, tenant, active status, last login
- Create modal: email, name, password, role, tenant dropdown
- Actions: edit, reset password, reset 2FA, deactivate
- ADMIN only

---

## Out of Scope

- LDAP/Entra ID federation (future)
- Password complexity policies (use minimum 8 chars for now)
- Account lockout after failed attempts (future)
- Email verification (future)
- Password reset via email (future — admin resets for now)
