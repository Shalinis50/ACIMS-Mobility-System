import type { Bus } from "./busTracking";

export type QueueEntry = {
  studentId: string;
  busId: string;
  boardingStop: string;
  queuePosition: number;
  joinedAt: Date;
  status: string;
};

const entries: QueueEntry[] = [
  {
    studentId: "student-014",
    busId: "bus-12",
    boardingStop: "Tambaram",
    queuePosition: 1,
    joinedAt: new Date(Date.now() - 1000 * 60 * 14),
    status: "waiting",
  },
  {
    studentId: "student-027",
    busId: "bus-12",
    boardingStop: "Perungalathur",
    queuePosition: 2,
    joinedAt: new Date(Date.now() - 1000 * 60 * 11),
    status: "waiting",
  },
  {
    studentId: "student-031",
    busId: "bus-12",
    boardingStop: "Tambaram",
    queuePosition: 3,
    joinedAt: new Date(Date.now() - 1000 * 60 * 7),
    status: "waiting",
  },
];

function entriesForBus(busId: string) {
  return entries.filter((entry) => entry.busId === busId && entry.status === "waiting");
}

function resequence(busId: string) {
  entriesForBus(busId).forEach((entry, index) => {
    entry.queuePosition = index + 1;
  });
}

export function getQueueStatus(bus: Bus, studentId = "demo-student-001") {
  const entry = entries.find(
    (candidate) =>
      candidate.busId === bus.id &&
      candidate.studentId === studentId &&
      candidate.status === "waiting",
  );
  const busEntries = entriesForBus(bus.id);
  const estimatedAvailabilityMinutes = entry
    ? Math.max(2, entry.queuePosition * 3)
    : Math.max(3, (busEntries.length + 1) * 3);

  return {
    joined: Boolean(entry),
    entry: entry ? { ...entry } : null,
    busId: bus.id,
    capacity: bus.capacity,
    estimatedAvailabilityMinutes,
    message: entry
      ? `You are #${entry.queuePosition} in line for Bus #${bus.busNumber} at ${entry.boardingStop}.`
      : `Select your stop to reserve a position in the boarding queue for Bus #${bus.busNumber}.`,
  };
}

export function joinQueue(
  bus: Bus,
  studentId: string,
  boardingStop: string,
) {
  const existing = entries.find(
    (entry) =>
      entry.busId === bus.id &&
      entry.studentId === studentId &&
      entry.status === "waiting",
  );
  if (existing) return { duplicate: true, status: getQueueStatus(bus, studentId) };

  const entry: QueueEntry = {
    studentId,
    busId: bus.id,
    boardingStop,
    queuePosition: entriesForBus(bus.id).length + 1,
    joinedAt: new Date(),
    status: "waiting",
  };
  entries.push(entry);
  return { duplicate: false, status: getQueueStatus(bus, studentId) };
}

export function leaveQueue(bus: Bus, studentId: string) {
  const entry = entries.find(
    (candidate) =>
      candidate.busId === bus.id &&
      candidate.studentId === studentId &&
      candidate.status === "waiting",
  );
  if (entry) {
    entry.status = "left";
    resequence(bus.id);
  }
  return getQueueStatus(bus, studentId);
}
