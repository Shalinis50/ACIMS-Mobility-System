import { listPickupPoints, upsertPickupPoint } from "./mobilityOps.ts";

/** Idempotent: seed pickup points for the single college MVP route only. */
export async function ensureOfficialPickupPointsFromRoutes() {
  const existing = await listPickupPoints();
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
      active: true,
    });
  }
  console.log("[ACIMS DB] College route pickup points ready");
}
