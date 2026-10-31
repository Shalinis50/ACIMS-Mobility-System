# ACMIS Shift Management Feature Documentation

## Overview

The **Shift Management** feature provides transport administrators with full control over college transit shifts, bus schedules, departure and return timings, and bus fleet assignments across Rajalakshmi Engineering College (REC) campus transport.

---

## Key Capabilities

1. **Flexible Shift Creation**:
   - Create shifts beyond standard predefined slots (e.g., Morning, Evening, Exam Services, Special Events).
   - Configure shift name, shift type (`REGULAR`, `MORNING`, `EVENING`, `EXAM_ONLY`, `SPECIAL`), departure time (start), return time (end), direction (`TO_COLLEGE` or `FROM_COLLEGE`), operating days, and activation status.
   - Prevents accidental duplicates and validates chronological timing (return time after departure time).

2. **Shift Details & Timings Editing**:
   - Inline and modal editing for every shift detail.
   - Live database persistence with instant UI synchronization.
   - Timings remain persistent across reboots and page refreshes.

3. **Bus Fleet Assignments**:
   - Assign any registered campus bus to one or multiple shifts.
   - Remove bus assignments easily without deleting the underlying bus record.
   - Preserves all pre-existing buses and route mappings.

4. **Per-Bus Individual Trip Timings**:
   - Set custom departure timings for specific buses within a shift when stagger schedules are needed.
   - Edit individual bus timings without unintentionally altering other buses in the same shift.

5. **Stop Configuration per Bus in Shift**:
   - Configure and toggle active pickup stops for each bus assigned to a shift.

---

## Database Schema (PostgreSQL / Drizzle ORM)

### `shifts` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | `TEXT PRIMARY KEY` | Unique shift identifier (e.g., `shift-morning-630`, `shift-1730...`) |
| `name` | `TEXT NOT NULL` | Shift display name (e.g., `6:30 AM Shift`) |
| `shift_type` | `TEXT` | Canonical type (`REGULAR`, `MORNING`, `EVENING`, `EXAM_ONLY`) |
| `start_time` | `TEXT` | Departure time in 24-hr format (`HH:MM`, e.g. `06:30`) |
| `end_time` | `TEXT` | Return/arrival time in 24-hr format (`HH:MM`, e.g. `08:00`) |
| `direction` | `TEXT` | Transit direction (`TO_COLLEGE` or `FROM_COLLEGE`) |
| `operating_days` | `TEXT` | Active days (e.g. `MON,TUE,WED,THU,FRI`) |
| `active` | `BOOLEAN NOT NULL` | Active status in dispatch schedules |
| `bus_id` | `TEXT` | Default assigned bus (optional) |
| `driver_id` | `TEXT` | Default driver (optional) |
| `route_id` | `TEXT` | Primary route ID (optional) |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Last update timestamp |

### `shift_assignments` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | `TEXT PRIMARY KEY` | Unique assignment ID (`sa-{shiftId}-{busId}-{timestamp}`) |
| `shift_id` | `TEXT NOT NULL` | Foreign key referencing `shifts.id` |
| `bus_id` | `TEXT NOT NULL` | Foreign key referencing `buses.id` |
| `departure_time` | `TEXT` | Individual bus departure time override (`HH:MM`) |
| `active_stop_ids` | `TEXT` | JSON array of active stop IDs for this bus |
| `active` | `BOOLEAN NOT NULL` | Active assignment flag |
| `created_at` | `TIMESTAMPTZ` | Assignment timestamp |

---

## API Endpoints

All endpoints are mounted under `/api` and require admin authorization headers (`x-acims-role: admin` or Bearer token):

- **`GET /api/admin/shifts`**  
  Returns all shifts with their assigned buses, individual departure timings, and stop configurations.

- **`POST /api/admin/shifts`**  
  Creates a new shift record. Validates required fields, timing format, and duplicate names.

- **`PUT /api/admin/shifts/:shiftId`**  
  Updates an existing shift's timing, name, direction, type, operating days, or active status.

- **`DELETE /api/admin/shifts/:shiftId`**  
  Deactivates or deletes an existing shift.

- **`POST /api/admin/shifts/:shiftId/buses`**  
  Assigns a bus to a shift. Body: `{ busId: string }`.

- **`DELETE /api/admin/shifts/:shiftId/buses/:busId`**  
  Removes a bus assignment from a shift without removing the bus from the fleet.

- **`PUT /api/admin/shifts/:shiftId/buses/:busId/timing`**  
  Updates the individual departure timing for a specific bus within a shift. Body: `{ departureTime: "06:45" }`.

- **`PUT /api/admin/shifts/:shiftId/buses/:busId/stops`**  
  Updates the active pickup stops for a specific bus within a shift. Body: `{ stopIds: string[] }`.

---

## Frontend Component

- **Location**: `artifacts/acims/src/components/admin/AdminShiftManagement.tsx`
- **Route**: Accessible at `/admin/shift-management` within the Admin Portal (`artifacts/acims/src/pages/admin.tsx`).
- **Features**:
  - Direct Edit mode showing current values in editable inputs.
  - Add Shift modal with input validation and clear feedback.
  - Multi-bus assignment manager.
  - Inline timing editor for individual buses.
  - Responsive, accessibility-friendly design consistent with the ACMIS design constitution.
