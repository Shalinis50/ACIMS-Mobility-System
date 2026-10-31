# Campus Mobility integration in ACIMS

This directory contains the routing engine adopted from [Ash1234leena/campus-mobility](https://github.com/Ash1234leena/campus-mobility).

## What is integrated

- Verified REC OpenStreetMap walkway graph (56 nodes / 60 edges).
- CampusRouter A* pathfinding with turn-angle penalties and nearest-road-segment snapping.
- Direct integration into ACIMS's existing `calculateCampusWalkingRoute` service. Both the existing **Campus Navigation** and **Campus Map** pages already call this service, so they now use graph-based routing first and retain ACIMS's previous route calculation as a fallback.

## What remains native to ACIMS

ACIMS already owns its authenticated student/admin experiences, fleet database, bus and driver management, real GPS telemetry, WebSocket updates, ETA, offline cache, alerts, and scheduling. Those systems remain the source of truth; the separate Campus Mobility JSON database and standalone Express server are intentionally not mounted, to avoid creating a second unauthenticated fleet database or replacing ACIMS APIs.

## Source

- Routing engine: `Ash1234leena/campus-mobility/router.js`
- Walkway graph: `Ash1234leena/campus-mobility/rec_campus_data.json` (`walkway_network`)

The original repositories are unchanged.
