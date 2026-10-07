# MTC public transport integration (ACIMS)

**Official source:** [https://mtcbus.tn.gov.in/](https://mtcbus.tn.gov.in/)

## Architecture

```
Student app → ACIMS API → mtcService → Official MTC website (public route register)
                      → Normalized mtc_* tables → NAVI / recommendations
```

College bus GPS and ACIMS mobility are unchanged.

## What is synced today

- **Route numbers** from the public *Route-wise info* page (`GET` HTML parse only).
- **Stages / timings:** not invented. Stored in `mtc_stops` / `mtc_timings` when an approved import path is added.
- **Live MTC vehicle tracking:** `NOT_INTEGRATED` until an officially documented interface is available.

## Commands

```bash
npm run mtc:sync    # Pull official route register into SQLite (backend)
```

## API (backend only)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/mtc/status` | Integration health + error log |
| `POST /api/mtc/sync` | Admin: sync route catalog |
| `GET /api/mtc/routes/search?q=` | Route search |
| `GET /api/mtc/stops/nearby?lat=&lon=` | Nearest stages (requires loaded coordinates) |
| `GET /api/mtc/get-to-college` | Compare ACIMS bus vs MTC options |
| `GET /api/mtc/missed-bus` | MTC alternatives after missed college bus |

## Failure behaviour

If sync fails or data is empty, APIs and NAVI return:

> MTC information is temporarily unavailable. Please try again.

No dummy routes or fabricated timings are used for MTC.
