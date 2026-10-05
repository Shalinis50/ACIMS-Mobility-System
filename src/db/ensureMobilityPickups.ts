import { recTransportStops } from "./schema.ts";
import { listPickupPoints, upsertPickupPoint } from "./mobilityOps.ts";
import { eq } from "drizzle-orm";
import { db } from "./index.ts";

/** Idempotent: never invent pickup points if official REC boarding points exist. */
export async function ensureOfficialPickupPointsFromRoutes() {
  const existing = await listPickupPoints();
  const recOfficial = existing.filter((p) => p.active && (p.source === "REC_TRANSPORT" || p.id.startsWith("rec-stop-")));
  if (recOfficial.length > 0) return;

  const recStops = await db.select({ id: recTransportStops.id }).from(recTransportStops).where(eq(recTransportStops.active, true)).limit(1);
  if (recStops.length) return;

  const { getMvpCollegeRoute } = await import(
    "../../artifacts/api-server/src/services/mvpCollegeRouteService.ts"
  );
  const mvp = getMvpCollegeRoute();
  const activeForRoute = existing.filter((p) => p.routeId === mvp.routeId && p.active);
  if (activeForRoute.length > 0) return;

  const { getRouteForBus } = await import(
    "../../artifacts/api-server/src/services/routesData.ts"
  );

  const route = getRouteForBus(mvp.busId);
  if (!route) return;
  for (const stop of route.stops) {
    await upsertPickupPoint({
      id: stop.id,
      routeId: mvp.routeId,
      stopName: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      sequenceNumber: stop.sequence,
      geofenceRadiusM: 150,
      expectedOffsetMinutes: stop.sequence * 8,
      source: "ADMIN",
      active: true,
    });
  }
  console.log("[ACIMS DB] College route pickup points ready");
}
