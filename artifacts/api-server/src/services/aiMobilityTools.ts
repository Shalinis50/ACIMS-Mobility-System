import { getDatabase, haversineMeters, type TransitStop } from "./publicTransitService";
import { getStudentProfile, type StudentProfile } from "./studentProfileService";
import { getBus, getBuses, getLocation, type Bus, type BusLocation } from "./busTracking";
import { getAllRoutes, getRouteById, haversineDistance, type RouteDefinition } from "./routesData";
import { REC_CAMPUS_CENTER } from "./campusData";
import { getLatestBusLocation } from "../../../../src/db/services.ts";
import { calculatePickupEta } from "./pickupEtaEngine.ts";
import { assessTripDelay } from "./delayEngine.ts";
import {
  getNearestMtcStops,
  isMtcDataAvailable,
  mtcUnavailableMessage,
  searchMtcRoutes,
} from "./mtc/mtcService.ts";
import { MTC_SOURCE_LABEL } from "./mtc/mtcSchema.ts";

export interface ToolResultMetadata {
  source: string;
  sourceType: "scheduled" | "live GPS" | "official" | "calculated";
  lastUpdated?: string;
  isLive?: boolean;
}

export interface StudentLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  source: "Real Device GPS" | "Approved Pickup Stop" | "Saved Home Location" | "Unavailable";
  stopName?: string;
}

export interface PublicStopResult {
  id: string;
  stopId: string;
  stopName: string;
  latitude: number;
  longitude: number;
  agencyId: string;
  agencyName: string;
  distanceMeters: number;
  walkingMinutes: number;
}

export interface StopDeparture {
  routeNumber: string;
  routeName: string;
  agencyId: string;
  agencyName: string;
  tripId: string;
  origin: string;
  destination: string;
  stopDepartureTime: string; // 24hr format "HH:MM:SS" at THIS stop
  departureFormatted: string; // "7:18 AM"
  minutesUntil: number;
  status: "Scheduled" | "Live";
  dataSource: string;
}

export interface JourneyPlanOption {
  optionNumber: number;
  summary: string;
  mode: "Direct ACIMS Bus" | "Direct MTC Bus" | "Metro + Feeder" | "Suburban Rail" | "Multi-Modal";
  departureTime: string;
  arrivalTime: string;
  totalDurationMinutes: number;
  transfers: number;
  steps: Array<{
    stepType: "walk" | "bus" | "metro" | "rail";
    instruction: string;
    fromName: string;
    toName: string;
    distanceMeters?: number;
    durationMinutes: number;
    serviceNumber?: string;
    serviceName?: string;
    departureTime?: string;
    arrivalTime?: string;
  }>;
  source: string;
}

export function formatTime12h(time24: string): string {
  if (!time24) return "";
  const parts = time24.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || "00";
  const ampm = hours >= 12 && hours < 24 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const padH = hours < 10 ? `0${hours}` : `${hours}`;
  return `${padH}:${minutes} ${ampm}`;
}

function timeToMinutes(time24: string): number {
  if (!time24) return 0;
  const [h, m] = time24.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getChennaiNow(): { time24: string; minutes: number; dayOfWeek: string; dateStr: string } {
  const now = new Date();
  const time24 = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dayOfWeek = now.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).toLowerCase();
  const dateStr = now.toISOString().split("T")[0];
  return { time24, minutes: timeToMinutes(time24), dayOfWeek, dateStr };
}

// ============================================================================
// TOOL 1: get_student_profile
// ============================================================================
export function toolGetStudentProfile(studentId: string): {
  profile: StudentProfile;
  metadata: ToolResultMetadata;
} {
  const profile = getStudentProfile(studentId);
  return {
    profile,
    metadata: {
      source: "ACIMS Student Identity & Registry",
      sourceType: "official",
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ============================================================================
// TOOL 2: get_student_location
// ============================================================================
export function toolGetStudentLocation(
  studentId: string,
  deviceCoords?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp?: string;
  },
): {
  location: StudentLocationData | null;
  hasPermission: boolean;
  metadata: ToolResultMetadata;
} {
  // If real device GPS provided with valid non-NaN coordinates
  if (
    deviceCoords &&
    typeof deviceCoords.latitude === "number" &&
    typeof deviceCoords.longitude === "number" &&
    !isNaN(deviceCoords.latitude) &&
    !isNaN(deviceCoords.longitude) &&
    deviceCoords.latitude !== 0
  ) {
    return {
      hasPermission: true,
      location: {
        latitude: Number(deviceCoords.latitude.toFixed(6)),
        longitude: Number(deviceCoords.longitude.toFixed(6)),
        accuracy: deviceCoords.accuracy,
        speed: deviceCoords.speed,
        heading: deviceCoords.heading,
        timestamp: deviceCoords.timestamp || new Date().toISOString(),
        source: "Real Device GPS",
      },
      metadata: {
        source: "Device Geolocation API (Browser GPS)",
        sourceType: "live GPS",
        isLive: true,
        lastUpdated: deviceCoords.timestamp || new Date().toISOString(),
      },
    };
  }

  // Fallback to student's approved pickup stop in profile
  const profile = getStudentProfile(studentId);
  if (profile.pickupStopCoordinates) {
    return {
      hasPermission: false,
      location: {
        latitude: profile.pickupStopCoordinates.latitude,
        longitude: profile.pickupStopCoordinates.longitude,
        timestamp: new Date().toISOString(),
        source: "Approved Pickup Stop",
        stopName: profile.pickupStopName,
      },
      metadata: {
        source: `Approved ACIMS Pickup Stop (${profile.pickupStopName})`,
        sourceType: "official",
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  return {
    hasPermission: false,
    location: null,
    metadata: {
      source: "Device Geolocation API",
      sourceType: "official",
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ============================================================================
// TOOL 3: get_pickup_stop
// ============================================================================
export function toolGetPickupStop(studentId: string) {
  const profile = getStudentProfile(studentId);
  const route = getRouteById(profile.assignedRouteId);
  const stopDetail = route?.stops.find((s) => s.id === profile.pickupStopId);

  return {
    pickupStopId: profile.pickupStopId,
    pickupStopName: profile.pickupStopName,
    coordinates: profile.pickupStopCoordinates,
    assignedBusId: profile.assignedBusId,
    assignedRouteName: route?.name || "Campus Route",
    scheduledDepartureTime: profile.preferredDepartureTime,
    scheduledDepartureFormatted: formatTime12h(profile.preferredDepartureTime),
    destination: profile.collegeDestination,
    metadata: {
      source: "ACIMS College Route Database",
      sourceType: "scheduled",
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ============================================================================
// TOOL 4: find_nearest_public_stops
// ============================================================================
export function toolFindNearestPublicStops(
  latitude: number,
  longitude: number,
  radiusKm = 4.0,
  limit = 5,
): {
  stops: PublicStopResult[];
  metadata: ToolResultMetadata;
} {
  const db = getDatabase();
  const radiusMeters = radiusKm * 1000;
  const latDelta = radiusMeters / 111000;
  const lonDelta = radiusMeters / (111000 * Math.cos((latitude * Math.PI) / 180));

  const candidates = db
    .prepare(
      `SELECT s.*, a.name as agency_name, a.agency_type
       FROM public_transport_stops s
       JOIN public_transport_agencies a ON s.agency_id = a.id
       WHERE s.latitude BETWEEN ? AND ?
         AND s.longitude BETWEEN ? AND ?`,
    )
    .all(latitude - latDelta, latitude + latDelta, longitude - lonDelta, longitude + lonDelta) as any[];

  const results: PublicStopResult[] = [];
  for (const c of candidates) {
    const dist = haversineMeters(latitude, longitude, c.latitude, c.longitude);
    if (dist <= radiusMeters) {
      // Real average walking speed ~ 75-80 meters per minute (4.5 - 4.8 km/h)
      const walkingMinutes = Math.max(1, Math.round(dist / 80));
      results.push({
        id: c.id,
        stopId: c.stop_id,
        stopName: c.stop_name,
        latitude: c.latitude,
        longitude: c.longitude,
        agencyId: c.agency_id,
        agencyName: c.agency_name,
        distanceMeters: dist,
        walkingMinutes,
      });
    }
  }

  if (isMtcDataAvailable()) {
    const mtcNearby = getNearestMtcStops({ latitude, longitude, radiusKm, limit });
    if (mtcNearby.available && mtcNearby.stops?.length) {
      for (const s of mtcNearby.stops) {
        results.push({
          id: s.stop_id,
          stopId: s.stop_id,
          stopName: s.stage_name,
          latitude: s.latitude,
          longitude: s.longitude,
          agencyId: "MTC",
          agencyName: "Metropolitan Transport Corporation (Chennai)",
          distanceMeters: s.distance_meters,
          walkingMinutes: s.walking_minutes,
        });
      }
    }
  }

  results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  const unique = new Map<string, PublicStopResult>();
  for (const r of results) unique.set(r.id, r);

  return {
    stops: Array.from(unique.values()).slice(0, limit),
    metadata: {
      source: isMtcDataAvailable() ? MTC_SOURCE_LABEL : "CMRL / Suburban transit registry",
      sourceType: "official",
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ============================================================================
// TOOL 5: get_routes_for_stop
// ============================================================================
export function toolGetRoutesForStop(stopId: string): {
  stopName: string;
  routes: Array<{
    routeId: string;
    routeNumber: string;
    routeName: string;
    agencyId: string;
    agencyName: string;
    origin: string;
    destination: string;
    type: number;
    color?: string;
  }>;
  metadata: ToolResultMetadata;
} {
  const db = getDatabase();

  const stop = db
    .prepare("SELECT * FROM public_transport_stops WHERE id = ? OR stop_id = ?")
    .get(stopId, stopId) as any;

  if (!stop) {
    return {
      stopName: "Unknown Stop",
      routes: [],
      metadata: {
        source: "CUMTA / MTC GTFS",
        sourceType: "official",
      },
    };
  }

  const query = `
    SELECT DISTINCT r.id as route_table_id, r.route_id, r.route_short_name, r.route_long_name,
           r.origin, r.destination, r.route_type, r.route_color, a.id as agency_id, a.name as agency_name
    FROM public_transport_stop_times st
    JOIN public_transport_trips t ON st.trip_id = t.id
    JOIN public_transport_routes r ON t.route_id = r.id
    JOIN public_transport_agencies a ON r.agency_id = a.id
    WHERE st.stop_id = ?
    ORDER BY r.route_short_name ASC
  `;

  const rows = db.prepare(query).all(stop.id) as any[];

  return {
    stopName: stop.stop_name,
    routes: rows.map((r) => ({
      routeId: r.route_table_id,
      routeNumber: r.route_short_name,
      routeName: r.route_long_name || `${r.origin} → ${r.destination}`,
      agencyId: r.agency_id,
      agencyName: r.agency_name,
      origin: r.origin,
      destination: r.destination,
      type: r.route_type,
      color: r.route_color,
    })),
    metadata: {
      source: "CUMTA GTFS / Official Timetables",
      sourceType: "official",
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ============================================================================
// TOOL 6: get_stop_departures
// Section 12 Rule: Uses stop_times for student's actual stop, NOT trip origin!
// ============================================================================
export function toolGetStopDepartures(
  stopId: string,
  filterTime?: string,
  limit = 8,
): {
  stopName: string;
  queryTime: string;
  departures: StopDeparture[];
  metadata: ToolResultMetadata;
} {
  const db = getDatabase();
  const now = getChennaiNow();
  const queryTime = filterTime || now.time24;
  const queryMinutes = timeToMinutes(queryTime);

  const stop = db
    .prepare("SELECT * FROM public_transport_stops WHERE id = ? OR stop_id = ?")
    .get(stopId, stopId) as any;

  if (!stop) {
    return {
      stopName: "Unknown Stop",
      queryTime,
      departures: [],
      metadata: { source: "CUMTA / MTC GTFS", sourceType: "scheduled" },
    };
  }

  const query = `
    SELECT r.id as route_table_id, r.route_id, r.route_short_name, r.route_long_name,
           r.origin, r.destination, r.route_type, t.id as trip_id, t.trip_headsign,
           st.departure_time, st.arrival_time, a.id as agency_id, a.name as agency_name, a.source as agency_source
    FROM public_transport_stop_times st
    JOIN public_transport_trips t ON st.trip_id = t.id
    JOIN public_transport_routes r ON t.route_id = r.id
    JOIN public_transport_agencies a ON r.agency_id = a.id
    WHERE st.stop_id = ?
    ORDER BY st.departure_time ASC
  `;

  const rows = db.prepare(query).all(stop.id) as any[];

  // Filter to upcoming departures at this stop after queryTime
  const upcoming: StopDeparture[] = [];
  const laterTomorrow: StopDeparture[] = [];

  for (const row of rows) {
    const depMins = timeToMinutes(row.departure_time);
    const diff = depMins - queryMinutes;

    const depItem: StopDeparture = {
      routeNumber: row.route_short_name,
      routeName: row.route_long_name || `${row.origin} → ${row.destination}`,
      agencyId: row.agency_id,
      agencyName: row.agency_name,
      tripId: row.trip_id,
      origin: row.origin,
      destination: row.trip_headsign || row.destination,
      stopDepartureTime: row.departure_time,
      departureFormatted: formatTime12h(row.departure_time),
      minutesUntil: diff > 0 ? diff : diff + 1440,
      status: "Scheduled",
      dataSource: row.agency_source || "CUMTA / Official GTFS",
    };

    if (diff >= 0 && diff <= 180) {
      upcoming.push(depItem);
    } else {
      laterTomorrow.push(depItem);
    }
  }

  upcoming.sort((a, b) => a.minutesUntil - b.minutesUntil);
  const finalDepartures = upcoming.length > 0 ? upcoming.slice(0, limit) : laterTomorrow.slice(0, limit);

  return {
    stopName: stop.stop_name,
    queryTime,
    departures: finalDepartures,
    metadata: {
      source: "CUMTA / MTC Official Scheduled Timetable",
      sourceType: "scheduled",
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ============================================================================
// TOOL 7: get_trip_details
// ============================================================================
export function toolGetTripDetails(tripId: string) {
  const db = getDatabase();

  const trip = db
    .prepare(
      `SELECT t.*, r.route_short_name, r.route_long_name, r.origin, r.destination, a.name as agency_name
       FROM public_transport_trips t
       JOIN public_transport_routes r ON t.route_id = r.id
       JOIN public_transport_agencies a ON r.agency_id = a.id
       WHERE t.id = ?`,
    )
    .get(tripId) as any;

  if (!trip) return null;

  const stops = db
    .prepare(
      `SELECT st.stop_sequence, st.arrival_time, st.departure_time, s.id, s.stop_name, s.latitude, s.longitude
       FROM public_transport_stop_times st
       JOIN public_transport_stops s ON st.stop_id = s.id
       WHERE st.trip_id = ?
       ORDER BY st.stop_sequence ASC`,
    )
    .all(trip.id) as any[];

  return {
    tripId: trip.id,
    routeNumber: trip.route_short_name,
    routeName: trip.route_long_name,
    agencyName: trip.agency_name,
    headsign: trip.trip_headsign || trip.destination,
    origin: trip.origin,
    destination: trip.destination,
    stopsCount: stops.length,
    stops: stops.map((s) => ({
      sequence: s.stop_sequence,
      stopName: s.stop_name,
      departureTime: s.departure_time,
      departureFormatted: formatTime12h(s.departure_time),
      latitude: s.latitude,
      longitude: s.longitude,
    })),
    metadata: {
      source: "CUMTA GTFS Verified Sequence",
      sourceType: "scheduled",
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ============================================================================
// TOOL 8: get_route_stops
// ============================================================================
export function toolGetRouteStops(routeNumberOrId: string) {
  const db = getDatabase();

  const route = db
    .prepare(
      `SELECT r.*, a.name as agency_name FROM public_transport_routes r
       JOIN public_transport_agencies a ON r.agency_id = a.id
       WHERE r.id = ? OR r.route_id = ? OR r.route_short_name = ?`,
    )
    .get(routeNumberOrId, routeNumberOrId, routeNumberOrId) as any;

  if (!route) return null;

  const trip = db
    .prepare("SELECT id FROM public_transport_trips WHERE route_id = ? LIMIT 1")
    .get(route.id) as any;

  let stops: any[] = [];
  if (trip) {
    stops = db
      .prepare(
        `SELECT st.stop_sequence, st.arrival_time, st.departure_time, s.stop_name, s.latitude, s.longitude
         FROM public_transport_stop_times st
         JOIN public_transport_stops s ON st.stop_id = s.id
         WHERE st.trip_id = ?
         ORDER BY st.stop_sequence ASC`,
      )
      .all(trip.id) as any[];
  }

  return {
    routeId: route.id,
    routeNumber: route.route_short_name,
    routeName: route.route_long_name,
    agencyName: route.agency_name,
    origin: route.origin,
    destination: route.destination,
    stops: stops.map((s) => ({
      sequence: s.stop_sequence,
      stopName: s.stop_name,
      arrivalFormatted: formatTime12h(s.arrival_time),
      departureFormatted: formatTime12h(s.departure_time),
      latitude: s.latitude,
      longitude: s.longitude,
    })),
    metadata: {
      source: "CUMTA Route Directory",
      sourceType: "official",
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ============================================================================
// TOOL 9: search_journey
// Real multi-modal journey planner (walking + bus/metro/rail + walking)
// ============================================================================
export function toolSearchJourney(input: {
  originText: string;
  originLat?: number;
  originLon?: number;
  destinationText: string;
  destinationLat?: number;
  destinationLon?: number;
  departureTime?: string;
  targetArrivalTime?: string;
}): {
  journeyOptions: JourneyPlanOption[];
  metadata: ToolResultMetadata;
} {
  const db = getDatabase();
  const now = getChennaiNow();
  const depTime = input.departureTime || now.time24;

  const destLat = input.destinationLat ?? REC_CAMPUS_CENTER.latitude;
  const destLon = input.destinationLon ?? REC_CAMPUS_CENTER.longitude;

  const journeyOptions: JourneyPlanOption[] = [];

  if (!isMtcDataAvailable() && (input.originText.toLowerCase().includes("mtc") || input.destinationText.toLowerCase().includes("rec"))) {
    return {
      journeyOptions: [],
      metadata: {
        source: mtcUnavailableMessage(),
        sourceType: "official",
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  if (isMtcDataAvailable()) {
    const q = `${input.originText} ${input.destinationText}`.trim();
    const mtcRoutes = searchMtcRoutes({ query: q, limit: 8 });
    if (mtcRoutes.available) {
      let optIdx = 1;
      for (const r of mtcRoutes.routes) {
        journeyOptions.push({
          optionNumber: optIdx++,
          summary: `MTC Route ${r.route_number} (official register)`,
          mode: "Direct MTC Bus",
          departureTime: "—",
          arrivalTime: "—",
          totalDurationMinutes: 0,
          transfers: 0,
          steps: [
            {
              stepType: "walk",
              instruction: `Walk to nearest official MTC stage toward ${input.originText}`,
              fromName: input.originText,
              toName: "Nearest MTC stage",
              durationMinutes: 0,
            },
            {
              stepType: "bus",
              instruction: `Use MTC route ${r.route_number}. Confirm stage timings on the official MTC site.`,
              fromName: input.originText,
              toName: input.destinationText,
              serviceNumber: r.route_number,
              serviceName: r.route_name,
              durationMinutes: 0,
            },
          ],
          source: `${MTC_SOURCE_LABEL} · updated ${r.last_updated}`,
        });
      }
    }
  }

  // Search direct routes matching origin & destination (Metro / Suburban registry)
  const fromPattern = `%${input.originText.trim()}%`;
  const toPattern = `%${input.destinationText.trim()}%`;

  const routes = db
    .prepare(
      `SELECT r.*, a.name as agency_name, a.agency_type
       FROM public_transport_routes r
       JOIN public_transport_agencies a ON r.agency_id = a.id
       WHERE (
         (r.origin LIKE ? AND r.destination LIKE ?) OR
         (r.route_long_name LIKE ? AND r.route_long_name LIKE ?) OR
         (r.route_short_name LIKE ? AND (r.destination LIKE ? OR r.origin LIKE ?))
       )
       LIMIT 5`,
    )
    .all(fromPattern, toPattern, fromPattern, toPattern, fromPattern, toPattern, toPattern) as any[];

  let optIdx = 1;
  for (const r of routes) {
    const trip = db
      .prepare("SELECT id FROM public_transport_trips WHERE route_id = ? LIMIT 1")
      .get(r.id) as any;

    let tripDep = depTime;
    let tripArr = "08:20:00";
    let duration = 45;

    if (trip) {
      const times = db
        .prepare(
          "SELECT arrival_time, departure_time FROM public_transport_stop_times WHERE trip_id = ? ORDER BY stop_sequence ASC",
        )
        .all(trip.id) as any[];

      if (times.length > 1) {
        tripDep = times[0].departure_time || tripDep;
        tripArr = times[times.length - 1].arrival_time || tripArr;
        const diff = timeToMinutes(tripArr) - timeToMinutes(tripDep);
        duration = diff > 0 ? diff : 45;
      }
    }

    const mode = r.agency_id === "CMRL" ? "Metro + Feeder" : r.agency_id === "CSR" ? "Suburban Rail" : "Direct MTC Bus";

    journeyOptions.push({
      optionNumber: optIdx++,
      summary: `${r.route_short_name} (${r.agency_name}): ${r.origin} → ${r.destination}`,
      mode,
      departureTime: formatTime12h(tripDep),
      arrivalTime: formatTime12h(tripArr),
      totalDurationMinutes: duration + 10,
      transfers: 0,
      steps: [
        {
          stepType: "walk",
          instruction: `Walk to ${r.origin} Station / Stop`,
          fromName: input.originText,
          toName: r.origin,
          durationMinutes: 5,
        },
        {
          stepType: r.agency_id === "CMRL" ? "metro" : r.agency_id === "CSR" ? "rail" : "bus",
          instruction: `Board ${r.agency_name} Route ${r.route_short_name} toward ${r.destination}`,
          fromName: r.origin,
          toName: r.destination,
          serviceNumber: r.route_short_name,
          serviceName: r.route_long_name,
          departureTime: formatTime12h(tripDep),
          arrivalTime: formatTime12h(tripArr),
          durationMinutes: duration,
        },
        {
          stepType: "walk",
          instruction: `Walk from ${r.destination} to ${input.destinationText}`,
          fromName: r.destination,
          toName: input.destinationText,
          durationMinutes: 5,
        },
      ],
      source: `CUMTA GTFS Official Feed (${r.agency_name})`,
    });
  }

  // If no direct public routes found, check ACIMS college bus
  if (journeyOptions.length === 0) {
    const acimsRoutes = getAllRoutes();
    const match = acimsRoutes.find((r) =>
      r.name.toLowerCase().includes(input.originText.toLowerCase()) ||
      r.stops.some((s) => s.name.toLowerCase().includes(input.originText.toLowerCase()))
    ) || acimsRoutes[0];

    journeyOptions.push({
      optionNumber: 1,
      summary: `ACIMS Bus #${match.routeNumber} (${match.name}): Direct College Transport`,
      mode: "Direct ACIMS Bus",
      departureTime: "07:20 AM",
      arrivalTime: "08:15 AM",
      totalDurationMinutes: 55,
      transfers: 0,
      steps: [
        {
          stepType: "walk",
          instruction: `Walk to ${match.stops[0].name}`,
          fromName: input.originText,
          toName: match.stops[0].name,
          durationMinutes: 5,
        },
        {
          stepType: "bus",
          instruction: `Board ACIMS Bus #${match.routeNumber} direct to REC Campus`,
          fromName: match.stops[0].name,
          toName: "Rajalakshmi Engineering College (REC)",
          serviceNumber: match.routeNumber,
          serviceName: match.name,
          departureTime: "07:20 AM",
          arrivalTime: "08:15 AM",
          durationMinutes: 50,
        },
      ],
      source: "ACIMS Campus Mobility Network",
    });
  }

  return {
    journeyOptions,
    metadata: {
      source: "CUMTA / MTC / CMRL Multi-Modal Journey Planner",
      sourceType: "calculated",
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ============================================================================
// TOOL 10: get_acims_bus_location
// Checks real driver phone GPS
// ============================================================================
export function toolGetAcimsBusLocation(busId: string): {
  bus: Bus | null;
  location: BusLocation | null;
  isLiveGps: boolean;
  secondsSinceLastUpdate: number;
  metadata: ToolResultMetadata;
} {
  const bus = getBus(busId);
  if (!bus) {
    return {
      bus: null,
      location: null,
      isLiveGps: false,
      secondsSinceLastUpdate: Infinity,
      metadata: {
        source: "ACIMS Fleet Management",
        sourceType: "official",
      },
    };
  }

  const loc = getLocation(busId);
  const now = Date.now();
  const updatedMs = new Date(bus.updatedAt).getTime();
  const secondsSinceLastUpdate = Math.max(0, Math.floor((now - updatedMs) / 1000));
  const isLiveGps = bus.locationMode === "driver-gps" && secondsSinceLastUpdate <= 120;

  return {
    bus,
    location: loc || null,
    isLiveGps,
    secondsSinceLastUpdate,
    metadata: {
      source: isLiveGps ? "Driver Phone Live GPS (Phone B)" : "ACIMS Fleet Telemetry (Awaiting Live Driver Broadcast)",
      sourceType: isLiveGps ? "live GPS" : "scheduled",
      isLive: isLiveGps,
      lastUpdated: bus.updatedAt.toISOString(),
    },
  };
}

// ============================================================================
// TOOL 11: get_acims_bus_status
// ============================================================================
export function toolGetAcimsBusStatus(busId: string) {
  const bus = getBus(busId);
  if (!bus) {
    return {
      found: false,
      message: `Bus ${busId} is not registered in the active ACIMS fleet.`,
    };
  }

  const now = Date.now();
  const updatedMs = new Date(bus.updatedAt).getTime();
  const secondsAgo = Math.floor((now - updatedMs) / 1000);
  const isTracking = bus.locationMode === "driver-gps" && secondsAgo <= 120;

  return {
    found: true,
    busId: bus.id,
    busNumber: bus.busNumber,
    routeLabel: bus.routeLabel,
    origin: bus.origin,
    destination: bus.destination,
    nextStop: bus.nextStop,
    status: bus.status,
    isLiveTrackingActive: isTracking,
    secondsAgo,
    locationMode: bus.locationMode,
    currentLocation: bus.currentLocation,
    metadata: {
      source: isTracking ? "Driver GPS Feed" : "Fleet Operational Register",
      sourceType: isTracking ? "live GPS" : "official",
      isLive: isTracking,
      lastUpdated: bus.updatedAt.toISOString(),
    },
  };
}

// ============================================================================
// TOOL 12: calculate_eta
// Calculates ETA only when real route geometry & coordinates exist
// ============================================================================
export async function toolCalculateEta(busId: string, stopId: string) {
  const loc = await getLatestBusLocation(busId);
  if (!loc) {
    const legacy = toolCalculateEtaLegacy(busId, stopId);
    return legacy;
  }

  const pickupEta = calculatePickupEta(busId, { latitude: loc.latitude, longitude: loc.longitude }, stopId);
  if (!pickupEta) {
    return {
      canCalculate: false,
      reason: `Could not compute pickup ETA for stop ${stopId}.`,
      metadata: { source: "ACIMS Pickup ETA Engine", sourceType: "calculated" },
    };
  }

  const { getBusShiftTimingContext } = await import("./shiftTiming.ts");
  const shiftCtx = await getBusShiftTimingContext(busId);
  const delay = shiftCtx
    ? assessTripDelay({
        busId,
        shiftStartTime: shiftCtx.shiftStartTime,
        pickupExpectedOffsetMinutes: shiftCtx.pickupExpectedOffsetMinutes,
        currentEtaToPickupMinutes: pickupEta.etaMinutes,
      })
    : { delayMinutes: 0, status: "ON_TIME" as const, expectedArrivalMinutesFromShiftStart: 0, predictedArrivalMinutesFromShiftStart: 0 };

  return {
    canCalculate: true,
    etaMinutes: pickupEta.etaMinutes,
    formattedEta: pickupEta.formattedEta,
    pickupStopName: pickupEta.pickupStopName,
    delayMinutes: delay.delayMinutes,
    delayStatus: delay.status,
    metadata: {
      source: "ACIMS Pickup ETA + Delay Engine (live GPS)",
      sourceType: "live GPS",
      lastUpdated:
        loc.recordedAt instanceof Date
          ? loc.recordedAt.toISOString()
          : loc.recordedAt
            ? String(loc.recordedAt)
            : new Date().toISOString(),
    },
  };
}

function toolCalculateEtaLegacy(busId: string, stopId: string) {
  const bus = getBus(busId);
  if (!bus) {
    return {
      canCalculate: false,
      reason: `Bus ${busId} not found in active fleet.`,
      metadata: { source: "ACIMS ETA Engine", sourceType: "calculated" },
    };
  }

  const route = getAllRoutes().find((r) => r.id === bus.routeId);
  if (!route) {
    return {
      canCalculate: false,
      reason: `Route definition for ${bus.routeId} unavailable.`,
      metadata: { source: "ACIMS ETA Engine", sourceType: "calculated" },
    };
  }

  const targetStop = route.stops.find((s) => s.id === stopId);
  if (!targetStop) {
    return {
      canCalculate: false,
      reason: `Stop ${stopId} is not served by Bus #${bus.busNumber}.`,
      metadata: { source: "ACIMS ETA Engine", sourceType: "calculated" },
    };
  }

  const directDistanceKm = haversineDistance(bus.currentLocation, {
    latitude: targetStop.latitude,
    longitude: targetStop.longitude,
  });
  const avgSpeedKmh = route.averageSpeedKmh || 22;
  const travelMinutes = Math.max(1, Math.round((directDistanceKm / avgSpeedKmh) * 60));

  return {
    canCalculate: true,
    etaMinutes: travelMinutes,
    formattedEta: travelMinutes <= 1 ? "Arriving in ~1 min" : `approximately ${travelMinutes} min`,
    metadata: {
      source: "ACIMS Distance & Geometry Calculator (fallback)",
      sourceType: "calculated",
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ============================================================================
// TOOL 13: get_public_transport_status
// ============================================================================
export function toolGetPublicTransportStatus() {
  const db = getDatabase();
  const agencies = db.prepare("SELECT * FROM public_transport_agencies").all() as any[];
  const routesCount = (db.prepare("SELECT count(*) as count FROM public_transport_routes").get() as any)?.count || 0;
  const stopsCount = (db.prepare("SELECT count(*) as count FROM public_transport_stops").get() as any)?.count || 0;
  const syncLogs = db.prepare("SELECT * FROM public_transport_sync_logs ORDER BY downloaded_at DESC LIMIT 1").all() as any[];

  return {
    status: "OPERATIONAL",
    agencies: agencies.map((a) => ({ id: a.id, name: a.name, type: a.agency_type, url: a.official_url })),
    totalRoutes: routesCount,
    totalStops: stopsCount,
    lastSync: syncLogs[0] || null,
    metadata: {
      source: "CUMTA Chennai Unified Transit Data Feed",
      sourceType: "official",
      lastUpdated: syncLogs[0]?.downloaded_at || new Date().toISOString(),
    },
  };
}
