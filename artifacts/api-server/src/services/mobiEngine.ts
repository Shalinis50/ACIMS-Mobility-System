import {
  changePickupPoint,
  findCampusLocation,
  formatAge,
  getAvailableShifts,
  getCampusRoute,
  getMissedBusAlternatives,
  getMTCOptions,
  getMyActiveTrip,
  getMyBus,
  getMyBusLocation,
  getMyDelay,
  getMyETA,
  getMyPickupPoint,
  getMyShift,
  getNearestCampusBusStop,
  getNearestPickupPoint,
  getNotifications,
  getPickupPoints,
  getStudentDisplayName,
  hasLiveDeviceGps,
  type DeviceCoords,
} from "./mobiTools.ts";
import { logMobiQuery } from "./mobiAudit.ts";
import { MTC_SOURCE_LABEL } from "./mtc/mtcSchema.ts";

export type MobiIntent =
  | "MY_BUS_LOCATION"
  | "MY_ETA"
  | "MY_DELAY"
  | "MY_PICKUP"
  | "CHANGE_PICKUP"
  | "MY_SHIFT"
  | "MISSED_BUS"
  | "NEAREST_PICKUP"
  | "NEAREST_CAMPUS_STOP"
  | "CAMPUS_LOCATION"
  | "CAMPUS_NAVIGATION"
  | "MTC"
  | "NOTIFICATIONS"
  | "CONVERSATION"
  | "OUT_OF_SCOPE";

export type MobiHistoryTurn = { role: "user" | "assistant"; text: string; intent?: string };

export type MobiConfirmAction = {
  action: "CHANGE_PICKUP";
  pickupPointId?: string;
  confirmed?: boolean;
};

export type MobiResponse = {
  answer: string;
  ttsText: string;
  intent: MobiIntent;
  sources: string[];
  sourceBadge: {
    label: string;
    type: "scheduled" | "live GPS" | "official" | "calculated";
    timestamp: string;
  };
  cards?: Array<{
    type: string;
    title: string;
    subtitle?: string;
    status?: "Scheduled" | "Live" | "Predicted";
    details: Record<string, unknown>;
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
  followUps?: string[];
  actionPrompt?: {
    type: "CHANGE_PICKUP";
    currentName: string | null;
    options: Array<{ id: string; name: string }>;
  };
  toolsCalled: string[];
};

const MOBI_SCOPE =
  /\b(bus|buses|mtc|metro|stop|eta|delay|gps|pickup|shift|schedule|timing|missed|transport|campus|commute|shuttle|driver|mobi|acims|walk|direction|arriv|depart|library|auditorium|canteen|hostel|gate|block|route|navigation|notification|alert)\b/i;

const OFF_TOPIC =
  /\b(homework|assignment|essay|exam\s+question|python|javascript|recipe|cricket|ipl|movie|netflix|joke|crypto|bitcoin|politics|medical\s+advice)\b/i;

function officialBadge(label: string, type: MobiResponse["sourceBadge"]["type"] = "official"): MobiResponse["sourceBadge"] {
  return { label, type, timestamp: new Date().toISOString() };
}

function reply(partial: Omit<MobiResponse, "toolsCalled"> & { toolsCalled?: string[] }): MobiResponse {
  return { toolsCalled: [], ...partial };
}

function extractNamedPlace(message: string): string | null {
  const cleaned = message
    .toLowerCase()
    .replace(/[?.!]/g, " ")
    .replace(/\b(where is the|where is|how do i get to|take me to|find the|nearest|campus|bus stop|please|mobi)\b/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length >= 3 ? cleaned : null;
}

export function classifyMobiIntent(message: string, history: MobiHistoryTurn[] = []): MobiIntent {
  const text = message.toLowerCase().trim();
  if (!text) return "CONVERSATION";
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|bye|help|what can you do|who are you)[\s!.?]*$/i.test(text)) {
    return "CONVERSATION";
  }
  if (OFF_TOPIC.test(text) && !MOBI_SCOPE.test(text)) return "OUT_OF_SCOPE";

  if (/\b(doesn't exist|does not exist|ghost|fake bus|bus 999|spaceship|alien|mars)\b/.test(text)) {
    return "OUT_OF_SCOPE";
  }

  if (/\bnearest pickup\b/.test(text)) return "NEAREST_PICKUP";
  if (/\bnearest (campus )?bus stop\b/.test(text)) return "NEAREST_CAMPUS_STOP";

  if (/\b(change|update|set|switch).*(pickup|pick up)\b/.test(text) || (/\bpickup point\b/.test(text) && /\b(change|update|set)\b/.test(text))) {
    return "CHANGE_PICKUP";
  }
  if (/\b(where is my bus|where's my bus|track my bus|my bus location|find my bus)\b/.test(text) || /\bwhere is bus\b/.test(text)) {
    return "MY_BUS_LOCATION";
  }
  if (/\b(eta|when will my bus|when will it (reach|arrive)|how long until|minutes away|what's my eta|whats my eta)\b/.test(text)) {
    return "MY_ETA";
  }
  if (/\b(delayed|delay|on time|late|running late)\b/.test(text)) return "MY_DELAY";
  if (/\b(pickup point|pick up point|my pickup|my stop)\b/.test(text)) return "MY_PICKUP";
  if (/\b(what time is my bus|when is my (morning |evening )?bus|my shift|morning bus|evening bus|schedule)\b/.test(text)) {
    return "MY_SHIFT";
  }
  if (/\bmiss(ed)? my bus|i missed\b/.test(text)) return "MISSED_BUS";
  if (/\b(mtc|public transport|public bus|how can i get home)\b/.test(text)) return "MTC";
  if (/\bnotification|alerts?\b/.test(text)) return "NOTIFICATIONS";
  if (/\b(take me to|how do i get to|directions to|walk to)\b/.test(text)) return "CAMPUS_NAVIGATION";
  if (/\bwhere is\b/.test(text) && !/\bmy bus\b/.test(text)) return "CAMPUS_LOCATION";
  if (MOBI_SCOPE.test(text)) return "MY_BUS_LOCATION";
  if (history.slice(-4).some((t) => t.intent && t.intent !== "OUT_OF_SCOPE" && t.intent !== "CONVERSATION")) {
    return "CONVERSATION";
  }
  return "OUT_OF_SCOPE";
}

function unavailable(intent: MobiIntent, answer: string, toolsCalled: string[]): MobiResponse {
  return reply({
    intent,
    answer,
    ttsText: answer,
    sources: ["ACIMS MOBI"],
    sourceBadge: officialBadge("Insufficient data"),
    toolsCalled,
  });
}

export async function executeMobiAgent(input: {
  studentId: string;
  message: string;
  deviceCoords?: DeviceCoords;
  history?: MobiHistoryTurn[];
  confirmAction?: MobiConfirmAction;
}): Promise<MobiResponse> {
  const { studentId, message, deviceCoords, history = [], confirmAction } = input;
  const toolsCalled: string[] = [];
  const intent = classifyMobiIntent(message, history);
  let response: MobiResponse;

  try {
    if (confirmAction?.action === "CHANGE_PICKUP" && confirmAction.confirmed && confirmAction.pickupPointId) {
      toolsCalled.push("changePickupPoint");
      const updated = await changePickupPoint(studentId, confirmAction.pickupPointId);
      response = reply({
        intent: "CHANGE_PICKUP",
        answer: updated
          ? `Your pickup point is now ${updated.pickupPointName}.`
          : "I'm unable to retrieve that information right now.",
        ttsText: updated ? `Your pickup point is now ${updated.pickupPointName}.` : "I couldn't update your pickup point.",
        sources: ["ACIMS Pickup Registry"],
        sourceBadge: officialBadge("Pickup updated"),
        toolsCalled,
      });
    } else {
      response = await dispatchIntent(intent, studentId, message, deviceCoords, toolsCalled);
    }
    await logMobiQuery({ studentId, intent: response.intent, toolsCalled: response.toolsCalled, success: true });
    return response;
  } catch (err) {
    console.warn("[MOBI]", err instanceof Error ? err.message : err);
    const fail = unavailable(intent, "I'm unable to retrieve that information right now.", toolsCalled);
    await logMobiQuery({ studentId, intent, toolsCalled, success: false });
    return fail;
  }
}

async function dispatchIntent(
  intent: MobiIntent,
  studentId: string,
  message: string,
  deviceCoords: DeviceCoords | undefined,
  toolsCalled: string[],
): Promise<MobiResponse> {
  if (intent === "OUT_OF_SCOPE") {
    const invented = /\b(doesn't exist|does not exist|ghost|fake bus|bus 999|spaceship|alien|mars)\b/i.test(message);
    const answer = invented
      ? "I don't have that information yet."
      : "I'm MOBI, the ACIMS mobility assistant. I can only help with your bus, pickup, campus navigation, and transport. Please ask something related to your commute.";
    return reply({
      intent,
      answer,
      ttsText: invented ? answer : "Please ask about your bus, pickup, or campus transport.",
      sources: ["ACIMS MOBI scope"],
      sourceBadge: officialBadge(invented ? "Unknown entity" : "Outside mobility scope"),
      toolsCalled,
    });
  }

  if (intent === "CONVERSATION") {
    toolsCalled.push("getMyBusLocation");
    const loc = await getMyBusLocation(studentId);
    const name = await getStudentDisplayName(studentId);
    const liveHint =
      loc.eta && loc.confidence === "LIVE"
        ? `Bus ${loc.eta.busNumber} GPS was updated ${formatAge(loc.eta.gps.secondsSinceUpdate)}.`
        : "Ask me where your bus is, your ETA, or your pickup point.";
    const answer = `Hi ${name}! I'm MOBI. How can I help you?\n\n${liveHint}`;
    return reply({
      intent,
      answer,
      ttsText: `Hi ${name}. How can I help you?`,
      sources: ["ACIMS Student Profile"],
      sourceBadge: officialBadge("MOBI"),
      followUps: ["Where is my bus?", "What's my ETA?", "What is my pickup point?"],
      toolsCalled,
    });
  }

  if (intent === "MY_BUS_LOCATION") return handleBusLocation(studentId, toolsCalled);
  if (intent === "MY_ETA") return handleEta(studentId, toolsCalled);
  if (intent === "MY_DELAY") return handleDelay(studentId, toolsCalled);
  if (intent === "MY_PICKUP") return handlePickup(studentId, toolsCalled);
  if (intent === "CHANGE_PICKUP") return handleChangePickup(studentId, message, toolsCalled);
  if (intent === "MY_SHIFT") return handleShift(studentId, message, toolsCalled);
  if (intent === "MISSED_BUS") return handleMissedBus(studentId, deviceCoords, toolsCalled);
  if (intent === "NEAREST_PICKUP") return handleNearestPickup(studentId, deviceCoords, toolsCalled);
  if (intent === "NEAREST_CAMPUS_STOP") return handleNearestCampusStop(deviceCoords, toolsCalled);
  if (intent === "CAMPUS_LOCATION" || intent === "CAMPUS_NAVIGATION") {
    return handleCampus(intent, message, deviceCoords, toolsCalled);
  }
  if (intent === "MTC") return handleMtc(deviceCoords, toolsCalled);
  if (intent === "NOTIFICATIONS") return handleNotifications(studentId, toolsCalled);

  return unavailable(intent, "I don't have enough current data to answer that reliably.", toolsCalled);
}

async function handleBusLocation(studentId: string, toolsCalled: string[]): Promise<MobiResponse> {
  toolsCalled.push("getMyBus", "getMyActiveTrip", "getMyBusLocation");
  const bus = await getMyBus(studentId);
  if (!bus.found || !bus.eta) {
    return unavailable("MY_BUS_LOCATION", "You don't currently have an active bus.", toolsCalled);
  }
  const trip = await getMyActiveTrip(studentId);
  const loc = await getMyBusLocation(studentId);
  const eta = loc.eta!;
  if (eta.gps.status === "STALE") {
    const age = formatAge(eta.gps.secondsSinceUpdate);
    const answer =
      age === "unknown"
        ? "Your bus location is currently unavailable."
        : `Your bus location is currently unavailable. The last update was ${age}.`;
    return reply({
      intent: "MY_BUS_LOCATION",
      answer,
      ttsText: answer,
      sources: ["ACIMS Driver GPS"],
      sourceBadge: officialBadge(`Stale GPS · ${formatAge(eta.gps.secondsSinceUpdate)}`, "live GPS"),
      toolsCalled,
    });
  }
  if (eta.gps.status !== "LIVE" || eta.gps.latitude == null || eta.gps.longitude == null) {
    if (!trip.found) {
      return unavailable("MY_BUS_LOCATION", "There isn't an active trip for your bus right now.", toolsCalled);
    }
    return unavailable("MY_BUS_LOCATION", "Your bus's live location isn't available right now.", toolsCalled);
  }

  const distance =
    eta.remainingDistanceKm != null ? ` It is about ${eta.remainingDistanceKm.toFixed(1)} km from ${eta.pickup.name}.` : "";
  const answer = `Bus ${eta.busNumber} last reported live GPS ${formatAge(eta.gps.secondsSinceUpdate)}.${distance}`;
  return reply({
    intent: "MY_BUS_LOCATION",
    answer,
    ttsText: answer,
    sources: ["ACIMS Driver GPS"],
    sourceBadge: officialBadge(`Live GPS · ${formatAge(eta.gps.secondsSinceUpdate)}`, "live GPS"),
    mapData: {
      center: { latitude: eta.gps.latitude, longitude: eta.gps.longitude },
      zoom: 14,
      markers: [
        {
          id: "bus",
          title: `Bus ${eta.busNumber}`,
          latitude: eta.gps.latitude,
          longitude: eta.gps.longitude,
          type: "bus",
        },
        ...(eta.pickup.latitude != null && eta.pickup.longitude != null
          ? [
              {
                id: "pickup",
                title: eta.pickup.name,
                latitude: eta.pickup.latitude,
                longitude: eta.pickup.longitude,
                type: "stop" as const,
              },
            ]
          : []),
      ],
    },
    toolsCalled,
  });
}

async function handleEta(studentId: string, toolsCalled: string[]): Promise<MobiResponse> {
  toolsCalled.push("getMyETA");
  const result = await getMyETA(studentId);
  if (!result.eta) {
    return unavailable("MY_ETA", "You don't currently have an active bus.", toolsCalled);
  }
  if (!result.available) {
    return unavailable("MY_ETA", "I can't calculate a reliable ETA right now because the bus's live location is unavailable.", toolsCalled);
  }
  const eta = result.eta;
  let answer = `Your bus is expected at your pickup point in about ${eta.etaMinutes} minutes.`;
  if (eta.delay && eta.delay.delayMinutes > 0 && eta.scheduledArrivalAt && eta.predictedArrivalAt) {
    answer = `Your bus is scheduled for ${eta.scheduledArrivalAt}, but the current predicted arrival is ${eta.predictedArrivalAt} — about ${eta.delay.delayMinutes} minutes later than scheduled.`;
  } else if (eta.delay && eta.delay.delayMinutes > 0) {
    answer = `Your bus is currently expected in about ${eta.etaMinutes} minutes, which is approximately ${eta.delay.delayMinutes} minutes later than scheduled.`;
  }
  return reply({
    intent: "MY_ETA",
    answer,
    ttsText: answer,
    sources: ["ACIMS Pickup ETA Engine"],
    sourceBadge: officialBadge("Predicted ETA", "calculated"),
    toolsCalled,
  });
}

async function handleDelay(studentId: string, toolsCalled: string[]): Promise<MobiResponse> {
  toolsCalled.push("getMyDelay");
  const result = await getMyDelay(studentId);
  if (!result.available) {
    return unavailable("MY_DELAY", "I don't have enough current data to determine whether your bus is delayed.", toolsCalled);
  }
  const delay = result.eta!.delay!;
  const answer =
    delay.status === "ON_TIME" || delay.delayMinutes <= 0
      ? "Your bus is currently on schedule."
      : `Yes. Your bus is currently predicted to be about ${delay.delayMinutes} minutes late.`;
  return reply({
    intent: "MY_DELAY",
    answer,
    ttsText: answer,
    sources: ["ACIMS Delay Engine"],
    sourceBadge: officialBadge("Predicted delay", "calculated"),
    toolsCalled,
  });
}

async function handlePickup(studentId: string, toolsCalled: string[]): Promise<MobiResponse> {
  toolsCalled.push("getMyPickupPoint");
  const pickup = await getMyPickupPoint(studentId);
  if (!pickup) {
    return unavailable("MY_PICKUP", "You haven't selected a pickup point yet. You can set one in Transport Settings.", toolsCalled);
  }
  const answer = `Your current pickup point is ${pickup.pickupPointName}.`;
  return reply({
    intent: "MY_PICKUP",
    answer,
    ttsText: answer,
    sources: ["ACIMS Student Pickup Registry"],
    sourceBadge: officialBadge("Stored pickup"),
    toolsCalled,
  });
}

async function handleChangePickup(studentId: string, message: string, toolsCalled: string[]): Promise<MobiResponse> {
  toolsCalled.push("getMyPickupPoint", "getPickupPoints");
  const pickup = await getMyPickupPoint(studentId);
  const options = await getPickupPoints(studentId);
  const named = extractNamedPlace(message.replace(/change|update|set|switch|my|pickup|point|to|please/gi, " "));
  const match = named
    ? options.find((p) => p.stopName.toLowerCase().includes(named) || p.id.toLowerCase().includes(named))
    : null;

  if (!match) {
    const current = pickup ? `Your current pickup point is ${pickup.pickupPointName}. ` : "";
    return reply({
      intent: "CHANGE_PICKUP",
      answer: `${current}You can change your pickup point from Transport Settings.`,
      ttsText: `${current}You can change your pickup point from Transport Settings.`,
      sources: ["ACIMS Pickup Registry"],
      sourceBadge: officialBadge("Pickup change"),
      actionPrompt: {
        type: "CHANGE_PICKUP",
        currentName: pickup?.pickupPointName ?? null,
        options: options.slice(0, 8).map((p) => ({ id: p.id, name: p.stopName })),
      },
      toolsCalled,
    });
  }

  return reply({
    intent: "CHANGE_PICKUP",
    answer: `Your current pickup point is ${pickup?.pickupPointName ?? "not set"}. Do you want to change it to ${match.stopName}? Confirm below to update it.`,
    ttsText: `Your current pickup is ${pickup?.pickupPointName ?? "not set"}. Confirm if you want ${match.stopName}.`,
    sources: ["ACIMS Pickup Registry"],
    sourceBadge: officialBadge("Confirmation required"),
    actionPrompt: {
      type: "CHANGE_PICKUP",
      currentName: pickup?.pickupPointName ?? null,
      options: [{ id: match.id, name: match.stopName }],
    },
    toolsCalled,
  });
}

async function handleShift(studentId: string, message: string, toolsCalled: string[]): Promise<MobiResponse> {
  toolsCalled.push("getMyShift", "getAvailableShifts");
  const mine = await getMyShift(studentId);
  const all = await getAvailableShifts();
  const wantsEvening = /\bevening\b/.test(message.toLowerCase());
  const wantsMorning = /\bmorning\b/.test(message.toLowerCase());

  if (mine.available && mine.shift?.shiftStartTime) {
    const label = mine.shift.shiftType?.toLowerCase() === "evening" ? "evening" : "morning";
    const answer = `Your ${label} shift is scheduled for ${formatShiftTime(mine.shift.shiftStartTime)}.`;
    return reply({
      intent: "MY_SHIFT",
      answer,
      ttsText: answer,
      sources: ["ACIMS Admin Shift Configuration"],
      sourceBadge: officialBadge("Scheduled shift", "scheduled"),
      toolsCalled,
    });
  }

  const filtered = all.filter((s) => {
    if (wantsEvening) return (s.shiftType || s.name).toLowerCase().includes("evening") || s.direction === "FROM_COLLEGE";
    if (wantsMorning) return (s.shiftType || s.name).toLowerCase().includes("morning") || s.direction === "TO_COLLEGE";
    return true;
  });
  if (!filtered.length) {
    return unavailable("MY_SHIFT", "I don't have that information yet. Admin hasn't configured a shift time for your bus.", toolsCalled);
  }
  const lines = filtered.map((s) => `• ${s.name}: ${formatShiftTime(s.startTime!)}`).join("\n");
  const answer = `Configured ACIMS shifts:\n${lines}`;
  return reply({
    intent: "MY_SHIFT",
    answer,
    ttsText: `Configured shift: ${filtered[0].name} at ${formatShiftTime(filtered[0].startTime!)}.`,
    sources: ["ACIMS Admin Shift Configuration"],
    sourceBadge: officialBadge("Scheduled shift", "scheduled"),
    toolsCalled,
  });
}

function formatShiftTime(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(":");
  let h = Number(hRaw);
  const m = mRaw || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

async function handleMissedBus(studentId: string, coords: DeviceCoords | undefined, toolsCalled: string[]): Promise<MobiResponse> {
  toolsCalled.push("getMissedBusAlternatives", "getMTCOptions");
  const alt = await getMissedBusAlternatives(studentId, coords);
  const acimsLines = alt.upcomingShifts
    .filter((s) => s.startTime)
    .map((s) => `• ${s.name} at ${formatShiftTime(s.startTime!)}`);

  const mtcLines = alt.mtc.available
    ? (alt.mtc.options as Array<{ stopName?: string; walkingMinutes?: number; routes?: string[] }>)
        .slice(0, 3)
        .map((o) => `• ${o.stopName}${o.routes?.length ? `: MTC ${o.routes.join(", ")}` : ""}`)
    : [];

  if (!acimsLines.length && !mtcLines.length) {
    const mtcNote = alt.mtc.available
      ? "I can't retrieve nearby MTC options without more location detail."
      : "I can't retrieve current MTC information right now.";
    const answer = `There are no other ACIMS options currently available, and ${mtcNote}`;
    return reply({
      intent: "MISSED_BUS",
      answer,
      ttsText: answer,
      sources: ["ACIMS Shifts", MTC_SOURCE_LABEL],
      sourceBadge: officialBadge("No alternatives"),
      toolsCalled,
    });
  }

  const passed = alt.stopPassed ? "Your scheduled bus has already passed your pickup point. " : "";
  const acimsBlock = acimsLines.length ? `Other ACIMS shifts:\n${acimsLines.join("\n")}` : "I don't currently see another available ACIMS bus.";
  const mtcBlock = alt.mtc.available
    ? mtcLines.length
      ? `\n\nOfficial MTC options:\n${mtcLines.join("\n")}`
      : "\n\nI can check available MTC options, but none are listed near you right now."
    : "\n\nI can't retrieve current MTC information right now.";
  const answer = `${passed}${acimsBlock}${mtcBlock}`;
  return reply({
    intent: "MISSED_BUS",
    answer,
    ttsText: acimsLines.length
      ? `${passed}There is another ACIMS option: ${alt.upcomingShifts[0]?.name} at ${formatShiftTime(alt.upcomingShifts[0]?.startTime || "")}.`
      : answer,
    sources: ["ACIMS Shift Configuration", MTC_SOURCE_LABEL],
    sourceBadge: officialBadge("Missed-bus alternatives"),
    toolsCalled,
  });
}

async function handleNearestPickup(studentId: string, coords: DeviceCoords | undefined, toolsCalled: string[]): Promise<MobiResponse> {
  toolsCalled.push("getNearestPickupPoint");
  const result = await getNearestPickupPoint(studentId, coords);
  if (result.needsLocation) {
    return unavailable("NEAREST_PICKUP", "I need your location permission to find the nearest stop.", toolsCalled);
  }
  if (!result.nearest) {
    return unavailable("NEAREST_PICKUP", "I don't have that information yet.", toolsCalled);
  }
  const walk = Math.max(1, Math.round(result.nearest.distanceMeters / 80));
  const answer = `The nearest pickup point is ${result.nearest.stopName}, about ${result.nearest.distanceMeters} meters away (~${walk} min walk).`;
  return reply({
    intent: "NEAREST_PICKUP",
    answer,
    ttsText: answer,
    sources: ["ACIMS Official Pickup Points"],
    sourceBadge: officialBadge("Pickup registry"),
    toolsCalled,
  });
}

async function handleNearestCampusStop(coords: DeviceCoords | undefined, toolsCalled: string[]): Promise<MobiResponse> {
  toolsCalled.push("getNearestCampusBusStop");
  const result = await getNearestCampusBusStop(coords);
  if (result.needsLocation) {
    return unavailable("NEAREST_CAMPUS_STOP", "I need your location permission to find the nearest stop.", toolsCalled);
  }
  if (!result.nearest) {
    return unavailable("NEAREST_CAMPUS_STOP", "That location isn't configured in ACIMS.", toolsCalled);
  }
  const walk = Math.max(1, Math.round(result.nearest.distanceMeters / 80));
  const answer = `The nearest campus bus stop is ${result.nearest.name}, about ${result.nearest.distanceMeters} meters away (~${walk} min walk).`;
  return reply({
    intent: "NEAREST_CAMPUS_STOP",
    answer,
    ttsText: answer,
    sources: ["ACIMS Campus Map"],
    sourceBadge: officialBadge("Campus map"),
    toolsCalled,
  });
}

async function handleCampus(
  intent: "CAMPUS_LOCATION" | "CAMPUS_NAVIGATION",
  message: string,
  coords: DeviceCoords | undefined,
  toolsCalled: string[],
): Promise<MobiResponse> {
  const place = extractNamedPlace(message);
  if (!place) {
    return unavailable(intent, "That location isn't configured in ACIMS.", toolsCalled);
  }
  toolsCalled.push("getCampusLocations");
  const loc = await findCampusLocation(place);
  if (!loc) {
    return unavailable(intent, "I don't have that location configured in the campus map.", toolsCalled);
  }
  if (intent === "CAMPUS_NAVIGATION") {
    if (!hasLiveDeviceGps(coords)) {
      const answer = `${loc.name} is on the campus map (${loc.category}). I need your location permission to give walking directions from where you are.`;
      return reply({
        intent,
        answer,
        ttsText: answer,
        sources: ["ACIMS Campus Map"],
        sourceBadge: officialBadge("Campus map"),
        toolsCalled,
      });
    }
    toolsCalled.push("getCampusRoute");
    const route = await getCampusRoute(loc.id, coords);
    if (!route) {
      const answer = `${loc.name} is configured on campus, but I don't have a verified walking path from your current location.`;
      return reply({
        intent,
        answer,
        ttsText: answer,
        sources: ["ACIMS Campus Map"],
        sourceBadge: officialBadge("Campus map"),
        toolsCalled,
      });
    }
    const answer = `${loc.name} is about ${route.distanceMeters} meters away (~${route.walkingMinutes} min walk). ${route.steps.join(" ")}`;
    return reply({
      intent,
      answer,
      ttsText: `${loc.name} is about ${route.walkingMinutes} minutes on foot.`,
      sources: ["ACIMS Campus Map"],
      sourceBadge: officialBadge("Campus walking path", "calculated"),
      toolsCalled,
    });
  }
  const answer = `${loc.name} is in the ${loc.category} zone${loc.description ? `: ${loc.description}` : "."}`;
  return reply({
    intent,
    answer,
    ttsText: answer,
    sources: ["ACIMS Campus Map"],
    sourceBadge: officialBadge("Campus map"),
    toolsCalled,
  });
}

async function handleMtc(coords: DeviceCoords | undefined, toolsCalled: string[]): Promise<MobiResponse> {
  toolsCalled.push("getMTCOptions");
  const result = await getMTCOptions(coords);
  if (!result.available) {
    return unavailable("MTC", "I can't retrieve current MTC information right now.", toolsCalled);
  }
  if ("needsLocation" in result && result.needsLocation) {
    return unavailable("MTC", "I need your location permission to find the nearest stop.", toolsCalled);
  }
  const options = (result.options || []) as Array<{ stopName?: string; routes?: string[]; walkingMinutes?: number }>;
  if (!options.length) {
    return unavailable("MTC", "Current MTC information isn't available right now.", toolsCalled);
  }
  const lines = options.slice(0, 4).map((o) => `• ${o.stopName}${o.routes?.length ? ` — ${o.routes.join(", ")}` : ""}`);
  const answer = `Official MTC options near you (${MTC_SOURCE_LABEL}):\n${lines.join("\n")}`;
  return reply({
    intent: "MTC",
    answer,
    ttsText: `Nearest official MTC stage is ${options[0]?.stopName}.`,
    sources: [MTC_SOURCE_LABEL],
    sourceBadge: officialBadge(MTC_SOURCE_LABEL),
    toolsCalled,
  });
}

async function handleNotifications(studentId: string, toolsCalled: string[]): Promise<MobiResponse> {
  toolsCalled.push("getNotifications");
  const items = await getNotifications(studentId);
  if (!items.length) {
    return unavailable("NOTIFICATIONS", "You currently have no transport notifications.", toolsCalled);
  }
  const latest = items.slice(0, 3).map((n) => `• ${n.title}: ${n.message}`).join("\n");
  const answer = `Your latest ACIMS notifications:\n${latest}`;
  return reply({
    intent: "NOTIFICATIONS",
    answer,
    ttsText: `Latest notification: ${items[0].title}.`,
    sources: ["ACIMS Notifications"],
    sourceBadge: officialBadge("Notifications"),
    toolsCalled,
  });
}
