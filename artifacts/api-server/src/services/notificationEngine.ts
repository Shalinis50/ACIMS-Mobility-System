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
    id: "alert-service-active",
    type: "SERVICE_ACTIVE",
    title: "Campus Transit Active",
    message: "Morning college routes connecting to REC Main Gate are operating normally.",
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
    read: true,
    busId: "bus-24",
  },
];

let lastState = {
  nextStop: "",
  etaMinutes: 0,
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
  if (bus.nextStop && bus.nextStop !== lastState.nextStop) {
    addNotification(
      "APPROACHING_STOP",
      "Approaching stop",
      `Bus ${bus.busNumber} is approaching ${bus.nextStop}.`,
      bus.id,
    );
  }

  if (bus.etaMinutes <= 3 && bus.nextStop) {
    addNotification(
      "NEARBY",
      "Your bus is nearby",
      `Bus ${bus.busNumber} is ${bus.etaMinutes} minutes away from ${bus.nextStop}.`,
      bus.id,
    );
  }

  if (queueEntry) {
    const message = `You are #${queueEntry.queuePosition} in line for boarding.`;
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
