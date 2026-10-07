import { useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { Navigation, AlertTriangle } from "lucide-react";
import { useAnimatedBusMarker } from "./busMarker";
import type { RoutePathCoordinate, RouteStopModel } from "../routes/routeTypes";
import type { EnrichedBusLocation } from "../lib/realtime-location";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

interface RoutePolylinesAndCameraProps {
  traveledPath: RoutePathCoordinate[];
  remainingPath: RoutePathCoordinate[];
  allPoints: RoutePathCoordinate[];
  busPosition: { lat: number; lng: number } | null;
  userPosition: { lat: number; lng: number } | null;
  followBus: boolean;
  centerOnUserTrigger: number;
}

function RoutePolylinesAndCamera({
  traveledPath,
  remainingPath,
  allPoints,
  busPosition,
  userPosition,
  followBus,
  centerOnUserTrigger,
}: RoutePolylinesAndCameraProps) {
  const map = useMap();
  const initialFitDoneRef = useRef(false);
  const traveledPolylineRef = useRef<google.maps.Polyline | null>(null);
  const remainingPolylineRef = useRef<google.maps.Polyline | null>(null);

  // Reset initial fit when route changes significantly
  const routeKey = useMemo(() => {
    if (allPoints.length === 0) return "empty";
    const first = allPoints[0];
    const last = allPoints[allPoints.length - 1];
    return `${first.latitude.toFixed(4)},${first.longitude.toFixed(4)}-${last.latitude.toFixed(4)},${last.longitude.toFixed(4)}`;
  }, [allPoints]);

  useEffect(() => {
    initialFitDoneRef.current = false;
  }, [routeKey]);

  // Fit route bounds once when loaded
  useEffect(() => {
    if (!map || initialFitDoneRef.current || allPoints.length === 0) return;
    if (typeof google === "undefined" || !google.maps) return;

    const bounds = new google.maps.LatLngBounds();
    allPoints.forEach((pt) => {
      bounds.extend({ lat: pt.latitude, lng: pt.longitude });
    });
    if (busPosition) {
      bounds.extend(busPosition);
    }
    map.fitBounds(bounds, 48);
    initialFitDoneRef.current = true;
  }, [map, allPoints, busPosition]);

  // Smooth pan to bus when followBus is enabled and busPosition updates
  useEffect(() => {
    if (!map || !followBus || !busPosition) return;
    map.panTo(busPosition);
  }, [map, followBus, busPosition]);

  // Center on user location when requested
  useEffect(() => {
    if (!map || centerOnUserTrigger === 0 || !userPosition) return;
    map.panTo(userPosition);
    map.setZoom(16);
  }, [map, centerOnUserTrigger, userPosition]);

  // Render and update Google Maps Polylines for traveled & remaining route
  useEffect(() => {
    if (!map || typeof google === "undefined" || !google.maps) return;

    if (!traveledPolylineRef.current) {
      traveledPolylineRef.current = new google.maps.Polyline({
        strokeColor: "#64748b",
        strokeOpacity: 0.7,
        strokeWeight: 5,
        map,
      });
    }
    traveledPolylineRef.current.setPath(
      traveledPath.map((p) => ({ lat: p.latitude, lng: p.longitude }))
    );

    if (!remainingPolylineRef.current) {
      remainingPolylineRef.current = new google.maps.Polyline({
        strokeColor: "#0f766e",
        strokeOpacity: 0.95,
        strokeWeight: 6,
        map,
      });
    }
    remainingPolylineRef.current.setPath(
      remainingPath.map((p) => ({ lat: p.latitude, lng: p.longitude }))
    );

    return () => {
      if (traveledPolylineRef.current) {
        traveledPolylineRef.current.setMap(null);
        traveledPolylineRef.current = null;
      }
      if (remainingPolylineRef.current) {
        remainingPolylineRef.current.setMap(null);
        remainingPolylineRef.current = null;
      }
    };
  }, [map, traveledPath, remainingPath]);

  return null;
}

export interface GoogleBusMapProps {
  busId: string;
  busNumber: string;
  stops: RouteStopModel[];
  traveledPath: RoutePathCoordinate[];
  remainingPath: RoutePathCoordinate[];
  fullPath: RoutePathCoordinate[];
  location: EnrichedBusLocation | null;
  userLocation: { latitude: number; longitude: number; accuracy?: number | null } | null;
  followBus: boolean;
  centerOnUserTrigger?: number;
  highlightPickupStopId?: string | null;
  heightClassName?: string;
}

export function GoogleBusMap({
  busId,
  busNumber,
  stops,
  traveledPath,
  remainingPath,
  fullPath,
  location,
  userLocation,
  followBus,
  centerOnUserTrigger = 0,
  highlightPickupStopId = null,
  heightClassName = "h-[500px] min-h-[480px]",
}: GoogleBusMapProps) {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [showBusInfoWindow, setShowBusInfoWindow] = useState(false);

  const hasVerifiedGps =
    Boolean(location) &&
    location?.source === "real-device-gps" &&
    typeof location.latitude === "number" &&
    typeof location.longitude === "number";

  const targetLat = hasVerifiedGps
    ? location!.latitude
    : location?.latitude ?? stops[0]?.latitude ?? 12.9287;
  const targetLng = hasVerifiedGps
    ? location!.longitude
    : location?.longitude ?? stops[0]?.longitude ?? 80.132;

  // Use adapted busMarker.ts logic for single-instance smooth coordinate interpolation & freshness
  const {
    position: animatedBusPosition,
    heading,
    freshness,
    secondsAgo,
  } = useAnimatedBusMarker({
    busId,
    busNumber,
    latitude: targetLat,
    longitude: targetLng,
    heading: location?.bearing ?? location?.heading ?? null,
    speedKph: location?.speed ?? null,
    accuracy: location?.accuracy ?? null,
    recordedAt: hasVerifiedGps ? location?.recordedAt : null,
    trackingStatus: location?.trackingStatus,
  });

  const userPosition = useMemo(() => {
    if (!userLocation) return null;
    return { lat: userLocation.latitude, lng: userLocation.longitude };
  }, [userLocation]);

  const selectedStop = useMemo(
    () => stops.find((s) => s.id === selectedStopId) || null,
    [stops, selectedStopId]
  );

  const defaultCenter = useMemo(() => {
    if (animatedBusPosition) return animatedBusPosition;
    if (stops.length > 0) return { lat: stops[0].latitude, lng: stops[0].longitude };
    return { lat: 13.0087, lng: 80.0038 };
  }, [animatedBusPosition, stops]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-[22px] border border-border bg-card p-6 text-center ${heightClassName}`}
      >
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="mt-2 text-sm font-bold text-foreground">
          Google Maps API key not configured
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in your environment to load the live Google Map.
        </p>
      </div>
    );
  }

  const badgeBg =
    freshness === "LIVE"
      ? "#10b981"
      : freshness === "RECENT"
      ? "#3b82f6"
      : freshness === "STALE"
      ? "#f59e0b"
      : "#64748b";

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className={`w-full overflow-hidden rounded-[22px] ${heightClassName}`}>
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={14}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
          gestureHandling="greedy"
          disableDefaultUI={false}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={true}
          className="h-full w-full"
        >
          <RoutePolylinesAndCamera
            traveledPath={traveledPath}
            remainingPath={remainingPath}
            allPoints={fullPath.length > 0 ? fullPath : stops}
            busPosition={animatedBusPosition}
            userPosition={userPosition}
            followBus={followBus}
            centerOnUserTrigger={centerOnUserTrigger}
          />

          {/* Route Pickup Stops */}
          {stops.map((stop, idx) => {
            const isNext = stop.id === location?.nextStopId;
            const isHighlight = stop.id === highlightPickupStopId;
            const isAtThisStop = Boolean(location?.isAtStop && isNext);

            return (
              <AdvancedMarker
                key={stop.id}
                position={{ lat: stop.latitude, lng: stop.longitude }}
                onClick={() => setSelectedStopId(stop.id)}
                title={`${stop.name} (Stop #${idx + 1})`}
              >
                <div
                  data-testid={`map-stop-marker-${stop.id}`}
                  className={`flex items-center justify-center rounded-full border-2 font-mono text-[10px] font-black shadow-md transition-transform hover:scale-110 ${
                    isAtThisStop
                      ? "h-7 w-7 border-white bg-emerald-600 text-white ring-4 ring-emerald-500/30"
                      : isNext
                      ? "h-7 w-7 border-slate-900 bg-amber-400 text-slate-950 ring-4 ring-amber-400/40"
                      : isHighlight
                      ? "h-6 w-6 border-white bg-blue-600 text-white ring-2 ring-blue-400"
                      : "h-5 w-5 border-teal-900 bg-white text-teal-950"
                  }`}
                >
                  {idx + 1}
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Stop InfoWindow */}
          {selectedStop && (
            <InfoWindow
              position={{ lat: selectedStop.latitude, lng: selectedStop.longitude }}
              onCloseClick={() => setSelectedStopId(null)}
            >
              <div className="p-1 text-xs text-slate-900 space-y-1">
                <div className="font-bold text-sm">{selectedStop.name}</div>
                <div className="text-slate-600">
                  Stop Sequence #{selectedStop.sequence + 1}
                </div>
                {selectedStop.id === location?.nextStopId && (
                  <div className="font-extrabold text-teal-700">
                    Next Stop · ETA: {location?.formattedEta || `${location?.etaMinutes ?? "—"} min`}
                  </div>
                )}
              </div>
            </InfoWindow>
          )}

          {/* Student / User Real Device GPS Location Marker */}
          {userPosition && (
            <AdvancedMarker
              position={userPosition}
              title="Your Current Location"
            >
              <div
                data-testid="map-user-location-marker"
                className="relative flex h-5 w-5 items-center justify-center"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-md" />
              </div>
            </AdvancedMarker>
          )}

          {/* Single Persistent Bus Marker (Updates position in-place via useAnimatedBusMarker) */}
          {animatedBusPosition && (
            <AdvancedMarker
              position={animatedBusPosition}
              onClick={() => setShowBusInfoWindow((prev) => !prev)}
              title={`Bus #${busNumber} (${freshness})`}
            >
              <div
                data-testid="google-map-bus-marker"
                data-bus-id={busId}
                data-freshness={freshness}
                className="relative flex flex-col items-center cursor-pointer select-none"
              >
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border-[3px] border-[#e8ff6b] bg-[#1e3f47] text-[#e8ff6b] shadow-xl">
                  <div className="flex flex-col items-center leading-none">
                    <span className="font-mono text-[11px] font-black">
                      #{busNumber}
                    </span>
                    {heading !== null && (
                      <Navigation
                        size={11}
                        className="mt-0.5 text-[#e8ff6b]"
                        style={{ transform: `rotate(${heading}deg)` }}
                      />
                    )}
                  </div>
                  {/* Freshness indicator dot */}
                  <span
                    style={{ backgroundColor: badgeBg }}
                    className={`absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                      freshness === "LIVE" ? "animate-pulse" : ""
                    }`}
                  />
                </div>
                <span className="mt-1 rounded-md bg-slate-900/90 px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-white shadow">
                  {freshness === "LIVE"
                    ? "LIVE"
                    : freshness === "RECENT"
                    ? `RECENT (${secondsAgo}s)`
                    : freshness === "STALE"
                    ? "STALE"
                    : "STANDBY"}
                </span>
              </div>
            </AdvancedMarker>
          )}

          {/* Bus InfoWindow */}
          {showBusInfoWindow && animatedBusPosition && (
            <InfoWindow
              position={animatedBusPosition}
              onCloseClick={() => setShowBusInfoWindow(false)}
            >
              <div className="p-1 text-xs text-slate-900 space-y-1 min-w-[170px]">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm">Bus #{busNumber}</strong>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                    {freshness}
                  </span>
                </div>
                <div>
                  Next Stop: <strong>{location?.nextStop || "—"}</strong>
                </div>
                <div>
                  ETA:{" "}
                  <strong>
                    {hasVerifiedGps
                      ? location?.formattedEta || `${location?.etaMinutes ?? "—"} min`
                      : "Waiting for live GPS"}
                  </strong>
                </div>
                {location?.speed != null && (
                  <div>Speed: {location.speed} km/h</div>
                )}
                <div className="font-mono text-[10px] text-slate-500">
                  {animatedBusPosition.lat.toFixed(6)}, {animatedBusPosition.lng.toFixed(6)}
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}
