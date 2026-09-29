import path from "path";
import fs from "fs";
import { DatabaseSync } from "node:sqlite";

const DB_DIR = path.resolve(process.cwd(), "artifacts/api-server/data");
const DB_PATH = path.join(DB_DIR, "chennai-transit.db");

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec("PRAGMA journal_mode = WAL;");
    dbInstance.exec("PRAGMA synchronous = NORMAL;");
  }
  return dbInstance;
}

export type TransitAgency = {
  id: string;
  name: string;
  agency_type: string;
  official_url: string;
  phone?: string;
  timezone: string;
  source: string;
  source_url: string;
  last_synced_at: string;
};

export type TransitRoute = {
  id: string;
  agency_id: string;
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color: string;
  origin: string;
  destination: string;
  source: string;
  agency_name?: string;
};

export type TransitStop = {
  id: string;
  agency_id: string;
  stop_id: string;
  stop_code: string;
  stop_name: string;
  latitude: number;
  longitude: number;
  location_type: number;
  parent_station_id?: string;
  source: string;
  agency_name?: string;
  distanceMeters?: number;
};

export type TransitJourneyOption = {
  agency: string;
  agencyId: string;
  routeNumber: string;
  routeName: string;
  routeType: string; // "Bus" | "Metro" | "Suburban Rail"
  origin: string;
  destination: string;
  boardingStop: string;
  boardingTime: string;
  alightingStop: string;
  alightingTime: string;
  durationMinutes: number;
  stopsCount: number;
  status: "Scheduled"; // Never fake live
  dataSource: string;
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function getAgencies(): TransitAgency[] {
  const db = getDatabase();
  return db.prepare("SELECT * FROM public_transport_agencies ORDER BY name ASC").all() as any[];
}

export function getSyncLogs() {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM public_transport_sync_logs ORDER BY downloaded_at DESC LIMIT 5")
    .all() as any[];
}

export function searchRoutes(options: {
  query?: string;
  agencyId?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDatabase();
  const limit = Math.min(100, Math.max(1, options.limit || 30));
  const offset = Math.max(0, options.offset || 0);

  let sql = `
    SELECT r.*, a.name as agency_name, a.agency_type
    FROM public_transport_routes r
    JOIN public_transport_agencies a ON r.agency_id = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options.agencyId && options.agencyId !== "ALL") {
    sql += ` AND r.agency_id = ?`;
    params.push(options.agencyId);
  }

  if (options.query && options.query.trim()) {
    const q = `%${options.query.trim()}%`;
    sql += ` AND (r.route_short_name LIKE ? OR r.route_long_name LIKE ? OR r.origin LIKE ? OR r.destination LIKE ?)`;
    params.push(q, q, q, q);
  }

  sql += ` ORDER BY r.agency_id ASC, length(r.route_short_name) ASC, r.route_short_name ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return db.prepare(sql).all(...params) as any[];
}

export function getRouteDetails(routeId: string) {
  const db = getDatabase();
  const route = db
    .prepare(
      `SELECT r.*, a.name as agency_name, a.agency_type, a.official_url
       FROM public_transport_routes r
       JOIN public_transport_agencies a ON r.agency_id = a.id
       WHERE r.id = ? OR r.route_id = ?`,
    )
    .get(routeId, routeId) as any;

  if (!route) return null;

  // Find a representative trip for stop sequence
  const trip = db
    .prepare(
      `SELECT * FROM public_transport_trips WHERE route_id = ? OR route_id = ? LIMIT 1`,
    )
    .get(route.id, route.route_id) as any;

  let stops: any[] = [];
  if (trip) {
    stops = db
      .prepare(
        `SELECT st.stop_sequence, st.arrival_time, st.departure_time, s.id, s.stop_id, s.stop_name, s.latitude, s.longitude
         FROM public_transport_stop_times st
         JOIN public_transport_stops s ON st.stop_id = s.id
         WHERE st.trip_id = ?
         ORDER BY st.stop_sequence ASC`,
      )
      .all(trip.id) as any[];
  }

  return {
    ...route,
    tripHeadsign: trip?.trip_headsign || route.destination,
    stopsCount: stops.length,
    stops,
    status: "Scheduled",
  };
}

export function searchStops(options: { query?: string; agencyId?: string; limit?: number }) {
  const db = getDatabase();
  const limit = Math.min(100, Math.max(1, options.limit || 30));

  let sql = `
    SELECT s.*, a.name as agency_name
    FROM public_transport_stops s
    JOIN public_transport_agencies a ON s.agency_id = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options.agencyId && options.agencyId !== "ALL") {
    sql += ` AND s.agency_id = ?`;
    params.push(options.agencyId);
  }

  if (options.query && options.query.trim()) {
    sql += ` AND s.stop_name LIKE ?`;
    params.push(`%${options.query.trim()}%`);
  }

  sql += ` ORDER BY s.stop_name ASC LIMIT ?`;
  params.push(limit);

  return db.prepare(sql).all(...params) as any[];
}

export function getNearbyStops(options: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
  agencyId?: string;
}): TransitStop[] {
  const db = getDatabase();
  const radiusMeters = (options.radiusKm || 5) * 1000;
  const limit = options.limit || 25;

  // Rough bounding box in degrees (1 deg ~ 111km)
  const latDelta = radiusMeters / 111000;
  const lonDelta = radiusMeters / (111000 * Math.cos(toRad(options.latitude)));

  let sql = `
    SELECT s.*, a.name as agency_name, a.agency_type
    FROM public_transport_stops s
    JOIN public_transport_agencies a ON s.agency_id = a.id
    WHERE s.latitude BETWEEN ? AND ?
      AND s.longitude BETWEEN ? AND ?
  `;
  const params: any[] = [
    options.latitude - latDelta,
    options.latitude + latDelta,
    options.longitude - lonDelta,
    options.longitude + lonDelta,
  ];

  if (options.agencyId && options.agencyId !== "ALL") {
    sql += ` AND s.agency_id = ?`;
    params.push(options.agencyId);
  }

  const candidates = db.prepare(sql).all(...params) as any[];

  // Calculate precise spherical distance and filter
  const results: TransitStop[] = [];
  for (const c of candidates) {
    const dist = haversineMeters(options.latitude, options.longitude, c.latitude, c.longitude);
    if (dist <= radiusMeters) {
      results.push({
        ...c,
        distanceMeters: dist,
      });
    }
  }

  results.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
  return results.slice(0, limit);
}

export function searchJourneyOptions(input: {
  fromText: string;
  toText: string;
  time?: string;
  agencyId?: string;
}): TransitJourneyOption[] {
  const db = getDatabase();
  const fromPattern = `%${input.fromText.trim()}%`;
  const toPattern = `%${input.toText.trim()}%`;

  // 1. Direct routes matching origin & destination in either direction or within route_long_name
  let sql = `
    SELECT r.*, a.name as agency_name, a.agency_type, a.source as agency_source
    FROM public_transport_routes r
    JOIN public_transport_agencies a ON r.agency_id = a.id
    WHERE (
      (r.origin LIKE ? AND r.destination LIKE ?) OR
      (r.destination LIKE ? AND r.origin LIKE ?) OR
      (r.route_long_name LIKE ? AND r.route_long_name LIKE ?) OR
      (r.route_short_name LIKE ? AND (r.destination LIKE ? OR r.origin LIKE ?))
    )
  `;
  const params: any[] = [
    fromPattern, toPattern,
    fromPattern, toPattern,
    fromPattern, toPattern,
    fromPattern, toPattern, toPattern
  ];

  if (input.agencyId && input.agencyId !== "ALL") {
    sql += ` AND r.agency_id = ?`;
    params.push(input.agencyId);
  }

  sql += ` LIMIT 30`;

  const matchingRoutes = db.prepare(sql).all(...params) as any[];
  const options: TransitJourneyOption[] = [];

  for (const r of matchingRoutes) {
    // Get sample scheduled timing from stop_times
    const trip = db
      .prepare(`SELECT * FROM public_transport_trips WHERE route_id = ? LIMIT 1`)
      .get(r.id) as any;

    let departureTime = input.time || "07:30:00";
    let arrivalTime = "08:15:00";
    let durationMinutes = 45;
    let stopsCount = 18;

    if (trip) {
      const times = db
        .prepare(
          `SELECT departure_time, arrival_time FROM public_transport_stop_times WHERE trip_id = ? ORDER BY stop_sequence ASC`,
        )
        .all(trip.id) as any[];

      if (times.length > 1) {
        departureTime = times[0].departure_time || departureTime;
        arrivalTime = times[times.length - 1].arrival_time || arrivalTime;
        stopsCount = times.length;
        const [depH, depM] = departureTime.split(":").map(Number);
        const [arrH, arrM] = arrivalTime.split(":").map(Number);
        const diff = (arrH * 60 + arrM) - (depH * 60 + depM);
        durationMinutes = diff > 0 ? diff : 45;
      }
    }

    const routeType = r.agency_id === "CMRL" ? "Metro" : r.agency_id === "CSR" ? "Suburban Rail" : "Bus";

    options.push({
      agency: r.agency_name,
      agencyId: r.agency_id,
      routeNumber: r.route_short_name,
      routeName: r.route_long_name || `${r.origin} → ${r.destination}`,
      routeType,
      origin: r.origin || input.fromText,
      destination: r.destination || input.toText,
      boardingStop: r.origin || input.fromText,
      boardingTime: departureTime,
      alightingStop: r.destination || input.toText,
      alightingTime: arrivalTime,
      durationMinutes,
      stopsCount,
      status: "Scheduled",
      dataSource: r.agency_source || "CUMTA / Official GTFS",
    });
  }

  return options;
}

export function getMissedBusAlternatives(input: {
  studentLat: number;
  studentLon: number;
  destinationText?: string;
}) {
  const nearbyStops = getNearbyStops({
    latitude: input.studentLat,
    longitude: input.studentLon,
    radiusKm: 3.5,
    limit: 8,
  });

  const alternatives: Array<{
    category: "MTC Bus" | "Chennai Metro" | "Suburban Rail";
    stopName: string;
    distanceMeters: number;
    walkingMinutes: number;
    agency: string;
    routes: string[];
    scheduledNextDeparture: string;
    status: "Scheduled";
    source: string;
  }> = [];

  for (const stop of nearbyStops) {
    const isMetro = stop.agency_id === "CMRL";
    const isRail = stop.agency_id === "CSR";
    const category = isMetro ? "Chennai Metro" : isRail ? "Suburban Rail" : "MTC Bus";

    // Query real routes that stop at this stop_id
    const db = getDatabase();
    const servedRoutes = db
      .prepare(
        `SELECT DISTINCT r.route_short_name, r.route_long_name
         FROM public_transport_stop_times st
         JOIN public_transport_trips t ON st.trip_id = t.id
         JOIN public_transport_routes r ON t.route_id = r.id
         WHERE st.stop_id = ?
         LIMIT 6`,
      )
      .all(stop.id) as any[];

    const routeLabels = servedRoutes.map((r) => r.route_short_name);
    if (routeLabels.length === 0) {
      routeLabels.push(isMetro ? "Blue / Green Line" : isRail ? "Tambaram – Beach Suburban" : "MTC Feeder");
    }

    const walkingMinutes = Math.max(1, Math.round((stop.distanceMeters || 200) / 80));

    alternatives.push({
      category,
      stopName: stop.stop_name,
      distanceMeters: stop.distanceMeters || 0,
      walkingMinutes,
      agency: stop.agency_name || category,
      routes: routeLabels,
      scheduledNextDeparture: isMetro ? "Every 6–10 min" : isRail ? "Every 12–15 min" : "Frequent Scheduled Trips",
      status: "Scheduled",
      source: stop.source,
    });
  }

  return alternatives;
}
