/**
 * Seeds official pickup points for ACIMS mobility core (no shift timings — admin configures shifts).
 * Run: npm run mobility:seed
 */
import "dotenv/config";
import { bootstrapCoreTables } from "../src/db/bootstrapCoreTables.ts";
import { ensureCanonicalShiftSlots } from "../src/db/shiftManagement.ts";
import { upsertPickupPoint } from "../src/db/mobilityOps.ts";
import { getRouteForBus } from "../artifacts/api-server/src/services/routesData.ts";

async function main() {
  await bootstrapCoreTables();
  await ensureCanonicalShiftSlots();

  const route = getRouteForBus("bus-12");
  if (route) {
    for (const stop of route.stops) {
      await upsertPickupPoint({
        id: stop.id,
        routeId: route.id,
        stopName: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        sequenceNumber: stop.sequence,
        geofenceRadiusM: 150,
        expectedOffsetMinutes: stop.sequence * 8,
        active: true,
      });
    }
  }

  console.log("Mobility core seed complete (pickup points only; configure shifts in Admin).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
