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
      { sequence: 2, name: 'Hospital Gate North', landmark: 'Medical Center Entrance' },
      { sequence: 3, name: 'Tambaram East', landmark: 'Suburban Line Link' },
      { sequence: 4, name: 'Medical Sciences Center', landmark: 'Health Center Gate' },
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
    id: 'college',
    name: 'College Main Entrance & Gate',
    type: 'Transit & Security',
    description: 'Main campus security desk, visitor registration, and primary bus arrival terminal.',
    walkingFromMain: '0 min (At entrance)',
    nearestStop: 'College Main Terminal',
  },
  {
    id: 'library',
    name: 'Central Library & Digital Resource Center',
    type: 'Academic',
    description: 'Digital archives, 3-floor reading halls, quiet study pods, and academic reference desk.',
    walkingFromMain: '4–5 min (450m via Main Pedestrian Avenue)',
    nearestStop: 'Central Library & Union Stop',
  },
  {
    id: 'student-center',
    name: 'Student Center & Dining Plaza',
    type: 'Student Life',
    description: 'Campus cafeteria, food courts, student clubs office, and stationery mart.',
    walkingFromMain: '3 min (300m via Central Walkway)',
    nearestStop: 'Student Center Stop',
  },
  {
    id: 'science-block',
    name: 'Science & Engineering Block (Academic Quad)',
    type: 'Academic',
    description: 'Undergraduate science laboratories, lecture theatres 1–12, and Dean offices.',
    walkingFromMain: '6 min (550m along East Avenue)',
    nearestStop: 'Academic Quad Stop',
  },
  {
    id: 'tech-park',
    name: 'Tech & Innovation Park',
    type: 'Research & Labs',
    description: 'Incubation centre, AI & software laboratories, maker spaces, and seminar rooms.',
    walkingFromMain: '10 min (900m via North Walkway)',
    nearestStop: 'Tech Park Portico Stop',
  },
  {
    id: 'north-residence',
    name: 'North Residence Complex',
    type: 'Residence',
    description: 'Student hostel blocks A–D, dining mess, laundry hub, and recreation room.',
    walkingFromMain: '12 min (1.1 km)',
    nearestStop: 'North Residence Courtyard',
  },
  {
    id: 'hostel-village',
    name: 'Hostel Village & Residential Grounds',
    type: 'Residence',
    description: 'Undergraduate residential quarters, central sports field, and night canteen.',
    walkingFromMain: '14 min (1.3 km)',
    nearestStop: 'Hostel Village Stop',
  },
  {
    id: 'sports-complex',
    name: 'Athletic Pavilion & Sports Stadium',
    type: 'Recreation',
    description: 'Synthetic running track, football turf, badminton courts, and gym.',
    walkingFromMain: '8 min (750m)',
    nearestStop: 'Athletic Pavilion Stop',
  },
  {
    id: 'medical-center',
    name: 'Campus Health Clinic & First Aid Center',
    type: 'Emergency & Health',
    description: '24/7 duty physician, campus emergency dispensary, first aid, and ambulance bay.',
    walkingFromMain: '5 min (480m near East Gate)',
    nearestStop: 'Hospital Gate North Stop',
  },
  {
    id: 'south-lot',
    name: 'South Commuter Parking Lot',
    type: 'Transit',
    description: 'Two-wheeler and four-wheeler parking, bus turnaround circle, and day-scholar lot.',
    walkingFromMain: '9 min (800m)',
    nearestStop: 'South Lot Stop',
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
