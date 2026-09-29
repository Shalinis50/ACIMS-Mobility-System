import { DatabaseSync } from "node:sqlite";
import { getDatabase, haversineMeters } from "./publicTransitService";
import { getAllRoutes } from "./routesData";
import { REC_CAMPUS_CENTER } from "./campusData";

export interface StudentLocationContext {
  name: string;
  source: "Approved ACIMS Pickup Stop" | "Real Device GPS" | "Saved Location";
  latitude: number;
  longitude: number;
  pickupStopId?: string;
}

export interface PersonalizedTransitResponse {
  status: "SUCCESS" | "LOCATION_UNAVAILABLE" | "NO_NEARBY_STOP" | "NO_SERVICE";
  message?: string;
  studentLocation?: StudentLocationContext;
  destination: {
    name: string;
    latitude: number;
    longitude: number;
  };
  closestPublicStop?: {
    id: string;
    stopId: string;
    name: string;
    distanceMeters: number;
    walkingMinutes: number;
    latitude: number;
    longitude: number;
    agencyId: string;
    agencyName: string;
  };
  nextBus?: {
    routeNumber: string;
    routeName: string;
    origin: string;
    destination: string;
    departureTime: string;
    departureTimeFormatted: string;
    minutesUntil: number;
    fromStop: string;
    tripId: string;
    routeId: string;
    agencyId: string;
    laterDepartures: string[];
    whyRecommended: string[];
  };
  otherBuses: Array<{
    routeNumber: string;
    routeName: string;
    origin: string;
    destination: string;
    departureTime: string;
    departureTimeFormatted: string;
    minutesUntil: number;
    tripId: string;
    routeId: string;
    agencyId: string;
  }>;
  totalServingRoutes: number;
  lastSynchronized: string;
  dataQuality: "Scheduled Timetable (CUMTA / MTC GTFS)";
}

function formatTime12h(time24: string): string {
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

function getCurrentChennaiTime(): { time24: string; minutes: number } {
  // Current time in Asia/Kolkata
  const now = new Date();
  const kolkataStr = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return {
    time24: kolkataStr,
    minutes: timeToMinutes(kolkataStr),
  };
}

export function getPersonalizedTransit(input: {
  studentId?: string;
  pickupStopId?: string;
  latitude?: number;
  longitude?: number;
  targetDestination?: string;
  filterTime?: string; // Optional custom time override for testing, format "HH:MM:SS"
}): PersonalizedTransitResponse {
  const db = getDatabase();

  // 1. Resolve Student Location by Priority:
  // Priority 1: Approved student pickup stop
  // Priority 2: Student's saved pickup location / coords
  // Priority 3: Real device GPS, with permission
  let studentLoc: StudentLocationContext | null = null;

  if (input.pickupStopId) {
    // Search across all routes in routesData for matching stop
    for (const route of getAllRoutes()) {
      const match = route.stops.find((s) => s.id === input.pickupStopId);
      if (match) {
        studentLoc = {
          name: match.name,
          source: "Approved ACIMS Pickup Stop",
          latitude: match.latitude,
          longitude: match.longitude,
          pickupStopId: match.id,
        };
        break;
      }
    }
  }

  if (!studentLoc && input.latitude !== undefined && input.longitude !== undefined) {
    if (!isNaN(input.latitude) && !isNaN(input.longitude)) {
      studentLoc = {
        name: "Current Device GPS",
        source: "Real Device GPS",
        latitude: input.latitude,
        longitude: input.longitude,
      };
    }
  }

  // Fallback to default student stop (Tambaram Terminal) if neither is provided
  if (!studentLoc) {
    const all = getAllRoutes();
    const defaultRoute = all.find((r) => r.id === "route-bus-12") || all[0];
    const defaultStop = defaultRoute?.stops.find((s) => s.id === "tambaram") ?? defaultRoute?.stops[2];
    if (defaultStop) {
      studentLoc = {
        name: defaultStop.name,
        source: "Approved ACIMS Pickup Stop",
        latitude: defaultStop.latitude,
        longitude: defaultStop.longitude,
        pickupStopId: defaultStop.id,
      };
    }
  }

  if (!studentLoc) {
    return {
      status: "LOCATION_UNAVAILABLE",
      message: "Location unavailable. Enable location or select a pickup stop to find public transport near you.",
      destination: {
        name: "Rajalakshmi Engineering College (REC)",
        latitude: REC_CAMPUS_CENTER.latitude,
        longitude: REC_CAMPUS_CENTER.longitude,
      },
      otherBuses: [],
      totalServingRoutes: 0,
      lastSynchronized: new Date().toISOString(),
      dataQuality: "Scheduled Timetable (CUMTA / MTC GTFS)",
    };
  }

  // Destination (Defaults to Rajalakshmi Engineering College, Thandalam)
  const destination = {
    name: input.targetDestination || "Rajalakshmi Engineering College (REC)",
    latitude: REC_CAMPUS_CENTER.latitude,
    longitude: REC_CAMPUS_CENTER.longitude,
  };

  // 2. Find Closest Real Public Bus Stop
  // Search radius: +/- 0.035 deg (~3.8 km)
  const latDelta = 0.035;
  const lonDelta = 0.035;

  const candidateStops = db
    .prepare(
      `SELECT s.*, a.name as agency_name
       FROM public_transport_stops s
       JOIN public_transport_agencies a ON s.agency_id = a.id
       WHERE s.latitude BETWEEN ? AND ?
         AND s.longitude BETWEEN ? AND ?`,
    )
    .all(
      studentLoc.latitude - latDelta,
      studentLoc.latitude + latDelta,
      studentLoc.longitude - lonDelta,
      studentLoc.longitude + lonDelta,
    ) as any[];

  if (candidateStops.length === 0) {
    return {
      status: "NO_NEARBY_STOP",
      message: "No nearby public bus stop found within search radius.",
      studentLocation: studentLoc,
      destination,
      otherBuses: [],
      totalServingRoutes: 0,
      lastSynchronized: new Date().toISOString(),
      dataQuality: "Scheduled Timetable (CUMTA / MTC GTFS)",
    };
  }

  // Calculate true spherical distance
  for (const s of candidateStops) {
    s.distanceMeters = haversineMeters(studentLoc.latitude, studentLoc.longitude, s.latitude, s.longitude);
  }
  candidateStops.sort((a, b) => a.distanceMeters - b.distanceMeters);

  const closestStop = candidateStops[0];
  const walkingMinutes = Math.max(1, Math.round(closestStop.distanceMeters / 80));

  // 3. Query All Routes and Stop Times at THIS Stop
  // Section 5 Rule: Use the departure time AT the student's selected stop, NOT trip origin!
  const stopTimes = db
    .prepare(
      `SELECT
         r.id as route_table_id,
         r.route_id,
         r.route_short_name,
         r.route_long_name,
         r.origin,
         r.destination,
         r.route_type,
         t.id as trip_id,
         t.trip_headsign,
         t.direction_id,
         st.departure_time,
         st.arrival_time,
         st.stop_sequence
       FROM public_transport_stop_times st
       JOIN public_transport_trips t ON st.trip_id = t.id
       JOIN public_transport_routes r ON t.route_id = r.id
       WHERE st.stop_id = ?
       ORDER BY st.departure_time ASC`,
    )
    .all(closestStop.id) as any[];

  if (stopTimes.length === 0) {
    return {
      status: "NO_SERVICE",
      message: "No scheduled MTC service found for this stop.",
      studentLocation: studentLoc,
      destination,
      closestPublicStop: {
        id: closestStop.id,
        stopId: closestStop.stop_id,
        name: closestStop.stop_name,
        distanceMeters: closestStop.distanceMeters,
        walkingMinutes,
        latitude: closestStop.latitude,
        longitude: closestStop.longitude,
        agencyId: closestStop.agency_id,
        agencyName: closestStop.agency_name,
      },
      otherBuses: [],
      totalServingRoutes: 0,
      lastSynchronized: new Date().toISOString(),
      dataQuality: "Scheduled Timetable (CUMTA / MTC GTFS)",
    };
  }

  // 4. Personalized Timings & Directions Filter
  const current = input.filterTime
    ? { time24: input.filterTime, minutes: timeToMinutes(input.filterTime) }
    : getCurrentChennaiTime();

  // Group departures by route + direction
  const routeGroups = new Map<string, any[]>();
  for (const st of stopTimes) {
    const key = `${st.route_short_name}::${st.destination}`;
    if (!routeGroups.has(key)) {
      routeGroups.set(key, []);
    }
    routeGroups.get(key)!.push(st);
  }

  // Find next upcoming departure for each route
  const upcomingList: any[] = [];

  for (const [key, departures] of routeGroups.entries()) {
    // Sort chronologically
    departures.sort((a, b) => timeToMinutes(a.departure_time) - timeToMinutes(b.departure_time));

    // Find first departure after current time
    let nextDep = departures.find((d) => timeToMinutes(d.departure_time) >= current.minutes);

    // If day wrapped (late night query), take earliest morning service
    if (!nextDep && departures.length > 0) {
      nextDep = departures[0];
    }

    if (nextDep) {
      const depMins = timeToMinutes(nextDep.departure_time);
      let diff = depMins - current.minutes;
      if (diff < 0) diff += 1440; // 24-hr wrap

      // Collect subsequent departures
      const subsequent = departures
        .filter((d) => d !== nextDep && timeToMinutes(d.departure_time) >= depMins)
        .slice(0, 3)
        .map((d) => formatTime12h(d.departure_time));

      upcomingList.push({
        routeNumber: nextDep.route_short_name,
        routeName: nextDep.route_long_name,
        origin: nextDep.origin,
        destination: nextDep.destination || nextDep.trip_headsign,
        departureTime: nextDep.departure_time,
        departureTimeFormatted: formatTime12h(nextDep.departure_time),
        minutesUntil: Math.max(1, diff),
        tripId: nextDep.trip_id,
        routeId: nextDep.route_table_id,
        agencyId: "MTC",
        laterDepartures: subsequent,
      });
    }
  }

  // Sort all upcoming services by departure time
  upcomingList.sort((a, b) => a.minutesUntil - b.minutesUntil);

  const topBus = upcomingList[0];
  const otherBuses = upcomingList.slice(1, 12);

  // Section 12: "Why This Bus?" derived from actual data
  const whyRecommended: string[] = [];
  if (topBus) {
    whyRecommended.push(`✓ Closest stop to your pickup (${closestStop.distanceMeters}m away at ${closestStop.stop_name})`);
    whyRecommended.push(`✓ Scheduled departure at your stop: ${topBus.departureTimeFormatted} (in ~${topBus.minutesUntil} min)`);
    whyRecommended.push(`✓ Direct service towards ${topBus.destination}`);
    whyRecommended.push(`✓ Authoritative CUMTA / MTC Scheduled Timetable`);
  }

  return {
    status: "SUCCESS",
    studentLocation: studentLoc,
    destination,
    closestPublicStop: {
      id: closestStop.id,
      stopId: closestStop.stop_id,
      name: closestStop.stop_name,
      distanceMeters: closestStop.distanceMeters,
      walkingMinutes,
      latitude: closestStop.latitude,
      longitude: closestStop.longitude,
      agencyId: closestStop.agency_id,
      agencyName: closestStop.agency_name,
    },
    nextBus: topBus
      ? {
          ...topBus,
          fromStop: closestStop.stop_name,
          whyRecommended,
        }
      : undefined,
    otherBuses,
    totalServingRoutes: routeGroups.size,
    lastSynchronized: new Date().toISOString(),
    dataQuality: "Scheduled Timetable (CUMTA / MTC GTFS)",
  };
}

/**
 * Get all ordered stops for a route with the student's stop highlighted
 */
export function getRouteStopsWithStudentStop(tripId: string, studentStopId?: string) {
  const db = getDatabase();

  const trip = db
    .prepare(
      `SELECT t.*, r.route_short_name, r.route_long_name, r.origin, r.destination
       FROM public_transport_trips t
       JOIN public_transport_routes r ON t.route_id = r.id
       WHERE t.id = ? OR t.trip_id = ?`,
    )
    .get(tripId, tripId) as any;

  if (!trip) return null;

  const stops = db
    .prepare(
      `SELECT
         st.stop_sequence,
         st.arrival_time,
         st.departure_time,
         s.id as stop_id,
         s.stop_name,
         s.latitude,
         s.longitude
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
    origin: trip.origin,
    destination: trip.destination,
    totalStops: stops.length,
    stops: stops.map((s) => ({
      sequence: s.stop_sequence,
      stopId: s.stop_id,
      stopName: s.stop_name,
      arrivalTime: s.arrival_time,
      departureTime: s.departure_time,
      departureTimeFormatted: formatTime12h(s.departure_time),
      latitude: s.latitude,
      longitude: s.longitude,
      isStudentStop: studentStopId ? s.stop_id === studentStopId : false,
    })),
  };
}
