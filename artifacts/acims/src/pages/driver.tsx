import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  BusFront,
  Compass,
  Gauge,
  MapPin,
  Power,
  Radio,
  RefreshCw,
  ShieldCheck,
  Signal,
  Smartphone,
} from "lucide-react";
import { useListBuses, getListBusesQueryKey } from "@workspace/api-client-react";
import { PageHeading } from "@/components/acims-ui";

export default function DriverTrackingPage() {
  const { data: buses, isLoading } = useListBuses({
    query: { queryKey: getListBusesQueryKey() },
  });

  const [selectedBusId, setSelectedBusId] = useState("bus-12");
  const [driverName, setDriverName] = useState("Driver Arun");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [lastCoords, setLastCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number | null;
    heading?: number | null;
    timestamp: string;
  } | null>(null);
  const [pingCount, setPingCount] = useState(0);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const selectedBus = buses?.find((b) => b.id === selectedBusId) ?? buses?.[0];

  const transmitLocation = async (coords: GeolocationCoordinates) => {
    try {
      const nowStr = new Date().toISOString();
      const payload = {
        busId: selectedBusId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        speed: coords.speed,
        heading: coords.heading,
        accuracy: coords.accuracy,
        timestamp: nowStr,
      };

      const res = await fetch("/api/bus/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setLastCoords({
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
          accuracy: coords.accuracy ? Math.round(coords.accuracy) : undefined,
          speed: coords.speed ? Math.round(coords.speed * 3.6) : 0, // km/h
          heading: coords.heading ? Math.round(coords.heading) : null,
          timestamp: nowStr,
        });
        setPingCount((c) => c + 1);
        setLastPingTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        setGeoError(null);
      }
    } catch (err: any) {
      console.error("Failed to transmit driver GPS:", err);
      setGeoError("Network error transmitting GPS update to backend.");
    }
  };

  const startBroadcast = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser or device.");
      return;
    }

    setGeoError(null);
    setIsBroadcasting(true);

    // Initial immediate fix
    navigator.geolocation.getCurrentPosition(
      (pos) => void transmitLocation(pos.coords),
      (err) => setGeoError(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );

    // Continuous real GPS watch stream
    const id = navigator.geolocation.watchPosition(
      (pos) => void transmitLocation(pos.coords),
      (err) => {
        setGeoError(`GPS Signal warning: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000,
      },
    );
    watchIdRef.current = id;
  };

  const stopBroadcast = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsBroadcasting(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="page-in min-h-screen bg-background text-foreground pb-12">
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft size={14} /> Back to Portal
          </Link>
          <span className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
            Phone B · Driver GPS Console
          </span>
        </div>

        <div className="mt-4">
          <PageHeading
            eyebrow="Two-Phone ACIMS Architecture"
            title="Driver Phone GPS Transmitter"
            description="Broadcast your device's genuine satellite GPS coordinates directly to the ACIMS live network. Students will track this vehicle in real time."
          />
        </div>

        {/* Console Container */}
        <div className="mt-6 space-y-5">
          {/* Vehicle & Driver Selector */}
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                Assigned Vehicle
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Smartphone size={14} className="text-accent-foreground" />
                <span>Device GPS Ready</span>
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Select Bus</label>
                <select
                  disabled={isBroadcasting}
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  {buses?.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      Bus #{bus.busNumber} — {bus.routeLabel} ({bus.destination})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Driver Call Sign</label>
                <input
                  type="text"
                  disabled={isBroadcasting}
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
              </div>
            </div>

            {selectedBus && (
              <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  Route: <strong className="text-foreground">{selectedBus.origin}</strong> →{" "}
                  <strong className="text-foreground">{selectedBus.destination}</strong>
                </span>
                <span className="font-bold text-foreground">Next: {selectedBus.nextStop}</span>
              </div>
            )}
          </div>

          {/* Broadcast Trigger Button */}
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-md text-center">
            {!isBroadcasting ? (
              <button
                type="button"
                onClick={startBroadcast}
                data-testid="button-start-driver-gps"
                className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-accent px-6 text-base font-extrabold text-accent-foreground shadow-lg transition hover:scale-[1.01] active:scale-[0.99]"
              >
                <Radio size={22} className="animate-pulse" />
                <span>Start Live GPS Broadcast</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopBroadcast}
                data-testid="button-stop-driver-gps"
                className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-destructive px-6 text-base font-extrabold text-destructive-foreground shadow-lg transition hover:opacity-90 active:scale-[0.99]"
              >
                <Power size={22} />
                <span>Stop GPS Broadcast</span>
              </button>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
              {isBroadcasting
                ? "Active satellite tracking engaged. Leave this screen open while driving."
                : "Press to request phone location permission and begin live telemetry."}
            </p>
          </div>

          {/* Live Telemetry Display */}
          {isBroadcasting && (
            <div className="rounded-[28px] border-2 border-accent/70 bg-card p-6 shadow-xl space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="pulse-dot h-3 w-3 rounded-full bg-accent-foreground" />
                  <span className="mono text-xs font-extrabold uppercase tracking-wider text-foreground">
                    Broadcasting Live Telemetry
                  </span>
                </div>
                <span className="mono text-[11px] font-bold text-muted-foreground">
                  Pings: <strong className="text-foreground">{pingCount}</strong>
                </span>
              </div>

              {lastCoords ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground">
                      <MapPin size={12} className="text-accent-foreground" />
                      <span>Latitude / Longitude</span>
                    </div>
                    <div className="mono mt-1 text-sm font-extrabold text-foreground">
                      {lastCoords.latitude}, {lastCoords.longitude}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground">
                      <Gauge size={12} className="text-accent-foreground" />
                      <span>Ground Speed</span>
                    </div>
                    <div className="mono mt-1 text-sm font-extrabold text-foreground">
                      {lastCoords.speed ?? 0} <span className="text-xs font-bold text-muted-foreground">km/h</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground">
                      <Signal size={12} className="text-accent-foreground" />
                      <span>GPS Accuracy</span>
                    </div>
                    <div className="mono mt-1 text-sm font-extrabold text-foreground">
                      ±{lastCoords.accuracy ?? 5} <span className="text-xs font-bold text-muted-foreground">m</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
                  Acquiring satellite constellation fix from device...
                </div>
              )}

              {lastPingTime && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Last backend handshake:</span>
                  <span className="mono font-bold text-foreground">{lastPingTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Geo Error Warning */}
          {geoError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-bold text-destructive">
              {geoError}
            </div>
          )}

          {/* Instructions Box */}
          <div className="rounded-2xl border border-border bg-muted/30 p-5 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck size={14} className="text-accent-foreground" />
              <span>Two-Phone Physical Testing Verification</span>
            </div>
            <p>
              1. Open this page on <strong>Phone 2 (Driver Phone)</strong> and tap <strong>Start Live GPS Broadcast</strong>.
            </p>
            <p>
              2. Open ACIMS AI Assistant on <strong>Phone 1 (Student Phone)</strong> and ask <em>"Where is my bus?"</em>.
            </p>
            <p>
              3. Physically move Phone 2; Phone 1 will report the real updated coordinates and recalculated ETA with zero simulated movement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
