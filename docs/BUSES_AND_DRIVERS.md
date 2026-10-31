# ACMIS Buses & Drivers Feature Documentation

## Overview

The **Buses and Drivers** management module (`/admin/buses-drivers` and `/driver`) forms the backbone of the **Adaptive Campus Mobility Intelligence System (ACMIS)**. It provides end-to-end administration for the college bus fleet, driver profile registration, route assignments, and driver mobile GPS streaming.

---

## Key Capabilities

1. **Fleet Registry & Bus Management**:
   - Register new college buses with unique bus numbers (e.g. `1`, `1B`, `2`, `18`, `50`).
   - Natural alphanumeric sorting ensures buses appear in intuitive order (`1`, `1B`, `1C`, `2`, `2B`, `3`, `4`, `18`, ...).
   - Enforces unique bus number validation to avoid operational conflicts.
   - Edit bus numbers, assigned routes, and operational status (`active` / `inactive`).

2. **Driver Management & Linking**:
   - Associate drivers directly with buses via name, phone number, and system user ID.
   - Driver profile synchronization between the `profiles` table and `drivers` table.
   - In-app driver selection dropdown showing already registered drivers with phone numbers.
   - Update driver details on the fly directly from the bus card or modal editor.

3. **Real-Time GPS Telemetry & Status Badges**:
   - Real-time telemetry indicators per bus:
     - 🟢 **LIVE**: Driver actively transmitting GPS coordinates via mobile device within the last 30–90 seconds.
     - 🟡 **STALE**: Coordinates received recently, but no active transmission within the past 90 seconds.
     - 🔴 **GPS UNAVAILABLE**: Bus is idle or driver has not started a trip session.
     - 🟠 **DELAYED**: Live GPS indicates bus is running significantly behind schedule.

4. **Driver Mode (`/driver`)**:
   - Mobile-first web app for drivers to start/pause/resume/end trip sessions.
   - Real-time geolocation watcher streaming GPS coordinates, heading, speed, and accuracy to the backend (`POST /api/bus/location`).
   - Broadcasts live updates via SSE / Socket.IO to student live maps (`/map` and `/dashboard`).
   - Offline GPS queue caching coordinates in case of temporary cellular dropouts.

---

## Database Schema (PostgreSQL / Drizzle ORM)

### `buses` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | `TEXT PRIMARY KEY` | Unique bus ID (e.g., `bus-18`, `bus-1b`) |
| `bus_number` | `TEXT NOT NULL UNIQUE` | Bus registration or display number (`18`, `1B`) |
| `route_id` | `TEXT` | Foreign key referencing `bus_routes.id` |
| `driver_id` | `TEXT` | Linked driver user ID referencing `profiles.user_id` |
| `registration_number`| `TEXT` | Vehicle license plate / RTO number (optional) |
| `active` | `BOOLEAN NOT NULL` | Whether the bus is currently in service |
| `source` | `TEXT` | Source tag (`REC_TRANSPORT` or `ADMIN`) |
| `manually_edited` | `BOOLEAN` | Flag indicating administrator customization |
| `created_at` | `TIMESTAMPTZ` | Record creation timestamp |

### `drivers` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PRIMARY KEY` | Auto-incrementing internal ID |
| `profile_id` | `INTEGER NOT NULL` | Foreign key referencing `profiles.id` |
| `assigned_bus_id` | `TEXT` | Foreign key referencing `buses.id` |
| `license_number` | `TEXT` | Commercial driver license number |
| `created_at` | `TIMESTAMPTZ` | Driver registration timestamp |

### `profiles` Table (Driver Role)
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PRIMARY KEY` | Profile internal ID |
| `user_id` | `TEXT UNIQUE` | Authentication UID (`driver-arun`, `driver-1730...`) |
| `name` | `TEXT NOT NULL` | Driver full name |
| `email` | `TEXT NOT NULL` | Driver official contact email |
| `phone` | `TEXT` | Contact phone number |
| `role` | `TEXT NOT NULL` | System role (`DRIVER`) |

---

## API Endpoints

All endpoints are mounted under `/api`:

### Admin Fleet Management
- **`GET /api/admin/buses-and-routes`**  
  Returns all college buses with route names, stop counts, driver names/phones, shift assignments, and live GPS telemetry status.
- **`POST /api/admin/buses-and-routes`**  
  Creates a new bus, validates uniqueness, links or creates a driver profile, and assigns routes and shifts.
- **`PATCH /api/admin/buses-and-routes/:busId`**  
  Updates bus number, route name, driver name/phone, and active status.
- **`GET /api/admin/drivers`**  
  Returns all registered drivers with their phone numbers and assigned bus IDs.

### Driver Telemetry & GPS Ingestion
- **`POST /api/bus/location`**  
  Receives real GPS coordinates (`latitude`, `longitude`, `speed`, `bearing`, `accuracy`) from authenticated driver devices.
- **`POST /api/driver/session/start`**  
  Starts an active driver trip session for a bus.
- **`POST /api/driver/session/end`**  
  Ends active trip session.

---

## Frontend Components

- **Admin Buses & Drivers UI**: `artifacts/acims/src/components/admin/AdminBusesAndDrivers.tsx`
- **Admin Bus Routes UI**: `artifacts/acims/src/components/admin/AdminBusRoutes.tsx`
- **Driver Mobile Interface**: `artifacts/acims/src/pages/driver.tsx`
- **Admin Navigation Route**: `/admin/buses-drivers` and `/admin/bus-routes` in `artifacts/acims/src/pages/admin.tsx`.
