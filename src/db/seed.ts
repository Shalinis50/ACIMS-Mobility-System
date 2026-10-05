import { db } from './index.ts';
import { eq } from 'drizzle-orm';
import {
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
  console.log('Seeding ACIMS campus map (college fleet comes from official REC Transport)...');

  // Campus locations
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
        });
      } else if (p.role === 'DRIVER') {
        await db.insert(drivers).values({
          profileId: ins[0].id,
        });
      }
    }
  }

  console.log('Seeding completed successfully!');
}
