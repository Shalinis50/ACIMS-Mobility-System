import type { Response } from "express";
import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import type { ComputedTelemetry } from "./gpsEngine";

interface ClientConnection {
  id: string;
  res: Response;
  busId?: string; // undefined means subscribed to all buses (Admin)
  connectedAt: Date;
}

export interface DriverLocationSocketPayload {
  driverId?: string;
  busId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  bearing?: number | null;
  heading?: number | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  timestamp?: number | string;
}

export type DriverSocketIngestHandler = (
  payload: DriverLocationSocketPayload
) => Promise<{
  ok: boolean;
  telemetry?: ComputedTelemetry;
  error?: string;
}>;

export type BusSnapshotResolver = (busId: string) => Promise<ComputedTelemetry | null>;

export function getBusSocketRoom(busId: string): string {
  return `bus:${busId}`;
}

class RealtimeLocationHub {
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private clientIdCounter = 0;
  private io: SocketIOServer | null = null;
  private ingestHandler: DriverSocketIngestHandler | null = null;
  private snapshotResolver: BusSnapshotResolver | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const pingPayload = `: ping ${Date.now()}\n\n`;
      for (const [id, client] of this.clients.entries()) {
        try {
          client.res.write(pingPayload);
        } catch {
          this.removeClient(id);
        }
      }
    }, 15000);
  }

  /**
   * Attaches Socket.IO server to the Node HTTP server on the same port (3000)
   * and wires bus-specific rooms (`bus:<busId>`) for Driver -> Server -> Passenger real-time streaming.
   */
  public attachSocketServer(
    httpServer: HttpServer,
    options?: {
      onDriverLocationIngest?: DriverSocketIngestHandler;
      resolveBusSnapshot?: BusSnapshotResolver;
    }
  ): SocketIOServer {
    if (options?.onDriverLocationIngest) {
      this.ingestHandler = options.onDriverLocationIngest;
    }
    if (options?.resolveBusSnapshot) {
      this.snapshotResolver = options.resolveBusSnapshot;
    }

    if (this.io) {
      return this.io;
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      path: "/socket.io",
    });

    this.io.on("connection", (socket: Socket) => {
      const handleJoinBusRoom = async (
        raw: string | { busId?: string; bus_id?: string },
        ack?: (res: any) => void
      ) => {
        const busId =
          typeof raw === "string"
            ? raw.trim()
            : (raw?.busId || raw?.bus_id || "").trim();

        if (!busId) {
          ack?.({ joined: false, error: "busId is required" });
          return;
        }

        const room = getBusSocketRoom(busId);
        await socket.join(room);
        await socket.join(busId);

        socket.emit("joinedBusRoom", {
          joined: true,
          busId,
          room,
          timestamp: Date.now(),
        });
        ack?.({ joined: true, busId, room });

        if (this.snapshotResolver) {
          try {
            const snapshot = await this.snapshotResolver(busId);
            if (snapshot) {
              const enriched = this.formatSocketPayload(snapshot);
              socket.emit("busLocationUpdate", enriched);
              socket.emit("locationUpdate", enriched);
              socket.emit("bus:location", enriched);
            }
          } catch {
            // Snapshot optional on initial join
          }
        }
      };

      const handleLeaveBusRoom = async (
        raw: string | { busId?: string; bus_id?: string },
        ack?: (res: any) => void
      ) => {
        const busId =
          typeof raw === "string"
            ? raw.trim()
            : (raw?.busId || raw?.bus_id || "").trim();
        if (!busId) return;

        const room = getBusSocketRoom(busId);
        await socket.leave(room);
        await socket.leave(busId);
        ack?.({ left: true, busId, room });
      };

      const handleDriverLocation = async (
        rawPayload: any,
        ack?: (res: any) => void
      ) => {
        try {
          const busId = (rawPayload?.busId || rawPayload?.bus_id || "").trim();
          const driverId =
            rawPayload?.driverId ||
            rawPayload?.driver_id ||
            (socket.handshake.headers["x-acims-driver-id"] as string) ||
            "driver-active";

          const latitude = Number(rawPayload?.latitude);
          const longitude = Number(rawPayload?.longitude);

          if (!busId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
            const errMsg = "Invalid driver GPS payload: busId, latitude, and longitude required";
            socket.emit("driverLocationError", { error: errMsg });
            ack?.({ ok: false, error: errMsg });
            return;
          }

          // Ensure driver socket is also in the bus room
          const room = getBusSocketRoom(busId);
          socket.join(room);
          socket.join(busId);

          if (this.ingestHandler) {
            const result = await this.ingestHandler({
              driverId,
              busId,
              latitude,
              longitude,
              accuracy:
                typeof rawPayload?.accuracy === "number" ? rawPayload.accuracy : null,
              speed:
                typeof rawPayload?.speed === "number" ? rawPayload.speed : null,
              bearing:
                typeof rawPayload?.bearing === "number"
                  ? rawPayload.bearing
                  : typeof rawPayload?.heading === "number"
                  ? rawPayload.heading
                  : null,
              heading:
                typeof rawPayload?.heading === "number"
                  ? rawPayload.heading
                  : typeof rawPayload?.bearing === "number"
                  ? rawPayload.bearing
                  : null,
              altitude:
                typeof rawPayload?.altitude === "number" ? rawPayload.altitude : null,
              altitudeAccuracy:
                typeof rawPayload?.altitudeAccuracy === "number"
                  ? rawPayload.altitudeAccuracy
                  : null,
              timestamp: rawPayload?.timestamp || rawPayload?.recorded_at || Date.now(),
            });

            if (result.ok && result.telemetry) {
              socket.emit("driverLocationAck", {
                ok: true,
                busId,
                room,
                timestamp: Date.now(),
                telemetry: result.telemetry,
              });
              ack?.({ ok: true, telemetry: result.telemetry });
            } else {
              socket.emit("driverLocationError", {
                ok: false,
                busId,
                error: result.error || "GPS point rejected",
              });
              ack?.({ ok: false, error: result.error });
            }
          }
        } catch (err: any) {
          const message = err?.message || "Failed to process driver Socket.IO GPS update";
          socket.emit("driverLocationError", { ok: false, error: message });
          ack?.({ ok: false, error: message });
        }
      };

      // Support all standard room subscription events (Android & Web)
      socket.on("joinBusRoom", handleJoinBusRoom);
      socket.on("join_bus_room", handleJoinBusRoom);
      socket.on("joinBus", handleJoinBusRoom);
      socket.on("subscribeBus", handleJoinBusRoom);
      socket.on("joinRoom", handleJoinBusRoom);

      socket.on("leaveBusRoom", handleLeaveBusRoom);
      socket.on("leave_bus_room", handleLeaveBusRoom);
      socket.on("unsubscribeBus", handleLeaveBusRoom);

      // Admin all-fleet subscription
      socket.on("joinFleetRoom", () => {
        socket.join("admin:all");
      });

      // Support all standard driver GPS emission events (Android FusedLocationProviderClient & Web watchPosition)
      socket.on("driverLocationUpdate", handleDriverLocation);
      socket.on("driver_location_update", handleDriverLocation);
      socket.on("locationUpdate", handleDriverLocation);
      socket.on("sendLocation", handleDriverLocation);
      socket.on("bus:location", handleDriverLocation);
    });

    return this.io;
  }

  private formatSocketPayload(telemetry: ComputedTelemetry) {
    const bearing =
      typeof telemetry.bearing === "number"
        ? telemetry.bearing
        : typeof telemetry.heading === "number"
        ? telemetry.heading
        : null;
    const timestamp =
      typeof telemetry.timestamp === "number" && telemetry.timestamp > 0
        ? telemetry.timestamp
        : new Date(telemetry.recordedAt).getTime() || Date.now();

    return {
      ...telemetry,
      driverId: telemetry.driverId || "driver-active",
      busId: telemetry.busId,
      latitude: telemetry.latitude,
      longitude: telemetry.longitude,
      accuracy: telemetry.accuracy ?? null,
      speed: telemetry.speed ?? null,
      bearing,
      heading: bearing,
      timestamp,
    };
  }

  /**
   * Registers a client for Server-Sent Events (SSE) updates for a specific bus
   */
  public subscribeBus(busId: string, res: Response, initialData?: ComputedTelemetry | null): string {
    const clientId = `bus-${busId}-${++this.clientIdCounter}-${Date.now()}`;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    });
    res.flushHeaders?.();

    const client: ClientConnection = {
      id: clientId,
      res,
      busId,
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);

    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, busId, timestamp: new Date().toISOString() })}\n\n`);

    if (initialData) {
      res.write(`event: location\ndata: ${JSON.stringify(this.formatSocketPayload(initialData))}\n\n`);
    }

    res.on("close", () => {
      this.removeClient(clientId);
    });

    return clientId;
  }

  /**
   * Registers a client for all active buses (Admin Fleet Live Monitoring)
   */
  public subscribeAllBuses(res: Response, initialFleet?: ComputedTelemetry[]): string {
    const clientId = `admin-all-${++this.clientIdCounter}-${Date.now()}`;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    });
    res.flushHeaders?.();

    const client: ClientConnection = {
      id: clientId,
      res,
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);

    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, scope: "all", timestamp: new Date().toISOString() })}\n\n`);

    if (initialFleet && initialFleet.length > 0) {
      res.write(`event: fleet_snapshot\ndata: ${JSON.stringify(initialFleet)}\n\n`);
    }

    res.on("close", () => {
      this.removeClient(clientId);
    });

    return clientId;
  }

  /**
   * Broadcasts a real-device GPS location update to the bus-specific Socket.IO room AND all SSE clients
   */
  public broadcastLocation(telemetry: ComputedTelemetry) {
    const enriched = this.formatSocketPayload(telemetry);
    const payload = `event: location\ndata: ${JSON.stringify(enriched)}\n\n`;

    // 1. Broadcast to SSE subscribers
    for (const [id, client] of this.clients.entries()) {
      if (!client.busId || client.busId === telemetry.busId) {
        try {
          client.res.write(payload);
        } catch {
          this.removeClient(id);
        }
      }
    }

    // 2. Broadcast to bus-specific Socket.IO room (`bus:<busId>` and `<busId>`) + admin fleet room
    if (this.io) {
      const room = getBusSocketRoom(telemetry.busId);
      const targets = this.io.to(room).to(telemetry.busId).to("admin:all");
      targets.emit("busLocationUpdate", enriched);
      targets.emit("locationUpdate", enriched);
      targets.emit("bus:location", enriched);
    }
  }

  /**
   * Broadcasts tracking session state change (ACTIVE, PAUSED, ENDED)
   */
  public broadcastSessionState(busId: string, state: "ACTIVE" | "PAUSED" | "ENDED", sessionDetails?: any) {
    const eventData = {
      busId,
      state,
      session: sessionDetails,
      timestamp: new Date().toISOString(),
    };
    const payload = `event: session_change\ndata: ${JSON.stringify(eventData)}\n\n`;

    for (const [id, client] of this.clients.entries()) {
      if (!client.busId || client.busId === busId) {
        try {
          client.res.write(payload);
        } catch {
          this.removeClient(id);
        }
      }
    }

    if (this.io) {
      const room = getBusSocketRoom(busId);
      this.io.to(room).to(busId).to("admin:all").emit("session_change", eventData);
    }
  }

  private removeClient(id: string) {
    this.clients.delete(id);
  }

  public getConnectedCount(busId?: string): number {
    if (!busId) return this.clients.size;
    let count = 0;
    for (const client of this.clients.values()) {
      if (!client.busId || client.busId === busId) count++;
    }
    return count;
  }
}

export const realtimeHub = new RealtimeLocationHub();
