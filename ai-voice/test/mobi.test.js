/**
 * MOBI AI Voice Search Agent — Test Suite
 * Automated tests for transit search engine, geo-calculations, tool calling, and session memory.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { TransitSearchService, haversineDistanceKm } from "../src/services/transitSearchService.js";
import { MobiAgent, ApiKeyMissingError, sessionStore } from "../src/services/mobiAgent.js";
import { STOPS, ROUTES } from "../src/data/transitData.js";
import { app } from "../src/server.js";

let testServer;
let testPort;

test.before(async () => {
  process.env.NODE_ENV = "test";
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      testPort = testServer.address().port;
      resolve();
    });
  });
});

test("API: Server responds to health and transit queries", async () => {
  const port = testPort;

  // 1. Check status endpoint
  const statusRes = await fetch(`http://localhost:${port}/api/mobi/status`);
  assert.equal(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.equal(statusData.status, "ok");
  assert.equal(statusData.agent, "MOBI AI Voice Search Agent");
  assert.ok(Array.isArray(statusData.tools));
  assert.equal(statusData.tools.length, 5);

  // 2. Check chat endpoint input validation
  const emptyChatRes = await fetch(`http://localhost:${port}/api/mobi/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "   " })
  });
  assert.equal(emptyChatRes.status, 400);

  // 3. Check direct transit search query endpoint
  const searchRes = await fetch(`http://localhost:${port}/api/mobi/transit/search?q=21G`);
  assert.equal(searchRes.status, 200);
  const searchData = await searchRes.json();
  assert.equal(searchData.success, true);
  assert.equal(searchData.results[0].routeNumber, "21G");
});

test("TransitSearchService: haversineDistanceKm calculates real geographic distances accurately", () => {
  // Chennai Central (13.0827, 80.2755) to T. Nagar (13.0418, 80.2341)
  const dist = haversineDistanceKm(13.0827, 80.2755, 13.0418, 80.2341);
  assert.ok(dist > 5.5 && dist < 7.5, `Expected distance ~6.2km, got ${dist}`);
});

test("TransitSearchService: searchBuses finds buses by destination", () => {
  const result = TransitSearchService.searchBuses({ destination: "Besant Nagar" });
  assert.equal(result.success, true);
  assert.ok(result.count >= 2, "Expected at least 2 routes heading to Besant Nagar (29C, 5E)");
  const routeNumbers = result.results.map((r) => r.routeNumber);
  assert.ok(routeNumbers.includes("29C"));
  assert.ok(routeNumbers.includes("5E"));
});

test("TransitSearchService: searchBuses finds route 21G directly", () => {
  const result = TransitSearchService.searchBuses({ query: "21G" });
  assert.equal(result.success, true);
  assert.equal(result.count, 1);
  assert.equal(result.results[0].routeNumber, "21G");
  assert.equal(result.results[0].origin, "Broadway");
  assert.equal(result.results[0].destination, "Tambaram");
  assert.ok(result.results[0].activeVehiclesOnRoad > 0);
});

test("TransitSearchService: searchBuses returns 0 results for unknown queries (no hallucination)", () => {
  const result = TransitSearchService.searchBuses({ query: "Route 9999XYZ to Moon" });
  assert.equal(result.success, true);
  assert.equal(result.count, 0);
  assert.equal(result.results.length, 0);
});

test("TransitSearchService: getNearbyBusStops calculates real distances and sorts by proximity", () => {
  // Coordinate near Guindy Metro (13.0067, 80.2025)
  const result = TransitSearchService.getNearbyBusStops({
    latitude: 13.0070,
    longitude: 80.2030,
    radiusKm: 5.0
  });

  assert.equal(result.success, true);
  assert.ok(result.stops.length > 0);
  // First stop should be Guindy
  assert.equal(result.stops[0].shortName, "Guindy");
  assert.ok(result.stops[0].distanceMeters < 300, "Distance should be under 300m");
  assert.ok(result.stops[0].routesServing.includes("21G"));
});

test("TransitSearchService: getBusDetails returns full vehicle tracking for active bus", () => {
  const result = TransitSearchService.getBusDetails({ busNumber: "21G" });
  assert.equal(result.success, true);
  assert.equal(result.found, true);
  assert.equal(result.routeNumber, "21G");
  assert.ok(result.stopsSequence.length >= 6);
  assert.ok(result.activeVehicles.length > 0);
  assert.ok(result.activeVehicles[0].speedKmph > 0);
});

test("TransitSearchService: getBusDetails returns found=false for unknown bus", () => {
  const result = TransitSearchService.getBusDetails({ busNumber: "999Z" });
  assert.equal(result.success, false);
  assert.equal(result.found, false);
});

test("TransitSearchService: getLiveBusETA calculates real arrival time to target stop", () => {
  const result = TransitSearchService.getLiveBusETA({
    busNumber: "21G",
    stopName: "Chennai International Airport"
  });

  assert.equal(result.success, true);
  assert.equal(result.routeNumber, "21G");
  assert.equal(result.targetStop, "Chennai International Airport (Tirusulam)");
  assert.ok(result.nextBus !== undefined);
  assert.ok(result.nextBus.estimatedMinutes > 0);
});

test("MobiAgent: executeToolCall executes real function calls", async () => {
  const toolResult = await MobiAgent.executeToolCall("getBusDetails", { busNumber: "21G" });
  assert.equal(toolResult.success, true);
  assert.equal(toolResult.routeNumber, "21G");

  const nearbyResult = await MobiAgent.executeToolCall("getNearbyBusStops", {
    latitude: 13.0418,
    longitude: 80.2341
  });
  assert.equal(nearbyResult.success, true);
  assert.equal(nearbyResult.stops[0].shortName, "T. Nagar");
});

test("MobiAgent: SessionStore maintains multi-turn conversation memory", () => {
  const testSession = sessionStore.getOrCreate("test_session_123");
  assert.equal(testSession.id, "test_session_123");
  assert.deepEqual(testSession.history, []);

  // Add turns
  testSession.history.push({ role: "user", parts: [{ text: "Find buses near me" }] });
  testSession.history.push({ role: "model", parts: [{ text: "I found three buses nearby: 21G, 29C, and 570." }] });

  // Retrieve same session
  const retrieved = sessionStore.get("test_session_123");
  assert.equal(retrieved.history.length, 2);
  assert.equal(retrieved.history[0].parts[0].text, "Find buses near me");

  sessionStore.reset("test_session_123");
  assert.equal(sessionStore.get("test_session_123"), null);
});

test("MobiAgent: Throws ApiKeyMissingError when GEMINI_API_KEY is not configured", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  assert.equal(MobiAgent.isConfigured(), false);
  assert.throws(
    () => {
      MobiAgent.getClient();
    },
    ApiKeyMissingError
  );

  // Restore key
  if (originalKey) {
    process.env.GEMINI_API_KEY = originalKey;
  }
});

// Teardown
test.after(async () => {
  if (testServer) {
    testServer.closeAllConnections?.();
    await new Promise((resolve) => testServer.close(resolve));
  }
});
