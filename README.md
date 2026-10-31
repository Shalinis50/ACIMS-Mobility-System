# ACMIS — Adaptive Campus Mobility Intelligence System

ACMIS is a real-time campus mobility and transit platform engineered for **Rajalakshmi Engineering College (REC)**. It unifies college fleet tracking, student boarding queues, driver GPS dispatch, MTC public transit connections, and administrative scheduling.

---

## 🚀 Key Features

### 1. Shift Management (`/admin/shift-management`)
Comprehensive administrative scheduling system for college transport operations:
- **Edit Existing Shifts**: Modify shift names, departure and return times, shift types (`REGULAR`, `MORNING`, `EVENING`, `EXAM_ONLY`), direction (`TO_COLLEGE` / `FROM_COLLEGE`), and operating days with instant database persistence.
- **Add Extra Shifts**: Simple form with validation to add new scheduled shifts beyond the baseline slots.
- **Fleet Assignment**: Assign multiple buses to shifts and assign a bus across multiple shifts when allowed.
- **Individual Bus Departure Timings**: Configure staggered trip departure timings per bus within the same shift without affecting unrelated buses.
- **Stop Control**: Configure active pickup stops per bus within each shift.
- **Persistence**: All changes persist directly to PostgreSQL via Drizzle ORM and sync immediately across the UI.

### 2. Buses & Drivers Management (`/admin/buses-drivers`)
Full fleet and crew administration with real-time telemetry:
- **Fleet Registry**: Alphanumerically sorted bus list (`1`, `1B`, `2`, `18`, `50`) with real-time GPS telemetry status (`LIVE`, `STALE`, `GPS UNAVAILABLE`, `DELAYED`).
- **Driver Profiles & Linking**: Register drivers with direct mobile contact numbers, link them to specific buses, or choose from registered drivers via dropdown.
- **Bus & Driver Editing**: Inline and modal dialogs to edit bus numbers, route names, driver assignments, and active service status.
- **Driver Mobile Experience (`/driver`)**: Driver trip start/pause/resume/end interface with live GPS broadcast to student maps.

### 3. Bus Routes & Scheduled Stops (`/admin/bus-routes`)
- View all official REC College bus routes with stop counts and start times.
- Add new buses to existing routes or create new routes.
- Prevent duplicate bus numbers with real-time validation.
- Configure, reorder, and activate/deactivate scheduled stops.

### 4. Real-Time Bus Tracking & Driver Dispatch
- **Driver Mode (`/driver`)**: Device GPS broadcast via Web Geolocation API and WebSockets/SSE.
- **Student Live Map (`/map`)**: Real-time moving bus marker with accurate ETA and distance calculations.
- **Student Dashboard (`/dashboard`)**: Boarding queue, nearest pickup point, and bus arrival updates.

### 5. Campus Navigation & Public Transport
- **Interactive Campus Map (`/campus-map`)**: Internal walking routes and campus POIs.
- **Public Transport Integration (`/public-transport`)**: Chennai MTC buses and Metro connections.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, TanStack Query, Wouter, Lucide Icons, Leaflet / Google Maps.
- **Backend**: Node.js, Express, Socket.IO, Drizzle ORM.
- **Database**: PostgreSQL (Cloud SQL / Neon / Local PostgreSQL).
- **Build Tools**: Vite, esbuild, TypeScript compiler (`tsc`).

---

## 📦 Getting Started

### Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0
- PostgreSQL database

### Installation
```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL
```

### Running Locally
```bash
# Start development server with live reload
npm run dev

# Run type check
npm run typecheck

# Build for production
npm run build

# Start production server
npm start
```

---

## 🐙 Pushing to your GitHub Repository

To push this codebase (including the Shift Management feature) to your GitHub repository:

```bash
# 1. Add your GitHub repository as remote origin
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git

# 2. Rename branch to main (if not already)
git branch -M main

# 3. Push to GitHub
git push -u origin main
```

If your remote repository already contains an initial commit (e.g. LICENSE or remote README):
```bash
# Pull and rebase or push with force-with-lease
git pull --rebase origin main
git push -u origin main
```

---

## 📖 Architecture & Feature Documentation

Detailed documentation of database models, REST endpoints, and architectural specifications:
- 🚌 **Buses & Drivers Management**: [`docs/BUSES_AND_DRIVERS.md`](./docs/BUSES_AND_DRIVERS.md)
- ⏰ **Shift Management & Timings**: [`docs/SHIFT_MANAGEMENT.md`](./docs/SHIFT_MANAGEMENT.md)
- 🗺️ **MTC Public Transit Integration**: [`docs/MTC_INTEGRATION.md`](./docs/MTC_INTEGRATION.md)
- 🎯 **Target Architecture & End Goal Spec**: [`docs/ACIMS_END_GOAL_SPEC.md`](./docs/ACIMS_END_GOAL_SPEC.md)
