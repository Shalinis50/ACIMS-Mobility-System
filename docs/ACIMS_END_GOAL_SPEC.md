# ACIMS — End Goal Specification (Real Data Only)

**Status:** Target architecture and acceptance criteria for the full refactor.  
**Principle:** Admin configuration + authenticated users + real GPS + integrated official feeds → derived ETA, delays, notifications. **Never invent operational data.**

## Absolute rule

Remove all dummy data. No fake buses, drivers, students, routes, pickup points, shift timings, ETA, delays, simulated GPS, placeholder MTC routes, hard-coded schedules, random statistics, fabricated notifications, or demo records auto-inserted into the database.

If required data does not exist, show clearly:

> **Data not available yet.**

Do not invent values to populate the UI.

## Source of truth

Operational transport information comes only from:

1. Data entered/configured by Admin  
2. Authenticated student data  
3. Authenticated driver data  
4. Real GPS data  
5. System-generated data derived from the above  
6. Official external sources where explicitly integrated (e.g. official MTC data)

## Architecture

```
ADMIN ENTERS DATA → DATABASE → BACKEND SERVICES → FEATURE LOGIC → STUDENT / DRIVER / ADMIN UI
```

The frontend must not hold operational transport data as hard-coded values.

## Admin is the source of truth

Admin configures the network before students use transport:

| Entity | Admin configures |
|--------|------------------|
| **Buses** | Number, fleet/registration ID, capacity, status |
| **Drivers** | Name, ID, credentials, active/inactive |
| **Routes** | Name/number, direction, stops, sequence, coordinates |
| **Pickup points** | Name, lat/lng, route, stop sequence, geofence radius, active/inactive |
| **Shifts** | Morning / Evening (default Morning), start/end times (admin-entered, not hard-coded), route, direction, bus, driver, operating days, active/inactive |

Admin can change values later; **historical completed trips keep their snapshots** (e.g. Monday 6:00 AM stays 6:00 AM after admin changes Tuesday schedule to 6:30 AM).

## Shift system

Exactly two primary slots: **Morning Shift** (default in admin UI) and **Evening Shift**. Times are admin-entered only — no hard-coded 6:00 AM / 5:00 PM.

## Bus system

Buses appear only after admin creates them. Status derived from system state: Available, Assigned, On Trip, Maintenance, Inactive, GPS Offline — not random.

## Driver system

Drivers exist only if created by admin. Admin assigns driver → bus → shift → route. Driver cannot pick an arbitrary bus; operates assigned trip only.

## Route system

Routes and stop order from admin. If no stops: **This route has no pickup points configured.** — do not invent stops.

## Student pickup point

Student selects from admin-configured pickup points; stored on profile (persisted, not re-prompt every session). **Change pickup point** updates future ETA/notifications. Students cannot create official pickup points.

## Driver GPS

Flow: Login → assigned trip → start trip → GPS permission → real coordinates → backend → active bus location.

Each record: driver, bus, trip, timestamp, lat/lng, speed, heading, accuracy. Reject unauthorized GPS.

## Live map

Show only buses with active trip + authenticated recent GPS. If none: **No buses are currently reporting live location.** No fake movement or artificial animation.

## ETA

Only when: active bus GPS, assigned route, stop sequence, target pickup, recent GPS timestamp. Use location + route distance + speed + historical/dwell when available. Otherwise: **ETA unavailable — waiting for live bus location.**

## Delay prediction

Delay = scheduled vs predicted arrival from real data. Otherwise: **Delay prediction unavailable.** No fake AI prediction.

## Learning over time

- **Phase 1:** Rule-based / deterministic ETA  
- **Phase 2+:** Historical averages (travel time, delay by route/time, dwell, ETA accuracy) once enough real trips exist  
- Never fabricate history for training

## Notifications (event-driven, once per student/trip/event)

- 10 min / 5 min from actual ETA  
- Delay when meaningfully calculated  
- Arrival via pickup geofence (admin-defined radius)  
- Store events in DB; no repeat spam on every GPS tick  

Valid events: trip started, ETA 10/5, approaching, arrived, delay detected/changed, GPS unavailable, trip cancelled, shift/route changed.

## Missed bus assistant

Use real: time, student location, pickup, active trips, upcoming shifts, other college buses, official public transport when integrated. If none: **No alternative college bus is currently available.**

## NAVI AI

Query ACIMS backend only; no hallucinated buses/routes/ETA. If insufficient data: **I don't have enough current ACIMS data to answer that.**

## Campus map

Locations from admin configuration only; navigation for configured locations only.

## Find my bus

Requires student GPS + bus GPS + campus map + active trip; else **Bus location is currently unavailable.**

## Public transport / MTC

Official MTC only when available. Else: **MTC information is temporarily unavailable.**

## Admin dashboard & analytics

Counts and percentages from DB only. Insufficient history: **Not enough historical data.**

## Empty states (examples)

| Situation | Message |
|-----------|---------|
| No buses | No buses have been configured by the administrator. |
| No active trips | No active trips right now. |
| No GPS | No live GPS data available. |
| No pickup | Please select your pickup point. |
| No route | No route has been assigned. |
| No MTC | MTC information is temporarily unavailable. |

## Data validation

Block operational shifts without route, bus, driver, timing, stops. Block ETA routes without stops/coordinates. Block personalized ETA without pickup. Block live bus without active trip + valid GPS.

## Role separation

- **Admin:** configuration  
- **Driver:** assigned trip + GPS  
- **Student:** personalized consumption  
- No role bypasses backend authorization  

## Database-first

Frontend requests → backend validates → database returns → backend calculates → frontend displays.

## Codebase hygiene

Search and remove from production paths: mock, dummy, sample, demo, fake, placeholder, hardcoded bus/route/driver/timing, `random()` / `Math.random()` for operational data, fake/simulated GPS.

## Implementation order

1. Database schema  
2. Admin authentication  
3. Bus → Driver → Route → Pickup → Shift management  
4. Student transport profile  
5. Driver trip management  
6. Real GPS  
7. Live map  
8. ETA → Delay → Notifications  
9. Missed-bus assistant  
10. Campus navigation  
11. MTC integration  
12. NAVI AI  
13. Analytics  
14. Audit logs  

Do not build UI before backend/data dependency exists.

## Final acceptance test (empty DB)

Start with **no** buses, drivers, routes, pickup points, shifts, trips — proper empty states only.

Then linearly: admin creates fleet/network → student pickup → driver login → start trip → real GPS → live map → ETA → delays → 10/5 min alerts → geofence arrival → trip complete → history → analytics.

**Every step uses real data.**

## Final rule

Never pretend something exists when it does not. Show no data / insufficient data / GPS unavailable / ETA unavailable / no buses configured / MTC unavailable — **never invent data to look complete.**
