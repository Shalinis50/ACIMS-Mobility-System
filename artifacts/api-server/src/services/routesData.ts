import { INITIAL_DEMO_ROUTES } from "../../../../src/db/initialDemoRoutes.ts";

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type RouteStop = Coordinate & {
  id: string;
  name: string;
  sequence: number;
  pathIndex: number;
  minutesFromPrevious: number;
};

export type RouteDefinition = {
  id: string;
  routeNumber: string;
  name: string;
  origin: string;
  destination: string;
  stops: RouteStop[];
  path: Coordinate[];
  cumulativeDistances: number[];
  totalDistanceKm: number;
  averageSpeedKmh: number;
};

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistance(c1: Coordinate, c2: Coordinate): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(c2.latitude - c1.latitude);
  const dLon = toRad(c2.longitude - c1.longitude);
  const lat1 = toRad(c1.latitude);
  const lat2 = toRad(c2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateCumulativeDistances(path: Coordinate[]): number[] {
  const cumulative: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineDistance(path[i - 1], path[i]));
  }
  return cumulative;
}

/**
 * Generate smooth path coordinates between key waypoints
 */
function interpolateWaypoints(waypoints: Coordinate[], pointsPerSegment: number): Coordinate[] {
  const result: Coordinate[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    for (let step = 0; step < pointsPerSegment; step++) {
      const t = step / pointsPerSegment;
      result.push({
        latitude: Number((start.latitude + (end.latitude - start.latitude) * t).toFixed(6)),
        longitude: Number((start.longitude + (end.longitude - start.longitude) * t).toFixed(6)),
      });
    }
  }
  result.push(waypoints[waypoints.length - 1]);
  return result;
}

/**
 * ------------------------------------------------------------------------
 * ROUTE 18: AVADI (Official REC Transport Route)
 * Stops:
 * - Avadi Ramarathinam (pathIndex: 0)
 * - Ponnu Supermarket (pathIndex: 12)
 * - Poonamallee Bypass (pathIndex: 24) [Via / Non-stop]
 * - College Campus (pathIndex: 36) [Destination]
 * ------------------------------------------------------------------------
 */
const bus18Waypoints: Coordinate[] = [
  { latitude: 13.1180, longitude: 80.1030 }, // Avadi Ramarathinam
  { latitude: 13.1140, longitude: 80.1070 }, // Ponnu Supermarket
  { latitude: 13.0489, longitude: 80.0934 }, // Poonamallee Bypass
  { latitude: 13.0084, longitude: 80.0033 }, // College Campus
];
const bus18Path = interpolateWaypoints(bus18Waypoints, 12);
const bus18Cumulative = calculateCumulativeDistances(bus18Path);

const routeBus18: RouteDefinition = {
  id: "route-18",
  routeNumber: "18",
  name: "AVADI",
  origin: "Avadi Ramarathinam",
  destination: "College Campus",
  stops: [
    {
      id: "18-1",
      name: "Avadi Ramarathinam",
      sequence: 1,
      pathIndex: 0,
      latitude: 13.1180,
      longitude: 80.1030,
      minutesFromPrevious: 0,
    },
    {
      id: "18-2",
      name: "Ponnu Supermarket",
      sequence: 2,
      pathIndex: 12,
      latitude: 13.1140,
      longitude: 80.1070,
      minutesFromPrevious: 2,
    },
    {
      id: "18-3",
      name: "Poonamallee Bypass",
      sequence: 3,
      pathIndex: 24,
      latitude: 13.0489,
      longitude: 80.0934,
      minutesFromPrevious: 33,
    },
    {
      id: "18-4",
      name: "College Campus",
      sequence: 4,
      pathIndex: 36,
      latitude: 13.0084,
      longitude: 80.0033,
      minutesFromPrevious: 25,
    },
  ],
  path: bus18Path,
  cumulativeDistances: bus18Cumulative,
  totalDistanceKm: Number(bus18Cumulative[bus18Cumulative.length - 1].toFixed(2)),
  averageSpeedKmh: 30,
};

/**
 * ------------------------------------------------------------------------
 * ROUTE 12: Campus Loop A
 * Vandalur (0) → Perungalathur (8) → Tambaram (16) → College Main (24)
 * ------------------------------------------------------------------------
 */
const bus12Waypoints: Coordinate[] = [
  { latitude: 12.8924, longitude: 80.0812 }, // Vandalur
  { latitude: 12.9055, longitude: 80.0918 }, // Perungalathur
  { latitude: 12.9249, longitude: 80.1275 }, // Tambaram
  { latitude: 12.9407, longitude: 80.1393 }, // College Main
];
const bus12Path = interpolateWaypoints(bus12Waypoints, 8);
const bus12Cumulative = calculateCumulativeDistances(bus12Path);

const routeBus12: RouteDefinition = {
  id: "route-bus-12",
  routeNumber: "12",
  name: "Campus Loop A",
  origin: "Vandalur Transit Hub",
  destination: "Academic Quad",
  stops: [
    {
      id: "vandalur",
      name: "Vandalur Transit Hub",
      sequence: 0,
      pathIndex: 0,
      latitude: bus12Path[0].latitude,
      longitude: bus12Path[0].longitude,
      minutesFromPrevious: 0,
    },
    {
      id: "perungalathur",
      name: "Perungalathur Junction",
      sequence: 1,
      pathIndex: 8,
      latitude: bus12Path[8].latitude,
      longitude: bus12Path[8].longitude,
      minutesFromPrevious: 5,
    },
    {
      id: "tambaram",
      name: "Tambaram Terminal",
      sequence: 2,
      pathIndex: 16,
      latitude: bus12Path[16].latitude,
      longitude: bus12Path[16].longitude,
      minutesFromPrevious: 7,
    },
    {
      id: "college",
      name: "College Main Terminal",
      sequence: 3,
      pathIndex: 24,
      latitude: bus12Path[24].latitude,
      longitude: bus12Path[24].longitude,
      minutesFromPrevious: 6,
    },
  ],
  path: bus12Path,
  cumulativeDistances: bus12Cumulative,
  totalDistanceKm: Number(bus12Cumulative[bus12Cumulative.length - 1].toFixed(2)),
  averageSpeedKmh: 24,
};

/**
 * ------------------------------------------------------------------------
 * ROUTE 4B: Engineering Express
 * North Residence (0) → Bio-Engineering Center (10) → Tech & Innovation Park (20)
 * ------------------------------------------------------------------------
 */
const bus4bWaypoints: Coordinate[] = [
  { latitude: 12.9458, longitude: 80.1352 },
  { latitude: 12.9385, longitude: 80.1284 },
  { latitude: 12.9312, longitude: 80.1215 },
];
const bus4bPath = interpolateWaypoints(bus4bWaypoints, 10);
const bus4bCumulative = calculateCumulativeDistances(bus4bPath);

const routeBus4b: RouteDefinition = {
  id: "route-bus-4b",
  routeNumber: "4B",
  name: "Engineering Express",
  origin: "North Residence Complex",
  destination: "Tech & Innovation Park",
  stops: [
    {
      id: "north-residence",
      name: "North Residence Complex",
      sequence: 0,
      pathIndex: 0,
      latitude: bus4bPath[0].latitude,
      longitude: bus4bPath[0].longitude,
      minutesFromPrevious: 0,
    },
    {
      id: "bio-center",
      name: "Bio-Engineering Center",
      sequence: 1,
      pathIndex: 10,
      latitude: bus4bPath[10].latitude,
      longitude: bus4bPath[10].longitude,
      minutesFromPrevious: 5,
    },
    {
      id: "tech-park",
      name: "Tech & Innovation Park",
      sequence: 2,
      pathIndex: 20,
      latitude: bus4bPath[20].latitude,
      longitude: bus4bPath[20].longitude,
      minutesFromPrevious: 6,
    },
  ],
  path: bus4bPath,
  cumulativeDistances: bus4bCumulative,
  totalDistanceKm: Number(bus4bCumulative[bus4bCumulative.length - 1].toFixed(2)),
  averageSpeedKmh: 20,
};

/**
 * ------------------------------------------------------------------------
 * ROUTE 7: North Campus Shuttle
 * Hostel Village (0) → Athletics (7) → Central Library (14) → Academic Quad (21)
 * ------------------------------------------------------------------------
 */
const bus7Waypoints: Coordinate[] = [
  { latitude: 12.9015, longitude: 80.0984 },
  { latitude: 12.9198, longitude: 80.1179 },
  { latitude: 12.9381, longitude: 80.1369 },
  { latitude: 12.9422, longitude: 80.1378 },
];
const bus7Path = interpolateWaypoints(bus7Waypoints, 7);
const bus7Cumulative = calculateCumulativeDistances(bus7Path);

const routeBus7: RouteDefinition = {
  id: "route-bus-7",
  routeNumber: "7",
  name: "North Campus Shuttle",
  origin: "Hostel Village",
  destination: "Central Library & Union",
  stops: [
    {
      id: "hostel-village",
      name: "Hostel Village",
      sequence: 0,
      pathIndex: 0,
      latitude: bus7Path[0].latitude,
      longitude: bus7Path[0].longitude,
      minutesFromPrevious: 0,
    },
    {
      id: "athletics",
      name: "Athletic Pavilion",
      sequence: 1,
      pathIndex: 7,
      latitude: bus7Path[7].latitude,
      longitude: bus7Path[7].longitude,
      minutesFromPrevious: 4,
    },
    {
      id: "library",
      name: "Central Library & Union",
      sequence: 2,
      pathIndex: 14,
      latitude: bus7Path[14].latitude,
      longitude: bus7Path[14].longitude,
      minutesFromPrevious: 5,
    },
    {
      id: "academic-quad",
      name: "Academic Quad",
      sequence: 3,
      pathIndex: 21,
      latitude: bus7Path[21].latitude,
      longitude: bus7Path[21].longitude,
      minutesFromPrevious: 2,
    },
  ],
  path: bus7Path,
  cumulativeDistances: bus7Cumulative,
  totalDistanceKm: Number(bus7Cumulative[bus7Cumulative.length - 1].toFixed(2)),
  averageSpeedKmh: 20,
};

/**
 * ------------------------------------------------------------------------
 * ROUTE 21: South Perimeter Circle
 * South Commuter Lot (0) → Faculty Enclave (9) → Main Auditorium (18)
 * ------------------------------------------------------------------------
 */
const bus21Waypoints: Coordinate[] = [
  { latitude: 12.8955, longitude: 80.0864 },
  { latitude: 12.9188, longitude: 80.1121 },
  { latitude: 12.9355, longitude: 80.1325 },
];
const bus21Path = interpolateWaypoints(bus21Waypoints, 9);
const bus21Cumulative = calculateCumulativeDistances(bus21Path);

const routeBus21: RouteDefinition = {
  id: "route-bus-21",
  routeNumber: "21",
  name: "South Perimeter Circle",
  origin: "South Commuter Lot",
  destination: "Main Auditorium",
  stops: [
    {
      id: "south-lot",
      name: "South Commuter Lot",
      sequence: 0,
      pathIndex: 0,
      latitude: bus21Path[0].latitude,
      longitude: bus21Path[0].longitude,
      minutesFromPrevious: 0,
    },
    {
      id: "faculty-enclave",
      name: "Faculty Enclave",
      sequence: 1,
      pathIndex: 9,
      latitude: bus21Path[9].latitude,
      longitude: bus21Path[9].longitude,
      minutesFromPrevious: 5,
    },
    {
      id: "auditorium",
      name: "Main Auditorium",
      sequence: 2,
      pathIndex: 18,
      latitude: bus21Path[18].latitude,
      longitude: bus21Path[18].longitude,
      minutesFromPrevious: 6,
    },
  ],
  path: bus21Path,
  cumulativeDistances: bus21Cumulative,
  totalDistanceKm: Number(bus21Cumulative[bus21Cumulative.length - 1].toFixed(2)),
  averageSpeedKmh: 22,
};

const mtc21gWaypoints: Coordinate[] = [
  { latitude: 12.9249, longitude: 80.1275 }, // Tambaram Terminal
  { latitude: 12.9516, longitude: 80.1462 }, // Chromepet
  { latitude: 13.0067, longitude: 80.2206 }, // Guindy
  { latitude: 13.0827, longitude: 80.2707 }, // Broadway / Central
];
const mtc21gPath = interpolateWaypoints(mtc21gWaypoints, 8);
const mtc21gCumulative = calculateCumulativeDistances(mtc21gPath);

const routeMtc21g: RouteDefinition = {
  id: "route-MTC_21G",
  routeNumber: "MTC_21G",
  name: "MTC 21G Express Corridor",
  origin: "Tambaram Terminal",
  destination: "Broadway / Central",
  stops: [
    {
      id: "mtc21g-tambaram",
      name: "Tambaram Terminal",
      sequence: 0,
      pathIndex: 0,
      latitude: mtc21gPath[0].latitude,
      longitude: mtc21gPath[0].longitude,
      minutesFromPrevious: 0,
    },
    {
      id: "mtc21g-chromepet",
      name: "Chromepet Station",
      sequence: 1,
      pathIndex: 8,
      latitude: mtc21gPath[8].latitude,
      longitude: mtc21gPath[8].longitude,
      minutesFromPrevious: 6,
    },
    {
      id: "mtc21g-guindy",
      name: "Guindy Transit Hub",
      sequence: 2,
      pathIndex: 16,
      latitude: mtc21gPath[16].latitude,
      longitude: mtc21gPath[16].longitude,
      minutesFromPrevious: 10,
    },
    {
      id: "mtc21g-broadway",
      name: "Broadway / Central",
      sequence: 3,
      pathIndex: 24,
      latitude: mtc21gPath[24].latitude,
      longitude: mtc21gPath[24].longitude,
      minutesFromPrevious: 12,
    },
  ],
  path: mtc21gPath,
  cumulativeDistances: mtc21gCumulative,
  totalDistanceKm: Number(mtc21gCumulative[mtc21gCumulative.length - 1].toFixed(2)),
  averageSpeedKmh: 26,
};

const routeMtc27b: RouteDefinition = {
  id: "route-MTC_27B",
  routeNumber: "MTC_27B",
  name: "MTC 27B Koyambedu Link",
  origin: "CMBT Koyambedu",
  destination: "Anna Square",
  stops: [
    {
      id: "mtc27b-cmbt",
      name: "CMBT Koyambedu",
      sequence: 0,
      pathIndex: 0,
      latitude: 13.0694,
      longitude: 80.2058,
      minutesFromPrevious: 0,
    },
    {
      id: "mtc27b-anna",
      name: "Anna Square",
      sequence: 1,
      pathIndex: 8,
      latitude: 13.0658,
      longitude: 80.2848,
      minutesFromPrevious: 15,
    },
  ],
  path: interpolateWaypoints(
    [
      { latitude: 13.0694, longitude: 80.2058 },
      { latitude: 13.0658, longitude: 80.2848 },
    ],
    8
  ),
  cumulativeDistances: [0, 8.5],
  totalDistanceKm: 8.5,
  averageSpeedKmh: 24,
};

// Build all 11 official REC College Routes from INITIAL_DEMO_ROUTES
const recDemoRouteRegistry: Record<string, RouteDefinition> = {};
for (const demo of INITIAL_DEMO_ROUTES) {
  if (demo.routeNumber === "18") {
    recDemoRouteRegistry["route-18"] = routeBus18;
    recDemoRouteRegistry["route-bus-18"] = routeBus18;
    continue;
  }
  const waypoints = demo.stops.map((s) => ({ latitude: s.lat, longitude: s.lng }));
  const path = interpolateWaypoints(waypoints, 6);
  const cumulative = calculateCumulativeDistances(path);
  const routeDef: RouteDefinition = {
    id: `route-${demo.routeNumber.toLowerCase()}`,
    routeNumber: demo.routeNumber,
    name: demo.routeName,
    origin: demo.origin,
    destination: demo.destination,
    stops: demo.stops.map((s, idx) => ({
      id: `route-${demo.routeNumber.toLowerCase()}-stop-${idx + 1}`,
      name: s.name,
      sequence: idx + 1,
      pathIndex: Math.min(idx * 6, Math.max(0, path.length - 1)),
      latitude: s.lat,
      longitude: s.lng,
      minutesFromPrevious: idx === 0 ? 0 : 3,
    })),
    path,
    cumulativeDistances: cumulative,
    totalDistanceKm: Number((cumulative[cumulative.length - 1] || 0).toFixed(2)),
    averageSpeedKmh: 24,
  };
  recDemoRouteRegistry[routeDef.id] = routeDef;
  recDemoRouteRegistry[`route-bus-${demo.routeNumber.toLowerCase()}`] = routeDef;
}

const routeRegistry: Record<string, RouteDefinition> = {
  ...recDemoRouteRegistry,
  "route-MTC_21G": routeMtc21g,
  "route-MTC_27B": routeMtc27b,
  "route-bus-18": routeBus18,
  "route-18": routeBus18,
  "route-bus-12": routeBus12,
  "route-bus-4b": routeBus4b,
  "route-bus-7": routeBus7,
  "route-bus-21": routeBus21,
};

export function getRouteById(routeId: string): RouteDefinition | undefined {
  if (!routeId) return undefined;
  const clean = routeId.trim().toLowerCase();
  return (
    routeRegistry[clean] ||
    routeRegistry[`route-${clean}`] ||
    routeRegistry[`route-bus-${clean}`] ||
    Object.values(routeRegistry).find(
      (r) => r.id.toLowerCase() === clean || r.routeNumber.toLowerCase() === clean
    )
  );
}

export function getRouteForBus(busId: string): RouteDefinition {
  if (!busId) {
    return routeBus18;
  }
  const clean = busId.trim().toLowerCase();
  const numOnly = clean.replace(/^(bus-|route-)/, "");

  // 1. Direct registry lookup
  if (routeRegistry[`route-${clean}`]) return routeRegistry[`route-${clean}`];
  if (routeRegistry[`route-bus-${clean}`]) return routeRegistry[`route-bus-${clean}`];
  if (routeRegistry[clean]) return routeRegistry[clean];

  // 2. Lookup by stripped route number
  const matchByNum = Object.values(routeRegistry).find(
    (r) => r.routeNumber.toLowerCase() === numOnly || r.id.toLowerCase() === `route-${numOnly}`
  );
  if (matchByNum) return matchByNum;

  // 3. Fallback to Route 18 or first registered route
  return routeRegistry["route-18"] || Object.values(routeRegistry)[0];
}

export function getAllRoutes(): RouteDefinition[] {
  return Object.values(routeRegistry);
}
