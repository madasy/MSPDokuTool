# MSP Documentation Tool

Multi-Tenant Documentation System for Managed Service Providers.

## Tech Stack
*   **Backend**: Kotlin, Spring Boot 3, PostgreSQL
*   **Frontend**: React, TypeScript, Vite
*   **Infrastructure**: Docker Compose

## Getting Started

### Prerequisites
*   Java 21
*   Node.js 20+
*   Docker & Docker Compose

### 1. Start Infrastructure (PostgreSQL)
```bash
docker-compose up -d
```

### 2. Backend Setup
The backend is a standard Gradle project.
```bash
cd backend
# Generate Wrapper (if not present) 
# gradle wrapper

# Run Application
./gradlew bootRun
```
*   API: http://localhost:8080
*   Swagger UI: http://localhost:8080/swagger-ui.html (once added)

### 3. Frontend Setup
The frontend is a Vite + React project.
```bash
cd frontend
npm install
npm run dev
```
*   App: http://localhost:5173

## Project Structure
*   `backend/`: Spring Boot Application source code
*   `frontend/`: React Application source code
*   `docker-compose.yml`: Database configuration
