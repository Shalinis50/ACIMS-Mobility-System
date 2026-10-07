# ACIMS build plan (execution tracker)

Aligned to the scope flowchart: **P0 → Shifts → Pickup → GPS/Trip → ETA → Geofence → Notifications → Delay → NAVI → Demo**.

## Phase 0 — Foundation (in progress)

| Item | Status | Notes |
|------|--------|--------|
| Core tables (`shifts`, `trips`, `official_pickup_points`, `mobility_events`) | Done | `src/db/schema.ts`, `bootstrapCoreTables.ts` |
| Trip lifecycle on driver start/stop | Done | `startTripFromDriverSession`, `completeActiveTrip` |
| GPS ingest tied to trip (strict mode) | Done | `ACIMS_STRICT_GPS=true` |
| DB `DATABASE_URL` support | Done | `src/db/index.ts` |
| Server bootstrap on start | Done | `server-app.ts` |
| Unified RBAC / Firebase on all routes | Partial | `optionalAuth` on `/api`; admin/mobility/driver GPS gated; demo headers supported |
| Consolidate `lib/db` vs `src/db` | Todo | |

## Phase 1 — Scheduling & pickup

| Item | Status | API |
|------|--------|-----|
| Shifts CRUD | Done (create/list) | `POST/GET /api/mobility/shifts` |
| Shift assignments + conflict checks | Done | `POST /api/mobility/shift-assignments` |
| Official pickup points | Done | `GET/POST /api/mobility/pickup-points` |
| Student pickup binding | Done | `PUT /api/mobility/students/:id/pickup-point` |
| Seed script | Done | `npx tsx scripts/seed-mobility-core.ts` |

## Intelligence pipeline

| Item | Status | Module |
|------|--------|--------|
| Pickup-centric ETA | Done | `pickupEtaEngine.ts`, `GET /api/mobility/eta/pickup` |
| Delay detection (rule-based) | Done | `delayEngine.ts` |
| Geofence engine | Done | `geofenceEngine.ts` |
| Event notifications (DB) | Done | `mobilityPipeline.ts` → `mobility_events` + `notifications` |
| Wired on GPS ingest | Done | `buses.ts` `POST /api/bus/location` |

## Remaining for end-to-end demo

1. ~~Admin UI for shifts, pickup points, assignments~~ → Admin **Shifts & pickups** tab.
2. ~~Student pickup picker~~ → Dashboard selector + `PUT /api/mobility/students/:id/pickup-point`.
3. ~~Dashboard ETA from pickup API~~ → Polls `GET /api/mobility/eta/pickup`.
4. ~~Command center map + counters~~ → **Command center** tab (`GET /api/mobility/command-center`).
5. ~~NAVI pickup ETA + delay~~ → `toolCalculateEta` uses live GPS + delay engines.
6. ~~Trip history & analytics~~ → APIs + **Trips & analytics** sub-tab.
7. Enable `ACIMS_STRICT_GPS=true` in production driver flow.

## Quick demo commands

```bash
npm run dev
npx tsx scripts/seed-mobility-core.ts
```

Driver: `POST /api/driver/session/start` with `{ busId, driverId, shiftId? }`  
GPS: `POST /api/bus/location` with bus coordinates  
Student ETA: `GET /api/mobility/eta/pickup?busId=bus-12&pickupStopId=tambaram`
