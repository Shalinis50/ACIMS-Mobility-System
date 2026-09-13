# ACMIS — System Architecture & Design Overview

## 1. Executive Summary
The **Automated Campus Mobility Information System (ACMIS)** is an integrated campus transportation management platform designed to provide real-time visibility into campus mobility assets (shuttles, buggies, transit points), predict arrivals and delays, manage passenger queues, and recommend optimal travel alternatives across campus.

---

## 2. Architectural Principles & Boundaries
To enable three developers to build independently without coupling or merge friction, the system follows a **modular architecture** with strict contract boundaries:

```text
+-------------------------------------------------------------------------+
|                              CLIENT TIER                                |
|          Web Portal / Mobile Interface / Campus Info Displays           |
+-------------------------------------------------------------------------+
                                    | HTTP / WebSocket
                                    v
+-------------------------------------------------------------------------+
|                             API GATEWAY                                 |
|               Routing, Authentication, Request Validation               |
+-------------------------------------------------------------------------+
       |                         |                           |
       v                         v                           v
+-------------------+   +--------------------+   +------------------------+
|  SHALINI'S DOMAIN |   |  BRINDA'S DOMAIN   |   |   DEVELOPER 3 DOMAIN   |
| ----------------- |   | ------------------ |   | ---------------------- |
| • ETA & AI Delay  |   | • Live Tracking    |   | • [Assigned Module]    |
|   Prediction      |   | • Smart Travel     |   |                        |
| • Queue System    |   |   Recommendation   |   |                        |
+-------------------+   +--------------------+   +------------------------+
       \                         |                          /
        \                        |                         /
         +------------------------------------------------+
                                  v
+-------------------------------------------------------------------------+
|                            SHARED DATA TIER                             |
|          Relational Persistence, Caching, and Message Broker            |
+-------------------------------------------------------------------------+
```

---

## 3. Team Responsibilities & Module Allocation

### 3.1 Shalini (`shalini` branch)
1. **ETA & AI Delay Prediction Module**:
   - Computes expected arrival times for transit vehicles at campus stops.
   - Considers historical transit patterns, real-time stop counts, and traffic/weather factors.
   - Exposes predicted ETA timestamps and delay status indicators.
2. **Queue System Module**:
   - Manages passenger counts and virtual queues at designated campus stops.
   - Monitors boarding capacity and estimated waiting times for queued passengers.
   - Provides status feeds to help balance passenger loads.

### 3.2 Brinda (`brinda` branch)
1. **Live Tracking Module**:
   - Ingests and processes location telemetry from campus transit vehicles.
   - Provides real-time coordinates, heading, speed, and status of active vehicles.
   - Broadcasts real-time position updates to client views.
2. **Smart Travel Recommendation Module**:
   - Analyzes available routes, transit options, and walking paths across campus.
   - Leverages ETA data and queue status to suggest optimal travel routes to users.
   - Recommends best departure times to minimize passenger wait times.

### 3.3 Developer 3 (`developer3` branch)
1. **Assigned System Module**:
   - Reserved for upcoming project component (e.g., Campus Notification System, User Administration, or Analytics Dashboard).
   - Will integrate via established API contracts.

---

## 4. Inter-Module Communication
- **Decoupled Contracts:** Modules communicate exclusively through defined interfaces specified in [`docs/api-contract.md`](api-contract.md).
- **Independent Development:** No module directly depends on the uncommitted internal implementation of another module.
- **Shared Schemas:** Common data models (Vehicle, Stop, Route, QueueEntry) are defined before module feature implementation begins.

---

## 5. Security & Configuration
- Configuration parameters (ports, database credentials, API keys) are injected via environment variables (`.env`).
- Never hardcode secrets, endpoints, or environment-specific values in source code.
