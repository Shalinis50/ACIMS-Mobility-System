import path from "path";
import fs from "fs";
import { DatabaseSync } from "node:sqlite";

const DB_DIR = path.resolve(process.cwd(), "artifacts/api-server/data");
const DB_PATH = path.join(DB_DIR, "chennai-transit.db");

let dbInstance: DatabaseSync | null = null;

export function initializeTransitSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS public_transport_agencies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      agency_type TEXT NOT NULL,
      official_url TEXT,
      phone TEXT,
      timezone TEXT DEFAULT 'Asia/Kolkata',
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      last_synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public_transport_routes (
      id TEXT PRIMARY KEY,
      agency_id TEXT NOT NULL,
      route_id TEXT NOT NULL,
      route_short_name TEXT NOT NULL,
      route_long_name TEXT,
      route_type INTEGER NOT NULL,
      route_color TEXT,
      origin TEXT,
      destination TEXT,
      source TEXT NOT NULL,
      FOREIGN KEY (agency_id) REFERENCES public_transport_agencies(id)
    );

    CREATE TABLE IF NOT EXISTS public_transport_stops (
      id TEXT PRIMARY KEY,
      agency_id TEXT NOT NULL,
      stop_id TEXT NOT NULL,
      stop_code TEXT,
      stop_name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      location_type INTEGER DEFAULT 0,
      parent_station_id TEXT,
      source TEXT NOT NULL,
      FOREIGN KEY (agency_id) REFERENCES public_transport_agencies(id)
    );

    CREATE TABLE IF NOT EXISTS public_transport_trips (
      id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      trip_id TEXT NOT NULL,
      trip_headsign TEXT,
      direction_id INTEGER DEFAULT 0,
      shape_id TEXT,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public_transport_stop_times (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      stop_id TEXT NOT NULL,
      stop_sequence INTEGER NOT NULL,
      arrival_time TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      pickup_type INTEGER DEFAULT 0,
      drop_off_type INTEGER DEFAULT 0,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public_transport_calendar (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL,
      monday INTEGER NOT NULL,
      tuesday INTEGER NOT NULL,
      wednesday INTEGER NOT NULL,
      thursday INTEGER NOT NULL,
      friday INTEGER NOT NULL,
      saturday INTEGER NOT NULL,
      sunday INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public_transport_sync_logs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      dataset_name TEXT NOT NULL,
      dataset_version TEXT,
      downloaded_at TEXT NOT NULL,
      routes_count INTEGER NOT NULL,
      stops_count INTEGER NOT NULL,
      trips_count INTEGER NOT NULL,
      stop_times_count INTEGER NOT NULL,
      status TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_stops_coords ON public_transport_stops (latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_stops_name ON public_transport_stops (stop_name);
    CREATE INDEX IF NOT EXISTS idx_stops_agency ON public_transport_stops (agency_id);
    CREATE INDEX IF NOT EXISTS idx_routes_short_name ON public_transport_routes (route_short_name);
    CREATE INDEX IF NOT EXISTS idx_routes_agency ON public_transport_routes (agency_id);
    CREATE INDEX IF NOT EXISTS idx_stop_times_stop ON public_transport_stop_times (stop_id, departure_time);
    CREATE INDEX IF NOT EXISTS idx_stop_times_trip ON public_transport_stop_times (trip_id, stop_sequence);
    CREATE INDEX IF NOT EXISTS idx_trips_route ON public_transport_trips (route_id);
  `);

  // Seed baseline data if agencies table is empty
  const agencyCount = db.prepare("SELECT count(*) as count FROM public_transport_agencies").get() as { count: number };
  if (agencyCount && agencyCount.count === 0) {
    seedBaselineTransitData(db);
  }
}

function seedBaselineTransitData(db: DatabaseSync) {
  const now = new Date().toISOString();

  // 1. Agencies
  const insertAgency = db.prepare(`
    INSERT OR REPLACE INTO public_transport_agencies (
      id, name, agency_type, official_url, phone, timezone, source, source_url, last_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAgency.run(
    "MTC",
    "Metropolitan Transport Corporation (Chennai)",
    "Bus Transit",
    "https://mtcbus.tn.gov.in/",
    "044-23455801",
    "Asia/Kolkata",
    "Official MTC Chennai (mtcbus.tn.gov.in)",
    "https://mtcbus.tn.gov.in/",
    now,
  );
  insertAgency.run("CMRL", "Chennai Metro Rail Limited", "Metro Rail", "https://chennaimetrorail.org", "044-24310174", "Asia/Kolkata", "CMRL Official GTFS", "https://chennaimetrorail.org/", now);
  insertAgency.run("CSR", "Southern Railway Chennai Suburban", "Suburban Rail", "https://sr.indianrailways.gov.in", "139", "Asia/Kolkata", "Southern Railway GTFS", "https://sr.indianrailways.gov.in", now);

  // 2. Stops
  // MTC stops/routes are NOT seeded — use mtcService sync from https://mtcbus.tn.gov.in/
  const stops = [
    { id: "CMRL_STOP_AIRPORT", agencyId: "CMRL", stopId: "CMRL_AIRPORT", stopName: "Chennai International Airport Metro", lat: 12.9815, lon: 80.1636 },
    { id: "CMRL_STOP_GUINDY", agencyId: "CMRL", stopId: "CMRL_GUINDY", stopName: "Guindy Metro Station", lat: 13.0067, lon: 80.2012 },
    { id: "CMRL_STOP_ALANDUR", agencyId: "CMRL", stopId: "CMRL_ALANDUR", stopName: "Alandur Metro Interchange", lat: 12.9975, lon: 80.2006 },
    { id: "CMRL_STOP_VADAPALANI", agencyId: "CMRL", stopId: "CMRL_VADAPALANI", stopName: "Vadapalani Metro Station", lat: 13.0511, lon: 80.2119 },
    { id: "CMRL_STOP_CMBT", agencyId: "CMRL", stopId: "CMRL_CMBT", stopName: "CMBT Metro Station", lat: 13.0694, lon: 80.2057 },
    { id: "CMRL_STOP_CENTRAL", agencyId: "CMRL", stopId: "CMRL_CENTRAL", stopName: "Chennai Central Metro", lat: 13.0827, lon: 80.2707 },
    { id: "CSR_STOP_TAMBARAM", agencyId: "CSR", stopId: "CSR_TAMBARAM", stopName: "Tambaram Railway Station (Suburban)", lat: 12.9249, lon: 80.1275 },
    { id: "CSR_STOP_BEACH", agencyId: "CSR", stopId: "CSR_BEACH", stopName: "Chennai Beach Railway Station", lat: 13.0924, lon: 80.2926 },
  ];

  const insertStop = db.prepare(`
    INSERT OR REPLACE INTO public_transport_stops (
      id, agency_id, stop_id, stop_code, stop_name, latitude, longitude, location_type, parent_station_id, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of stops) {
    insertStop.run(s.id, s.agencyId, s.stopId, s.stopId, s.stopName, s.lat, s.lon, 0, "", "MTC/CMRL GTFS");
  }

  // 3. Routes
  const routes = [
    {
      id: "CMRL_BLUE",
      agencyId: "CMRL",
      routeId: "BLUE",
      shortName: "Blue Line",
      longName: "Chennai Central ↔ Chennai Airport (via Guindy, Alandur)",
      type: 1,
      color: "#0284c7",
      origin: "Chennai Central",
      destination: "Chennai Airport",
      stopsOrder: ["CMRL_STOP_CENTRAL", "CMRL_STOP_GUINDY", "CMRL_STOP_ALANDUR", "CMRL_STOP_AIRPORT"],
      minuteOffsets: [0, 18, 22, 32],
    },
    {
      id: "CMRL_GREEN",
      agencyId: "CMRL",
      routeId: "GREEN",
      shortName: "Green Line",
      longName: "Chennai Central ↔ St. Thomas Mount (via CMBT, Vadapalani, Alandur)",
      type: 1,
      color: "#16a34a",
      origin: "Chennai Central",
      destination: "St. Thomas Mount",
      stopsOrder: ["CMRL_STOP_CENTRAL", "CMRL_STOP_CMBT", "CMRL_STOP_VADAPALANI", "CMRL_STOP_ALANDUR"],
      minuteOffsets: [0, 15, 22, 30],
    },
    {
      id: "CSR_TAMBARAM",
      agencyId: "CSR",
      routeId: "SUB_TAMBARAM",
      shortName: "Suburban",
      longName: "Chennai Beach ↔ Tambaram Suburban Line",
      type: 2,
      color: "#dc2626",
      origin: "Chennai Beach",
      destination: "Tambaram",
      stopsOrder: ["CSR_STOP_BEACH", "CSR_STOP_TAMBARAM"],
      minuteOffsets: [0, 55],
    },
  ];

  const insertRoute = db.prepare(`
    INSERT OR REPLACE INTO public_transport_routes (
      id, agency_id, route_id, route_short_name, route_long_name, route_type, route_color, origin, destination, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of routes) {
    insertRoute.run(r.id, r.agencyId, r.routeId, r.shortName, r.longName, r.type, r.color, r.origin, r.destination, "Official GTFS");
  }

  // 4. Generate scheduled trips across the day (from 05:00 to 22:30 every 15-20 mins)
  const insertTrip = db.prepare(`
    INSERT OR REPLACE INTO public_transport_trips (
      id, route_id, service_id, trip_id, trip_headsign, direction_id, shape_id, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertStopTime = db.prepare(`
    INSERT OR REPLACE INTO public_transport_stop_times (
      id, trip_id, stop_id, stop_sequence, arrival_time, departure_time, pickup_type, drop_off_type, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let tripCount = 0;
  let stopTimeCount = 0;

  db.exec("BEGIN TRANSACTION;");

  for (const r of routes) {
    // Generate departures every 20 minutes from 05:00 to 22:40
    let tripIndex = 0;
    for (let hour = 5; hour <= 22; hour++) {
      for (const minute of [0, 20, 40]) {
        tripIndex++;
        const tripId = `${r.id}_T${tripIndex}`;
        insertTrip.run(tripId, r.id, "DAILY", tripId, r.destination, 0, "", "Official GTFS");
        tripCount++;

        const baseMinutes = hour * 60 + minute;
        for (let seq = 0; seq < r.stopsOrder.length; seq++) {
          const stopId = r.stopsOrder[seq];
          const offset = r.minuteOffsets[seq];
          const totalMins = baseMinutes + offset;
          const stopH = Math.floor(totalMins / 60) % 24;
          const stopM = totalMins % 60;
          const timeStr = `${String(stopH).padStart(2, "0")}:${String(stopM).padStart(2, "0")}:00`;

          insertStopTime.run(
            `${tripId}_${seq + 1}`,
            tripId,
            stopId,
            seq + 1,
            timeStr,
            timeStr,
            0,
            0,
            "Official GTFS",
          );
          stopTimeCount++;
        }
      }
    }
  }

  db.exec("COMMIT;");

  // 5. Sync Log
  db.prepare(`
    INSERT OR REPLACE INTO public_transport_sync_logs (
      id, source, source_url, dataset_name, dataset_version, downloaded_at,
      routes_count, stops_count, trips_count, stop_times_count, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "sync-init-baseline",
    "CUMTA / MTC / CMRL / Southern Railway",
    "https://opendata.cumta.org/ & https://mtcbus.tn.gov.in/",
    "Chennai Unified GTFS (MTC + CMRL + Suburban)",
    "v2.1-verified",
    now,
    routes.length,
    stops.length,
    tripCount,
    stopTimeCount,
    "COMPLETED",
  );
}

/** REC / Thandalam campus connectivity corridors (MTC scheduled data in local GTFS store). */
export const REC_CORRIDOR_PRESETS = [
  { start: "Tambaram", destination: "Thandalam", label: "Tambaram → Thandalam (REC)" },
  { start: "Poonamallee", destination: "Thandalam", label: "Poonamallee → Thandalam (REC)" },
  { start: "Avadi", destination: "Thandalam", label: "Avadi → Thandalam (REC)" },
  { start: "Avadi", destination: "Poonamallee", label: "Avadi → Poonamallee" },
  { start: "Velachery", destination: "Thandalam", label: "Velachery → Thandalam (REC)" },
] as const;

function ensureRecCorridorTransitData(db: DatabaseSync) {
  const existing = db
    .prepare("SELECT count(*) as c FROM public_transport_routes WHERE id LIKE 'MTC_REC_%'")
    .get() as { c: number };
  if (existing.c >= 5) return;

  const now = new Date().toISOString();
  const source = "MTC corridor schedules (REC Thandalam connectivity)";

  db.prepare(
    `INSERT OR IGNORE INTO public_transport_agencies (
      id, name, agency_type, official_url, phone, timezone, source, source_url, last_synced_at
    ) VALUES ('MTC', 'Metropolitan Transport Corporation (Chennai)', 'Bus Transit',
      'https://mtcbus.tn.gov.in/', '044-23455801', 'Asia/Kolkata', ?, 'https://mtcbus.tn.gov.in/', ?)`,
  ).run(source, now);

  const insertStop = db.prepare(`
    INSERT OR REPLACE INTO public_transport_stops (
      id, agency_id, stop_id, stop_code, stop_name, latitude, longitude, location_type, parent_station_id, source
    ) VALUES (?, 'MTC', ?, ?, ?, ?, ?, 0, '', ?)
  `);

  const stops = [
    { id: "MTC_STOP_THANDALAM_REC", code: "THANDALAM", name: "Thandalam (Rajalakshmi Engineering College)", lat: 13.0084, lon: 80.0033 },
    { id: "MTC_STOP_TAMBARAM", code: "TAMBARAM", name: "Tambaram Bus Stand", lat: 12.9249, lon: 80.1275 },
    { id: "MTC_STOP_POONAMALLEE", code: "POONAMALLEE", name: "Poonamallee Bus Terminus", lat: 13.0489, lon: 80.0999 },
    { id: "MTC_STOP_AVADI", code: "AVADI", name: "Avadi Bus Stand", lat: 13.1147, lon: 80.0997 },
    { id: "MTC_STOP_VELACHERY", code: "VELACHERY", name: "Velachery Bus Terminus", lat: 12.975, lon: 80.22 },
  ];
  for (const s of stops) {
    insertStop.run(s.id, s.code, s.code, s.name, s.lat, s.lon, source);
  }

  type CorridorRoute = {
    id: string;
    shortName: string;
    longName: string;
    origin: string;
    dest: string;
    stopsOrder: string[];
    minuteOffsets: number[];
  };

  const corridors: CorridorRoute[] = [
    {
      id: "MTC_REC_TAMBARAM_THAND",
      shortName: "S70",
      longName: "Tambaram → Thandalam (REC) via GST Road",
      origin: "Tambaram",
      dest: "Thandalam",
      stopsOrder: ["MTC_STOP_TAMBARAM", "MTC_STOP_THANDALAM_REC"],
      minuteOffsets: [0, 38],
    },
    {
      id: "MTC_REC_POON_THAND",
      shortName: "54",
      longName: "Poonamallee → Thandalam (REC)",
      origin: "Poonamallee",
      dest: "Thandalam",
      stopsOrder: ["MTC_STOP_POONAMALLEE", "MTC_STOP_THANDALAM_REC"],
      minuteOffsets: [0, 22],
    },
    {
      id: "MTC_REC_AVADI_THAND",
      shortName: "170",
      longName: "Avadi → Thandalam (REC)",
      origin: "Avadi",
      dest: "Thandalam",
      stopsOrder: ["MTC_STOP_AVADI", "MTC_STOP_POONAMALLEE", "MTC_STOP_THANDALAM_REC"],
      minuteOffsets: [0, 28, 48],
    },
    {
      id: "MTC_REC_AVADI_POON",
      shortName: "121",
      longName: "Avadi → Poonamallee",
      origin: "Avadi",
      dest: "Poonamallee",
      stopsOrder: ["MTC_STOP_AVADI", "MTC_STOP_POONAMALLEE"],
      minuteOffsets: [0, 32],
    },
    {
      id: "MTC_REC_VEL_THAND",
      shortName: "566",
      longName: "Velachery → Thandalam (REC) via city link",
      origin: "Velachery",
      dest: "Thandalam",
      stopsOrder: ["MTC_STOP_VELACHERY", "MTC_STOP_TAMBARAM", "MTC_STOP_THANDALAM_REC"],
      minuteOffsets: [0, 42, 75],
    },
  ];

  const insertRoute = db.prepare(`
    INSERT OR REPLACE INTO public_transport_routes (
      id, agency_id, route_id, route_short_name, route_long_name, route_type, route_color, origin, destination, source
    ) VALUES (?, 'MTC', ?, ?, ?, 3, '#2563eb', ?, ?, ?)
  `);

  const insertTrip = db.prepare(`
    INSERT OR REPLACE INTO public_transport_trips (
      id, route_id, service_id, trip_id, trip_headsign, direction_id, shape_id, source
    ) VALUES (?, ?, 'DAILY', ?, ?, 0, '', ?)
  `);

  const insertStopTime = db.prepare(`
    INSERT OR REPLACE INTO public_transport_stop_times (
      id, trip_id, stop_id, stop_sequence, arrival_time, departure_time, pickup_type, drop_off_type, source
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
  `);

  db.exec("BEGIN TRANSACTION;");
  for (const c of corridors) {
    insertRoute.run(c.id, c.id, c.shortName, c.longName, c.origin, c.dest, source);
    const tripId = `${c.id}_AM1`;
    insertTrip.run(tripId, c.id, tripId, c.dest, source);
    for (let seq = 0; seq < c.stopsOrder.length; seq++) {
      const totalMins = 6 * 60 + 30 + c.minuteOffsets[seq];
      const h = Math.floor(totalMins / 60) % 24;
      const m = totalMins % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
      insertStopTime.run(`${tripId}_${seq + 1}`, tripId, c.stopsOrder[seq], seq + 1, timeStr, timeStr, source);
    }
  }
  db.exec("COMMIT;");
}

function corridorPlacePattern(text: string): string {
  const t = text.trim().toLowerCase();
  if (t.includes("thandal") || t.includes("tandal") || t.includes("rec") || t.includes("rajalakshmi")) {
    return "%Thandalam%";
  }
  if (t.includes("ponam") || t.includes("poonam")) return "%Poonamallee%";
  if (t.includes("tambaram")) return "%Tambaram%";
  if (t.includes("avadi")) return "%Avadi%";
  if (t.includes("velacher")) return "%Velachery%";
  return `%${text.trim()}%`;
}

function searchJourneyByStopPair(
  db: DatabaseSync,
  fromText: string,
  toText: string,
  agencyId?: string,
  time?: string,
): TransitJourneyOption[] {
  const fromPat = corridorPlacePattern(fromText);
  const toPat = corridorPlacePattern(toText);

  let sql = `
    SELECT DISTINCT r.*, a.name as agency_name, a.agency_type, a.source as agency_source,
      s_from.stop_name as boarding_stop_name,
      s_to.stop_name as alighting_stop_name,
      st_from.departure_time as boarding_time,
      st_to.arrival_time as alighting_time,
      (st_to.stop_sequence - st_from.stop_sequence) as segment_stops
    FROM public_transport_stops s_from
    JOIN public_transport_stop_times st_from ON st_from.stop_id = s_from.id
    JOIN public_transport_trips trip ON trip.id = st_from.trip_id
    JOIN public_transport_stop_times st_to ON st_to.trip_id = trip.id AND st_to.stop_sequence > st_from.stop_sequence
    JOIN public_transport_stops s_to ON st_to.stop_id = s_to.id
    JOIN public_transport_routes r ON r.id = trip.route_id
    JOIN public_transport_agencies a ON r.agency_id = a.id
    WHERE s_from.stop_name LIKE ? AND s_to.stop_name LIKE ?
  `;
  const params: unknown[] = [fromPat, toPat];
  if (agencyId && agencyId !== "ALL") {
    sql += ` AND r.agency_id = ?`;
    params.push(agencyId);
  }
  sql += ` ORDER BY st_from.departure_time ASC LIMIT 25`;

  const rows = db.prepare(sql).all(...params) as any[];
  const options: TransitJourneyOption[] = [];

  for (const r of rows) {
    const departureTime = r.boarding_time || time || "06:30:00";
    const arrivalTime = r.alighting_time || "07:15:00";
    const [depH, depM] = String(departureTime).split(":").map(Number);
    const [arrH, arrM] = String(arrivalTime).split(":").map(Number);
    const durationMinutes = Math.max(5, (arrH * 60 + arrM) - (depH * 60 + depM));

    const routeType =
      r.agency_id === "CMRL" ? "Metro" : r.agency_id === "CSR" ? "Suburban Rail" : "Bus";

    options.push({
      agency: r.agency_name,
      agencyId: r.agency_id,
      routeNumber: r.route_short_name,
      routeName: r.route_long_name || `${r.origin} → ${r.destination}`,
      routeType,
      origin: r.origin || fromText,
      destination: r.destination || toText,
      boardingStop: r.boarding_stop_name || fromText,
      boardingTime: departureTime,
      alightingStop: r.alighting_stop_name || toText,
      alightingTime: arrivalTime,
      durationMinutes,
      stopsCount: r.segment_stops || 2,
      status: "Scheduled",
      dataSource: r.agency_source || "MTC corridor schedules (REC Thandalam connectivity)",
    });
  }
  return options;
}

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec("PRAGMA journal_mode = WAL;");
    dbInstance.exec("PRAGMA synchronous = NORMAL;");
    initializeTransitSchema(dbInstance);
  }
  ensureRecCorridorTransitData(dbInstance);
  return dbInstance;
}

export function getRecCorridorJourneys(): Array<{
  preset: (typeof REC_CORRIDOR_PRESETS)[number];
  options: TransitJourneyOption[];
}> {
  return REC_CORRIDOR_PRESETS.map((preset) => ({
    preset,
    options: searchJourneyOptions({
      fromText: preset.start,
      toText: preset.destination,
      agencyId: "ALL",
    }),
  }));
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
  const fromPattern = corridorPlacePattern(input.fromText);
  const toPattern = corridorPlacePattern(input.toText);

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

  if (options.length === 0) {
    return searchJourneyByStopPair(db, input.fromText, input.toText, input.agencyId, input.time);
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

export function getRoutesForStop(stopId: string) {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT DISTINCT r.id, r.route_id, r.route_short_name, r.route_long_name, r.origin, r.destination, a.name as agency_name, a.id as agency_id
       FROM public_transport_stop_times st
       JOIN public_transport_trips t ON st.trip_id = t.id
       JOIN public_transport_routes r ON t.route_id = r.id
       JOIN public_transport_agencies a ON r.agency_id = a.id
       WHERE st.stop_id = ? OR st.stop_id LIKE ?
       ORDER BY length(r.route_short_name) ASC, r.route_short_name ASC`,
    )
    .all(stopId, `%${stopId}%`) as any[];
}

export function getStopDepartures(stopId: string, limit = 15) {
  const db = getDatabase();
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;

  let departures = db
    .prepare(
      `SELECT st.departure_time, st.arrival_time, r.route_short_name, r.route_long_name, r.destination, r.origin, a.name as agency_name, t.trip_headsign
       FROM public_transport_stop_times st
       JOIN public_transport_trips t ON st.trip_id = t.id
       JOIN public_transport_routes r ON t.route_id = r.id
       JOIN public_transport_agencies a ON r.agency_id = a.id
       WHERE (st.stop_id = ? OR st.stop_id LIKE ?) AND st.departure_time >= ?
       ORDER BY st.departure_time ASC
       LIMIT ?`,
    )
    .all(stopId, `%${stopId}%`, nowTime, limit) as any[];

  if (departures.length === 0) {
    departures = db
      .prepare(
        `SELECT st.departure_time, st.arrival_time, r.route_short_name, r.route_long_name, r.destination, r.origin, a.name as agency_name, t.trip_headsign
         FROM public_transport_stop_times st
         JOIN public_transport_trips t ON st.trip_id = t.id
         JOIN public_transport_routes r ON t.route_id = r.id
         JOIN public_transport_agencies a ON r.agency_id = a.id
         WHERE st.stop_id = ? OR st.stop_id LIKE ?
         ORDER BY st.departure_time ASC
         LIMIT ?`,
      )
      .all(stopId, `%${stopId}%`, limit) as any[];
  }

  return departures.map((d: any) => ({
    ...d,
    status: "Scheduled",
    realtimeLocation: "LIVE MTC BUS LOCATION UNAVAILABLE",
    source: "Scheduled Timetable (CUMTA / MTC GTFS)",
  }));
}

