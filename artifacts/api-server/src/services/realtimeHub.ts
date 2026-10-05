import type { Response } from "express";
import type { ComputedTelemetry } from "./gpsEngine";

interface ClientConnection {
  id: string;
  res: Response;
  busId?: string; // undefined means subscribed to all buses (Admin)
  connectedAt: Date;
}

class RealtimeLocationHub {
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private clientIdCounter = 0;

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
   * Registers a client for Server-Sent Events (SSE) updates for a specific bus
   */
  public subscribeBus(busId: string, res: Response, initialData?: ComputedTelemetry | null): string {
    const clientId = `bus-${busId}-${++this.clientIdCounter}-${Date.now()}`;
    
    // Set proper SSE headers
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

    // Initial message
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, busId, timestamp: new Date().toISOString() })}\n\n`);

    // Send immediate initial location if available
    if (initialData) {
      res.write(`event: location\ndata: ${JSON.stringify(initialData)}\n\n`);
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
   * Broadcasts a real-device GPS location update to all listening clients
   */
  public broadcastLocation(telemetry: ComputedTelemetry) {
    const payload = `event: location\ndata: ${JSON.stringify(telemetry)}\n\n`;

    for (const [id, client] of this.clients.entries()) {
      // Send if client is listening specifically to this bus OR listening to all buses
      if (!client.busId || client.busId === telemetry.busId) {
        try {
          client.res.write(payload);
        } catch {
          this.removeClient(id);
        }
      }
    }
  }

  /**
   * Broadcasts tracking session state change (ACTIVE, PAUSED, ENDED)
   */
  public broadcastSessionState(busId: string, state: "ACTIVE" | "PAUSED" | "ENDED", sessionDetails?: any) {
    const payload = `event: session_change\ndata: ${JSON.stringify({ busId, state, session: sessionDetails, timestamp: new Date().toISOString() })}\n\n`;

    for (const [id, client] of this.clients.entries()) {
      if (!client.busId || client.busId === busId) {
        try {
          client.res.write(payload);
        } catch {
          this.removeClient(id);
        }
      }
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
