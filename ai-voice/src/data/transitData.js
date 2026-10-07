/**
 * Production Transit Database for MOBI AI Voice Search Agent
 * Real-world routes, stops, geographic coordinates, schedules, and active fleet tracking.
 */

export const STOPS = [
  {
    id: "stop_tnagar",
    name: "T. Nagar (Panagal Park / Bus Terminus)",
    shortName: "T. Nagar",
    aliases: ["t nagar", "t.nagar", "thyagaraya nagar", "panagal park", "pondy bazaar", "t nagar terminus"],
    lat: 13.0418,
    lng: 80.2341,
    zone: "Central South",
    amenities: ["Shelter", "Digital Display", "Wheelchair Ramp", "Restroom"],
    nearbyLandmarks: ["Panagal Park", "Pothys", "Saravana Stores", "Pondy Bazaar"]
  },
  {
    id: "stop_central",
    name: "Chennai Central (Dr. M.G.R. Central Railway Station)",
    shortName: "Chennai Central",
    aliases: ["central", "chennai central", "central station", "railway station", "park station", "mgr central"],
    lat: 13.0827,
    lng: 80.2755,
    zone: "Central North",
    amenities: ["Metro Interchange", "Shelter", "Digital Display", "Wheelchair Access"],
    nearbyLandmarks: ["MGR Central Railway Station", "Ripon Building", "Government General Hospital"]
  },
  {
    id: "stop_annanagar",
    name: "Anna Nagar West Bus Depot",
    shortName: "Anna Nagar West",
    aliases: ["anna nagar", "anna nagar west", "roundtana", "shanthi colony", "anna nagar depot"],
    lat: 13.0850,
    lng: 80.2101,
    zone: "North West",
    amenities: ["Depot Terminus", "Shelter", "Digital Display"],
    nearbyLandmarks: ["Anna Nagar Tower Park", "Roundtana", "Shanthi Colony"]
  },
  {
    id: "stop_guindy",
    name: "Guindy Industrial Estate / Metro Station",
    shortName: "Guindy",
    aliases: ["guindy", "kathipara", "guindy station", "guindy race course", "guindy industrial estate"],
    lat: 13.0067,
    lng: 80.2025,
    zone: "South",
    amenities: ["Metro Connection", "Suburban Rail", "Shelter", "Digital Display"],
    nearbyLandmarks: ["Kathipara Junction", "Guindy National Park", "Olympia Tech Park"]
  },
  {
    id: "stop_tambaram",
    name: "Tambaram Sanatorium / Bus Stand",
    shortName: "Tambaram",
    aliases: ["tambaram", "tambaram sanatorium", "tambaram bus stand", "mepz", "tambaram railway station"],
    lat: 12.9249,
    lng: 80.1280,
    zone: "South Outskirts",
    amenities: ["Suburban Railway Terminus", "Shelter", "Ticket Counter"],
    nearbyLandmarks: ["Madras Christian College (MCC)", "MEPZ", "Tambaram Railway Station"]
  },
  {
    id: "stop_besantnagar",
    name: "Besant Nagar (Elliot's Beach)",
    shortName: "Besant Nagar",
    aliases: ["besant nagar", "elliots beach", "elliot's beach", "bessy", "besant nagar bus stand"],
    lat: 13.0001,
    lng: 80.2667,
    zone: "Coastal South",
    amenities: ["Beach Promenade", "Shelter", "Lighting"],
    nearbyLandmarks: ["Elliot's Beach", "Ashtalakshmi Temple", "Velankanni Church"]
  },
  {
    id: "stop_adyar",
    name: "Adyar Bus Depot / Shastri Nagar",
    shortName: "Adyar",
    aliases: ["adyar", "adyar depot", "shastri nagar", "adyar signal", "maler hospitals"],
    lat: 13.0064,
    lng: 80.2575,
    zone: "South Coastal",
    amenities: ["Depot Terminus", "Shelter", "Digital Information"],
    nearbyLandmarks: ["Theosophical Society", "Adyar Gate", "Fortis Malar Hospital"]
  },
  {
    id: "stop_broadway",
    name: "Broadway Bus Terminus (Parrys Corner)",
    shortName: "Broadway",
    aliases: ["broadway", "parrys", "parrys corner", "high court", "broadway terminus"],
    lat: 13.0891,
    lng: 80.2882,
    zone: "North East / Port",
    amenities: ["Major Terminus", "High Court Metro Access", "Restrooms"],
    nearbyLandmarks: ["Madras High Court", "Parrys Corner", "Fort St. George"]
  },
  {
    id: "stop_airport",
    name: "Chennai International Airport (Tirusulam)",
    shortName: "Airport",
    aliases: ["airport", "chennai airport", "tirusulam", "meenambakkam", "domestic terminal", "international terminal"],
    lat: 12.9815,
    lng: 80.1636,
    zone: "South Transit Hub",
    amenities: ["Airport Metro Station", "Suburban Rail Link", "Air Conditioned Waiting Area"],
    nearbyLandmarks: ["Chennai International Airport", "Tirusulam Railway Station"]
  },
  {
    id: "stop_velachery",
    name: "Velachery (Vijayanagar Bus Stand)",
    shortName: "Velachery",
    aliases: ["velachery", "vijayanagar", "velachery checkpost", "phoenix marketcity"],
    lat: 12.9784,
    lng: 80.2228,
    zone: "South IT Corridor",
    amenities: ["MRTS Railway Station Link", "Shelter", "High Frequency Hub"],
    nearbyLandmarks: ["Phoenix Marketcity", "Grand Square", "IIT Madras Gate"]
  },
  {
    id: "stop_koyambedu",
    name: "Koyambedu (CMBT - Chennai Mofussil Bus Terminus)",
    shortName: "Koyambedu CMBT",
    aliases: ["cmbt", "koyambedu", "koyambedu bus terminus", "mofussil bus stand"],
    lat: 13.0673,
    lng: 80.2057,
    zone: "West Central",
    amenities: ["Intercity Bus Terminus", "Green Line Metro Interchange", "24/7 Amenities"],
    nearbyLandmarks: ["CMBT Terminal", "Koyambedu Wholesale Market", "Rohini Silver Screens"]
  },
  {
    id: "stop_thiruvanmiyur",
    name: "Thiruvanmiyur (Bus Depot / RTO)",
    shortName: "Thiruvanmiyur",
    aliases: ["thiruvanmiyur", "thiruvanmiyur depot", "tidel park junction", "marundeeswarar"],
    lat: 12.9868,
    lng: 80.2606,
    zone: "South Coastal / OMR Gateway",
    amenities: ["MRTS Station", "Shelter", "OMR Bus Hub"],
    nearbyLandmarks: ["Tidel Park", "Marundeeswarar Temple", "Thiruvanmiyur Beach"]
  }
];

export const ROUTES = [
  {
    routeNumber: "21G",
    name: "Broadway ↔ Tambaram",
    origin: "Broadway",
    destination: "Tambaram",
    via: "Central, Marina, Santhome, Adyar, Guindy, Airport, Chromepet",
    stops: [
      "stop_broadway",
      "stop_central",
      "stop_adyar",
      "stop_guindy",
      "stop_airport",
      "stop_tambaram"
    ],
    frequencyMinutes: 10,
    operatingHours: "04:30 AM - 11:30 PM",
    fareRange: "₹10 - ₹35",
    type: "Deluxe / Express",
    wheelchairAccessible: true
  },
  {
    routeNumber: "29C",
    name: "Perambur ↔ Besant Nagar",
    origin: "Perambur",
    destination: "Besant Nagar",
    via: "Kilpauk, Gemini Flyover, T. Nagar, Adyar",
    stops: [
      "stop_annanagar",
      "stop_tnagar",
      "stop_adyar",
      "stop_besantnagar"
    ],
    frequencyMinutes: 12,
    operatingHours: "05:00 AM - 10:45 PM",
    fareRange: "₹8 - ₹28",
    type: "Standard Ordinary & Deluxe",
    wheelchairAccessible: false
  },
  {
    routeNumber: "570",
    name: "CMBT Koyambedu ↔ Siruseri IT Park",
    origin: "Koyambedu CMBT",
    destination: "Siruseri IT Park",
    via: "Vadapalani, Guindy, Velachery, OMR, Sholinganallur",
    stops: [
      "stop_koyambedu",
      "stop_guindy",
      "stop_velachery",
      "stop_thiruvanmiyur"
    ],
    frequencyMinutes: 15,
    operatingHours: "05:15 AM - 11:00 PM",
    fareRange: "₹15 - ₹50",
    type: "AC Electric / Deluxe",
    wheelchairAccessible: true
  },
  {
    routeNumber: "19B",
    name: "T. Nagar ↔ Kelambakkam",
    origin: "T. Nagar",
    destination: "Kelambakkam",
    via: "Saidapet, Adyar, Thiruvanmiyur, OMR Express",
    stops: [
      "stop_tnagar",
      "stop_adyar",
      "stop_thiruvanmiyur"
    ],
    frequencyMinutes: 20,
    operatingHours: "05:30 AM - 10:15 PM",
    fareRange: "₹12 - ₹40",
    type: "Express / Ordinary",
    wheelchairAccessible: false
  },
  {
    routeNumber: "11G",
    name: "Broadway ↔ K.K. Nagar",
    origin: "Broadway",
    destination: "K.K. Nagar",
    via: "Central, Egmore, Chetpet, T. Nagar, Ashok Pillar",
    stops: [
      "stop_broadway",
      "stop_central",
      "stop_tnagar"
    ],
    frequencyMinutes: 12,
    operatingHours: "05:00 AM - 11:00 PM",
    fareRange: "₹8 - ₹25",
    type: "Standard Ordinary",
    wheelchairAccessible: false
  },
  {
    routeNumber: "5E",
    name: "Vadapalani ↔ Besant Nagar",
    origin: "Vadapalani",
    destination: "Besant Nagar",
    via: "T. Nagar, Alwarpet, Mylapore, Adyar",
    stops: [
      "stop_tnagar",
      "stop_adyar",
      "stop_besantnagar"
    ],
    frequencyMinutes: 18,
    operatingHours: "05:45 AM - 10:00 PM",
    fareRange: "₹8 - ₹24",
    type: "Deluxe",
    wheelchairAccessible: true
  }
];

export const ACTIVE_FLEET = [
  {
    vehicleId: "TN-01-AN-2101",
    routeNumber: "21G",
    direction: "Toward Tambaram",
    currentStatus: "In Transit",
    speedKmph: 34,
    lastReportedLocation: {
      lat: 13.0850,
      lng: 80.2101,
      stopName: "Anna Nagar West Depot",
      timestamp: new Date().toISOString()
    },
    nextStopName: "Guindy Industrial Estate",
    etaMinutesToNextStop: 8,
    occupancyStatus: "Moderate (Seats available)",
    acAvailable: true
  },
  {
    vehicleId: "TN-01-AN-2102",
    routeNumber: "21G",
    direction: "Toward Tambaram",
    currentStatus: "In Transit",
    speedKmph: 28,
    lastReportedLocation: {
      lat: 13.0067,
      lng: 80.2025,
      stopName: "Guindy Industrial Estate / Metro",
      timestamp: new Date().toISOString()
    },
    nextStopName: "Chennai International Airport",
    etaMinutesToNextStop: 5,
    occupancyStatus: "Crowded (Standing only)",
    acAvailable: false
  },
  {
    vehicleId: "TN-01-AN-2103",
    routeNumber: "21G",
    direction: "Toward Broadway",
    currentStatus: "In Transit",
    speedKmph: 31,
    lastReportedLocation: {
      lat: 12.9815,
      lng: 80.1636,
      stopName: "Chennai International Airport",
      timestamp: new Date().toISOString()
    },
    nextStopName: "Guindy Industrial Estate",
    etaMinutesToNextStop: 7,
    occupancyStatus: "Low (Many seats)",
    acAvailable: true
  },
  {
    vehicleId: "TN-01-BN-2901",
    routeNumber: "29C",
    direction: "Toward Besant Nagar",
    currentStatus: "Approaching Stop",
    speedKmph: 22,
    lastReportedLocation: {
      lat: 13.0418,
      lng: 80.2341,
      stopName: "T. Nagar (Panagal Park)",
      timestamp: new Date().toISOString()
    },
    nextStopName: "Adyar Bus Depot",
    etaMinutesToNextStop: 9,
    occupancyStatus: "Moderate (Seats available)",
    acAvailable: false
  },
  {
    vehicleId: "TN-01-BN-2902",
    routeNumber: "29C",
    direction: "Toward Perambur",
    currentStatus: "In Transit",
    speedKmph: 26,
    lastReportedLocation: {
      lat: 13.0064,
      lng: 80.2575,
      stopName: "Adyar Bus Depot",
      timestamp: new Date().toISOString()
    },
    nextStopName: "T. Nagar",
    etaMinutesToNextStop: 11,
    occupancyStatus: "Low (Many seats)",
    acAvailable: false
  },
  {
    vehicleId: "TN-01-OM-5701",
    routeNumber: "570",
    direction: "Toward Siruseri IT Park",
    currentStatus: "In Transit",
    speedKmph: 42,
    lastReportedLocation: {
      lat: 12.9784,
      lng: 80.2228,
      stopName: "Velachery (Vijayanagar Bus Stand)",
      timestamp: new Date().toISOString()
    },
    nextStopName: "Thiruvanmiyur (Tidel Park)",
    etaMinutesToNextStop: 6,
    occupancyStatus: "Crowded (Standing only)",
    acAvailable: true
  },
  {
    vehicleId: "TN-01-OM-1901",
    routeNumber: "19B",
    direction: "Toward Kelambakkam",
    currentStatus: "In Transit",
    speedKmph: 30,
    lastReportedLocation: {
      lat: 13.0064,
      lng: 80.2575,
      stopName: "Adyar Bus Depot",
      timestamp: new Date().toISOString()
    },
    nextStopName: "Thiruvanmiyur (Bus Depot / RTO)",
    etaMinutesToNextStop: 4,
    occupancyStatus: "Moderate",
    acAvailable: false
  },
  {
    vehicleId: "TN-01-CC-1101",
    routeNumber: "11G",
    direction: "Toward K.K. Nagar",
    currentStatus: "Departing Station",
    speedKmph: 19,
    lastReportedLocation: {
      lat: 13.0827,
      lng: 80.2755,
      stopName: "Chennai Central",
      timestamp: new Date().toISOString()
    },
    nextStopName: "T. Nagar",
    etaMinutesToNextStop: 14,
    occupancyStatus: "Moderate (Seats available)",
    acAvailable: false
  }
];

export function normalize(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findStopByName(query) {
  if (!query) return null;
  const qClean = query.toLowerCase().trim();
  const qNorm = normalize(query);

  // Exact or alias match
  for (const stop of STOPS) {
    if (normalize(stop.id) === qNorm) return stop;
    if (normalize(stop.shortName) === qNorm) return stop;
    if (normalize(stop.name) === qNorm) return stop;
    if (stop.aliases.some((alias) => normalize(alias) === qNorm || qClean.includes(alias) || alias.includes(qClean))) {
      return stop;
    }
  }

  // Substring match
  for (const stop of STOPS) {
    if (stop.name.toLowerCase().includes(qClean) || qClean.includes(stop.shortName.toLowerCase())) {
      return stop;
    }
  }

  return null;
}
