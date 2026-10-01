import { db } from './index.ts';
import { eq } from 'drizzle-orm';
import {
  buses,
  busRoutes,
  busStops,
  campusLocations,
  campusPaths,
  profiles,
  students,
  drivers,
  publicTransportStops,
  publicTransportDepartures,
} from './schema.ts';
import { REC_BUILDINGS, REC_CAMPUS_STOPS, REC_POINTS_OF_INTEREST, REC_CAMPUS_PATHS } from '../../artifacts/api-server/src/services/campusData.ts';

export async function seedDatabase() {
  console.log('Seeding ACIMS PostgreSQL database...');

  // 1. Seed Routes
  const initialRoutes = [
    { id: 'route-bus-18', routeName: 'Metro Connector Feeder', routeCode: '18', active: true },
    { id: 'route-bus-12', routeName: 'Campus Loop A', routeCode: '12', active: true },
    { id: 'route-bus-4b', routeName: 'Engineering Express', routeCode: '4B', active: true },
    { id: 'route-bus-7', routeName: 'North Campus Shuttle', routeCode: '7', active: true },
    { id: 'route-bus-21', routeName: 'South Perimeter Circle', routeCode: '21', active: true },
  ];

  for (const r of initialRoutes) {
    await db.insert(busRoutes).values(r).onConflictDoNothing();
  }

  // 2. Seed Stops
  const initialStops = [
    // Route 18
    { id: 'metro-central', routeId: 'route-bus-18', stopName: 'Metro Central Station', latitude: 12.9249, longitude: 80.1275, sequenceNumber: 1 },
    { id: 'jb-estate', routeId: 'route-bus-18', stopName: 'JB Estate', latitude: 12.9272, longitude: 80.1302, sequenceNumber: 2 },
    { id: 'ponnu', routeId: 'route-bus-18', stopName: 'Ponnu', latitude: 12.9301, longitude: 80.1336, sequenceNumber: 3 },
    { id: 'ramratna', routeId: 'route-bus-18', stopName: 'Ramratna', latitude: 12.9338, longitude: 80.1368, sequenceNumber: 4 },
    { id: 'med-sciences', routeId: 'route-bus-18', stopName: 'Medical Sciences Center', latitude: 12.9372, longitude: 80.1396, sequenceNumber: 5 },

    // Route 12
    { id: 'vandalur', routeId: 'route-bus-12', stopName: 'Vandalur Transit Hub', latitude: 12.8912, longitude: 80.0815, sequenceNumber: 1 },
    { id: 'perungalathur', routeId: 'route-bus-12', stopName: 'Perungalathur Junction', latitude: 12.9042, longitude: 80.0965, sequenceNumber: 2 },
    { id: 'tambaram', routeId: 'route-bus-12', stopName: 'Tambaram Terminal', latitude: 12.9254, longitude: 80.1198, sequenceNumber: 3 },
    { id: 'chromepet', routeId: 'route-bus-12', stopName: 'Chromepet Station Gate', latitude: 12.9515, longitude: 80.1412, sequenceNumber: 4 },
    { id: 'quad', routeId: 'route-bus-12', stopName: 'Academic Quad', latitude: 12.9734, longitude: 80.1589, sequenceNumber: 5 },

    // Route 4B
    { id: 'north-residence', routeId: 'route-bus-4b', stopName: 'North Residence Complex', latitude: 12.9421, longitude: 80.1245, sequenceNumber: 1 },
    { id: 'bio-center', routeId: 'route-bus-4b', stopName: 'Bio-Engineering Center', latitude: 12.9375, longitude: 80.1292, sequenceNumber: 2 },
    { id: 'nano-hub', routeId: 'route-bus-4b', stopName: 'Nano Research Facility', latitude: 12.9318, longitude: 80.1345, sequenceNumber: 3 },
    { id: 'innovation-park', routeId: 'route-bus-4b', stopName: 'Tech & Innovation Park', latitude: 12.9262, longitude: 80.1415, sequenceNumber: 4 },

    // Route 7
    { id: 'hostel-village', routeId: 'route-bus-7', stopName: 'Hostel Village', latitude: 12.9145, longitude: 80.1122, sequenceNumber: 1 },
    { id: 'athletics', routeId: 'route-bus-7', stopName: 'Athletic Pavilion', latitude: 12.9182, longitude: 80.1165, sequenceNumber: 2 },
    { id: 'library', routeId: 'route-bus-7', stopName: 'Central Library & Union', latitude: 12.9221, longitude: 80.1215, sequenceNumber: 3 },

    // Route 21
    { id: 'south-lot', routeId: 'route-bus-21', stopName: 'South Commuter Lot', latitude: 12.9015, longitude: 80.0935, sequenceNumber: 1 },
    { id: 'faculty-enclave', routeId: 'route-bus-21', stopName: 'Faculty Enclave', latitude: 12.9085, longitude: 80.1012, sequenceNumber: 2 },
    { id: 'auditorium', routeId: 'route-bus-21', stopName: 'Main Auditorium', latitude: 12.9152, longitude: 80.1095, sequenceNumber: 3 },
  ];

  for (const s of initialStops) {
    await db.insert(busStops).values(s).onConflictDoNothing();
  }

  // 3. Seed Buses
  const initialBuses = [
    { id: 'bus-18', busNumber: '18', registrationNumber: 'TN-11-AC-1018', routeId: 'route-bus-18', driverId: 'driver-rajesh', active: true },
    { id: 'bus-12', busNumber: '12', registrationNumber: 'TN-11-AC-1012', routeId: 'route-bus-12', driverId: 'driver-arun', active: true },
    { id: 'bus-4b', busNumber: '4B', registrationNumber: 'TN-11-AC-1044', routeId: 'route-bus-4b', driverId: 'driver-suresh', active: true },
    { id: 'bus-7', busNumber: '7', registrationNumber: 'TN-11-AC-1007', routeId: 'route-bus-7', driverId: 'driver-venkat', active: true },
    { id: 'bus-21', busNumber: '21', registrationNumber: 'TN-11-AC-1021', routeId: 'route-bus-21', driverId: 'driver-karthik', active: true },
  ];

  for (const b of initialBuses) {
    await db.insert(buses).values(b).onConflictDoNothing();
  }

  // 4. Seed Campus Locations
  for (const bldg of REC_BUILDINGS) {
    await db.insert(campusLocations).values({
      id: bldg.id,
      name: bldg.name,
      category: bldg.category,
      latitude: bldg.latitude,
      longitude: bldg.longitude,
      description: bldg.description,
    }).onConflictDoNothing();
  }

  for (const stop of REC_CAMPUS_STOPS) {
    await db.insert(campusLocations).values({
      id: stop.id,
      name: stop.name,
      category: 'transit',
      latitude: stop.latitude,
      longitude: stop.longitude,
      description: stop.description,
    }).onConflictDoNothing();
  }

  for (const poi of REC_POINTS_OF_INTEREST) {
    await db.insert(campusLocations).values({
      id: poi.id,
      name: poi.name,
      category: poi.category,
      latitude: poi.latitude,
      longitude: poi.longitude,
      description: `Near ${poi.landmarkNear}`,
    }).onConflictDoNothing();
  }

  // 5. Seed Campus Paths
  for (const path of REC_CAMPUS_PATHS) {
    const coords = path.coordinates;
    if (coords.length >= 2) {
      await db.insert(campusPaths).values({
        id: path.id,
        fromLocationId: path.name.split(' to ')[0] || path.id,
        toLocationId: path.name.split(' to ')[1] || path.id,
        distanceMeters: Math.round(coords.length * 25),
        pathPoints: JSON.stringify(coords.map((c) => [c.latitude, c.longitude])),
      }).onConflictDoNothing();
    }
  }

  // 6. Seed Public Transport Stops & Departures (Chennai MTC / Tambaram corridor)
  const ptStops = [
    { id: 'pt-thandalam', name: 'Thandalam REC Main Gate', latitude: 13.0084, longitude: 80.0033, routesServed: '597, 54B, 578, 597A' },
    { id: 'pt-tambaram', name: 'Tambaram Central Bus Terminus', latitude: 12.9254, longitude: 80.1198, routesServed: '554, 578, 597, 114, 202' },
    { id: 'pt-poonamallee', name: 'Poonamallee Bus Terminus', latitude: 13.0489, longitude: 80.0934, routesServed: '54, 54B, 597, 153' },
    { id: 'pt-guindy', name: 'Guindy Estate Bus Station', latitude: 13.0067, longitude: 80.2012, routesServed: '54, 54B, 597' },
  ];

  for (const stop of ptStops) {
    await db.insert(publicTransportStops).values(stop).onConflictDoNothing();
  }

  const ptDepartures = [
    { id: 'dep-597-1', stopId: 'pt-thandalam', routeNumber: '597', destination: 'Tambaram Terminal', departureTime: '07:30', serviceDays: 'MON,TUE,WED,THU,FRI,SAT', isLive: true },
    { id: 'dep-597-2', stopId: 'pt-thandalam', routeNumber: '597', destination: 'Tambaram Terminal', departureTime: '08:15', serviceDays: 'MON,TUE,WED,THU,FRI,SAT', isLive: false },
    { id: 'dep-54b-1', stopId: 'pt-thandalam', routeNumber: '54B', destination: 'Poonamallee / T.Nagar', departureTime: '07:45', serviceDays: 'MON,TUE,WED,THU,FRI,SAT', isLive: true },
    { id: 'dep-578-1', stopId: 'pt-thandalam', routeNumber: '578', destination: 'Sriperumbudur / Kanchipuram', departureTime: '08:00', serviceDays: 'MON,TUE,WED,THU,FRI,SAT', isLive: false },
    { id: 'dep-tam-597-1', stopId: 'pt-tambaram', routeNumber: '597', destination: 'Thandalam (REC Campus)', departureTime: '07:15', serviceDays: 'MON,TUE,WED,THU,FRI,SAT', isLive: true },
    { id: 'dep-tam-554-1', stopId: 'pt-tambaram', routeNumber: '554', destination: 'Sriperumbudur via REC', departureTime: '07:40', serviceDays: 'MON,TUE,WED,THU,FRI,SAT', isLive: false },
  ];

  for (const dep of ptDepartures) {
    await db.insert(publicTransportDepartures).values(dep).onConflictDoNothing();
  }

  // 7. Seed Initial Profiles (Demo student, drivers, admin)
  const defaultProfiles = [
    { userId: 'admin', name: 'Campus Transport Controller', email: 'admin@rec.edu.in', role: 'ADMIN' as const },
    { userId: 'student-20418', name: 'Rithvik S (CSD)', email: 'student-20418@rec.edu.in', role: 'STUDENT' as const },
    { userId: 'driver-arun', name: 'Driver Arun', email: 'arun.driver@rec.edu.in', role: 'DRIVER' as const },
    { userId: 'driver-rajesh', name: 'Driver Rajesh', email: 'rajesh.driver@rec.edu.in', role: 'DRIVER' as const },
  ];

  for (const p of defaultProfiles) {
    const existing = await db.select().from(profiles).where(eq(profiles.userId, p.userId));
    if (existing.length === 0) {
      const ins = await db.insert(profiles).values(p).returning();
      if (p.role === 'STUDENT') {
        await db.insert(students).values({
          profileId: ins[0].id,
          registerNumber: '2024-CSD-014',
          assignedBusId: 'bus-12',
          assignedRouteId: 'route-bus-12',
          pickupStopId: 'tambaram',
        });
      } else if (p.role === 'DRIVER') {
        await db.insert(drivers).values({
          profileId: ins[0].id,
          assignedBusId: p.userId === 'driver-arun' ? 'bus-12' : 'bus-18',
        });
      }
    }
  }

  console.log('Seeding completed successfully!');
}
