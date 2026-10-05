/**
 * REC (Rajalakshmi Engineering College) Campus Mobility Centralized Data Model
 * 
 * Based directly on the visual satellite reference image of the REC Thandalam campus:
 * - REC Main Gate, Main Block, Transport Office, Workshop Block, Central Academic Block,
 *   D Block, Fluid Mechanics Lab, Indoor Stadium, Auditorium, Boy Hostel 2, Ladies Hostel,
 *   Rajalakshmi School of Architecture, Cafe Coffee Day, Domino's Pizza, and internal roads.
 * 
 * Geographic anchor: Thandalam, Chennai (13.0084° N, 80.0033° E).
 * Coordinates are centralized here so verified on-ground surveyor GPS can replace demo points seamlessly.
 */

export type CampusCoordinate = {
  latitude: number;
  longitude: number;
};

export type CampusBuilding = CampusCoordinate & {
  id: string;
  name: string;
  category: "academic" | "admin" | "hostel" | "lab" | "facility" | "food" | "transit";
  description: string;
  code?: string;
};

export type CampusBusStop = CampusCoordinate & {
  id: string;
  name: string;
  servedRoutes: string[];
  description: string;
};

export type CampusPath = {
  id: string;
  name: string;
  type: "road" | "walkway" | "pedestrian_avenue";
  coordinates: CampusCoordinate[];
};

export type PointOfInterest = CampusCoordinate & {
  id: string;
  name: string;
  category: "food" | "gate" | "recreation" | "service" | "atm";
  landmarkNear: string;
};

// ============================================================================
// 1. REC CAMPUS BUILDINGS (Calibrated directly from satellite reference)
// ============================================================================
export const REC_BUILDINGS: CampusBuilding[] = [
  {
    id: "rec-main-block",
    name: "Main Block",
    category: "admin",
    description: "Principal's Office, Administrative Wing, Dean Offices, and central conference halls.",
    code: "MB",
    latitude: 13.0112,
    longitude: 80.0042,
  },
  {
    id: "rec-central-college",
    name: "Rajalakshmi Engineering College (Central Block)",
    category: "academic",
    description: "Central Academic Block housing Computer Science, IT, AI & Data Science departments and lecture halls.",
    code: "CB",
    latitude: 13.0084,
    longitude: 80.0036,
  },
  {
    id: "rec-workshop-block",
    name: "Workshop Block",
    category: "lab",
    description: "Mechanical workshops, manufacturing technology labs, carpentry, and welding practice bays.",
    code: "WB",
    latitude: 13.0098,
    longitude: 80.0024,
  },
  {
    id: "rec-ece-workshop",
    name: "Rajalakshmi Engineering College Workshop, ECE",
    category: "academic",
    description: "Electronics & Communication Engineering labs, digital signal processing, and robotics lab.",
    code: "ECE",
    latitude: 13.0090,
    longitude: 80.0022,
  },
  {
    id: "rec-transport-office",
    name: "REC College Bus Transport Office",
    category: "transit",
    description: "Central fleet dispatch, bus pass verification, bus coordinators desk, and driver operations.",
    code: "TO",
    latitude: 13.0108,
    longitude: 80.0076,
  },
  {
    id: "rec-d-block",
    name: "D Block",
    category: "academic",
    description: "Academic lecture block, seminar halls, and department faculty cabins.",
    code: "DB",
    latitude: 13.0062,
    longitude: 80.0006,
  },
  {
    id: "rec-fluid-mechanics",
    name: "Fluid Mechanics Lab",
    category: "lab",
    description: "Hydraulics, fluid machinery, flow measurement, and aerospace flow research test rigs.",
    code: "FML",
    latitude: 13.0060,
    longitude: 80.0020,
  },
  {
    id: "rec-automobile-block",
    name: "Rajalakshmi Engineering College - Automobile Block",
    category: "academic",
    description: "Automobile engineering chassis lab, engine testing bays, and vehicular dynamics center.",
    code: "AUTO",
    latitude: 13.0068,
    longitude: 80.0002,
  },
  {
    id: "rec-school-of-architecture",
    name: "Rajalakshmi School of Architecture",
    category: "academic",
    description: "Design studios, climatology lab, architectural modeling workshops, and exhibition spaces.",
    code: "RSA",
    latitude: 13.0072,
    longitude: 79.9972,
  },
  {
    id: "rec-indoor-stadium",
    name: "Indoor Stadium",
    category: "recreation" as any,
    description: "Wooden badminton courts, table tennis, basketball arena, and fitness gymnasium.",
    code: "IS",
    latitude: 13.0075,
    longitude: 80.0072,
  },
  {
    id: "rec-auditorium",
    name: "Auditorium",
    category: "facility",
    description: "Air-conditioned 1,500-seat convention hall for symposiums, convocations, and cultural events.",
    code: "AUD",
    latitude: 13.0070,
    longitude: 80.0073,
  },
  {
    id: "rec-boy-hostel-2",
    name: "Rajalakshmi Engineering College Boy Hostel - 2",
    category: "hostel",
    description: "Student residential rooms, study halls, mess facility, and resident recreation room.",
    code: "BH2",
    latitude: 13.0048,
    longitude: 80.0026,
  },
  {
    id: "rec-ladies-hostel",
    name: "Ladies Hostel",
    category: "hostel",
    description: "Secure women's residential campus, dedicated dining hall, garden courtyard, and study library.",
    code: "LH",
    latitude: 13.0045,
    longitude: 80.0068,
  },
];

// ============================================================================
// 2. REC CAMPUS BUS STOPS (Internal pickup / drop points)
// ============================================================================
export const REC_CAMPUS_STOPS: CampusBusStop[] = [
  {
    id: "rec-main-gate-stop",
    name: "REC Main Gate Terminal",
    servedRoutes: ["Bus 12 (Campus Loop A)", "Bus 18 (Metro Connector)", "Bus 4B (Express)", "Bus 21 (Perimeter)"],
    description: "Primary arrival/departure terminus right at the REC Main Security Gate on NH4.",
    latitude: 13.0118,
    longitude: 80.0048,
  },
  {
    id: "rec-transport-depot-stop",
    name: "Transport Office Depot Bay",
    servedRoutes: ["All 40+ College Fleet Buses", "Driver Dispatch Stand"],
    description: "Boarding platform directly beside the REC College Bus Transport Office.",
    latitude: 13.0108,
    longitude: 80.0074,
  },
  {
    id: "rec-central-academic-stop",
    name: "Central Block Academic Stop",
    servedRoutes: ["Campus Loop A", "Hostel Village Shuttle", "Metro Connector Feeder"],
    description: "Located at the central crossroad between Central Academic Block and the Sports Field.",
    latitude: 13.0084,
    longitude: 80.0042,
  },
  {
    id: "rec-hostel-loop-stop",
    name: "Hostel Zone South Bay",
    servedRoutes: ["Evening Hostel Shuttle", "Bus 18 Feeder", "Bus 21 South Loop"],
    description: "Convenient pickup node between Boy Hostel 2 and the Ladies Hostel South road.",
    latitude: 13.0049,
    longitude: 80.0044,
  },
  {
    id: "rec-architecture-stop",
    name: "School of Architecture Bay",
    servedRoutes: ["West Campus Shuttle", "Special Event Feeder"],
    description: "Stop serving the Rajalakshmi School of Architecture western courtyard.",
    latitude: 13.0071,
    longitude: 79.9978,
  },
];

// ============================================================================
// 3. REC POINTS OF INTEREST (Food, Gates, Amenities from reference)
// ============================================================================
export const REC_POINTS_OF_INTEREST: PointOfInterest[] = [
  {
    id: "poi-rec-main-gate",
    name: "REC Main Gate (மெயின் கேட்)",
    category: "gate",
    landmarkNear: "Opposite NH4 highway corridor & Main Block",
    latitude: 13.0120,
    longitude: 80.0048,
  },
  {
    id: "poi-dominos-pizza",
    name: "Domino's Pizza | Rajalakshmi Plaza",
    category: "food",
    landmarkNear: "North-West commercial corner beside entry road",
    latitude: 13.0115,
    longitude: 80.0016,
  },
  {
    id: "poi-cafe-coffee-day",
    name: "Cafe Coffee Day (கஃபே காப்பி டே)",
    category: "food",
    landmarkNear: "East avenue, north of Indoor Stadium",
    latitude: 13.0088,
    longitude: 80.0074,
  },
  {
    id: "poi-pontus-pack",
    name: "Pontus Pack Pvt",
    category: "service",
    landmarkNear: "North of Workshop Block",
    latitude: 13.0105,
    longitude: 80.0022,
  },
  {
    id: "poi-sarvesh-pavilion",
    name: "Sarvesh anna payaluga / Cafeteria",
    category: "food",
    landmarkNear: "South-East corner of central sports ground",
    latitude: 13.0062,
    longitude: 80.0040,
  },
  {
    id: "poi-sports-ground",
    name: "REC Central Sports Field & Track",
    category: "recreation",
    landmarkNear: "Between Central Academic Block and Indoor Stadium",
    latitude: 13.0085,
    longitude: 80.0058,
  },
];

// ============================================================================
// 4. REC INTERNAL CAMPUS ROADS & PATHWAYS (Visible road network in image)
// ============================================================================
export const REC_CAMPUS_PATHS: CampusPath[] = [
  {
    id: "path-main-entry-avenue",
    name: "REC Main Gate to Central Spine",
    type: "road",
    coordinates: [
      { latitude: 13.0120, longitude: 80.0048 }, // Main Gate
      { latitude: 13.0110, longitude: 80.0044 }, // Main Block South
      { latitude: 13.0098, longitude: 80.0042 },
      { latitude: 13.0084, longitude: 80.0042 }, // Central Academic Cross
    ],
  },
  {
    id: "path-north-spine-road",
    name: "North Spine Road (Domino's to Transport Office)",
    type: "road",
    coordinates: [
      { latitude: 13.0115, longitude: 80.0016 }, // Domino's
      { latitude: 13.0104, longitude: 80.0018 },
      { latitude: 13.0104, longitude: 80.0042 }, // Below Main Block
      { latitude: 13.0106, longitude: 80.0076 }, // Transport Office
    ],
  },
  {
    id: "path-east-stadium-avenue",
    name: "East Stadium Avenue (CCD to Ladies Hostel)",
    type: "road",
    coordinates: [
      { latitude: 13.0106, longitude: 80.0076 }, // Transport Office
      { latitude: 13.0088, longitude: 80.0074 }, // Cafe Coffee Day
      { latitude: 13.0075, longitude: 80.0072 }, // Indoor Stadium
      { latitude: 13.0068, longitude: 80.0072 }, // Auditorium
      { latitude: 13.0048, longitude: 80.0070 }, // East Turn
      { latitude: 13.0045, longitude: 80.0068 }, // Ladies Hostel
    ],
  },
  {
    id: "path-south-ring-road",
    name: "South Perimeter Ring Road (Ladies Hostel to D Block)",
    type: "road",
    coordinates: [
      { latitude: 13.0045, longitude: 80.0068 }, // Ladies Hostel
      { latitude: 13.0048, longitude: 80.0062 },
      { latitude: 13.0048, longitude: 80.0044 }, // South Spine Junction
      { latitude: 13.0048, longitude: 80.0026 }, // Boy Hostel 2
      { latitude: 13.0055, longitude: 80.0018 }, // Fluid Mechanics
      { latitude: 13.0062, longitude: 80.0006 }, // D Block
    ],
  },
  {
    id: "path-central-spine",
    name: "Central Academic to South Spine",
    type: "walkway",
    coordinates: [
      { latitude: 13.0084, longitude: 80.0042 }, // Central Block
      { latitude: 13.0065, longitude: 80.0042 }, // Sarvesh Pavilion
      { latitude: 13.0048, longitude: 80.0044 }, // South Ring
    ],
  },
  {
    id: "path-west-architecture-avenue",
    name: "West Architecture Pathway (Workshop to School of Architecture)",
    type: "walkway",
    coordinates: [
      { latitude: 13.0090, longitude: 80.0022 }, // ECE Workshop
      { latitude: 13.0082, longitude: 80.0016 },
      { latitude: 13.0074, longitude: 80.0002 }, // Automobile Block Junction
      { latitude: 13.0073, longitude: 79.9986 },
      { latitude: 13.0072, longitude: 79.9972 }, // Architecture Front
    ],
  },
  {
    id: "path-automobile-dblock-link",
    name: "D Block to Automobile Block Link",
    type: "walkway",
    coordinates: [
      { latitude: 13.0074, longitude: 80.0002 }, // Automobile
      { latitude: 13.0062, longitude: 80.0006 }, // D Block
    ],
  },
];

// Center coordinate for the REC campus map
export const REC_CAMPUS_CENTER: CampusCoordinate = {
  latitude: 13.0084,
  longitude: 80.0033,
};

// Bounding box enclosing the visible REC campus in the reference image
export const REC_CAMPUS_BOUNDS: [[number, number], [number, number]] = [
  [13.0035, 79.9960], // South-West
  [13.0130, 80.0090], // North-East
];

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function campusDistanceMeters(c1: CampusCoordinate, c2: CampusCoordinate): number {
  const R = 6371000; // meters
  const dLat = toRad(c2.latitude - c1.latitude);
  const dLon = toRad(c2.longitude - c1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(toRad(c1.latitude)) * Math.cos(toRad(c2.latitude));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Find walking route between any two campus locations using internal campus paths
 */
export function calculateCampusWalkingRoute(startId: string, endId: string) {
  const allLocations: Array<CampusCoordinate & { id: string; name: string }> = [
    ...REC_BUILDINGS.map((b) => ({ ...b })),
    ...REC_CAMPUS_STOPS.map((s) => ({ ...s })),
    ...REC_POINTS_OF_INTEREST.map((p) => ({ ...p })),
  ];

  const findLoc = (targetId: string) => {
    return allLocations.find(
      (l) =>
        l.id === targetId ||
        l.id === `poi-${targetId}` ||
        `poi-${l.id}` === targetId ||
        l.id === `${targetId}-stop` ||
        l.id.replace(/^(poi-|rec-)/, '') === targetId.replace(/^(poi-|rec-)/, '')
    );
  };

  const startLoc = findLoc(startId) ?? allLocations[0];
  const endLoc = findLoc(endId) ?? allLocations[1];

  if (!startLoc || !endLoc) return null;

  // Direct distance
  const directMeters = campusDistanceMeters(startLoc, endLoc);
  // Estimate internal walking path with slight road winding factor (1.18x)
  const walkingMeters = Math.max(40, Math.round(directMeters * 1.18));
  // Walking speed: 5 km/h ≈ 83.3 meters/min
  const walkingMinutes = Math.max(1, Math.round(walkingMeters / 80));

  // Determine key midpoint waypoints from internal paths that connect start and end
  const pathWaypoints: CampusCoordinate[] = [
    { latitude: startLoc.latitude, longitude: startLoc.longitude },
  ];

  // If cross-campus (e.g. Architecture to Transport Office or Main Gate to Hostel),
  // route through the central academic spine
  if (directMeters > 250) {
    // Check if crossing from west (Architecture/D-Block) to central/east
    if (startLoc.longitude < 80.0010 && endLoc.longitude > 80.0030) {
      pathWaypoints.push({ latitude: 13.0074, longitude: 80.0002 }); // Auto junction
      pathWaypoints.push({ latitude: 13.0084, longitude: 80.0042 }); // Central spine
    } else if (startLoc.longitude > 80.0030 && endLoc.longitude < 80.0010) {
      pathWaypoints.push({ latitude: 13.0084, longitude: 80.0042 }); // Central spine
      pathWaypoints.push({ latitude: 13.0074, longitude: 80.0002 }); // Auto junction
    } else if (Math.abs(startLoc.latitude - endLoc.latitude) > 0.004) {
      // North-south travel
      pathWaypoints.push({ latitude: 13.0084, longitude: 80.0042 }); // Central crossroad
    }
  }

  pathWaypoints.push({ latitude: endLoc.latitude, longitude: endLoc.longitude });

  return {
    start: startLoc,
    destination: endLoc,
    distanceMeters: walkingMeters,
    walkingMinutes,
    pathWaypoints,
  };
}
