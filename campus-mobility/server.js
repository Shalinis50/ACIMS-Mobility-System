import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3500;
const DB_PATH = path.join(__dirname, 'data', 'rec_transport_database.json');

app.use(cors());
app.use(express.json());

// --- Real-Time Telemetry Event Broadcaster (SSE) ---
const sseClients = new Set();
const activeDriverSessions = new Map(); // token -> { busId, busNumber, createdAt }

function broadcastSSE(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// SSE Keep-alive heartbeat every 15s to keep connections alive across mobile & proxies
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': keepalive\n\n');
    } catch (err) {
      sseClients.delete(client);
    }
  }
}, 15000);

// Helper to safely read database
function readDatabase() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { buses: [], routes: [], stops: [] };
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database:', err);
    return { buses: [], routes: [], stops: [] };
  }
}

// Helper to atomically save database
function writeDatabase(data) {
  try {
    data.lastSyncTimestamp = new Date().toISOString();
    const tmpPath = DB_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, DB_PATH);
    return true;
  } catch (err) {
    console.error('Error writing database:', err);
    return false;
  }
}

function findBusIndex(db, identifier) {
  if (!identifier) return -1;
  const raw = String(identifier).toLowerCase().trim();
  const clean = raw.replace(/^(bus[-_]|rec_bus_)/, '');
  return db.buses.findIndex(b => {
    const bId = (b.busId || '').toLowerCase();
    const bNum = (b.busNumber || '').toLowerCase();
    const bClean = bId.replace(/^(bus[-_]|rec_bus_)/, '');
    return bId === raw || bNum === raw || bNum === clean || bClean === clean;
  });
}

// Heartbeat timeout sweeper for server-verified live status (runs every 5 seconds)
// LIVE -> LAST_KNOWN if no telemetry received for 20 seconds
setInterval(() => {
  const db = readDatabase();
  let modified = false;
  const now = Date.now();

  for (const bus of db.buses) {
    if (bus.status === 'LIVE') {
      const lastUpdate = bus.lastGpsUpdate ? new Date(bus.lastGpsUpdate).getTime() : 0;
      if (now - lastUpdate > 20000) { // 20s timeout
        bus.status = 'LAST_KNOWN';
        bus.speed = 0;
        bus.updatedAt = new Date().toISOString();
        modified = true;
        broadcastSSE('BUS_STATUS_CHANGED', {
          busId: bus.busId,
          busNumber: bus.busNumber,
          status: 'LAST_KNOWN',
          reason: 'heartbeat_timeout',
          bus: bus
        });
      }
    }
  }

  if (modified) {
    writeDatabase(db);
  }
}, 5000);

// --- REST API Endpoints ---

// GET /api/status
app.get('/api/status', (req, res) => {
  const db = readDatabase();
  res.json({
    online: true,
    system: db.system || 'Rajalakshmi Engineering College (REC) Transport System',
    campus: db.campus || 'REC Thandalam Campus',
    serverTime: new Date().toISOString(),
    totalBuses: db.buses.length,
    activeBuses: db.buses.filter(b => b.isActive).length,
    totalRoutes: db.routes.length,
    totalStops: db.stops ? db.stops.length : 0,
    sseConnectedClients: sseClients.size
  });
});

// GET /api/transport/stream (Server-Sent Events for real-time live telemetry)
app.get('/api/transport/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString(), system: 'REC Transport Live Telemetry Stream' })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// GET /api/transport/live (Authoritative current live bus snapshot)
app.get('/api/transport/live', (req, res) => {
  const db = readDatabase();
  const liveBuses = db.buses
    .filter(b => b.isActive !== false)
    .map(b => ({
      busId: b.busId,
      busNumber: b.busNumber,
      status: b.status,
      lastLatitude: b.lastLatitude,
      lastLongitude: b.lastLongitude,
      speed: b.speed || 0,
      heading: b.heading || 0,
      accuracy: b.accuracy || 0,
      lastGpsUpdate: b.lastGpsUpdate,
      parkingBay: b.parkingBay,
      mapX: b.mapX,
      mapY: b.mapY
    }));
  res.json({ count: liveBuses.length, buses: liveBuses, timestamp: new Date().toISOString() });
});

// POST /api/driver/session (Authenticate and authorize driver for a specific bus)
app.post('/api/driver/session', (req, res) => {
  const db = readDatabase();
  const { busId } = req.body;
  if (!busId) {
    return res.status(400).json({ error: 'busId is required to start driver session' });
  }

  const idx = findBusIndex(db, busId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  const bus = db.buses[idx];
  if (bus.isActive === false) {
    return res.status(403).json({ error: 'Cannot start session for inactive bus' });
  }

  const token = crypto.randomUUID();
  activeDriverSessions.set(token, {
    busId: bus.busId,
    busNumber: bus.busNumber,
    createdAt: Date.now()
  });

  res.json({
    success: true,
    token: token,
    busId: bus.busId,
    busNumber: bus.busNumber,
    driver: bus.driver,
    route: bus.routeName || bus.route
  });
});

// GET /api/transport/calibration
app.get('/api/transport/calibration', (req, res) => {
  const db = readDatabase();
  res.json(db.calibration || {
    topLeft: { latitude: 13.013000, longitude: 80.000000 },
    topRight: { latitude: 13.013000, longitude: 80.006200 },
    bottomLeft: { latitude: 13.006800, longitude: 80.000000 },
    bottomRight: { latitude: 13.006800, longitude: 80.006200 },
    isVerified: true
  });
});

// PUT /api/transport/calibration
app.put('/api/transport/calibration', (req, res) => {
  const db = readDatabase();
  const { topLeft, topRight, bottomLeft, bottomRight } = req.body;
  if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
    return res.status(400).json({ error: 'All 4 corner points (topLeft, topRight, bottomLeft, bottomRight) are required' });
  }

  db.calibration = {
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
    isVerified: true,
    lastCalibratedAt: new Date().toISOString()
  };

  writeDatabase(db);
  broadcastSSE('CALIBRATION_UPDATED', db.calibration);
  res.json({ success: true, calibration: db.calibration });
});

// GET /api/buses
app.get('/api/buses', (req, res) => {
  const db = readDatabase();
  const includeInactive = req.query.includeInactive === 'true';
  const statusFilter = req.query.status ? req.query.status.toUpperCase() : null;
  const searchQuery = req.query.search ? req.query.search.trim().toLowerCase() : null;
  const routeFilter = req.query.route ? req.query.route.trim().toLowerCase() : null;
  const campusFilter = req.query.campus ? req.query.campus.trim().toLowerCase() : null;

  let results = db.buses;

  if (!includeInactive) {
    results = results.filter(b => b.isActive !== false);
  }

  if (statusFilter && statusFilter !== 'ALL') {
    results = results.filter(b => (b.status || '').toUpperCase() === statusFilter);
  }

  if (campusFilter) {
    results = results.filter(b => (b.campus || '').toLowerCase().includes(campusFilter));
  }

  if (routeFilter) {
    results = results.filter(b => 
      (b.routeId && b.routeId.toLowerCase().includes(routeFilter)) ||
      (b.routeName && b.routeName.toLowerCase().includes(routeFilter))
    );
  }

  if (searchQuery) {
    results = results.filter(b => 
      (b.busNumber && b.busNumber.toLowerCase().includes(searchQuery)) ||
      (b.routeName && b.routeName.toLowerCase().includes(searchQuery)) ||
      (b.registrationNumber && b.registrationNumber.toLowerCase().includes(searchQuery)) ||
      (b.parkingBay && b.parkingBay.toLowerCase().includes(searchQuery))
    );
  }

  res.json(results);
});

// GET /api/buses/:id
app.get('/api/buses/:id', (req, res) => {
  const db = readDatabase();
  const idx = findBusIndex(db, req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Bus not found' });
  }
  res.json(db.buses[idx]);
});

// POST /api/buses (Create bus)
app.post('/api/buses', (req, res) => {
  const db = readDatabase();
  const b = req.body;
  if (!b.busNumber) {
    return res.status(400).json({ error: 'busNumber is required' });
  }

  const existing = db.buses.find(item => item.busNumber.toLowerCase() === b.busNumber.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: `Bus ${b.busNumber} already exists in database` });
  }

  const now = new Date().toISOString();
  const newBus = {
    busId: b.busId || `rec_bus_${b.busNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    busNumber: b.busNumber,
    registrationNumber: b.registrationNumber || '',
    campus: b.campus || 'REC Thandalam Campus',
    routeId: b.routeId || `route_${b.busNumber.toLowerCase()}`,
    routeName: b.routeName || `Route ${b.busNumber}`,
    busType: b.busType || 'Standard Transit',
    capacity: Number(b.capacity) || 55,
    driver: b.driver || '',
    driverContact: b.driverContact || '',
    conductor: b.conductor || '',
    conductorContact: b.conductorContact || '',
    morningTrip: b.morningTrip || '',
    returnTrip: b.returnTrip || '',
    boardingPoints: b.boardingPoints || '',
    departureTime: b.departureTime || '',
    arrivalTime: b.arrivalTime || '',
    status: b.status || 'STATIC',
    isActive: b.isActive !== undefined ? Boolean(b.isActive) : true,
    mapX: b.mapX !== undefined ? Number(b.mapX) : null,
    mapY: b.mapY !== undefined ? Number(b.mapY) : null,
    parkingBay: b.parkingBay || '',
    lastLatitude: b.lastLatitude !== undefined ? b.lastLatitude : null,
    lastLongitude: b.lastLongitude !== undefined ? b.lastLongitude : null,
    lastGpsUpdate: b.lastGpsUpdate || null,
    stopLocationId: b.stopLocationId || 'GATE-01',
    createdAt: now,
    updatedAt: now
  };

  db.buses.push(newBus);
  writeDatabase(db);
  broadcastSSE('BUS_CREATED', newBus);
  res.status(201).json(newBus);
});

// PUT /api/buses/:id (Update bus)
app.put('/api/buses/:id', (req, res) => {
  const db = readDatabase();
  const idx = findBusIndex(db, req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  const existing = db.buses[idx];
  const updated = {
    ...existing,
    ...req.body,
    busId: existing.busId, // preserve canonical ID
    updatedAt: new Date().toISOString()
  };

  db.buses[idx] = updated;
  writeDatabase(db);
  broadcastSSE('BUS_UPDATED', updated);
  res.json(updated);
});

// PATCH /api/buses/:id/position (Persist normalized X/Y coordinates)
app.patch('/api/buses/:id/position', (req, res) => {
  const db = readDatabase();
  const idx = findBusIndex(db, req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  const { mapX, mapY, parkingBay } = req.body;
  if (mapX === undefined || mapY === undefined) {
    return res.status(400).json({ error: 'mapX and mapY normalized coordinates required (0.0 to 1.0)' });
  }

  const parsedX = Math.max(0.0, Math.min(1.0, parseFloat(mapX)));
  const parsedY = Math.max(0.0, Math.min(1.0, parseFloat(mapY)));

  db.buses[idx].mapX = parsedX;
  db.buses[idx].mapY = parsedY;
  if (parkingBay) db.buses[idx].parkingBay = parkingBay;
  db.buses[idx].updatedAt = new Date().toISOString();

  writeDatabase(db);
  broadcastSSE('BUS_POSITION_UPDATED', db.buses[idx]);

  res.json({
    success: true,
    busId: db.buses[idx].busId,
    busNumber: db.buses[idx].busNumber,
    mapX: parsedX,
    mapY: parsedY,
    parkingBay: db.buses[idx].parkingBay
  });
});

// POST /api/buses/:id/telemetry (Real GPS Telemetry from Driver Cockpit)
app.post('/api/buses/:id/telemetry', (req, res) => {
  const db = readDatabase();
  const idx = findBusIndex(db, req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  const bus = db.buses[idx];
  if (bus.isActive === false) {
    return res.status(403).json({ error: 'Cannot transmit telemetry for inactive bus' });
  }

  // Driver session token check if provided
  const authHeader = req.headers.authorization;
  const token = req.headers['x-driver-token'] || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.body.token);
  if (token && activeDriverSessions.has(token)) {
    const session = activeDriverSessions.get(token);
    if (session.busId !== bus.busId) {
      return res.status(403).json({ error: 'Driver session is not authorized for this bus' });
    }
  }

  const { latitude, longitude, speed, heading, accuracy, isLive, parkingBay } = req.body;
  const now = new Date().toISOString();

  // Validate coordinates (Requirement 14)
  if (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
      return res.status(400).json({ error: 'Invalid coordinates: latitude and longitude must be finite numbers' });
    }

    // Acceptable REC transport operating region: Tamil Nadu / Chennai / Kanchipuram / Thiruvallur
    if (lat < 12.0 || lat > 14.5 || lon < 78.5 || lon > 81.5) {
      return res.status(400).json({ error: 'Coordinates outside REC transport operational region (12.0-14.5° N, 78.5-81.5° E)' });
    }

    db.buses[idx].lastLatitude = lat;
    db.buses[idx].lastLongitude = lon;
    db.buses[idx].lastGpsUpdate = now;
  }

  if (speed !== undefined && speed !== null) {
    const sp = Number(speed);
    if (!isNaN(sp) && isFinite(sp) && sp >= 0 && sp <= 150) {
      db.buses[idx].speed = sp;
    }
  }

  if (heading !== undefined && heading !== null) {
    const hd = Number(heading);
    if (!isNaN(hd) && isFinite(hd) && hd >= 0 && hd <= 360) {
      db.buses[idx].heading = hd;
    }
  }

  if (accuracy !== undefined && accuracy !== null) {
    const acc = Number(accuracy);
    if (!isNaN(acc) && isFinite(acc) && acc > 0) {
      db.buses[idx].accuracy = acc;
    }
  }

  if (parkingBay && typeof parkingBay === 'string') {
    db.buses[idx].parkingBay = parkingBay.trim();
  }

  // Server-verified status hierarchy:
  // LIVE if active broadcast and valid GPS, LAST_KNOWN when broadcast ended, STATIC if no GPS history
  if (isLive === true && db.buses[idx].lastLatitude !== null) {
    db.buses[idx].status = 'LIVE';
  } else if (isLive === false) {
    db.buses[idx].status = db.buses[idx].lastLatitude !== null ? 'LAST_KNOWN' : 'STATIC';
    db.buses[idx].speed = 0;
  }

  db.buses[idx].updatedAt = now;
  writeDatabase(db);

  // Broadcast real-time live telemetry to connected students
  broadcastSSE('BUS_TELEMETRY', {
    busId: db.buses[idx].busId,
    busNumber: db.buses[idx].busNumber,
    status: db.buses[idx].status,
    latitude: db.buses[idx].lastLatitude,
    longitude: db.buses[idx].lastLongitude,
    speed: db.buses[idx].speed || 0,
    heading: db.buses[idx].heading || 0,
    accuracy: db.buses[idx].accuracy || 0,
    lastGpsUpdate: db.buses[idx].lastGpsUpdate,
    parkingBay: db.buses[idx].parkingBay,
    bus: db.buses[idx]
  });

  res.json({ success: true, bus: db.buses[idx] });
});

// DELETE /api/buses/:id (Deactivate or remove)
app.delete('/api/buses/:id', (req, res) => {
  const db = readDatabase();
  const idx = findBusIndex(db, req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  const bus = db.buses[idx];

  // Support hard delete with ?hard=true, otherwise soft delete (isActive = false)
  if (req.query.hard === 'true') {
    const deleted = db.buses.splice(idx, 1)[0];
    writeDatabase(db);
    broadcastSSE('BUS_DELETED', { busId: deleted.busId, busNumber: deleted.busNumber });
    return res.json({ success: true, message: `Bus ${deleted.busNumber} deleted`, bus: deleted });
  } else {
    db.buses[idx].isActive = false;
    db.buses[idx].status = 'INACTIVE';
    db.buses[idx].updatedAt = new Date().toISOString();
    writeDatabase(db);
    broadcastSSE('BUS_STATUS_CHANGED', { busId: bus.busId, busNumber: bus.busNumber, status: 'INACTIVE', bus: db.buses[idx] });
    return res.json({ success: true, message: `Bus ${db.buses[idx].busNumber} deactivated`, bus: db.buses[idx] });
  }
});

// GET /api/routes
app.get('/api/routes', (req, res) => {
  const db = readDatabase();
  res.json(db.routes || []);
});

// GET /api/stops
app.get('/api/stops', (req, res) => {
  const db = readDatabase();
  res.json(db.stops || []);
});

// Static assets serving
app.use(express.static(__dirname));

// Serve index.html as fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[REC Transport Server] Running at http://localhost:${PORT}`);
  console.log(`[REC Transport Server] REST API available at http://localhost:${PORT}/api/buses`);
  console.log(`[REC Transport Server] Real-time SSE stream at http://localhost:${PORT}/api/transport/stream`);
});
