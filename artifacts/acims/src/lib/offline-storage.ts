// ACMIS Offline Storage & Mobility Knowledge Base

export interface OfflineBusRoute {
  id: string;
  busNumber: string;
  origin: string;
  destination: string;
  routeLabel: string;
  operatingHours: string;
  frequency: string;
  stops: Array<{ name: string; sequence: number; landmark?: string }>;
}

export interface OfflineCampusLocation {
  id: string;
  name: string;
  type: string;
  description: string;
  walkingFromMain: string;
  nearestStop: string;
}

export interface OfflineEmergencyContact {
  id: string;
  name: string;
  department: string;
  phone: string;
  ext: string;
  location: string;
}

export interface OfflinePublicTransportGuide {
  category: string;
  name: string;
  routeDetails: string;
  frequency: string;
  campusConnection: string;
}

export interface LastKnownBusSnapshot {
  busId: string;
  busNumber: string;
  lastStop: string;
  status: string;
  savedAt: string;
  etaMinutes?: number;
  origin?: string;
  destination?: string;
  routeLabel?: string;
  capacity?: number;
}

const DEFAULT_OFFLINE_ROUTES: OfflineBusRoute[] = [
  {
    id: 'bus-12',
    busNumber: '12',
    origin: 'Vandalur Transit Hub',
    destination: 'Academic Quad',
    routeLabel: 'Campus Loop A',
    operatingHours: '07:30 AM – 06:30 PM',
    frequency: 'Every 8–10 minutes',
    stops: [
      { sequence: 1, name: 'Vandalur Transit Hub', landmark: 'South Gate Bus Bay 1' },
      { sequence: 2, name: 'Perungalathur Junction', landmark: 'Flyover Underpass' },
      { sequence: 3, name: 'Tambaram Terminal', landmark: 'East Bus Stand Platform 4' },
      { sequence: 4, name: 'College Main Entrance', landmark: 'Security Gate Checkpoint' },
      { sequence: 5, name: 'Academic Quad', landmark: 'Science & Admin Block' },
    ],
  },
  {
    id: 'bus-4b',
    busNumber: '4B',
    origin: 'North Residence Complex',
    destination: 'Tech & Innovation Park',
    routeLabel: 'Engineering Express',
    operatingHours: '08:00 AM – 05:45 PM',
    frequency: 'Every 15 minutes',
    stops: [
      { sequence: 1, name: 'North Residence Complex', landmark: 'Block D Courtyard' },
      { sequence: 2, name: 'Bio-Engineering Center', landmark: 'Biotech Wing Gate 2' },
      { sequence: 3, name: 'College Main Entrance', landmark: 'Main Terminal' },
      { sequence: 4, name: 'Tech & Innovation Park', landmark: 'Software Labs Portico' },
    ],
  },
  {
    id: 'bus-7',
    busNumber: '7',
    origin: 'Hostel Village',
    destination: 'Central Library & Union',
    routeLabel: 'North Campus Shuttle',
    operatingHours: '07:15 AM – 09:30 PM',
    frequency: 'Every 10 minutes',
    stops: [
      { sequence: 1, name: 'Hostel Village', landmark: 'Dining Hall Plaza' },
      { sequence: 2, name: 'Athletic Pavilion', landmark: 'Sports Stadium Turnaround' },
      { sequence: 3, name: 'Central Library & Union', landmark: 'Library Circle Arch' },
      { sequence: 4, name: 'College Main Terminal', landmark: 'Main Departure Bay' },
    ],
  },
  {
    id: 'bus-18',
    busNumber: '18',
    origin: 'Metro Central Station',
    destination: 'Medical Sciences Center',
    routeLabel: 'Metro Connector Feeder',
    operatingHours: '07:00 AM – 08:30 PM',
    frequency: 'Every 12 minutes',
    stops: [
      { sequence: 1, name: 'Metro Central Station', landmark: 'Airport / CMRL Feeder Stand' },
      { sequence: 2, name: 'JB Estate', landmark: 'Estate Cross Avenue' },
      { sequence: 3, name: 'Ponnu', landmark: 'Ponnu Junction' },
      { sequence: 4, name: 'Ramratna', landmark: 'Ramratna Corner' },
      { sequence: 5, name: 'Medical Sciences Center', landmark: 'Health Center Gate' },
    ],
  },
  {
    id: 'bus-21',
    busNumber: '21',
    origin: 'South Commuter Lot',
    destination: 'Main Auditorium',
    routeLabel: 'South Perimeter Circle',
    operatingHours: '08:15 AM – 05:00 PM',
    frequency: 'Every 20 minutes',
    stops: [
      { sequence: 1, name: 'South Commuter Lot', landmark: 'Park & Ride Area 3' },
      { sequence: 2, name: 'Faculty Enclave', landmark: 'Staff Quarters Avenue' },
      { sequence: 3, name: 'Student Center & Dining', landmark: 'Campus Store Front' },
      { sequence: 4, name: 'Main Auditorium', landmark: 'Convention Hall Plaza' },
    ],
  },
];

const DEFAULT_OFFLINE_LOCATIONS: OfflineCampusLocation[] = [
  {
    id: 'rec-main-block',
    name: 'Main Block (Admin & Dean Offices)',
    type: 'Admin & Academics',
    description: 'Principal office, administrative departments, central auditorium entrance, and conference suites.',
    walkingFromMain: '1 min (80m south of Main Gate)',
    nearestStop: 'REC Main Gate Terminal',
  },
  {
    id: 'rec-central-college',
    name: 'Rajalakshmi Engineering College (Central Block)',
    type: 'Academic',
    description: 'Central academic complex, Computer Science, IT, and AI/DS departments with modern lecture theatres.',
    walkingFromMain: '3 min (280m south along Central Spine)',
    nearestStop: 'Central Block Academic Stop',
  },
  {
    id: 'rec-workshop-block',
    name: 'Workshop Block & Labs',
    type: 'Labs & Workshops',
    description: 'Mechanical workshops, manufacturing tech labs, machine shops, and ECE labs.',
    walkingFromMain: '2 min (190m south-west)',
    nearestStop: 'Central Block Academic Stop',
  },
  {
    id: 'rec-transport-office',
    name: 'REC College Bus Transport Office',
    type: 'Transit Operations',
    description: 'Fleet management office, bus pass coordinator, route scheduling, and fleet parking bay.',
    walkingFromMain: '2 min (220m east)',
    nearestStop: 'Transport Office Depot Bay',
  },
  {
    id: 'rec-d-block',
    name: 'D Block',
    type: 'Academic',
    description: 'Academic block, lecture classrooms, department seminar hall, and faculty rooms.',
    walkingFromMain: '5 min (520m south-west)',
    nearestStop: 'Hostel Zone South Bay',
  },
  {
    id: 'rec-fluid-mechanics',
    name: 'Fluid Mechanics Lab',
    type: 'Research Lab',
    description: 'Hydraulic machines, flow measurement rigs, fluid dynamics test apparatus, and wind tunnel.',
    walkingFromMain: '5 min (540m south)',
    nearestStop: 'Hostel Zone South Bay',
  },
  {
    id: 'rec-school-of-architecture',
    name: 'Rajalakshmi School of Architecture',
    type: 'Architecture Campus',
    description: 'Dedicated architectural design studios, climatology lab, material library, and exhibition gallery.',
    walkingFromMain: '8 min (750m west via Architecture Avenue)',
    nearestStop: 'School of Architecture Bay',
  },
  {
    id: 'rec-indoor-stadium',
    name: 'Indoor Stadium & Gymnasium',
    type: 'Sports & Recreation',
    description: 'Badminton courts, basketball arena, table tennis hall, and fitness center.',
    walkingFromMain: '4 min (420m south-east)',
    nearestStop: 'Transport Office Depot Bay',
  },
  {
    id: 'rec-auditorium',
    name: 'Auditorium',
    type: 'Auditorium & Events',
    description: 'Central 1,500-capacity auditorium for convocations, tech symposiums, and cultural festivals.',
    walkingFromMain: '4 min (450m south-east)',
    nearestStop: 'Transport Office Depot Bay',
  },
  {
    id: 'rec-boy-hostel-2',
    name: 'Rajalakshmi Engineering College Boy Hostel - 2',
    type: 'Student Residence',
    description: 'Undergraduate boys residential block, study rooms, dining hall, and evening recreation lounge.',
    walkingFromMain: '6 min (650m south)',
    nearestStop: 'Hostel Zone South Bay',
  },
  {
    id: 'rec-ladies-hostel',
    name: 'Ladies Hostel',
    type: 'Student Residence',
    description: 'Women student residential complex with secure perimeter, mess facility, and study library.',
    walkingFromMain: '7 min (720m south-east)',
    nearestStop: 'Hostel Zone South Bay',
  },
  {
    id: 'poi-dominos-pizza',
    name: "Domino's Pizza | Rajalakshmi Plaza",
    type: 'Food & Dining',
    description: 'Campus Domino pizza outlet, takeaway counter, and beverage lounge.',
    walkingFromMain: '2 min (150m west of Main Gate)',
    nearestStop: 'REC Main Gate Terminal',
  },
  {
    id: 'poi-cafe-coffee-day',
    name: 'Cafe Coffee Day (CCD)',
    type: 'Food & Cafe',
    description: 'CCD cafe outlet near the East sports field and Indoor Stadium.',
    walkingFromMain: '3 min (300m south-east)',
    nearestStop: 'Transport Office Depot Bay',
  },
];

const DEFAULT_OFFLINE_CONTACTS: OfflineEmergencyContact[] = [
  {
    id: 'contact-sec',
    name: 'Campus Security Central Control',
    department: '24/7 Security & Safety Command',
    phone: '+91 44 2275 0100',
    ext: 'Ext. 100',
    location: 'College Main Gate Security Complex',
  },
  {
    id: 'contact-trans',
    name: 'ACIMS Transport Operations Desk',
    department: 'Fleet Dispatch & Driver Coordinator',
    phone: '+91 44 2275 0120',
    ext: 'Ext. 120',
    location: 'Transport Depot, East Gate',
  },
  {
    id: 'contact-med',
    name: 'Campus Medical & First Aid Clinic',
    department: 'Health Center & Emergency Ambulance',
    phone: '+91 44 2275 0108',
    ext: 'Ext. 108',
    location: 'Medical Sciences Block, Ground Floor',
  },
  {
    id: 'contact-women',
    name: 'Student Grievance & Women Safety Cell',
    department: 'Campus Helpline & Support Desk',
    phone: '+91 44 2275 0199',
    ext: 'Ext. 199',
    location: 'Administrative Block, Room 104',
  },
];

const DEFAULT_OFFLINE_PUBLIC_TRANSIT: OfflinePublicTransportGuide[] = [
  {
    category: 'Public Bus',
    name: 'MTC Route 500 / 70V (Tambaram Corridor)',
    routeDetails: 'Connects Tambaram East Stand to Guindy / Broadway / Central corridors.',
    frequency: 'Every 10–12 minutes from Tambaram Terminal',
    campusConnection: 'Take Campus Bus #12 to Tambaram Terminal, transfer at Platform 4.',
  },
  {
    category: 'Suburban Train',
    name: 'Southern Railway Suburban EMU (Beach ↔ Chengalpattu)',
    routeDetails: 'Tambaram Railway Station connects directly to Chennai Park / Chennai Central.',
    frequency: 'Trains run every 10–15 minutes between 04:30 AM and 11:30 PM',
    campusConnection: 'Tambaram Terminal is a 3-minute footbridge walk to Tambaram Railway Station.',
  },
  {
    category: 'Metro Rail',
    name: 'CMRL Metro Blue Line (Airport ↔ Wimco Nagar)',
    routeDetails: 'Airport Metro Station connects to Alandur, Guindy, Central, and North Chennai.',
    frequency: 'Every 6 minutes during peak hours; every 10 minutes off-peak',
    campusConnection: 'Take ACIMS Metro Connector (Bus #18) directly to Airport Metro link.',
  },
];

const CACHE_KEYS = {
  ROUTES: 'acims-offline-routes',
  LOCATIONS: 'acims-offline-locations',
  CONTACTS: 'acims-offline-contacts',
  PUBLIC_TRANSIT: 'acims-offline-public-transit',
  LAST_SNAPSHOTS: 'acims-offline-bus-snapshots',
  LAST_SYNC: 'acims-offline-last-sync',
};

export function getOfflineRoutes(): OfflineBusRoute[] {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.ROUTES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_OFFLINE_ROUTES;
}

export function getOfflineLocations(): OfflineCampusLocation[] {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.LOCATIONS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_OFFLINE_LOCATIONS;
}

export function getOfflineContacts(): OfflineEmergencyContact[] {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.CONTACTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_OFFLINE_CONTACTS;
}

export function getOfflinePublicTransit(): OfflinePublicTransportGuide[] {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.PUBLIC_TRANSIT);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_OFFLINE_PUBLIC_TRANSIT;
}

export function getLastKnownBusSnapshots(): Record<string, LastKnownBusSnapshot> {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.LAST_SNAPSHOTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    'bus-12': {
      busId: 'bus-12',
      busNumber: '12',
      lastStop: 'Tambaram Terminal',
      status: 'On route (Schedule: 07:30 - 18:30)',
      savedAt: '8:14 AM',
      etaMinutes: 3,
      origin: 'Vandalur Transit Hub',
      destination: 'Academic Quad',
      routeLabel: 'Campus Loop A',
      capacity: 40,
    },
    'bus-4b': {
      busId: 'bus-4b',
      busNumber: '4B',
      lastStop: 'Bio-Engineering Center',
      status: 'Engineering Express (Active)',
      savedAt: '8:10 AM',
      etaMinutes: 5,
      origin: 'North Residence Complex',
      destination: 'Tech & Innovation Park',
      routeLabel: 'Engineering Express',
      capacity: 45,
    },
    'bus-7': {
      busId: 'bus-7',
      busNumber: '7',
      lastStop: 'Hostel Village',
      status: 'North Campus Shuttle (Active)',
      savedAt: '8:12 AM',
      etaMinutes: 2,
      origin: 'Hostel Village',
      destination: 'Central Library & Union',
      routeLabel: 'North Campus Shuttle',
      capacity: 35,
    },
  };
}

export function saveLastKnownBusSnapshot(bus: {
  id: string;
  busNumber: string;
  nextStop?: string;
  status?: string;
  capacity?: number;
  etaMinutes?: number;
  origin?: string;
  destination?: string;
  routeLabel?: string;
}) {
  try {
    const current = getLastKnownBusSnapshots();
    current[bus.id] = {
      busId: bus.id,
      busNumber: bus.busNumber,
      lastStop: bus.nextStop || 'Campus Line',
      status: bus.status || 'Active route',
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      etaMinutes: bus.etaMinutes ?? 3,
      origin: bus.origin || 'Main Transit Hub',
      destination: bus.destination || 'Campus Terminal',
      routeLabel: bus.routeLabel || `Route ${bus.busNumber}`,
      capacity: bus.capacity ?? 40,
    };
    localStorage.setItem(CACHE_KEYS.LAST_SNAPSHOTS, JSON.stringify(current));
    localStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch {}
}

export function getLastSyncTime(): string {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
    if (raw) {
      const date = new Date(raw);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } catch {}
  return 'Just before going offline';
}
