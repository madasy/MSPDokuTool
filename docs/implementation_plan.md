# Implementation Plan: MSP Documentation Tool

## Goal Description
Initialize the MSP Documentation Tool project ("MSPDokuTool") with a modern, enterprise-ready technology stack. The goal is to set up a robust foundation for Multi-Tenancy, O365 Authentication, and the specific documentation use cases (Network/Rack).

## User Review Required
> [!IMPORTANT]
> **Tech Stack Selection**:
> *   **Backend**: Kotlin with Spring Boot 3 (Java 21). Chosen for robustness, type safety, and excellent ecosystem for enterprise apps.
> *   **Frontend**: React with TypeScript (Vite). Chosen for best-in-class component ecosystem (visualizations!) and performance.
> *   **Database**: PostgreSQL 16.
> *   **Infrastructure**: Docker Compose for local development.

## Proposed Changes

### Project Structure
Root directory: `/Users/anishmadassery/IdeaProjects/MSPDokuTool`
*   `backend/`: Spring Boot Application
*   `frontend/`: React Application
*   `docker/`: Docker Compose & DB Init scripts

### Backend Service ([NEW] `backend/`)
*   **Framework**: Spring Boot 3.3.x
*   **Language**: Kotlin
*   **Build Tool**: Gradle (Kotlin DSL)
*   **Dependencies**:
    *   `spring-boot-starter-web` (REST API)
    *   `spring-boot-starter-data-jpa` (Database Access)
    *   `spring-boot-starter-security` (Auth base)
    *   `spring-boot-starter-oauth2-resource-server` (JWT/OIDC Validation)
    *   `flyway-core` (Database Migrations)
    *   `postgresql` (JDBC Driver)

### Frontend Service ([NEW] `frontend/`)
*   **Framework**: React 18
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **Key Libraries** (Planned):
    *   `tanstack-query` (Data Fetching)
    *   `zustand` (State Management)
    *   `tailwindcss` (Styling)
    *   `react-router-dom` (Routing)

### Infrastructure ([NEW] `docker-compose.yml`)
*   PostgreSQL Container
*   Adminer/PgAdmin (Optional, for DB management)

## Verification Plan

### Automated Tests
*   **Backend**: `./gradlew test` (Unit & Integration Tests)
*   **Frontend**: `npm run test` (Vitest)

### Manual Verification
1.  Start stack via `docker-compose up -d` (DB) and IDE run configurations.
2.  Access Backend Health Endpoint (`/actuator/health`).
3.  Access Frontend Landing Page (`http://localhost:5173`).
