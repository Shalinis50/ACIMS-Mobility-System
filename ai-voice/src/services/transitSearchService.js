/**
 * Production Transit Search Service for MOBI AI Voice Search Agent
 * Real geo-distance calculations, route matching, stop proximity, and fleet tracking.
 */

import { STOPS, ROUTES, ACTIVE_FLEET, normalize, findStopByName } from "../data/transitData.js";

/**
 * Calculate great-circle distance between two GPS coordinates using the Haversine formula
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class TransitSearchService {
  /**
   * Search bus routes matching keywords, origin, or destination
   */
  static searchBuses({ query = "", origin = "", destination = "" } = {}) {
    const qClean = (query || "").trim().toLowerCase();
    let origClean = (origin || "").trim().toLowerCase();
    let destClean = (destination || "").trim().toLowerCase();

    // Natural Language fallback if origin/destination were not extracted by LLM parameters
    if (qClean && !origClean && !destClean) {
      const fromToMatch = qClean.match(/from\s+([a-zA-Z0-9\.\s]+?)\s+to\s+([a-zA-Z0-9\.\s]+?)(?:\?|$)/i);
      if (fromToMatch) {
        origClean = fromToMatch[1].trim().toLowerCase();
        destClean = fromToMatch[2].trim().toLowerCase();
      } else {
        const toMatch = qClean.match(/(?:to|towards|for|reach|going to)\s+([a-zA-Z0-9\.\s]+?)(?:\?|$|\s+from)/i);
        if (toMatch) {
          destClean = toMatch[1].trim().toLowerCase();
        }
      }
    }

    const matchedRoutes = ROUTES.filter((route) => {
      // Direct Route Number match (e.g., '21G', '29C')
      if (qClean && normalize(route.routeNumber) === normalize(qClean)) {
        return true;
      }
      if (qClean && (qClean.includes(route.routeNumber.toLowerCase()) || route.routeNumber.toLowerCase().includes(qClean))) {
        return true;
      }

      // Check origin and destination match
      let originMatches = false;
      let destMatches = false;

      if (origClean) {
        const origStop = findStopByName(origClean);
        if (origStop && route.stops.includes(origStop.id)) originMatches = true;
        if (route.origin.toLowerCase().includes(origClean)) originMatches = true;
        if (route.via.toLowerCase().includes(origClean)) originMatches = true;
      } else {
        originMatches = true;
      }

      if (destClean) {
        const destStop = findStopByName(destClean);
        if (destStop && route.stops.includes(destStop.id)) destMatches = true;
        if (route.destination.toLowerCase().includes(destClean)) destMatches = true;
        if (route.via.toLowerCase().includes(destClean)) destMatches = true;
      } else {
        destMatches = true;
      }

      if (origClean || destClean) {
        return originMatches && destMatches;
      }

      // General query search against route name, terminals, via, stops
      if (qClean) {
        if (route.name.toLowerCase().includes(qClean)) return true;
        if (route.via.toLowerCase().includes(qClean)) return true;
        if (route.destination.toLowerCase().includes(qClean)) return true;
        if (route.origin.toLowerCase().includes(qClean)) return true;

        // Check if query matches any stop along this route
        const matchedStop = findStopByName(qClean);
        if (matchedStop && route.stops.includes(matchedStop.id)) return true;
      }

      return false;
    });

    // Enrich matched routes with active vehicle status
    const enrichedResults = matchedRoutes.map((route) => {
      const activeVehicles = ACTIVE_FLEET.filter((v) => normalize(v.routeNumber) === normalize(route.routeNumber));
      const stopNames = route.stops.map((sid) => {
        const st = STOPS.find((s) => s.id === sid);
        return st ? st.name : sid;
      });

      return {
        routeNumber: route.routeNumber,
        name: route.name,
        origin: route.origin,
        destination: route.destination,
        via: route.via,
        stops: stopNames,
        frequencyMinutes: route.frequencyMinutes,
        operatingHours: route.operatingHours,
        fareRange: route.fareRange,
        type: route.type,
        wheelchairAccessible: route.wheelchairAccessible,
        activeVehiclesOnRoad: activeVehicles.length,
        liveVehicles: activeVehicles.map((v) => ({
          vehicleId: v.vehicleId,
          direction: v.direction,
          currentLocation: v.lastReportedLocation.stopName,
          nextStop: v.nextStopName,
          etaMinutes: v.etaMinutesToNextStop,
          occupancy: v.occupancyStatus,
          isAC: v.acAvailable
        }))
      };
    });

    return {
      success: true,
      count: enrichedResults.length,
      results: enrichedResults
    };
  }

  /**
   * Find bus stops near user coordinates or a named landmark
   */
  static getNearbyBusStops({ latitude, longitude, radiusKm = 3.0, stopName = "" } = {}) {
    let refLat = latitude;
    let refLng = longitude;
    let referenceLabel = "your current location";

    // If stopName is provided instead of coordinates, resolve it
    if ((!refLat || !refLng) && stopName) {
      const resolved = findStopByName(stopName);
      if (resolved) {
        refLat = resolved.lat;
        refLng = resolved.lng;
        referenceLabel = resolved.name;
      }
    }

    // Default reference if coordinates are missing (Chennai City Centre: T. Nagar)
    if (!refLat || !refLng) {
      refLat = 13.0418;
      refLng = 80.2341;
      referenceLabel = "T. Nagar (Default City Center)";
    }

    const stopsWithDistance = STOPS.map((stop) => {
      const distKm = haversineDistanceKm(refLat, refLng, stop.lat, stop.lng);
      const distMeters = Math.round(distKm * 1000);

      // Find routes serving this stop
      const servingRoutes = ROUTES.filter((r) => r.stops.includes(stop.id)).map((r) => r.routeNumber);

      return {
        stopId: stop.id,
        stopName: stop.name,
        shortName: stop.shortName,
        zone: stop.zone,
        distanceKm: Number(distKm.toFixed(2)),
        distanceMeters: distMeters,
        distanceFormatted: distMeters < 1000 ? `${distMeters} meters away` : `${distKm.toFixed(1)} km away`,
        amenities: stop.amenities,
        nearbyLandmarks: stop.nearbyLandmarks,
        routesServing: servingRoutes
      };
    });

    // Sort by proximity
    stopsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    // Filter within radius (or at least return top 3 closest)
    let filtered = stopsWithDistance.filter((s) => s.distanceKm <= radiusKm);
    if (filtered.length === 0) {
      filtered = stopsWithDistance.slice(0, 3);
    }

    return {
      success: true,
      referenceLocation: referenceLabel,
      coordinates: { latitude: refLat, longitude: refLng },
      count: filtered.length,
      stops: filtered
    };
  }

  /**
   * Get detailed status and real-time fleet positions for a specific bus number
   */
  static getBusDetails({ busNumber } = {}) {
    if (!busNumber) {
      return { success: false, error: "Please specify a bus number (e.g., '21G', '29C')." };
    }

    const bNorm = normalize(busNumber);
    const route = ROUTES.find((r) => normalize(r.routeNumber) === bNorm);

    if (!route) {
      return {
        success: false,
        found: false,
        busNumber,
        message: `Bus '${busNumber}' was not found in the active transit database. Valid routes include: ${ROUTES.map((r) => r.routeNumber).join(", ")}.`
      };
    }

    const activeVehicles = ACTIVE_FLEET.filter((v) => normalize(v.routeNumber) === bNorm);
    const stopDetails = route.stops.map((sid) => {
      const s = STOPS.find((st) => st.id === sid);
      return s ? { id: s.id, name: s.name, shortName: s.shortName, zone: s.zone } : { id: sid, name: sid };
    });

    return {
      success: true,
      found: true,
      routeNumber: route.routeNumber,
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      via: route.via,
      stopsSequence: stopDetails,
      operatingHours: route.operatingHours,
      frequencyMinutes: route.frequencyMinutes,
      fareRange: route.fareRange,
      type: route.type,
      wheelchairAccessible: route.wheelchairAccessible,
      activeVehiclesCount: activeVehicles.length,
      activeVehicles: activeVehicles.map((v) => ({
        vehicleId: v.vehicleId,
        status: v.currentStatus,
        direction: v.direction,
        currentLocation: v.lastReportedLocation.stopName,
        currentCoordinates: { lat: v.lastReportedLocation.lat, lng: v.lastReportedLocation.lng },
        speedKmph: v.speedKmph,
        nextStop: v.nextStopName,
        etaMinutesToNextStop: v.etaMinutesToNextStop,
        occupancy: v.occupancyStatus,
        acAvailable: v.acAvailable
      }))
    };
  }

  /**
   * Get real-time ETA for a bus approaching a specific target stop
   */
  static getLiveBusETA({ busNumber, stopName } = {}) {
    if (!busNumber) {
      return { success: false, error: "Please provide a bus route number." };
    }

    const bNorm = normalize(busNumber);
    const route = ROUTES.find((r) => normalize(r.routeNumber) === bNorm);
    if (!route) {
      return { success: false, message: `Bus '${busNumber}' not found.` };
    }

    let targetStop = null;
    if (stopName) {
      targetStop = findStopByName(stopName);
    }

    const activeVehicles = ACTIVE_FLEET.filter((v) => normalize(v.routeNumber) === bNorm);

    if (activeVehicles.length === 0) {
      return {
        success: true,
        routeNumber: route.routeNumber,
        message: `No active GPS-tracked vehicles currently on the road for bus ${route.routeNumber}. Scheduled frequency is every ${route.frequencyMinutes} minutes.`
      };
    }

    if (!targetStop) {
      // Return ETAs for all active vehicles to their immediate next stops
      return {
        success: true,
        routeNumber: route.routeNumber,
        activeVehicles: activeVehicles.map((v) => ({
          vehicleId: v.vehicleId,
          direction: v.direction,
          currentLocation: v.lastReportedLocation.stopName,
          nextStop: v.nextStopName,
          etaMinutes: v.etaMinutesToNextStop,
          speedKmph: v.speedKmph,
          occupancy: v.occupancyStatus
        }))
      };
    }

    // Calculate distance and ETA to specified target stop
    const estimates = activeVehicles.map((v) => {
      const distKm = haversineDistanceKm(
        v.lastReportedLocation.lat,
        v.lastReportedLocation.lng,
        targetStop.lat,
        targetStop.lng
      );
      // City traffic average speed 20 km/h with 2 mins dwell per stop
      const travelMinutes = Math.max(1, Math.round((distKm / 20) * 60));

      return {
        vehicleId: v.vehicleId,
        direction: v.direction,
        currentlyNear: v.lastReportedLocation.stopName,
        targetStop: targetStop.name,
        distanceKm: Number(distKm.toFixed(1)),
        estimatedMinutes: travelMinutes,
        occupancy: v.occupancyStatus,
        acAvailable: v.acAvailable
      };
    });

    // Sort by closest ETA
    estimates.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);

    return {
      success: true,
      routeNumber: route.routeNumber,
      targetStop: targetStop.name,
      nextBus: estimates[0],
      allActiveBuses: estimates
    };
  }

  /**
   * Get full route sequence, schedule and fare
   */
  static getRouteInformation({ routeNumber } = {}) {
    return this.getBusDetails({ busNumber: routeNumber });
  }
}
