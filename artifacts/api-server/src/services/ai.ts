import { getBuses } from "./busTracking";
import { getQueueStatus } from "./queueManager";
import { listCampusLocations } from "./campus";
import { listSafetyAlerts } from "./safety";

export function getAiContext() {
  const bus = getBuses()[0];
  if (!bus) {
    throw new Error("No active ACIMS bus is available");
  }
  return {
    buses: getBuses(),
    queue: getQueueStatus(bus),
    safetyAlerts: listSafetyAlerts(),
    destinations: listCampusLocations(),
  };
}

export function answerMobilityQuestion(message: string, destinationId?: string) {
  const context = getAiContext();
  const bus = context.buses[0];
  if (!bus) {
    throw new Error("No active ACIMS bus is available");
  }
  const queue = context.queue;
  const text = message.toLowerCase();
  const destination = context.destinations.find(
    (item) => item.id === destinationId || text.includes(item.name.toLowerCase()),
  );
  const target = destination?.name ?? "your selected destination";
  const queueNote = queue.joined
    ? `Your overflow queue position is ${queue.entry?.queuePosition ?? "not available"}.`
    : queue.seatsAvailable > 0
      ? `${queue.seatsAvailable} seats are currently available.`
      : "The bus is full, so the overflow queue is the reliable boarding path.";
  const safetyNote = context.safetyAlerts.length
    ? `Safety note: ${context.safetyAlerts[0].message}`
    : "No active safety alerts are recorded for this context.";

  let answer = `Bus ${bus.busNumber} is ${bus.etaMinutes} minutes from ${bus.nextStop} and is traveling toward ${bus.destination}. ${queueNote}`;
  if (destination) {
    answer += ` For ${target}, ACIMS can guide you from College to the nearest served stop.`;
  }
  if (text.includes("missed") || text.includes("another") || text.includes("fastest")) {
    answer += " External public transport connections are not live yet; the available alternatives are labeled development data in the Public Transport section.";
  }
  if (text.includes("safe") || text.includes("safety")) answer += ` ${safetyNote}`;
  return {
    answer,
    sources: ["Live ACIMS bus state", "Queue status", "Campus location data", "Safety alert feed"],
    context,
  };
}