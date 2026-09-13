# ACMIS — API Contract & Endpoint Specifications

## 1. Overview
This document defines the interface contracts between backend modules and client consumers for the **Automated Campus Mobility Information System (ACMIS)**. By formalizing these contracts early, team members can build their respective modules in parallel without integration blockers.

---

## 2. Global Standards

### 2.1 Base Path & Versioning
All RESTful API routes must use the standard version prefix:
```text
/api/v1
```

### 2.2 Standard Response Envelope
All endpoints must return JSON using the standard envelope format:

**Successful Response:**
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "timestamp": "2026-09-13T21:00:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested stop could not be found."
  },
  "meta": {
    "timestamp": "2026-09-13T21:00:00.000Z"
  }
}
```

### 2.3 Standard HTTP Status Codes
| Code | Meaning | Use Case |
| :--- | :--- | :--- |
| `200 OK` | Success | Standard read/update response |
| `201 Created` | Created | Successful entity creation |
| `400 Bad Request` | Client Error | Missing or malformed parameters |
| `401 Unauthorized` | Auth Required | Missing or invalid auth token |
| `403 Forbidden` | Access Denied | Insufficient permissions |
| `404 Not Found` | Not Found | Requested resource does not exist |
| `500 Internal Error` | Server Error | Unhandled server error |

---

## 3. Module Endpoint Contracts

### 3.1 ETA & AI Delay Prediction (Developer: Shalini)
- **`GET /api/v1/eta/stops/:stopId`**
  - **Description:** Retrieve estimated arrival times for all active vehicles heading towards a specific campus stop.
  - **Response `data`:** List of arrival predictions with vehicle IDs, route numbers, estimated arrival timestamps, and predicted delay in minutes.
- **`GET /api/v1/eta/predictions/:routeId`**
  - **Description:** Retrieve predictive delay metrics across all segments of a route.
  - **Response `data`:** Route ID, active vehicle statuses, expected cycle delays, and confidence score.

### 3.2 Queue System (Developer: Shalini)
- **`GET /api/v1/queues/stops/:stopId`**
  - **Description:** Get current queue density, head count, and estimated wait duration at a specific stop.
  - **Response `data`:** Stop ID, queue length, estimated wait time in minutes, and queue capacity status (`LOW`, `MODERATE`, `HIGH`).
- **`POST /api/v1/queues/join`**
  - **Description:** Register a user into the virtual boarding queue at a stop.
  - **Request Body:** `{ "stopId": "string", "userId": "string" }`
  - **Response `data`:** Queue token, position in queue, and estimated boarding window.
- **`POST /api/v1/queues/leave`**
  - **Description:** Remove a user from the queue.
  - **Request Body:** `{ "queueToken": "string" }`

### 3.3 Live Tracking (Developer: Brinda)
- **`GET /api/v1/tracking/vehicles`**
  - **Description:** Retrieve the latest geographic locations and operational states of all active campus vehicles.
  - **Response `data`:** Array of vehicle records (id, label, latitude, longitude, speed, heading, status).
- **`GET /api/v1/tracking/vehicles/:vehicleId`**
  - **Description:** Retrieve real-time telemetry for a specific vehicle.
  - **Response `data`:** Single vehicle telemetry object including last update timestamp.

### 3.4 Smart Travel Recommendation (Developer: Brinda)
- **`POST /api/v1/recommendations/routes`**
  - **Description:** Calculate recommended multi-modal transit options between two campus coordinates/buildings.
  - **Request Body:** `{ "origin": { "lat": number, "lng": number }, "destination": { "lat": number, "lng": number }, "preference": "fastest" | "least_walking" | "least_queue" }`
  - **Response `data`:** Ranked list of route options combining walking paths, shuttle legs, estimated transit times, and queue overheads.

### 3.5 Developer 3 Module Endpoints
- Reserved for future component endpoints as assigned.

---

## 4. Contract Maintenance Guidelines
1. Do not introduce breaking schema changes without team review.
2. If fields need to be updated, create a PR proposing changes to this document first.
3. Keep response structures consistent with Section 2.2 across all modules.
