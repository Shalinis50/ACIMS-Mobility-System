export type RecRouteStop = {
  id: string;
  name: string;
  time: string;
  lat: number;
  lng: number;
  sequence: number;
  isVia?: boolean;
  isCollege?: boolean;
};

export type RecRoute = {
  id: string;
  routeNumber: string;
  routeName: string;
  displayName: string;
  origin: string;
  destination: string;
  startTime: string;
  campusArrivalTime: string;
  viaNotes?: string;
  isSimulated: boolean;
  stops: RecRouteStop[];
  path: [number, number][];
};

/**
 * Interpolates smooth coordinates between waypoints for clean route polylines
 */
function interpolateWaypoints(
  coords: [number, number][],
  stepsPerSegment: number = 6
): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const start = coords[i];
    const end = coords[i + 1];
    for (let step = 0; step < stepsPerSegment; step++) {
      const t = step / stepsPerSegment;
      result.push([
        Number((start[0] + (end[0] - start[0]) * t).toFixed(6)),
        Number((start[1] + (end[1] - start[1]) * t).toFixed(6)),
      ]);
    }
  }
  if (coords.length > 0) {
    result.push(coords[coords.length - 1]);
  }
  return result;
}

export const ALL_REC_ROUTES: RecRoute[] = [
  // 1 - Ennore
  {
    id: "route-1",
    routeNumber: "1",
    routeName: "Ennore",
    displayName: "1 • Ennore",
    origin: "Ennore Bus Stand",
    destination: "College Campus",
    startTime: "5:40 AM",
    campusArrivalTime: "7:40 AM",
    viaNotes: "Poonamallee Bypass",
    isSimulated: false,
    stops: [
      { id: "1-1", name: "Ennore Bus Stand", time: "5:40 AM", lat: 13.2185, lng: 80.3235, sequence: 1 },
      { id: "1-2", name: "Ernavur Anna Nagar", time: "5:42 AM", lat: 13.2045, lng: 80.3121, sequence: 2 },
      { id: "1-3", name: "Lift Gate", time: "5:45 AM", lat: 13.1902, lng: 80.3065, sequence: 3 },
      { id: "1-4", name: "ITC", time: "5:50 AM", lat: 13.1784, lng: 80.3012, sequence: 4 },
      { id: "1-5", name: "Wimco Nagar", time: "5:52 AM", lat: 13.1685, lng: 80.2981, sequence: 5 },
      { id: "1-6", name: "Thiruvottiyur Market", time: "5:54 AM", lat: 13.1592, lng: 80.2974, sequence: 6 },
      { id: "1-7", name: "Theradi", time: "5:56 AM", lat: 13.1501, lng: 80.2965, sequence: 7 },
      { id: "1-8", name: "Raja Kadai", time: "5:58 AM", lat: 13.1418, lng: 80.2952, sequence: 8 },
      { id: "1-9", name: "Thangal", time: "6:00 AM", lat: 13.1334, lng: 80.2941, sequence: 9 },
      { id: "1-10", name: "Tollgate", time: "6:01 AM", lat: 13.1252, lng: 80.2932, sequence: 10 },
      { id: "1-11", name: "Poonamallee Bypass", time: "7:10 AM", lat: 13.0489, lng: 80.0934, sequence: 11, isVia: true },
      { id: "1-12", name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033, sequence: 12, isCollege: true },
    ],
    path: interpolateWaypoints([
      [13.2185, 80.3235],
      [13.2045, 80.3121],
      [13.1902, 80.3065],
      [13.1784, 80.3012],
      [13.1685, 80.2981],
      [13.1592, 80.2974],
      [13.1501, 80.2965],
      [13.1418, 80.2952],
      [13.1334, 80.2941],
      [13.1252, 80.2932],
      [13.0489, 80.0934],
      [13.0084, 80.0033],
    ]),
  },
  // 1B - Periyamedu
  {
    id: "route-1b",
    routeNumber: "1B",
    routeName: "Periyamedu",
    displayName: "1B • Periyamedu",
    origin: "Ennore Bus Stand",
    destination: "College Campus",
    startTime: "5:40 AM",
    campusArrivalTime: "7:40 AM",
    viaNotes: "Poonamallee Bypass",
    isSimulated: false,
    stops: [
      { id: "1b-1", name: "Ennore Bus Stand", time: "5:40 AM", lat: 13.2185, lng: 80.3235, sequence: 1 },
      { id: "1b-2", name: "Ernavur", time: "5:43 AM", lat: 13.2045, lng: 80.3121, sequence: 2 },
      { id: "1b-3", name: "Murugan Koil", time: "5:45 AM", lat: 13.1932, lng: 80.3075, sequence: 3 },
      { id: "1b-4", name: "Mullai Nagar", time: "5:47 AM", lat: 13.1812, lng: 80.3025, sequence: 4 },
      { id: "1b-5", name: "Poonamallee Bypass", time: "7:10 AM", lat: 13.0489, lng: 80.0934, sequence: 5, isVia: true },
      { id: "1b-6", name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033, sequence: 6, isCollege: true },
    ],
    path: interpolateWaypoints([
      [13.2185, 80.3235],
      [13.2045, 80.3121],
      [13.1932, 80.3075],
      [13.1812, 80.3025],
      [13.0489, 80.0934],
      [13.0084, 80.0033],
    ]),
  },
  // 1C - Tondiarpet RTO Office
  {
    id: "route-1c",
    routeNumber: "1C",
    routeName: "Tondiarpet RTO Office",
    displayName: "1C • Tondiarpet RTO Office",
    origin: "Tondiarpet Depot",
    destination: "College Campus",
    startTime: "6:05 AM",
    campusArrivalTime: "7:40 AM",
    viaNotes: "Poonamallee Bypass",
    isSimulated: false,
    stops: [
      { id: "1c-1", name: "Tondiarpet Depot", time: "6:05 AM", lat: 13.1285, lng: 80.2885, sequence: 1 },
      { id: "1c-2", name: "Kasimedu", time: "6:07 AM", lat: 13.1205, lng: 80.2942, sequence: 2 },
      { id: "1c-3", name: "Kasimedu Petrol Bunk", time: "6:08 AM", lat: 13.1165, lng: 80.2938, sequence: 3 },
      { id: "1c-4", name: "Kalmandapam Police Station", time: "6:10 AM", lat: 13.1112, lng: 80.2932, sequence: 4 },
      { id: "1c-5", name: "ST Anne's School", time: "6:12 AM", lat: 13.1065, lng: 80.2925, sequence: 5 },
      { id: "1c-6", name: "Royapuram Bridge", time: "6:15 AM", lat: 13.1002, lng: 80.2915, sequence: 6 },
      { id: "1c-7", name: "Beach Station", time: "6:18 AM", lat: 13.0925, lng: 80.2922, sequence: 7 },
      { id: "1c-8", name: "Annamalai Mandram", time: "6:21 AM", lat: 13.0885, lng: 80.2875, sequence: 8 },
      { id: "1c-9", name: "GH (Rajiv Gandhi Hospital)", time: "6:23 AM", lat: 13.0815, lng: 80.2785, sequence: 9 },
      { id: "1c-10", name: "Everest Hotel", time: "6:26 AM", lat: 13.0825, lng: 80.2692, sequence: 10 },
      { id: "1c-11", name: "Dasaprakash", time: "6:30 AM", lat: 13.0812, lng: 80.2565, sequence: 11 },
      { id: "1c-12", name: "Neyveli House", time: "6:32 AM", lat: 13.0785, lng: 80.2485, sequence: 12 },
      { id: "1c-13", name: "KMC", time: "6:33 AM", lat: 13.0772, lng: 80.2435, sequence: 13 },
      { id: "1c-14", name: "Taylors Road", time: "6:35 AM", lat: 13.0765, lng: 80.2375, sequence: 14 },
      { id: "1c-15", name: "Pachaiyappa's", time: "6:37 AM", lat: 13.0735, lng: 80.2285, sequence: 15 },
      { id: "1c-16", name: "Aminjikarai", time: "6:40 AM", lat: 13.0712, lng: 80.2195, sequence: 16 },
      { id: "1c-17", name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934, sequence: 17, isVia: true },
      { id: "1c-18", name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033, sequence: 18, isCollege: true },
    ],
    path: interpolateWaypoints([
      [13.1285, 80.2885],
      [13.1205, 80.2942],
      [13.1165, 80.2938],
      [13.1112, 80.2932],
      [13.1065, 80.2925],
      [13.1002, 80.2915],
      [13.0925, 80.2922],
      [13.0885, 80.2875],
      [13.0815, 80.2785],
      [13.0825, 80.2692],
      [13.0812, 80.2565],
      [13.0785, 80.2485],
      [13.0772, 80.2435],
      [13.0765, 80.2375],
      [13.0735, 80.2285],
      [13.0712, 80.2195],
      [13.0489, 80.0934],
      [13.0084, 80.0033],
    ]),
  },
  // 2 - Tondiarpet
  {
    id: "route-2",
    routeNumber: "2",
    routeName: "Tondiarpet",
    displayName: "2 • Tondiarpet",
    origin: "Tondiarpet Mani Cycle Shop",
    destination: "College Campus",
    startTime: "6:10 AM",
    campusArrivalTime: "7:40 AM",
    viaNotes: "Poonamallee Bypass",
    isSimulated: false,
    stops: [
      { id: "2-1", name: "Tondiarpet Mani Cycle Shop", time: "6:10 AM", lat: 13.1255, lng: 80.2872, sequence: 1 },
      { id: "2-2", name: "Police Quarters", time: "6:11 AM", lat: 13.1215, lng: 80.2865, sequence: 2 },
      { id: "2-3", name: "Post Office", time: "6:12 AM", lat: 13.1175, lng: 80.2858, sequence: 3 },
      { id: "2-4", name: "Maharani (Singapore Shoppee)", time: "6:13 AM", lat: 13.1135, lng: 80.2845, sequence: 4 },
      { id: "2-5", name: "Aminjikarai", time: "6:40 AM", lat: 13.0712, lng: 80.2195, sequence: 5 },
      { id: "2-6", name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934, sequence: 6, isVia: true },
      { id: "2-7", name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033, sequence: 7, isCollege: true },
    ],
    path: interpolateWaypoints([
      [13.1255, 80.2872],
      [13.1215, 80.2865],
      [13.1175, 80.2858],
      [13.1135, 80.2845],
      [13.0712, 80.2195],
      [13.0489, 80.0934],
      [13.0084, 80.0033],
    ]),
  },
  // 2B - Ajax
  {
    id: "route-2b",
    routeNumber: "2B",
    routeName: "Ajax",
    displayName: "2B • Ajax",
    origin: "Ajax Bus Depot",
    destination: "College Campus",
    startTime: "5:50 AM",
    campusArrivalTime: "7:40 AM",
    viaNotes: "Poonamallee Bypass",
    isSimulated: false,
    stops: [
      { id: "2b-1", name: "Ajax Bus Depot", time: "5:50 AM", lat: 13.1625, lng: 80.3052, sequence: 1 },
      { id: "2b-2", name: "Periyar Nagar", time: "5:57 AM", lat: 13.1532, lng: 80.2985, sequence: 2 },
      { id: "2b-3", name: "Ellaiamman Koil", time: "6:00 AM", lat: 13.1465, lng: 80.2945, sequence: 3 },
      { id: "2b-4", name: "Lakshmi Koil", time: "6:05 AM", lat: 13.1385, lng: 80.2912, sequence: 4 },
      { id: "2b-5", name: "Aminjikarai", time: "6:40 AM", lat: 13.0712, lng: 80.2195, sequence: 5 },
      { id: "2b-6", name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934, sequence: 6, isVia: true },
      { id: "2b-7", name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033, sequence: 7, isCollege: true },
    ],
    path: interpolateWaypoints([
      [13.1625, 80.3052],
      [13.1532, 80.2985],
      [13.1465, 80.2945],
      [13.1385, 80.2912],
      [13.0712, 80.2195],
      [13.0489, 80.0934],
      [13.0084, 80.0033],
    ]),
  },
  // 2C - Mint
  {
    id: "route-2c",
    routeNumber: "2C",
    routeName: "Mint",
    displayName: "2C • Mint",
    origin: "Cemetery Road",
    destination: "College Campus",
    startTime: "6:10 AM",
    campusArrivalTime: "7:40 AM",
    viaNotes: "Poonamallee Bypass",
    isSimulated: false,
    stops: [
      { id: "2c-1", name: "Cemetery Road", time: "6:10 AM", lat: 13.1095, lng: 80.2875, sequence: 1 },
      { id: "2c-2", name: "Mint Old Bus Stop", time: "6:11 AM", lat: 13.1052, lng: 80.2825, sequence: 2 },
      { id: "2c-3", name: "Mint New Bus Stand", time: "6:13 AM", lat: 13.1025, lng: 80.2785, sequence: 3 },
      { id: "2c-4", name: "Basin Bridge", time: "6:14 AM", lat: 13.0985, lng: 80.2725, sequence: 4 },
      { id: "2c-5", name: "Padmanaba Theater", time: "6:18 AM", lat: 13.0925, lng: 80.2645, sequence: 5 },
      { id: "2c-6", name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934, sequence: 6, isVia: true },
      { id: "2c-7", name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033, sequence: 7, isCollege: true },
    ],
    path: interpolateWaypoints([
      [13.1095, 80.2875],
      [13.1052, 80.2825],
      [13.1025, 80.2785],
      [13.0985, 80.2725],
      [13.0925, 80.2645],
      [13.0489, 80.0934],
      [13.0084, 80.0033],
    ]),
  },
  // 3 - Choolai
  {
    id: "route-3",
    routeNumber: "3",
    routeName: "Choolai",
    displayName: "3 • Choolai",
    origin: "Choolai Post Office",
    destination: "College Campus",
    startTime: "6:15 AM",
    campusArrivalTime: "7:40 AM",
    viaNotes: "Poonamallee Bypass",
    isSimulated: false,
    stops: [
      { id: "3-1", name: "Choolai Post Office", time: "6:15 AM", lat: 13.0912, lng: 80.2655, sequence: 1 },
      { id: "3-2", name: "Veperi Police Station", time: "6:20 AM", lat: 13.0855, lng: 80.2612, sequence: 2 },
      { id: "3-3", name: "Muthumari Amman Koil - Purasaiwakkam", time: "6:22 AM", lat: 13.0872, lng: 80.2545, sequence: 3 },
      { id: "3-4", name: "Gangadeeswarar Koil", time: "6:23 AM", lat: 13.0845, lng: 80.2512, sequence: 4 },
      { id: "3-5", name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934, sequence: 5, isVia: true },
      { id: "3-6", name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033, sequence: 6, isCollege: true },
    ],
    path: interpolateWaypoints([
      [13.0912, 80.2655],
      [13.0855, 80.2612],
      [13.0872, 80.2545],
      [13.0845, 80.2512],
      [13.0489, 80.0934],
      [13.0084, 80.0033],
    ]),
  },
  // 3B - Kilpauk Kallarai
  {
    id: "route-3b",
    routeNumber: "3B",
    routeName: "Kilpauk Kallarai",
    displayName: "3B • Kilpauk Kallarai",
    origin: "Kilpauk Kallarai",
    destination: "College Campus",
    startTime: "6:35 AM",
    campusArrivalTime: "7:40 AM",
    viaNotes: "Poonamallee Bypass",
    isSimulated: false,
    stops: [
      { id: "3b-1", name: "Kilpauk Kallarai", time: "6:35 AM", lat: 13.0825, lng: 80.2395, sequence: 1 },
      { id: "3b-2", name: "Periya Palaiyamman Kovil", time: "6:37 AM", lat: 13.0845, lng: 80.2315, sequence: 2 },
      { id: "3b-3", name: "Thiruvikka Parking", time: "6:40 AM", lat: 13.0815, lng: 80.2245, sequence: 3 },
      { id: "3b-4", name: "Anna Arch", time: "6:45 AM", lat: 13.0785, lng: 80.2155, sequence: 4 },
      { id: "3b-5", name: "Thiruvithiyamman Kovil", time: "6:55 AM", lat: 13.0695, lng: 80.2035, sequence: 5 },
      { id: "3b-6", name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934, sequence: 6, isVia: true },
      { id: "3b-7", name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033, sequence: 7, isCollege: true },
    ],
    path: interpolateWaypoints([
      [13.0825, 80.2395],
      [13.0845, 80.2315],
      [13.0815, 80.2245],
      [13.0785, 80.2155],
      [13.0695, 80.2035],
      [13.0489, 80.0934],
      [13.0084, 80.0033],
    ]),
  },
  // 3C - Dovton Bridge
  {
    id: "route-3c",
    routeNumber: "3C",
    routeName: "Dovton Bridge",
    displayName: "3C • Dovton Bridge",
    origin: "Muthumariamman Kovil (Doveton Bridge)",
    destination: "College Campus",
    startTime: "6:15 AM",
    campusArrivalTime: "7:40 AM",
    viaNotes: "Poonamallee Bypass",
    isSimulated: false,
    stops: [
      { id: "3c-1", name: "Muthumariamman Kovil (Doveton Bridge)", time: "6:15 AM", lat: 13.0895, lng: 80.2605, sequence: 1 },
      { id: "3c-2", name: "Alagappa Road", time: "6:16 AM", lat: 13.0865, lng: 80.2575, sequence: 2 },
      { id: "3c-3", name: "Pathala Ponniammam Koil", time: "6:20 AM", lat: 13.0842, lng: 80.2535, sequence: 3 },
      { id: "3c-4", name: "Motcham Theatre", time: "6:25 AM", lat: 13.0825, lng: 80.2485, sequence: 4 },
      { id: "3c-5", name: "Kellys Signal", time: "6:27 AM", lat: 13.0805, lng: 80.2435, sequence: 5 },
      { id: "3c-6", name: "Mummy Daddy", time: "6:30 AM", lat: 13.0785, lng: 80.2385, sequence: 6 },
      { id: "3c-7", name: "Murugan Hospital", time: "6:32 AM", lat: 13.0765, lng: 80.2345, sequence: 7 },
      { id: "3c-8", name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934, sequence: 8, isVia: true },
      { id: "3c-9", name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033, sequence: 9, isCollege: true },
    ],
    path: interpolateWaypoints([
      [13.0895, 80.2605],
      [13.0865, 80.2575],
      [13.0842, 80.2535],
      [13.0825, 80.2485],
      [13.0805, 80.2435],
      [13.0785, 80.2385],
      [13.0765, 80.2345],
      [13.0489, 80.0934],
      [13.0084, 80.0033],
    ]),
  },
  // 4 - Chintadripet
  {
    id: "route-4",
    routeNumber: "4",
    routeName: "Chintadripet",
    displayName: "4 • Chintadripet",
    origin: "Chintadripet Fish Market",
    destination: "College Campus",
    startTime: "6:15 AM",
    campusArrivalTime: "7:40 AM",
    viaNotes: "Poonamallee Bypass",
    isSimulated: false,
    stops: [
      { id: "4-1", name: "Chintadripet Fish Market", time: "6:15 AM", lat: 13.0792, lng: 80.2745, sequence: 1 },
      { id: "4-2", name: "Chintadripet Market", time: "6:17 AM", lat: 13.0775, lng: 80.2715, sequence: 2 },
      { id: "4-3", name: "Chintadripet Police Quarters", time: "6:18 AM", lat: 13.0762, lng: 80.2685, sequence: 3 },
      { id: "4-4", name: "Pudupet", time: "6:20 AM", lat: 13.0745, lng: 80.2645, sequence: 4 },
      { id: "4-5", name: "Egmore Court", time: "6:22 AM", lat: 13.0732, lng: 80.2605, sequence: 5 },
      { id: "4-6", name: "Rajarthinam Stadium", time: "6:24 AM", lat: 13.0715, lng: 80.2565, sequence: 6 },
      { id: "4-7", name: "Egmore Co-Optex Bridge", time: "6:26 AM", lat: 13.0702, lng: 80.2515, sequence: 7 },
      { id: "4-8", name: "Halls Road Junction", time: "6:28 AM", lat: 13.0692, lng: 80.2465, sequence: 8 },
      { id: "4-9", name: "Chetpet Signal", time: "6:30 AM", lat: 13.0682, lng: 80.2415, sequence: 9 },
      { id: "4-10", name: "Harington Road Junction", time: "6:35 AM", lat: 13.0672, lng: 80.2355, sequence: 10 },
      { id: "4-11", name: "Mehta Nagar", time: "6:40 AM", lat: 13.0662, lng: 80.2285, sequence: 11 },
      { id: "4-12", name: "Skywalk Bridge", time: "6:42 AM", lat: 13.0715, lng: 80.2215, sequence: 12 },
      { id: "4-13", name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934, sequence: 13, isVia: true },
      { id: "4-14", name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033, sequence: 14, isCollege: true },
    ],
    path: interpolateWaypoints([
      [13.0792, 80.2745],
      [13.0775, 80.2715],
      [13.0762, 80.2685],
      [13.0745, 80.2645],
      [13.0732, 80.2605],
      [13.0715, 80.2565],
      [13.0702, 80.2515],
      [13.0692, 80.2465],
      [13.0682, 80.2415],
      [13.0672, 80.2355],
      [13.0662, 80.2285],
      [13.0715, 80.2215],
      [13.0489, 80.0934],
      [13.0084, 80.0033],
    ]),
  },
  // 18 - Avadi (Special Simulated Case)
  {
    id: "route-18",
    routeNumber: "18",
    routeName: "Avadi",
    displayName: "18 • Avadi",
    origin: "Avadi Ramarathinam",
    destination: "College Campus",
    startTime: "6:40 AM",
    campusArrivalTime: "7:40 AM",
    viaNotes: "Poonamallee Bypass",
    isSimulated: true,
    stops: [
      { id: "18-1", name: "Avadi Ramarathinam", time: "6:40 AM", lat: 13.1180, lng: 80.1030, sequence: 1 },
      { id: "18-2", name: "Ponnu Supermarket", time: "6:42 AM", lat: 13.1140, lng: 80.1070, sequence: 2 },
      { id: "18-3", name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934, sequence: 3, isVia: true },
      { id: "18-4", name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033, sequence: 4, isCollege: true },
    ],
    path: interpolateWaypoints([
      [13.1180, 80.1030], // Avadi Ramarathinam
      [13.1140, 80.1070], // Ponnu Supermarket
      [13.0950, 80.1020], // Road connection towards Poonamallee
      [13.0720, 80.0980], // High road corridor
      [13.0489, 80.0934], // Poonamallee Bypass
      [13.0300, 80.0500], // NH4 Highway approach
      [13.0084, 80.0033], // College Campus
    ], 12),
  },
];

export function findRouteByNumberOrId(key: string | null | undefined): RecRoute | undefined {
  if (!key) return undefined;
  const clean = key.trim().toLowerCase();
  const numOnly = clean.replace(/^(route-|bus-)/, "");
  return ALL_REC_ROUTES.find(
    (r) =>
      r.id.toLowerCase() === clean ||
      r.routeNumber.toLowerCase() === clean ||
      r.routeNumber.toLowerCase() === numOnly ||
      `route-${r.routeNumber.toLowerCase()}` === clean ||
      `bus-${r.routeNumber.toLowerCase()}` === clean ||
      r.routeName.toLowerCase().includes(clean)
  );
}

export function getDefaultRecRoute(): RecRoute {
  // Default to Route 18 as the premier simulated route if nothing else is selected
  return ALL_REC_ROUTES.find((r) => r.routeNumber === "18") || ALL_REC_ROUTES[0];
}
