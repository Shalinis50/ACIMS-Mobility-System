import type { Bus } from "./busTracking";
import type { QueueEntry } from "./queueManager";

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  busId: string;
};

const notifications: Notification[] = [
  {
    id: "alert-approaching-tambaram",
    type: "APPROACHING_STOP",
    title: "Approaching your stop",
    message: "Bus 12 is approaching Tambaram.",
    createdAt: new Date(Date.now() - 1000 * 60 * 2),
    read: false,
    busId: "bus-12",
  },
  {
    id: "alert-bus-full",
    type: "BUS_FULL",
    title: "Bus is at capacity",
    message: "Bus 12 is currently full. Join the overflow queue for a seat.",
    createdAt: new Date(Date.now() - 1000 * 60 * 8),
    read: false,
    busId: "bus-12",
  },
  {
    id: "alert-started",
    type: "BUS_STARTED",
    title: "Route started",
    message: "Bus 12 has started its route.",
    createdAt: new Date(Date.now() - 1000 * 60 * 22),
    read: true,
    busId: "bus-12",
  },
];

let lastState = {
  nextStop: "Tambaram",
  etaMinutes: 3,
  occupancy: 40,
};

function addNotification(
  type: string,
  title: string,
  message: string,
  busId: string,
) {
  if (type === "NEARBY") {
    const existingNearby = notifications.find(
      (notification) =>
        notification.type === type &&
        notification.busId === busId &&
        !notification.read,
    );
    if (existingNearby) return existingNearby;
  }
  const duplicate = notifications.find(
    (notification) =>
      notification.type === type &&
      notification.message === message &&
      notification.busId === busId,
  );
  if (duplicate) return duplicate;

  const notification: Notification = {
    id: `alert-${Date.now()}`,
    type,
    title,
    message,
    createdAt: new Date(),
    read: false,
    busId,
  };
  notifications.unshift(notification);
  return notification;
}

export function syncBusNotifications(
  bus: Bus,
  queueEntry?: QueueEntry | null,
) {
  if (bus.currentOccupancy >= bus.capacity && lastState.occupancy < bus.capacity) {
    addNotification(
      "BUS_FULL",
      "Bus is at capacity",
      `Bus ${bus.busNumber} is currently full.`,
      bus.id,
    );
  }

  if (bus.nextStop !== lastState.nextStop) {
    addNotification(
      "APPROACHING_STOP",
      "Approaching your stop",
      `Bus ${bus.busNumber} is approaching ${bus.nextStop}.`,
      bus.id,
    );
  }

  if (bus.etaMinutes <= 3 && bus.nextStop === "Tambaram") {
    addNotification(
      "NEARBY",
      "Your bus is nearby",
      `Bus ${bus.busNumber} is ${bus.etaMinutes} minutes away from Tambaram.`,
      bus.id,
    );
  }

  if (queueEntry) {
    const message = `You are #${queueEntry.queuePosition} in the overflow queue.`;
    const latestQueueAlert = notifications.find(
      (notification) => notification.type === "QUEUE_UPDATE" && !notification.read,
    );
    if (!latestQueueAlert || latestQueueAlert.message !== message) {
      addNotification("QUEUE_UPDATE", "Queue position updated", message, bus.id);
    }
  }

  lastState = {
    nextStop: bus.nextStop,
    etaMinutes: bus.etaMinutes,
    occupancy: bus.currentOccupancy,
  };
}

export function listNotifications() {
  return notifications.map((notification) => ({ ...notification }));
}

export function markNotificationRead(id: string) {
  const notification = notifications.find((candidate) => candidate.id === id);
  if (!notification) return undefined;
  notification.read = true;
  return { ...notification };
}
