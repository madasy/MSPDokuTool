# MSP Documentation Tool - Demo Walkthrough

This guide details how to start the application stack and walk through the implemented MVP features (Tenant Management, Rack Visualization, and Network Documentation).

> [!NOTE]
> For this MVP Demo, **Backend Authentication is DISABLED**. You do not need to configure Entra ID to test the functionality.

## 1. Prerequisites

*   Docker & Docker Compose
*   Node.js (v18+) & npm
*   Java JDK 21 (optional, for local backend dev)

## 2. Start the Backend

The backend and database run in Docker containers.

1.  Navigate to the project root:
    ```bash
    cd /Users/anishmadassery/IdeaProjects/MSPDokuTool
    ```
2.  Start the stack:
    ```bash
    docker compose up -d --build
    ```
3.  Verify backend health:
    *   Open [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
    *   Status should be `{"status":"UP"}`.

## 3. Start the Frontend

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies (if not already done):
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open the App: [http://localhost:5173](http://localhost:5173)

---

## 4. Feature Walkthrough

### A. Dashboard
*   Landing page showing high-level stats (currently placeholders).
*   **Action:** Click on "Tenants" in the sidebar.

### B. Tenant Management (Vertical Slice)
*   **View:** Displays a list of all tenants. Initially empty.
*   **Action:** Click **"New Tenant"**.
    *   Name: `Acme Corp`
    *   Identifier: `acme`
    *   Click **Create**.
*   **Verification:** Tenant appears in the table. Data is persisted in PostgreSQL.

### C. Rack Management (Visualization & DnD)
*   **Action:** Click on "Racks" in the sidebar.
*   **View:** Shows a list of Racks. *Note: Currently uses Mock Data for demonstration purposes purely because the "Create Site/Room/Rack" UI flow is not yet implemented.*
*   **Interaction:**
    *   Observe the 42U Rack Visualization.
    *   **Drag & Drop:** Try dragging "Core-Switch-01" or "ESXi-Host-01" to a different Unit position.
    *   The position updates instantly (client-side demo).

### D. Network Documentation (IPAM)
*   **Action:** Click on "Network & IP" in the sidebar.
*   **View:** Shows IP Plans / Subnets.
*   **Visualization:**
    *   See the "Heatmap" style visualization of Subnet utilization (Mock Data for preview).
    *   Observe the progress bars indicating IP usage.
*   **Backend Integration:** The Backend API for creation (`POST /api/v1/network/subnets`) is ready, but the UI currently displays a preview of how the documentation looks.

---

## 5. Next Steps for Development

1.  **Re-enable Security:** Revert `SecurityConfig.kt` to enforce OAuth2.
2.  **Complete Frontend Forms:** Add "Create Rack", "Create Subnet" forms linked to the real API.
3.  **Connect Graph:** Link Racks to Sites and Subnets to VLANs (Data Model relations).
