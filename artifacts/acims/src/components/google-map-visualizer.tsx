import { useEffect, useRef, useState, useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import {
  BusFront,
  Navigation2,
  Clock,
  MapPin,
  LocateFixed,
  Compass,
  Gauge,
  Radio,
  Layers,
  Sparkles,
} from "lucide-react";
import type { RouteStop, EnrichedBusLocation } from "@/lib/realtime-location";

export const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY) ||
  "AIzaSyDyfXmT7lbpDPpOzqNHzyJsB8lCsKoxrkM";

/**
 * Declarative Polyline component for Google Maps
 */
function GooglePolyline({
  path,
  options,
}: {
  path: google.maps.LatLngLiteral[];
  options?: google.maps.PolylineOptions;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    const polyline = new google.maps.Polyline({
      path,
      map,
      ...options,
    });
    polylineRef.current = polyline;

    return () => {
      polyline.setMap(null);
    };
  }, [map]);

  useEffect(() => {
    if (polylineRef.current) {
      polylineRef.current.setPath(path);
      if (options) {
        polylineRef.current.setOptions(options);
      }
    }
  }, [path, options]);

  return null;
}

/**
 * Camera controller for following bus and auto-fitting bounds
 */
function GoogleCameraController({
  busPosition,
  routeBounds,
  followBus,
}: {
  busPosition: [number, number];
  routeBounds: [number, number][];
  followBus: boolean;
}) {
  const map = useMap();
  const initialFitDone = useRef(false);

  // Initial fit to route bounds
  useEffect(() => {
    if (!map || initialFitDone.current || routeBounds.length < 2) return;
    const bounds = new google.maps.LatLngBounds();
    routeBounds.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    initialFitDone.current = true;
  }, [map, routeBounds]);

  // Smooth follow camera
  useEffect(() => {
    if (!map || !followBus || !busPosition) return;
    map.panTo({ lat: busPosition[0], lng: busPosition[1] });
  }, [map, busPosition, followBus]);

  return null;
}

interface GoogleMapVisualizerProps {
  stops: RouteStop[];
  traveledPath: [number, number][];
  remainingPath: [number, number][];
  busPosition: [number, number];
  busNumber: string;
  location: EnrichedBusLocation | null;
  routeBounds: [number, number][];
  followBus: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
  mapType?: "roadmap" | "satellite" | "hybrid" | "terrain";
  onFollowToggle?: () => void;
  onFitRoute?: () => void;
}

export function GoogleMapVisualizer({
  stops,
  traveledPath,
  remainingPath,
  busPosition,
  busNumber,
  location,
  routeBounds,
  followBus,
  userLocation,
  mapType = "roadmap",
}: GoogleMapVisualizerProps) {
  const [selectedMarker, setSelectedMarker] = useState<"bus" | string | null>(null);
  const [busMarkerRef, busMarker] = useAdvancedMarkerRef();

  // Convert coordinate arrays to Google Maps LatLngLiteral
  const traveledLatLng = useMemo(
    () => traveledPath.map(([lat, lng]) => ({ lat, lng })),
    [traveledPath]
  );

  const remainingLatLng = useMemo(
    () => remainingPath.map(([lat, lng]) => ({ lat, lng })),
    [remainingPath]
  );

  const heading = location?.heading ?? 0;
  const speed = location?.speed ?? 0;
  const accuracy = location?.accuracy ?? null;
  const isLive = location?.freshness === "LIVE";
  const isRecent = location?.freshness === "RECENT";

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["marker", "geometry"]}>
      <div className="relative h-[540px] min-h-[500px] w-full overflow-hidden rounded-[24px]">
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: busPosition[0], lng: busPosition[1] }}
          defaultZoom={14}
          mapTypeId={mapType}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          className="h-full w-full"
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
        >
          <GoogleCameraController
            busPosition={busPosition}
            routeBounds={routeBounds}
            followBus={followBus}
          />

          {/* Traveled portion of route (dashed gray) */}
          {traveledLatLng.length > 1 && (
            <GooglePolyline
              path={traveledLatLng}
              options={{
                strokeColor: "#64748b",
                strokeOpacity: 0.7,
                strokeWeight: 4,
              }}
            />
          )}

          {/* Remaining portion of route (vibrant cyan/navy) */}
          {remainingLatLng.length > 1 && (
            <GooglePolyline
              path={remainingLatLng}
              options={{
                strokeColor: "#0284c7",
                strokeOpacity: 0.95,
                strokeWeight: 6,
              }}
            />
          )}

          {/* Route Stops */}
          {stops.map((stop, idx) => {
            const isNext = stop.id === location?.nextStopId;
            const isAtStop =
              location?.isAtStop &&
              (location?.currentStop === stop.name || isNext);

            return (
              <AdvancedMarker
                key={stop.id}
                position={{ lat: stop.latitude, lng: stop.longitude }}
                title={`${stop.name} (Stop #${idx + 1})`}
                onClick={() => setSelectedMarker(stop.id)}
              >
                <div
                  className={`group relative flex items-center justify-center transition-all ${
                    isAtStop
                      ? "scale-125 z-30"
                      : isNext
                      ? "scale-110 z-20"
                      : "scale-100 z-10"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg text-[11px] font-black transition-all ${
                      isAtStop
                        ? "bg-emerald-500 border-white text-white ring-4 ring-emerald-500/30 animate-pulse"
                        : isNext
                        ? "bg-amber-500 border-white text-white ring-4 ring-amber-500/30"
                        : "bg-card border-border text-foreground hover:border-primary"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {isNext && (
                    <span className="absolute -top-7 whitespace-nowrap rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-sm">
                      Next Stop
                    </span>
                  )}
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Student Device Marker (if available) */}
          {userLocation && (
            <AdvancedMarker
              position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
              title="Your Device Location"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute -inset-1.5 rounded-full bg-blue-500/30 animate-ping" />
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-md">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* MOVING BUS MARKER (Real-Time Driver GPS) */}
          <AdvancedMarker
            ref={busMarkerRef}
            position={{ lat: busPosition[0], lng: busPosition[1] }}
            title={`Bus #${busNumber} - Live Tracking`}
            onClick={() => setSelectedMarker("bus")}
            zIndex={100}
          >
            <div className="relative flex flex-col items-center">
              {/* Accuracy halo ring */}
              {accuracy && accuracy <= 100 && (
                <div
                  className={`absolute -inset-2 rounded-full border opacity-50 transition-all ${
                    isLive
                      ? "border-emerald-500 bg-emerald-500/10 animate-pulse"
                      : "border-blue-500 bg-blue-500/10"
                  }`}
                  style={{
                    width: Math.min(60, Math.max(36, accuracy * 0.8)),
                    height: Math.min(60, Math.max(36, accuracy * 0.8)),
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              )}

              {/* Vehicle Body Container */}
              <div
                className={`relative flex items-center gap-1.5 rounded-2xl border-2 px-3 py-1.5 shadow-2xl transition-all duration-300 ${
                  isLive
                    ? "bg-slate-900 text-white border-emerald-400 ring-4 ring-emerald-500/30"
                    : isRecent
                    ? "bg-slate-900 text-white border-blue-400 ring-2 ring-blue-500/20"
                    : "bg-slate-800 text-slate-200 border-amber-400"
                }`}
              >
                {/* Heading Arrow (Rotated to GPS compass bearing) */}
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 transition-transform duration-500"
                  style={{ transform: `rotate(${heading}deg)` }}
                  title={`Heading: ${Math.round(heading)}°`}
                >
                  <Navigation2 size={14} className="fill-emerald-400" />
                </div>

                {/* Bus Number Badge */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <BusFront size={14} className="text-emerald-400" />
                    <span className="mono text-xs font-black tracking-wider">
                      #{busNumber}
                    </span>
                  </div>
                  {/* Speed Tag */}
                  <span className="text-[9px] font-bold text-slate-300">
                    {speed > 0 ? `${speed} km/h` : "Stopped"}
                  </span>
                </div>

                {/* Live Pulse Dot */}
                <span
                  className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-900 ${
                    isLive
                      ? "bg-emerald-500 animate-ping"
                      : isRecent
                      ? "bg-blue-500"
                      : "bg-amber-500"
                  }`}
                />
                <span
                  className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-900 ${
                    isLive
                      ? "bg-emerald-500"
                      : isRecent
                      ? "bg-blue-500"
                      : "bg-amber-500"
                  }`}
                />
              </div>

              {/* Pin Pointer Tail */}
              <div className="h-2 w-2 rotate-45 bg-slate-900 -mt-1 shadow-md border-r-2 border-b-2 border-emerald-400" />
            </div>
          </AdvancedMarker>

          {/* BUS TELEMETRY INFOWINDOW */}
          {selectedMarker === "bus" && busMarker && (
            <InfoWindow
              anchor={busMarker}
              onCloseClick={() => setSelectedMarker(null)}
              headerContent={
                <div className="flex items-center gap-2 font-black text-sm">
                  <BusFront size={16} className="text-emerald-600" />
                  <span>Bus #{busNumber} · Live Telemetry</span>
                </div>
              }
            >
              <div className="p-1 space-y-2 text-xs min-w-[210px] text-slate-800">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">Signal Status:</span>
                  <span
                    className={`font-black px-2 py-0.5 rounded text-[10px] ${
                      isLive
                        ? "bg-emerald-100 text-emerald-800"
                        : isRecent
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {location?.freshness || "LIVE"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded bg-slate-100 p-1.5">
                    <div className="text-[10px] font-bold text-slate-500">Speed</div>
                    <div className="font-extrabold text-sm text-slate-900">
                      {speed > 0 ? `${speed} km/h` : "Stationary"}
                    </div>
                  </div>
                  <div className="rounded bg-slate-100 p-1.5">
                    <div className="text-[10px] font-bold text-slate-500">Heading</div>
                    <div className="font-extrabold text-sm text-slate-900">
                      {Math.round(heading)}°
                    </div>
                  </div>
                </div>

                <div className="rounded bg-slate-100 p-1.5">
                  <div className="text-[10px] font-bold text-slate-500">Next Stop</div>
                  <div className="font-extrabold text-slate-900">
                    {location?.nextStop || "Campus Stop"}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                    ETA: {location?.formattedEta || `${location?.etaMinutes} min`}
                  </div>
                </div>

                {accuracy && (
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>GPS Accuracy:</span>
                    <span className="font-bold">±{accuracy}m</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Source: Real Device GPS</span>
                  <span>{location?.secondsAgo !== undefined ? `${location.secondsAgo}s ago` : "Live"}</span>
                </div>
              </div>
            </InfoWindow>
          )}

          {/* STOP INFOWINDOW */}
          {selectedMarker && selectedMarker !== "bus" && (
            (() => {
              const stop = stops.find((s) => s.id === selectedMarker);
              if (!stop) return null;
              const idx = stops.indexOf(stop);
              const isNext = stop.id === location?.nextStopId;

              return (
                <InfoWindow
                  position={{ lat: stop.latitude, lng: stop.longitude }}
                  onCloseClick={() => setSelectedMarker(null)}
                  headerContent={
                    <div className="flex items-center gap-1.5 font-black text-sm">
                      <MapPin size={15} className="text-blue-600" />
                      <span>{stop.name}</span>
                    </div>
                  }
                >
                  <div className="p-1 space-y-1 text-xs min-w-[180px]">
                    <div className="text-slate-500 font-semibold">Stop #{idx + 1} on Route</div>
                    {isNext && (
                      <div className="rounded bg-amber-50 p-1.5 text-amber-900 font-bold text-[11px] border border-amber-200">
                        Next Arrival: {location?.formattedEta || `${location?.etaMinutes} min`}
                      </div>
                    )}
                  </div>
                </InfoWindow>
              );
            })()
          )}
        </Map>
      </div>
    </APIProvider>
  );
}
