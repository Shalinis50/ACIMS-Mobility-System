import { db } from "./index.ts";
import { busRoutes, buses, busStops, officialPickupPoints } from "./schema.ts";
import { eq } from "drizzle-orm";

export type DemoStop = {
  name: string;
  time: string;
  lat: number;
  lng: number;
};

export type DemoRoute = {
  routeNumber: string;
  routeName: string;
  origin: string;
  destination: string;
  stops: DemoStop[];
};

export const INITIAL_DEMO_ROUTES: DemoRoute[] = [
  {
    routeNumber: "1",
    routeName: "ENNORE",
    origin: "Ennore Bus Stand",
    destination: "College Campus",
    stops: [
      { name: "Ennore Bus Stand", time: "5:40 AM", lat: 13.2185, lng: 80.3235 },
      { name: "Ernavur Anna Nagar", time: "5:42 AM", lat: 13.2045, lng: 80.3121 },
      { name: "Lift Gate", time: "5:45 AM", lat: 13.1902, lng: 80.3065 },
      { name: "ITC", time: "5:50 AM", lat: 13.1784, lng: 80.3012 },
      { name: "Wimco Nagar", time: "5:52 AM", lat: 13.1685, lng: 80.2981 },
      { name: "Thiruvottiyur Market", time: "5:54 AM", lat: 13.1592, lng: 80.2974 },
      { name: "Theradi", time: "5:56 AM", lat: 13.1501, lng: 80.2965 },
      { name: "Raja Kadai", time: "5:58 AM", lat: 13.1418, lng: 80.2952 },
      { name: "Thangal", time: "6:00 AM", lat: 13.1334, lng: 80.2941 },
      { name: "Tollgate", time: "6:01 AM", lat: 13.1252, lng: 80.2932 },
      { name: "Poonamallee Bypass", time: "7:10 AM", lat: 13.0489, lng: 80.0934 },
      { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 },
    ],
  },
  {
    routeNumber: "1B",
    routeName: "PERIYAMEDU",
    origin: "Ennore Bus Stand",
    destination: "College Campus",
    stops: [
      { name: "Ennore Bus Stand", time: "5:40 AM", lat: 13.2185, lng: 80.3235 },
      { name: "Ernavur", time: "5:43 AM", lat: 13.2045, lng: 80.3121 },
      { name: "Murugan Koil", time: "5:45 AM", lat: 13.1932, lng: 80.3075 },
      { name: "Mullai Nagar", time: "5:47 AM", lat: 13.1812, lng: 80.3025 },
      { name: "Poonamallee Bypass", time: "7:10 AM", lat: 13.0489, lng: 80.0934 },
      { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 },
    ],
  },
  {
    routeNumber: "1C",
    routeName: "TONDIARPET",
    origin: "Tondiarpet Depot",
    destination: "College Campus",
    stops: [
      { name: "Tondiarpet Depot", time: "6:05 AM", lat: 13.1285, lng: 80.2885 },
      { name: "Kasimedu", time: "6:07 AM", lat: 13.1205, lng: 80.2942 },
      { name: "Kasimedu Petrol Bunk", time: "6:08 AM", lat: 13.1165, lng: 80.2938 },
      { name: "Kalmandapam Police Station", time: "6:10 AM", lat: 13.1112, lng: 80.2932 },
      { name: "ST Anne's School", time: "6:12 AM", lat: 13.1065, lng: 80.2925 },
      { name: "Royapuram Bridge", time: "6:15 AM", lat: 13.1002, lng: 80.2915 },
      { name: "Beach Station", time: "6:18 AM", lat: 13.0925, lng: 80.2922 },
      { name: "Annamalai Mandram", time: "6:21 AM", lat: 13.0885, lng: 80.2875 },
      { name: "GH (Rajiv Gandhi Hospital)", time: "6:23 AM", lat: 13.0815, lng: 80.2785 },
      { name: "Everest Hotel", time: "6:26 AM", lat: 13.0825, lng: 80.2692 },
      { name: "Dasaprakash", time: "6:30 AM", lat: 13.0812, lng: 80.2565 },
      { name: "Neyveli House", time: "6:32 AM", lat: 13.0785, lng: 80.2485 },
      { name: "KMC", time: "6:33 AM", lat: 13.0772, lng: 80.2435 },
      { name: "Taylors Road", time: "6:35 AM", lat: 13.0765, lng: 80.2375 },
      { name: "Pachaiyappa's", time: "6:37 AM", lat: 13.0735, lng: 80.2285 },
      { name: "Aminjikarai", time: "6:40 AM", lat: 13.0712, lng: 80.2195 },
      { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
      { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 },
    ],
  },
  {
    routeNumber: "2",
    routeName: "TONDIARPET",
    origin: "Tondiarpet Mani Cycle Shop",
    destination: "College Campus",
    stops: [
      { name: "Tondiarpet Mani Cycle Shop", time: "6:10 AM", lat: 13.1255, lng: 80.2872 },
      { name: "Police Quarters", time: "6:11 AM", lat: 13.1215, lng: 80.2865 },
      { name: "Post Office", time: "6:12 AM", lat: 13.1175, lng: 80.2858 },
      { name: "Maharani (Singapore Shoppee)", time: "6:13 AM", lat: 13.1135, lng: 80.2845 },
      { name: "Aminjikarai", time: "6:40 AM", lat: 13.0712, lng: 80.2195 },
      { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
      { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 },
    ],
  },
  {
    routeNumber: "2B",
    routeName: "AJAX",
    origin: "Ajax Bus Depot",
    destination: "College Campus",
    stops: [
      { name: "Ajax Bus Depot", time: "5:50 AM", lat: 13.1625, lng: 80.3052 },
      { name: "Periyar Nagar", time: "5:57 AM", lat: 13.1532, lng: 80.2985 },
      { name: "Ellaiamman Koil", time: "6:00 AM", lat: 13.1465, lng: 80.2945 },
      { name: "Lakshmi Koil", time: "6:05 AM", lat: 13.1385, lng: 80.2912 },
      { name: "Aminjikarai", time: "6:40 AM", lat: 13.0712, lng: 80.2195 },
      { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
      { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 },
    ],
  },
  {
    routeNumber: "2C",
    routeName: "MINT",
    origin: "Cemetery Road",
    destination: "College Campus",
    stops: [
      { name: "Cemetery Road", time: "6:10 AM", lat: 13.1095, lng: 80.2875 },
      { name: "Mint Old Bus Stop", time: "6:11 AM", lat: 13.1052, lng: 80.2825 },
      { name: "Mint New Bus Stand", time: "6:13 AM", lat: 13.1025, lng: 80.2785 },
      { name: "Basin Bridge", time: "6:14 AM", lat: 13.0985, lng: 80.2725 },
      { name: "Padmanaba Theater", time: "6:18 AM", lat: 13.0925, lng: 80.2645 },
      { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
      { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 },
    ],
  },
  {
    routeNumber: "3",
    routeName: "CHOOLAI",
    origin: "Choolai Post Office",
    destination: "College Campus",
    stops: [
      { name: "Choolai Post Office", time: "6:15 AM", lat: 13.0912, lng: 80.2655 },
      { name: "Veperi Police Station", time: "6:20 AM", lat: 13.0855, lng: 80.2612 },
      { name: "Muthumari Amman Koil - Purasaiwakkam", time: "6:22 AM", lat: 13.0872, lng: 80.2545 },
      { name: "Gangadeeswarar Koil", time: "6:23 AM", lat: 13.0845, lng: 80.2512 },
      { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
      { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 },
    ],
  },
  {
    routeNumber: "3B",
    routeName: "KILPAUK KALLARAI",
    origin: "Kilpauk Kallarai",
    destination: "College Campus",
    stops: [
      { name: "Kilpauk Kallarai", time: "6:35 AM", lat: 13.0825, lng: 80.2395 },
      { name: "Periya Palaiyamman Kovil", time: "6:37 AM", lat: 13.0845, lng: 80.2315 },
      { name: "Thiruvikka Parking", time: "6:40 AM", lat: 13.0815, lng: 80.2245 },
      { name: "Anna Arch", time: "6:45 AM", lat: 13.0785, lng: 80.2155 },
      { name: "Thiruvithiyamman Kovil", time: "6:55 AM", lat: 13.0695, lng: 80.2035 },
      { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
      { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 },
    ],
  },
  {
    routeNumber: "3C",
    routeName: "DOVETON BRIDGE",
    origin: "Muthumariamman Kovil (Doveton Bridge)",
    destination: "College Campus",
    stops: [
      { name: "Muthumariamman Kovil (Doveton Bridge)", time: "6:15 AM", lat: 13.0895, lng: 80.2605 },
      { name: "Alagappa Road", time: "6:16 AM", lat: 13.0865, lng: 80.2575 },
      { name: "Pathala Ponniammam Koil", time: "6:20 AM", lat: 13.0842, lng: 80.2535 },
      { name: "Motcham Theatre", time: "6:25 AM", lat: 13.0825, lng: 80.2485 },
      { name: "Kellys Signal", time: "6:27 AM", lat: 13.0805, lng: 80.2435 },
      { name: "Mummy Daddy", time: "6:30 AM", lat: 13.0785, lng: 80.2385 },
      { name: "Murugan Hospital", time: "6:32 AM", lat: 13.0765, lng: 80.2345 },
      { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
      { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 },
    ],
  },
  {
    routeNumber: "4",
    routeName: "CHINTADRIPET",
    origin: "Chintadripet Fish Market",
    destination: "College Campus",
    stops: [
      { name: "Chintadripet Fish Market", time: "6:15 AM", lat: 13.0792, lng: 80.2745 },
      { name: "Chintadripet Market", time: "6:17 AM", lat: 13.0775, lng: 80.2715 },
      { name: "Chintadripet Police Quarters", time: "6:18 AM", lat: 13.0762, lng: 80.2685 },
      { name: "Pudupet", time: "6:20 AM", lat: 13.0745, lng: 80.2645 },
      { name: "Egmore Court", time: "6:22 AM", lat: 13.0732, lng: 80.2605 },
      { name: "Rajarthinam Stadium", time: "6:24 AM", lat: 13.0715, lng: 80.2565 },
      { name: "Egmore Co-Optex Bridge", time: "6:26 AM", lat: 13.0702, lng: 80.2515 },
      { name: "Halls Road Junction", time: "6:28 AM", lat: 13.0692, lng: 80.2465 },
      { name: "Chetpet Signal", time: "6:30 AM", lat: 13.0682, lng: 80.2415 },
      { name: "Harington Road Junction", time: "6:35 AM", lat: 13.0672, lng: 80.2355 },
      { name: "Mehta Nagar", time: "6:40 AM", lat: 13.0662, lng: 80.2285 },
      { name: "Skywalk Bridge", time: "6:42 AM", lat: 13.0715, lng: 80.2215 },
      { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
      { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 },
    ],
  },
  {
    routeNumber: "18",
    routeName: "AVADI",
    origin: "Avadi Ramarathinam",
    destination: "College Campus",
    stops: [
      { name: "Avadi Ramarathinam", time: "6:40 AM", lat: 13.1180, lng: 80.1030 },
      { name: "Ponnu Supermarket", time: "6:42 AM", lat: 13.1140, lng: 80.1070 },
      { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
      { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 },
    ],
  },
];

/**
 * Ensures all 11 initial demo routes and their stops are populated into PostgreSQL
 */
export async function seedInitialDemoRoutes() {
  // Purge any legacy MTC rows from buses and busRoutes so they never mix into REC campus transport
  try {
    const allDbBuses = await db.select().from(buses);
    for (const b of allDbBuses) {
      if (b.busNumber?.toUpperCase().includes("MTC") || b.id?.toLowerCase().includes("mtc")) {
        await db.delete(buses).where(eq(buses.id, b.id));
      }
    }
  } catch (err) {
    console.warn("MTC cleanup skipped:", err);
  }

  for (const r of INITIAL_DEMO_ROUTES) {
    const routeId = `route-${r.routeNumber.toLowerCase()}`;
    const busId = `bus-${r.routeNumber.toLowerCase()}`;
    const fullRouteName = `${r.routeNumber} · ${r.routeName}`;

    // 1. Bus Route
    const [existingRoute] = await db.select().from(busRoutes).where(eq(busRoutes.id, routeId)).limit(1);
    if (!existingRoute) {
      await db.insert(busRoutes).values({
        id: routeId,
        routeName: fullRouteName,
        routeCode: r.routeNumber,
        startingTimeDisplay: r.stops[0]?.time,
        campusArrivalDisplay: r.stops[r.stops.length - 1]?.time,
        source: "REC_TRANSPORT",
        active: true,
      });
    }

    // 2. Bus
    const [existingBus] = await db.select().from(buses).where(eq(buses.id, busId)).limit(1);
    if (!existingBus) {
      await db.insert(buses).values({
        id: busId,
        busNumber: r.routeNumber,
        routeId: routeId,
        source: "REC_TRANSPORT",
        active: true,
      });
    }

    // 3. Stops
    for (let i = 0; i < r.stops.length; i++) {
      const stop = r.stops[i];
      const stopId = `${routeId}-stop-${i + 1}`;
      const [existingStop] = await db.select().from(busStops).where(eq(busStops.id, stopId)).limit(1);
      if (!existingStop) {
        await db.insert(busStops).values({
          id: stopId,
          routeId: routeId,
          stopName: stop.name,
          latitude: stop.lat,
          longitude: stop.lng,
          sequenceNumber: i + 1,
        });
      }

      // Also ensure official pickup points
      const pickupId = `pickup-${routeId}-${i + 1}`;
      const [existingPickup] = await db.select().from(officialPickupPoints).where(eq(officialPickupPoints.id, pickupId)).limit(1);
      if (!existingPickup) {
        await db.insert(officialPickupPoints).values({
          id: pickupId,
          routeId: routeId,
          stopName: stop.name,
          latitude: stop.lat,
          longitude: stop.lng,
          sequenceNumber: i + 1,
          scheduledTimeDisplay: stop.time,
          source: "REC_TRANSPORT",
          active: true,
        });
      }
    }
  }
  console.log(`[ACIMS DB] Initial demo routes seeded (${INITIAL_DEMO_ROUTES.length} routes: BUS 1, 1B, 1C, 2, 2B, 2C, 3, 3B, 3C, 4, 18)`);
}
