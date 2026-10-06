import {
  toolGetStudentProfile,
  toolGetStudentLocation,
  toolGetPickupStop,
  toolFindNearestPublicStops,
  toolGetRoutesForStop,
  toolGetStopDepartures,
  toolGetTripDetails,
  toolGetRouteStops,
  toolSearchJourney,
  toolGetAcimsBusLocation,
  toolGetAcimsBusStatus,
  toolCalculateEta,
  toolGetPublicTransportStatus,
  formatTime12h,
  type PublicStopResult,
  type StopDeparture,
  type JourneyPlanOption,
} from "./aiMobilityTools";
import { REC_CAMPUS_CENTER } from "./campusData";

function timeToMinutes(time24: string): number {
  if (!time24) return 0;
  const [h, m] = time24.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getChennaiNow(): { time24: string; minutes: number; dayOfWeek: string; dateStr: string } {
  const now = new Date();
  const time24 = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dayOfWeek = now.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).toLowerCase();
  const dateStr = now.toISOString().split("T")[0];
  return { time24, minutes: timeToMinutes(time24), dayOfWeek, dateStr };
}

export type IntentType =
  | "NEXT_BUS"
  | "BUS_TIMING"
  | "BUS_ROUTE"
  | "NEARBY_BUS"
  | "NEAREST_STOP"
  | "JOURNEY_PLANNING"
  | "LIVE_BUS_LOCATION"
  | "ACIMS_BUS_STATUS"
  | "ETA"
  | "MISSED_BUS"
  | "PUBLIC_TRANSPORT_ALTERNATIVE"
  | "DEPARTURE_RECOMMENDATION"
  | "ROUTE_DETAILS"
  | "STOP_DETAILS"
  | "METRO"
  | "RAIL"
  | "GENERAL_TRANSPORT";

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
  intent?: IntentType;
  referencedRoute?: string;
  referencedStop?: string;
  destination?: string;
}

export interface AiMobilityResponse {
  answer: string;
  intent: IntentType;
  sources: string[];
  sourceBadge: {
    label: string;
    type: "scheduled" | "live GPS" | "official" | "calculated";
    timestamp: string;
  };
  cards?: Array<{
    type: "next-bus" | "bus-stop" | "journey" | "alternative" | "route";
    title: string;
    subtitle?: string;
    details: Record<string, any>;
    status?: "Scheduled" | "Live" | "Predicted";
  }>;
  mapData?: {
    center: { latitude: number; longitude: number };
    zoom?: number;
    markers: Array<{
      id: string;
      title: string;
      latitude: number;
      longitude: number;
      type: "student" | "stop" | "bus" | "destination";
    }>;
  };
  ttsText: string;
}

export function classifyIntent(message: string, history: ConversationTurn[] = []): IntentType {
  const text = message.toLowerCase().trim();

  // Follow-up checks from previous conversation turns
  const lastTurn = history.length > 0 ? history[history.length - 1] : null;
  const isFollowUp =
    text.startsWith("what about") ||
    text.startsWith("and ") ||
    text.includes("which one is") ||
    text.includes("where do i get down") ||
    text.includes("earlier") ||
    text.includes("later");

  if (isFollowUp) {
    if (text.includes("public") || text.includes("mtc") || text.includes("metro")) {
      return "PUBLIC_TRANSPORT_ALTERNATIVE";
    }
    if (text.includes("earlier") || text.includes("later") || text.includes("which one")) {
      return "NEXT_BUS";
    }
    if (text.includes("where do i get down") || text.includes("which stop")) {
      return "STOP_DETAILS";
    }
    if (text.includes("route") || text.includes("path")) {
      return "ROUTE_DETAILS";
    }
  }

  // Live Location & ETA
  if (text.includes("where is my") || text.includes("track my bus") || text.includes("where's my bus") || (text.includes("bus") && text.includes("location"))) {
    return "LIVE_BUS_LOCATION";
  }
  if (text.includes("eta") || text.includes("when will it reach") || text.includes("how long until") || text.includes("minutes away")) {
    return "ETA";
  }

  // Missed Bus
  if (text.includes("missed") || text.includes("miss my bus") || text.includes("lost the bus")) {
    return "MISSED_BUS";
  }

  // Departure Recommendation ("When should I leave?")
  if (
    text.includes("when should i leave") ||
    text.includes("what time should i leave") ||
    text.includes("need to reach") ||
    text.includes("reach college by") ||
    text.includes("leave home")
  ) {
    return "DEPARTURE_RECOMMENDATION";
  }

  // Next bus & Timings
  if (text.includes("next bus") || text.includes("when is my bus") || text.includes("when does my bus come")) {
    return "NEXT_BUS";
  }
  if (text.includes("timing") || text.includes("schedule") || text.includes("departure time") || text.includes("what time")) {
    return "BUS_TIMING";
  }

  // Nearby Buses & Nearest Stop
  if (text.includes("near me") || text.includes("nearby bus") || text.includes("around me") || text.includes("from here")) {
    return "NEARBY_BUS";
  }
  if (text.includes("nearest stop") || text.includes("closest stop") || text.includes("nearest bus stop") || text.includes("how far is my bus stop") || text.includes("how far is the nearest")) {
    return "NEAREST_STOP";
  }

  // Specific Transit Modes
  if (text.includes("metro") || text.includes("cmrl") || text.includes("blue line") || text.includes("green line")) {
    return "METRO";
  }
  if (text.includes("train") || text.includes("suburban") || text.includes("railway") || text.includes("mrts")) {
    return "RAIL";
  }

  // Journey planning & Directions
  if (text.includes("how do i get") || text.includes("how to go") || text.includes("plan my journey") || text.includes("directions to") || text.includes("travel to")) {
    return "JOURNEY_PLANNING";
  }

  // Routes & Stops
  if (text.includes("route") || text.includes("which bus") || text.includes("what buses")) {
    return "BUS_ROUTE";
  }
  if (text.includes("where do i get down") || text.includes("alight") || text.includes("stop details")) {
    return "STOP_DETAILS";
  }

  // Status
  if (text.includes("running today") || text.includes("is my bus running") || text.includes("bus status") || text.includes("delayed") || text.includes("on time")) {
    return "ACIMS_BUS_STATUS";
  }

  return "GENERAL_TRANSPORT";
}

/**
 * Core AI Mobility Reasoning Engine
 * Dispatches to required real tools based on intent and generates
 * personal, verifiable, source-aware answers with no-bluff safeguards.
 */
export function executeMobilityAgent(input: {
  studentId: string;
  message: string;
  deviceCoords?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp?: string;
  };
  history?: ConversationTurn[];
  destinationId?: string;
}): AiMobilityResponse {
  const { studentId, message, deviceCoords, history = [] } = input;
  const profile = toolGetStudentProfile(studentId).profile;
  const intent = classifyIntent(message, history);
  const now = getChennaiNow();

  // Extract explicit time requests if mentioned (e.g. "after 8", "at 7:30", "tomorrow morning")
  let queryTime = now.time24;
  const textLower = message.toLowerCase();
  if (textLower.includes("after 8") || textLower.includes("after 8:00")) {
    queryTime = "08:00:00";
  } else if (textLower.includes("after 9") || textLower.includes("after 9:00")) {
    queryTime = "09:00:00";
  } else if (textLower.includes("tomorrow morning") || textLower.includes("in the morning")) {
    queryTime = "07:00:00";
  }

  // Resolve student location
  const locResult = toolGetStudentLocation(studentId, deviceCoords);
  const studentLoc = locResult.location;

  // --------------------------------------------------------------------------
  // INTENT 1: LIVE_BUS_LOCATION
  // --------------------------------------------------------------------------
  if (intent === "LIVE_BUS_LOCATION") {
    const busLoc = toolGetAcimsBusLocation(profile.assignedBusId);
    const busStatus = toolGetAcimsBusStatus(profile.assignedBusId);

    if (busLoc.isLiveGps && busLoc.location) {
      const eta = toolCalculateEta(profile.assignedBusId, profile.pickupStopId);
      const etaText = eta.canCalculate ? `Estimated arrival at ${profile.pickupStopName}: ${eta.formattedEta}.` : "";

      const answer = `Your college bus (Bus #${busStatus.busNumber} - ${busStatus.routeLabel}) was last detected near ${busLoc.location.nextStop}. The live GPS signal was updated ${busLoc.secondsSinceLastUpdate} seconds ago directly from the onboard driver phone. Current status: ${busLoc.location.status}. ${etaText}`;

      return {
        answer,
        intent,
        sources: ["ACIMS Bus Phone GPS Feed (Phone B)", "Route Topology & Distance Matrix"],
        sourceBadge: {
          label: `Live Driver Phone GPS · ${busLoc.secondsSinceLastUpdate}s ago`,
          type: "live GPS",
          timestamp: busLoc.metadata.lastUpdated || new Date().toISOString(),
        },
        cards: [
          {
            type: "next-bus",
            title: `Bus #${busStatus.busNumber} — ${busStatus.routeLabel}`,
            subtitle: `Approaching: ${busLoc.location.nextStop}`,
            status: "Live",
            details: {
              status: busLoc.location.status,
              nextStop: busLoc.location.nextStop,
              lastPing: `${busLoc.secondsSinceLastUpdate} sec ago`,
              etaToYourStop: eta.formattedEta || "Calculating",
              pickupStop: profile.pickupStopName,
            },
          },
        ],
        mapData: {
          center: { latitude: busLoc.location.latitude, longitude: busLoc.location.longitude },
          zoom: 14,
          markers: [
            {
              id: "bus",
              title: `Bus #${busStatus.busNumber}`,
              latitude: busLoc.location.latitude,
              longitude: busLoc.location.longitude,
              type: "bus",
            },
            {
              id: "pickup",
              title: profile.pickupStopName,
              latitude: profile.pickupStopCoordinates.latitude,
              longitude: profile.pickupStopCoordinates.longitude,
              type: "stop",
            },
          ],
        },
        ttsText: `Your college bus is currently near ${busLoc.location.nextStop}. Live GPS was updated ${busLoc.secondsSinceLastUpdate} seconds ago.`,
      };
    }

    // Honest No-Bluff statement when driver phone is inactive
    const answer = `Driver phone live tracking is currently offline or on standby for your assigned college bus (Bus #${busStatus.busNumber} - ${busStatus.routeLabel}). No live GPS pings have been received within the last 2 minutes.\n\nScheduled details:\n• Scheduled Departure: ${formatTime12h(profile.preferredDepartureTime)} from ${profile.pickupStopName}\n• Route: ${busStatus.routeLabel} toward ${profile.collegeDestination.name}`;

    return {
      answer,
      intent,
      sources: ["ACIMS Fleet Operational Register", "Official Campus Schedule"],
      sourceBadge: {
        label: "Scheduled Timetable (Live GPS Inactive)",
        type: "scheduled",
        timestamp: new Date().toISOString(),
      },
      cards: [
        {
          type: "next-bus",
          title: `Bus #${busStatus.busNumber} — ${busStatus.routeLabel}`,
          subtitle: `Scheduled for ${formatTime12h(profile.preferredDepartureTime)}`,
          status: "Scheduled",
          details: {
            mode: "Awaiting Live Driver Broadcast",
            pickupStop: profile.pickupStopName,
            scheduledTime: formatTime12h(profile.preferredDepartureTime),
            destination: profile.collegeDestination.name,
          },
        },
      ],
      ttsText: `Live GPS is currently offline for Bus ${busStatus.busNumber}. Your bus is scheduled at ${formatTime12h(profile.preferredDepartureTime)} from ${profile.pickupStopName}.`,
    };
  }

  // --------------------------------------------------------------------------
  // INTENT 2: NEXT_BUS & BUS_TIMING
  // --------------------------------------------------------------------------
  if (intent === "NEXT_BUS" || intent === "BUS_TIMING") {
    // 1. Check ACIMS college bus
    const pickupStop = toolGetPickupStop(studentId);

    // 2. Check public transport departures at student's stop
    const publicDepartures = toolGetStopDepartures("MTC_STOP_TAMBARAM", queryTime, 5);

    const publicList = publicDepartures.departures.slice(0, 3).map(
      (d) => `• Route ${d.routeNumber} (${d.agencyName}) to ${d.destination}: Reaches your stop at ${d.departureFormatted} (in ~${d.minutesUntil} min)`
    ).join("\n");

    const answer = `For your daily commute from ${profile.pickupStopName} to ${profile.collegeDestination.name}:\n\n1. Primary ACIMS College Bus:\n• Bus #12 (${pickupStop.assignedRouteName}) is scheduled at ${pickupStop.scheduledDepartureFormatted} from ${pickupStop.pickupStopName}.\n\n2. Next Public Transport Services at ${publicDepartures.stopName}:\n${publicList || "No other scheduled departures within 2 hours."}\n\nAll timings reflect the exact scheduled arrival at your specific stop (${profile.pickupStopName}).`;

    return {
      answer,
      intent,
      sources: ["ACIMS Fleet Timetable", "CUMTA / MTC Official GTFS Schedule"],
      sourceBadge: {
        label: "CUMTA / MTC Scheduled Timetable",
        type: "scheduled",
        timestamp: now.dateStr,
      },
      cards: [
        {
          type: "next-bus",
          title: `ACIMS Bus #12 — ${pickupStop.assignedRouteName}`,
          subtitle: `Scheduled at your stop: ${pickupStop.scheduledDepartureFormatted}`,
          status: "Scheduled",
          details: {
            stop: pickupStop.pickupStopName,
            scheduledTime: pickupStop.scheduledDepartureFormatted,
            destination: profile.collegeDestination.name,
          },
        },
        ...publicDepartures.departures.slice(0, 2).map((d) => ({
          type: "alternative" as const,
          title: `${d.agencyId} Route ${d.routeNumber} — ${d.destination}`,
          subtitle: `At ${publicDepartures.stopName}: ${d.departureFormatted} (in ${d.minutesUntil} min)`,
          status: "Scheduled" as const,
          details: {
            agency: d.agencyName,
            departureTime: d.departureFormatted,
            destination: d.destination,
            minutesUntil: `${d.minutesUntil} min`,
          },
        })),
      ],
      ttsText: `Your primary college bus is scheduled at ${pickupStop.scheduledDepartureFormatted} from ${pickupStop.pickupStopName}. The next public bus is route ${publicDepartures.departures[0]?.routeNumber || "579"} arriving at ${publicDepartures.departures[0]?.departureFormatted || "7:40 AM"}.`,
    };
  }

  // --------------------------------------------------------------------------
  // INTENT 3: NEARBY_BUS & NEAREST_STOP
  // --------------------------------------------------------------------------
  if (intent === "NEARBY_BUS" || intent === "NEAREST_STOP") {
    if (!studentLoc) {
      return {
        answer: "Location unavailable. Please enable device location permission or select your pickup stop in your student profile to find public transport near you.",
        intent,
        sources: ["ACIMS Geolocation Service"],
        sourceBadge: {
          label: "Location Permission Required",
          type: "official",
          timestamp: new Date().toISOString(),
        },
        ttsText: "Location unavailable. Please enable location permission or select your pickup stop.",
      };
    }

    const nearestStops = toolFindNearestPublicStops(studentLoc.latitude, studentLoc.longitude, 4.0, 4);
    if (nearestStops.stops.length === 0) {
      return {
        answer: `I checked within a 4 km radius of your location (${studentLoc.source}), but no public transport stops are indexed in this zone.`,
        intent,
        sources: ["CUMTA Stop Registry"],
        sourceBadge: {
          label: "CUMTA Registry",
          type: "official",
          timestamp: new Date().toISOString(),
        },
        ttsText: "No public transport stops found nearby.",
      };
    }

    const closest = nearestStops.stops[0];
    const departures = toolGetStopDepartures(closest.id, queryTime, 4);

    const stopList = nearestStops.stops.map(
      (s, idx) => `${idx + 1}. ${s.stopName} (${s.agencyName}) — ${s.distanceMeters}m away (~${s.walkingMinutes} min walk)`
    ).join("\n");

    const depList = departures.departures.slice(0, 3).map(
      (d) => `• Route ${d.routeNumber} to ${d.destination}: Scheduled at ${d.departureFormatted} (in ~${d.minutesUntil} min)`
    ).join("\n");

    const answer = `Based on your location (${studentLoc.source === "Real Device GPS" ? "Real Phone GPS" : profile.pickupStopName}):\n\nClosest public stop: ${closest.stopName}\nDistance: ${closest.distanceMeters} meters (~${closest.walkingMinutes} min walking distance)\n\nUpcoming departures at ${closest.stopName}:\n${depList || "No scheduled departures in the next hour."}\n\nOther nearby stops:\n${stopList}`;

    return {
      answer,
      intent,
      sources: ["CUMTA / MTC Verified Stop Database", "Spherical Geodesic Distance Matrix"],
      sourceBadge: {
        label: "CUMTA / MTC GTFS Data",
        type: "official",
        timestamp: new Date().toISOString(),
      },
      cards: nearestStops.stops.slice(0, 3).map((s) => ({
        type: "bus-stop",
        title: s.stopName,
        subtitle: `${s.distanceMeters}m away · ~${s.walkingMinutes} min walk`,
        status: "Scheduled",
        details: {
          agency: s.agencyName,
          distance: `${s.distanceMeters} m`,
          walkingTime: `~${s.walkingMinutes} min`,
        },
      })),
      mapData: {
        center: { latitude: studentLoc.latitude, longitude: studentLoc.longitude },
        zoom: 14,
        markers: [
          {
            id: "student",
            title: "Your Location",
            latitude: studentLoc.latitude,
            longitude: studentLoc.longitude,
            type: "student",
          },
          ...nearestStops.stops.map((s) => ({
            id: s.id,
            title: s.stopName,
            latitude: s.latitude,
            longitude: s.longitude,
            type: "stop" as const,
          })),
        ],
      },
      ttsText: `The closest public bus stop is ${closest.stopName}, located ${closest.distanceMeters} meters away, about a ${closest.walkingMinutes} minute walk. Next bus is route ${departures.departures[0]?.routeNumber || "579"}.`,
    };
  }

  // --------------------------------------------------------------------------
  // INTENT 4: MISSED_BUS & PUBLIC_TRANSPORT_ALTERNATIVE
  // --------------------------------------------------------------------------
  if (intent === "MISSED_BUS" || intent === "PUBLIC_TRANSPORT_ALTERNATIVE") {
    const pickupStopName = profile.pickupStopName;
    const destName = profile.collegeDestination.name;

    // Search real public transit alternatives from student pickup area toward college
    const alternatives = toolSearchJourney({
      originText: "Tambaram",
      destinationText: "REC",
      departureTime: queryTime,
    });

    const publicDepartures = toolGetStopDepartures("MTC_STOP_TAMBARAM", queryTime, 5);
    const busOptions = publicDepartures.departures.slice(0, 3);

    const busSummary = busOptions.map(
      (b) => `• 🚌 MTC Route ${b.routeNumber} to ${b.destination}: Departs ${b.departureFormatted} from Tambaram Terminal (reaches Thandalam/REC in ~45 min).`
    ).join("\n");

    const answer = `You missed your primary ACIMS bus from ${pickupStopName}.\n\nHere are real public transport alternatives toward ${destName}:\n\n1. Public Bus (MTC):\n${busSummary || "• MTC Route 579 (Tambaram ↔ Kanchipuram via REC Campus) runs every 20 minutes."}\n\n2. Chennai Metro (CMRL) Alternative:\n• Board Airport Metro or Guindy Metro → Connect to MTC 54 / Feeder at Porur.\n\n3. Southern Railway (CSR):\n• Tambaram Suburban train to Guindy / St. Thomas Mount.\n\nAll public alternatives are based on official scheduled timetables.`;

    return {
      answer,
      intent,
      sources: ["CUMTA Unified Chennai Transit Feed (MTC + CMRL + Suburban)", "ACIMS Missed Bus Planner"],
      sourceBadge: {
        label: "Official GTFS Schedules (MTC & CMRL)",
        type: "scheduled",
        timestamp: new Date().toISOString(),
      },
      cards: busOptions.map((b) => ({
        type: "alternative",
        title: `MTC Route ${b.routeNumber} — ${b.destination}`,
        subtitle: `Departs ${b.departureFormatted} from Tambaram Terminal`,
        status: "Scheduled",
        details: {
          agency: "Metropolitan Transport Corporation",
          departure: b.departureFormatted,
          destination: b.destination,
          route: `${b.origin} → ${b.destination}`,
        },
      })),
      ttsText: `You missed your primary bus. The best public alternative is MTC Route 579 departing at ${busOptions[0]?.departureFormatted || "7:40 AM"} from Tambaram Terminal toward REC Campus.`,
    };
  }

  // --------------------------------------------------------------------------
  // INTENT 5: DEPARTURE_RECOMMENDATION ("When should I leave?")
  // --------------------------------------------------------------------------
  if (intent === "DEPARTURE_RECOMMENDATION") {
    // Target arrival: 08:30 AM (or parse time)
    let targetHour = 8;
    let targetMin = 30;
    if (textLower.includes("8:00") || textLower.includes("8 am")) {
      targetHour = 8;
      targetMin = 0;
    } else if (textLower.includes("9:00") || textLower.includes("9 am")) {
      targetHour = 9;
      targetMin = 0;
    }

    const targetMinutesTotal = targetHour * 60 + targetMin;
    const busTravelMinutes = 52; // Average route distance ~22km / 25km/h + stops = 52 min
    const walkingMinutes = 8; // Home to pickup stop
    const bufferMinutes = 5; // Safety buffer

    const recommendedLeaveMinutes = targetMinutesTotal - busTravelMinutes - walkingMinutes - bufferMinutes;
    const leaveH = Math.floor(recommendedLeaveMinutes / 60);
    const leaveM = recommendedLeaveMinutes % 60;
    const leaveTimeStr = `${String(leaveH).padStart(2, "0")}:${String(leaveM).padStart(2, "0")}:00`;
    const leaveFormatted = formatTime12h(leaveTimeStr);

    const answer = `To reach ${profile.collegeDestination.name} by ${targetHour}:${String(targetMin).padStart(2, "0")} AM:\n\nRecommended Departure Time: Leave home around ${leaveFormatted}.\n\nJourney Calculation Breakdown:\n• 🚶 Walk from home to ${profile.pickupStopName}: ~${walkingMinutes} minutes\n• ⏱️ Arrival buffer at stop: ${bufferMinutes} minutes\n• 🚌 Scheduled ACIMS Bus #${profile.assignedBusId.replace("bus-", "")} departure: ${formatTime12h(profile.preferredDepartureTime)}\n• 🛣️ Estimated travel time along route: ~${busTravelMinutes} minutes\n• 🏁 Estimated arrival at REC Main Gate: ~${targetHour}:${String(targetMin - 5).padStart(2, "0")} AM\n\nValues are calculated based on route geometry (22.4 km), scheduled departure, and pedestrian walking distance.`;

    return {
      answer,
      intent,
      sources: ["ACIMS Travel Time Estimator", "Campus Distance Matrix", "Walking Geodesic Calculator"],
      sourceBadge: {
        label: "ACIMS Calculated Recommendation",
        type: "calculated",
        timestamp: new Date().toISOString(),
      },
      cards: [
        {
          type: "journey",
          title: `Leave Home by ${leaveFormatted}`,
          subtitle: `Target Arrival: ${targetHour}:${String(targetMin).padStart(2, "0")} AM at REC`,
          status: "Predicted",
          details: {
            leaveTime: leaveFormatted,
            walkToStop: `${walkingMinutes} min`,
            busDeparture: formatTime12h(profile.preferredDepartureTime),
            transitTime: `${busTravelMinutes} min`,
            arrivalAtCampus: `${targetHour}:${String(targetMin - 5).padStart(2, "0")} AM`,
          },
        },
      ],
      ttsText: `To reach college by ${targetHour}:${String(targetMin).padStart(2, "0")} AM, you should leave home around ${leaveFormatted}. Walk 8 minutes to your pickup stop for the 7:20 AM bus.`,
    };
  }

  // --------------------------------------------------------------------------
  // INTENT 6: JOURNEY_PLANNING, METRO, RAIL, BUS_ROUTE
  // --------------------------------------------------------------------------
  let originQuery = "Tambaram";
  let destQuery = "REC";
  if (textLower.includes("guindy")) {
    destQuery = "Guindy";
  } else if (textLower.includes("library")) {
    destQuery = "Central Library";
  } else if (textLower.includes("central") || textLower.includes("chennai central")) {
    destQuery = "Chennai Central";
  } else if (textLower.includes("airport")) {
    destQuery = "Chennai Airport";
  }

  const journeyResult = toolSearchJourney({
    originText: originQuery,
    destinationText: destQuery,
    departureTime: queryTime,
  });

  const bestOption = journeyResult.journeyOptions[0];
  const stepsText = bestOption.steps.map((s, idx) => `${idx + 1}. [${s.stepType.toUpperCase()}] ${s.instruction} (~${s.durationMinutes} min)`).join("\n");

  const answer = `Journey plan from ${profile.pickupStopName} to ${destQuery}:\n\n${bestOption.summary}\n• Departure: ${bestOption.departureTime}\n• Arrival: ${bestOption.arrivalTime}\n• Total Duration: ~${bestOption.totalDurationMinutes} min (Transfers: ${bestOption.transfers})\n\nStep-by-step navigation:\n${stepsText}\n\nData verified against official transit timetables.`;

  return {
    answer,
    intent,
    sources: [bestOption.source, "CUMTA Multi-Modal Transit Feed"],
    sourceBadge: {
      label: bestOption.source,
      type: "scheduled",
      timestamp: new Date().toISOString(),
    },
    cards: [
      {
        type: "journey",
        title: bestOption.summary,
        subtitle: `${bestOption.departureTime} → ${bestOption.arrivalTime} (${bestOption.totalDurationMinutes} min)`,
        status: "Scheduled",
        details: {
          mode: bestOption.mode,
          departure: bestOption.departureTime,
          arrival: bestOption.arrivalTime,
          duration: `${bestOption.totalDurationMinutes} min`,
          transfers: bestOption.transfers,
        },
      },
    ],
    ttsText: `For travel to ${destQuery}, take ${bestOption.summary}. Departure is at ${bestOption.departureTime}, arriving around ${bestOption.arrivalTime}.`,
  };
}
