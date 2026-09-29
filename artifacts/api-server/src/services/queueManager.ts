import type { Bus } from "./busTracking";

export type QueueEntry = {
  studentId: string;
  busId: string;
  boardingStop: string;
  queuePosition: number;
  joinedAt: Date;
  status: string;
};

const entries: QueueEntry[] = [];

function entriesForBus(busId: string) {
  return entries.filter((entry) => entry.busId === busId && entry.status === "waiting");
}

function resequence(busId: string) {
  entriesForBus(busId).forEach((entry, index) => {
    entry.queuePosition = index + 1;
  });
}

export function getQueueStatus(bus: Bus, studentId = "student-20418") {
  const entry = entries.find(
    (candidate) =>
      candidate.busId === bus.id &&
      candidate.studentId === studentId &&
      candidate.status === "waiting",
  );
  const queueLength = entriesForBus(bus.id).length;

  return {
    joined: Boolean(entry),
    entry: entry ? { ...entry } : null,
    busId: bus.id,
    queueLength,
    estimatedWaitMinutes: entry ? entry.queuePosition * 3 : 0,
    message: entry
      ? `You are #${entry.queuePosition} in line for boarding at ${entry.boardingStop}.`
      : "Boarding line is open.",
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
