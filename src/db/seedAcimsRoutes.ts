import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { buses, busRoutes, busStops, officialPickupPoints, shifts, shiftAssignments, drivers, profiles } from "./schema.ts";

export interface InitialRouteStopDef {
  name: string;
  approxTime: string;
  isNonStop?: boolean;
  latitude: number;
  longitude: number;
}

export interface InitialRouteDef {
  busId: string;
  busNumber: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  direction: "TO_COLLEGE" | "FROM_COLLEGE";
  startingTimeDisplay: string;
  campusArrivalDisplay: string;
  stops: InitialRouteStopDef[];
}

export const INITIAL_ACIMS_ROUTES: InitialRouteDef[] = [
  {
    busId: "bus-1",
    busNumber: "1",
    routeId: "route-1",
    routeCode: "1",
    routeName: "Ennore",
    direction: "TO_COLLEGE",
    startingTimeDisplay: "5:40 AM (Approx.)",
    campusArrivalDisplay: "7:40 AM (Approx.)",
    stops: [
      { name: "Ennore Bus Stand", approxTime: "5:40 AM", latitude: 13.2167, longitude: 80.3236 },
      { name: "Ernavur Anna Nagar", approxTime: "5:42 AM", latitude: 13.2050, longitude: 80.3150 },
      { name: "Lift Gate", approxTime: "5:45 AM", latitude: 13.1900, longitude: 80.3080 },
      { name: "ITC", approxTime: "5:50 AM", latitude: 13.1750, longitude: 80.3010 },
      { name: "Wimco Nagar", approxTime: "5:52 AM", latitude: 13.1680, longitude: 80.2980 },
      { name: "Thiruvottiyur Market", approxTime: "5:54 AM", latitude: 13.1580, longitude: 80.2960 },
      { name: "Theradi", approxTime: "5:56 AM", latitude: 13.1500, longitude: 80.2950 },
      { name: "Raja Kadai", approxTime: "5:58 AM", latitude: 13.1420, longitude: 80.2930 },
      { name: "Thangal", approxTime: "6:00 AM", latitude: 13.1350, longitude: 80.2910 },
      { name: "Tollgate", approxTime: "6:01 AM", latitude: 13.1280, longitude: 80.2890 },
      { name: "Parrys", approxTime: "Non-stop", isNonStop: true, latitude: 13.0890, longitude: 80.2850 },
      { name: "Central", approxTime: "Non-stop", isNonStop: true, latitude: 13.0827, longitude: 80.2707 },
      { name: "Koyambedu Roundtana", approxTime: "Non-stop", isNonStop: true, latitude: 13.0694, longitude: 80.1948 },
      { name: "Poonamallee Bypass", approxTime: "Non-stop", isNonStop: true, latitude: 13.0489, longitude: 80.0912 },
      { name: "College Campus", approxTime: "7:40 AM", latitude: 13.0084, longitude: 80.0034 },
    ],
  },
  {
    busId: "bus-1b",
    busNumber: "1B",
    routeId: "route-1b",
    routeCode: "1B",
    routeName: "Periyamedu",
    direction: "TO_COLLEGE",
    startingTimeDisplay: "5:40 AM (Approx.)",
    campusArrivalDisplay: "7:40 AM (Approx.)",
    stops: [
      { name: "Ennore Bus Stand", approxTime: "5:40 AM", latitude: 13.2167, longitude: 80.3236 },
      { name: "Ernavur", approxTime: "5:43 AM", latitude: 13.2030, longitude: 80.3140 },
      { name: "Murugan Koil", approxTime: "5:45 AM", latitude: 13.1950, longitude: 80.3100 },
      { name: "Mullai Nagar", approxTime: "5:47 AM", latitude: 13.1850, longitude: 80.3050 },
      { name: "Koyambedu Roundtana", approxTime: "Non-stop", isNonStop: true, latitude: 13.0694, longitude: 80.1948 },
      { name: "Poonamallee Bypass", approxTime: "Non-stop", isNonStop: true, latitude: 13.0489, longitude: 80.0912 },
      { name: "College Campus", approxTime: "7:40 AM", latitude: 13.0084, longitude: 80.0034 },
    ],
  },
  {
    busId: "bus-1c",
    busNumber: "1C",
    routeId: "route-1c",
    routeCode: "1C",
    routeName: "Tondiarpet RTO Office",
    direction: "TO_COLLEGE",
    startingTimeDisplay: "6:05 AM (Approx.)",
    campusArrivalDisplay: "7:40 AM (Approx.)",
    stops: [
      { name: "Tondiarpet Depot", approxTime: "6:05 AM", latitude: 13.1250, longitude: 80.2880 },
      { name: "Kasimedu", approxTime: "6:07 AM", latitude: 13.1180, longitude: 80.2920 },
      { name: "Kasimedu Petrol Bunk", approxTime: "6:08 AM", latitude: 13.1140, longitude: 80.2930 },
      { name: "Kalmandapam Police Station", approxTime: "6:10 AM", latitude: 13.1090, longitude: 80.2935 },
      { name: "ST Anne's School", approxTime: "6:12 AM", latitude: 13.1030, longitude: 80.2940 },
      { name: "Royapuram Bridge", approxTime: "6:15 AM", latitude: 13.0980, longitude: 80.2945 },
      { name: "Beach Station", approxTime: "6:18 AM", latitude: 13.0920, longitude: 80.2920 },
      { name: "Annamalai Mandram", approxTime: "6:21 AM", latitude: 13.0870, longitude: 80.2860 },
      { name: "GH (Rajiv Gandhi Hospital)", approxTime: "6:23 AM", latitude: 13.0815, longitude: 80.2790 },
      { name: "Everest Hotel", approxTime: "6:26 AM", latitude: 13.0810, longitude: 80.2680 },
      { name: "Dasaprakash", approxTime: "6:30 AM", latitude: 13.0780, longitude: 80.2560 },
      { name: "Neyveli House", approxTime: "6:32 AM", latitude: 13.0785, longitude: 80.2480 },
      { name: "KMC", approxTime: "6:33 AM", latitude: 13.0790, longitude: 80.2420 },
      { name: "Taylors Road", approxTime: "6:35 AM", latitude: 13.0795, longitude: 80.2350 },
      { name: "Pachaiyappa's", approxTime: "6:37 AM", latitude: 13.0770, longitude: 80.2290 },
      { name: "Aminjikarai", approxTime: "6:40 AM", latitude: 13.0732, longitude: 80.2210 },
      { name: "Koyambedu Roundtana", approxTime: "Non-stop", isNonStop: true, latitude: 13.0694, longitude: 80.1948 },
      { name: "Poonamallee Bypass", approxTime: "Non-stop", isNonStop: true, latitude: 13.0489, longitude: 80.0912 },
      { name: "College Campus", approxTime: "7:40 AM", latitude: 13.0084, longitude: 80.0034 },
    ],
  },
  {
    busId: "bus-2",
    busNumber: "2",
    routeId: "route-2",
    routeCode: "2",
    routeName: "Tondiarpet",
    direction: "TO_COLLEGE",
    startingTimeDisplay: "6:10 AM (Approx.)",
    campusArrivalDisplay: "7:40 AM (Approx.)",
    stops: [
      { name: "Tondiarpet Mani Cycle Shop", approxTime: "6:10 AM", latitude: 13.1260, longitude: 80.2870 },
      { name: "Police Quarters", approxTime: "6:11 AM", latitude: 13.1230, longitude: 80.2865 },
      { name: "Post Office", approxTime: "6:12 AM", latitude: 13.1200, longitude: 80.2860 },
      { name: "Maharani (Singapore Shoppee)", approxTime: "6:13 AM", latitude: 13.1160, longitude: 80.2855 },
      { name: "Aminjikarai", approxTime: "Non-stop", isNonStop: true, latitude: 13.0732, longitude: 80.2210 },
      { name: "Koyambedu Roundtana", approxTime: "Non-stop", isNonStop: true, latitude: 13.0694, longitude: 80.1948 },
      { name: "Poonamallee Bypass", approxTime: "Non-stop", isNonStop: true, latitude: 13.0489, longitude: 80.0912 },
      { name: "College Campus", approxTime: "7:40 AM", latitude: 13.0084, longitude: 80.0034 },
    ],
  },
  {
    busId: "bus-2b",
    busNumber: "2B",
    routeId: "route-2b",
    routeCode: "2B",
    routeName: "Ajax",
    direction: "TO_COLLEGE",
    startingTimeDisplay: "5:50 AM (Approx.)",
    campusArrivalDisplay: "7:40 AM (Approx.)",
    stops: [
      { name: "Ajax Bus Depot", approxTime: "5:50 AM", latitude: 13.1700, longitude: 80.3050 },
      { name: "Periyar Nagar", approxTime: "5:57 AM", latitude: 13.1610, longitude: 80.3000 },
      { name: "Ellaiamman Koil", approxTime: "6:00 AM", latitude: 13.1550, longitude: 80.2970 },
      { name: "Lakshmi Koil", approxTime: "6:05 AM", latitude: 13.1480, longitude: 80.2940 },
      { name: "Aminjikarai", approxTime: "Non-stop", isNonStop: true, latitude: 13.0732, longitude: 80.2210 },
      { name: "Koyambedu Roundtana", approxTime: "Non-stop", isNonStop: true, latitude: 13.0694, longitude: 80.1948 },
      { name: "Poonamallee Bypass", approxTime: "Non-stop", isNonStop: true, latitude: 13.0489, longitude: 80.0912 },
      { name: "College Campus", approxTime: "7:40 AM", latitude: 13.0084, longitude: 80.0034 },
    ],
  },
  {
    busId: "bus-2c",
    busNumber: "2C",
    routeId: "route-2c",
    routeCode: "2C",
    routeName: "Mint",
    direction: "TO_COLLEGE",
    startingTimeDisplay: "6:10 AM (Approx.)",
    campusArrivalDisplay: "7:40 AM (Approx.)",
    stops: [
      { name: "Cemetery Road", approxTime: "6:10 AM", latitude: 13.1090, longitude: 80.2850 },
      { name: "Mint Old Bus Stop", approxTime: "6:11 AM", latitude: 13.1060, longitude: 80.2810 },
      { name: "Mint New Bus Stand", approxTime: "6:13 AM", latitude: 13.1040, longitude: 80.2780 },
      { name: "Basin Bridge", approxTime: "6:14 AM", latitude: 13.1010, longitude: 80.2730 },
      { name: "Padmanaba Theater", approxTime: "6:18 AM", latitude: 13.0970, longitude: 80.2690 },
      { name: "Koyambedu Roundtana", approxTime: "Non-stop", isNonStop: true, latitude: 13.0694, longitude: 80.1948 },
      { name: "Poonamallee Bypass", approxTime: "Non-stop", isNonStop: true, latitude: 13.0489, longitude: 80.0912 },
      { name: "College Campus", approxTime: "7:40 AM", latitude: 13.0084, longitude: 80.0034 },
    ],
  },
  {
    busId: "bus-3",
    busNumber: "3",
    routeId: "route-3",
    routeCode: "3",
    routeName: "Choolai",
    direction: "TO_COLLEGE",
    startingTimeDisplay: "6:15 AM (Approx.)",
    campusArrivalDisplay: "7:40 AM (Approx.)",
    stops: [
      { name: "Choolai Post Office", approxTime: "6:15 AM", latitude: 13.0900, longitude: 80.2650 },
      { name: "Veperi Police Station", approxTime: "6:20 AM", latitude: 13.0850, longitude: 80.2600 },
      { name: "Muthumari Amman Koil - Purasaiwakkam", approxTime: "6:22 AM", latitude: 13.0870, longitude: 80.2540 },
      { name: "Gangadeeswarar Koil", approxTime: "6:23 AM", latitude: 13.0860, longitude: 80.2500 },
      { name: "Koyambedu Roundtana", approxTime: "Non-stop", isNonStop: true, latitude: 13.0694, longitude: 80.1948 },
      { name: "Poonamallee Bypass", approxTime: "Non-stop", isNonStop: true, latitude: 13.0489, longitude: 80.0912 },
      { name: "College Campus", approxTime: "7:40 AM", latitude: 13.0084, longitude: 80.0034 },
    ],
  },
  {
    busId: "bus-3b",
    busNumber: "3B",
    routeId: "route-3b",
    routeCode: "3B",
    routeName: "Kilpauk Kallarai",
    direction: "TO_COLLEGE",
    startingTimeDisplay: "6:35 AM (Approx.)",
    campusArrivalDisplay: "7:40 AM (Approx.)",
    stops: [
      { name: "Kilpauk Kallarai", approxTime: "6:35 AM", latitude: 13.0820, longitude: 80.2400 },
      { name: "Periya Palaiyamman Kovil", approxTime: "6:37 AM", latitude: 13.0800, longitude: 80.2320 },
      { name: "Thiruvikka Parking", approxTime: "6:40 AM", latitude: 13.0780, longitude: 80.2260 },
      { name: "Anna Arch", approxTime: "6:45 AM", latitude: 13.0750, longitude: 80.2180 },
      { name: "Thiruvithiyamman Kovil", approxTime: "6:55 AM", latitude: 13.0710, longitude: 80.2100 },
      { name: "Koyambedu Roundtana", approxTime: "Non-stop", isNonStop: true, latitude: 13.0694, longitude: 80.1948 },
      { name: "Poonamallee Bypass", approxTime: "Non-stop", isNonStop: true, latitude: 13.0489, longitude: 80.0912 },
      { name: "College Campus", approxTime: "7:40 AM", latitude: 13.0084, longitude: 80.0034 },
    ],
  },
  {
    busId: "bus-3c",
    busNumber: "3C",
    routeId: "route-3c",
    routeCode: "3C",
    routeName: "Dovton Bridge",
    direction: "TO_COLLEGE",
    startingTimeDisplay: "6:15 AM (Approx.)",
    campusArrivalDisplay: "7:40 AM (Approx.)",
    stops: [
      { name: "Muthumariamman Kovil (Dovton Bridge)", approxTime: "6:15 AM", latitude: 13.0890, longitude: 80.2600 },
      { name: "Alagappa Road", approxTime: "6:16 AM", latitude: 13.0870, longitude: 80.2580 },
      { name: "Pathala Ponniammam Koil", approxTime: "6:20 AM", latitude: 13.0850, longitude: 80.2530 },
      { name: "Motcham Theatre", approxTime: "6:25 AM", latitude: 13.0860, longitude: 80.2480 },
      { name: "Kellys Signal", approxTime: "6:27 AM", latitude: 13.0840, longitude: 80.2430 },
      { name: "Mummy Daddy", approxTime: "6:30 AM", latitude: 13.0820, longitude: 80.2380 },
      { name: "Murugan Hospital", approxTime: "6:32 AM", latitude: 13.0800, longitude: 80.2330 },
      { name: "Koyambedu Roundtana", approxTime: "Non-stop", isNonStop: true, latitude: 13.0694, longitude: 80.1948 },
      { name: "Poonamallee Bypass", approxTime: "Non-stop", isNonStop: true, latitude: 13.0489, longitude: 80.0912 },
      { name: "College Campus", approxTime: "7:40 AM", latitude: 13.0084, longitude: 80.0034 },
    ],
  },
  {
    busId: "bus-4",
    busNumber: "4",
    routeId: "route-4",
    routeCode: "4",
    routeName: "Chintadripet",
    direction: "TO_COLLEGE",
    startingTimeDisplay: "6:15 AM (Approx.)",
    campusArrivalDisplay: "7:40 AM (Approx.)",
    stops: [
      { name: "Chintadripet Fish Market", approxTime: "6:15 AM", latitude: 13.0760, longitude: 80.2720 },
      { name: "Chintadripet Market", approxTime: "6:17 AM", latitude: 13.0750, longitude: 80.2700 },
      { name: "Chintadripet Police Quarters", approxTime: "6:18 AM", latitude: 13.0740, longitude: 80.2680 },
      { name: "Pudupet", approxTime: "6:20 AM", latitude: 13.0730, longitude: 80.2650 },
      { name: "Egmore Court", approxTime: "6:22 AM", latitude: 13.0740, longitude: 80.2600 },
      { name: "Rajarthinam Stadium", approxTime: "6:24 AM", latitude: 13.0750, longitude: 80.2560 },
      { name: "Egmore Co-Optex Bridge", approxTime: "6:26 AM", latitude: 13.0740, longitude: 80.2520 },
      { name: "Halls Road Junction", approxTime: "6:28 AM", latitude: 13.0730, longitude: 80.2480 },
      { name: "Chetpet Signal", approxTime: "6:30 AM", latitude: 13.0710, longitude: 80.2430 },
      { name: "Harington Road Junction", approxTime: "6:35 AM", latitude: 13.0720, longitude: 80.2370 },
      { name: "Mehta Nagar", approxTime: "6:40 AM", latitude: 13.0700, longitude: 80.2300 },
      { name: "Skywalk Bridge", approxTime: "6:42 AM", latitude: 13.0720, longitude: 80.2220 },
      { name: "Koyambedu Roundtana", approxTime: "Non-stop", isNonStop: true, latitude: 13.0694, longitude: 80.1948 },
      { name: "Poonamallee Bypass", approxTime: "Non-stop", isNonStop: true, latitude: 13.0489, longitude: 80.0912 },
      { name: "College Campus", approxTime: "7:40 AM", latitude: 13.0084, longitude: 80.0034 },
    ],
  },
  {
    busId: "bus-18",
    busNumber: "18",
    routeId: "route-18",
    routeCode: "18",
    routeName: "Avadi",
    direction: "TO_COLLEGE",
    startingTimeDisplay: "6:40 AM (Approx.)",
    campusArrivalDisplay: "7:40 AM (Approx.)",
    stops: [
      { name: "Avadi Ramarathinam", approxTime: "6:40 AM", latitude: 13.1170, longitude: 80.1080 },
      { name: "Ponnu Supermarket", approxTime: "6:42 AM", latitude: 13.1120, longitude: 80.1050 },
      { name: "Poonamallee Bypass", approxTime: "Non-stop", isNonStop: true, latitude: 13.0489, longitude: 80.0912 },
      { name: "College Campus", approxTime: "7:40 AM", latitude: 13.0084, longitude: 80.0034 },
    ],
  },
];

export const INITIAL_SERVICE_SLOTS = [
  {
    id: "slot-morning-630",
    name: "Morning Shift (6:30 AM)",
    shiftType: "MORNING",
    slotTime: "6:30 AM",
    startTime: "06:30",
    endTime: "08:00",
    direction: "TO_COLLEGE",
    examOnly: false,
    active: true,
    busIds: ["bus-1", "bus-1b", "bus-1c", "bus-2", "bus-2b", "bus-2c", "bus-3", "bus-3b", "bus-3c", "bus-4", "bus-18"],
  },
  {
    id: "slot-morning-830",
    name: "Morning Shift (8:30 AM)",
    shiftType: "MORNING",
    slotTime: "8:30 AM",
    startTime: "08:30",
    endTime: "10:00",
    direction: "TO_COLLEGE",
    examOnly: false,
    active: true,
    busIds: ["bus-1", "bus-18"],
  },
  {
    id: "slot-evening-315",
    name: "Evening Shift (3:15 PM)",
    shiftType: "EVENING",
    slotTime: "3:15 PM",
    startTime: "15:15",
    endTime: "17:00",
    direction: "FROM_COLLEGE",
    examOnly: false,
    active: true,
    busIds: ["bus-1", "bus-1b", "bus-1c", "bus-2", "bus-2b", "bus-2c", "bus-3", "bus-3b", "bus-3c", "bus-4", "bus-18"],
  },
  {
    id: "slot-evening-515",
    name: "Evening Shift (5:15 PM)",
    shiftType: "EVENING",
    slotTime: "5:15 PM",
    startTime: "17:15",
    endTime: "19:00",
    direction: "FROM_COLLEGE",
    examOnly: false,
    active: true,
    busIds: ["bus-1", "bus-18"],
  },
  {
    id: "slot-exam-1145",
    name: "Exam Special (11:45 AM)",
    shiftType: "EXAM",
    slotTime: "11:45 AM",
    startTime: "11:45",
    endTime: "13:30",
    direction: "FROM_COLLEGE",
    examOnly: true,
    active: false,
    busIds: ["bus-18"],
  },
  {
    id: "slot-exam-1200",
    name: "Exam Special (12:00 PM)",
    shiftType: "EXAM",
    slotTime: "12:00 PM",
    startTime: "12:00",
    endTime: "13:45",
    direction: "FROM_COLLEGE",
    examOnly: true,
    active: false,
    busIds: ["bus-1", "bus-18"],
  },
];

export const INITIAL_REGISTERED_DRIVERS = [
  { id: "driver-murugan", name: "K. Murugan", phone: "+91 98401 23456" },
  { id: "driver-ramesh", name: "S. Ramesh", phone: "+91 98402 34567" },
  { id: "driver-kumar", name: "P. Kumar", phone: "+91 98403 45678" },
  { id: "driver-selvam", name: "V. Selvam", phone: "+91 98404 56789" },
];

export async function seedInitialAcimsRoutesAndFleet() {
  console.log("[ACIMS Seed] Seeding initial 11 college bus routes, buses, and service slots...");

  // 1. Seed initial Drivers into profiles & drivers table (unassigned by default)
  for (const drv of INITIAL_REGISTERED_DRIVERS) {
    const existingProfile = await db.select().from(profiles).where(eq(profiles.userId, drv.id)).limit(1);
    let profileId: number;
    if (!existingProfile.length) {
      const [inserted] = await db
        .insert(profiles)
        .values({
          userId: drv.id,
          name: drv.name,
          email: `${drv.id}@rectransport.ac.in`,
          phone: drv.phone,
          role: "DRIVER",
        })
        .returning();
      profileId = inserted.id;
    } else {
      profileId = existingProfile[0].id;
    }

    const existingDriver = await db.select().from(drivers).where(eq(drivers.profileId, profileId)).limit(1);
    if (!existingDriver.length) {
      await db.insert(drivers).values({
        profileId,
      });
    }
  }

  // 2. Seed 11 Routes, Stops, and Buses
  for (const r of INITIAL_ACIMS_ROUTES) {
    // Route
    const [existingRoute] = await db.select().from(busRoutes).where(eq(busRoutes.id, r.routeId)).limit(1);
    if (!existingRoute) {
      await db.insert(busRoutes).values({
        id: r.routeId,
        routeName: r.routeName,
        routeCode: r.routeCode,
        direction: r.direction,
        startingTimeDisplay: r.startingTimeDisplay,
        campusArrivalDisplay: r.campusArrivalDisplay,
        source: "PROJECT_TEAM",
        manuallyEdited: false,
        active: true,
      });
    }

    // Bus
    const [existingBus] = await db.select().from(buses).where(eq(buses.id, r.busId)).limit(1);
    if (!existingBus) {
      await db.insert(buses).values({
        id: r.busId,
        busNumber: r.busNumber,
        routeId: r.routeId,
        driverId: null, // "Not assigned" by default
        capacity: 40,
        active: true,
        source: "PROJECT_TEAM",
        manuallyEdited: false,
      });
    }

    // Stops (populate bus_stops and official_pickup_points if not already present)
    const existingStops = await db.select().from(busStops).where(eq(busStops.routeId, r.routeId));
    if (existingStops.length === 0) {
      let seq = 1;
      for (const s of r.stops) {
        const stopId = `stop-${r.routeId}-${seq}`;
        await db.insert(busStops).values({
          id: stopId,
          routeId: r.routeId,
          stopName: s.name,
          approximateTime: s.approxTime,
          isNonStop: Boolean(s.isNonStop),
          latitude: s.latitude,
          longitude: s.longitude,
          sequenceNumber: seq,
          active: true,
        });

        // Also ensure in official_pickup_points
        const [existingPickup] = await db.select().from(officialPickupPoints).where(eq(officialPickupPoints.id, stopId)).limit(1);
        if (!existingPickup) {
          await db.insert(officialPickupPoints).values({
            id: stopId,
            routeId: r.routeId,
            stopName: s.name,
            latitude: s.latitude,
            longitude: s.longitude,
            sequenceNumber: seq,
            scheduledTimeDisplay: s.approxTime,
            isNonStop: Boolean(s.isNonStop),
            active: true,
            source: "PROJECT_TEAM",
          });
        }
        seq++;
      }
    }
  }

  // 3. Seed Service Slots / Shifts
  for (const slot of INITIAL_SERVICE_SLOTS) {
    const [existingShift] = await db.select().from(shifts).where(eq(shifts.id, slot.id)).limit(1);
    if (!existingShift) {
      await db.insert(shifts).values({
        id: slot.id,
        name: slot.name,
        shiftType: slot.shiftType,
        slotTime: slot.slotTime,
        startTime: slot.startTime,
        endTime: slot.endTime,
        direction: slot.direction,
        operatingDays: "MON,TUE,WED,THU,FRI",
        examOnly: slot.examOnly,
        active: slot.active,
      });
    }

    // Seed Shift Bus Assignments
    for (const bId of slot.busIds) {
      const assignId = `assign-${slot.id}-${bId}`;
      const [existingAssign] = await db.select().from(shiftAssignments).where(eq(shiftAssignments.id, assignId)).limit(1);
      if (!existingAssign) {
        await db.insert(shiftAssignments).values({
          id: assignId,
          shiftId: slot.id,
          busId: bId,
          active: true,
        });
      }
    }
  }

  console.log("[ACIMS Seed] Verified 11 official routes, stops, and service slots in database.");
}
