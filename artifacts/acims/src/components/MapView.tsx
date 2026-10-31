import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RecRoute, RecRouteStop } from '@/data/recRoutes';

// Custom Leaflet Icons for Stops, Via Points, College, and Bus
function createStopIcon(sequence: number, isSelected: boolean) {
  if (isSelected) {
    return L.divIcon({
      className: 'rec-selected-stop-icon',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:34px;height:34px;border-radius:50%;background:rgba(245,158,11,0.35);animation:pulse 1.8s infinite;"></div>
          <div style="position:relative;width:26px;height:26px;border-radius:50%;background:#f59e0b;border:3px solid #ffffff;color:#ffffff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.35);">
            ★
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }

  return L.divIcon({
    className: 'rec-standard-stop-icon',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#0284c7;border:2.5px solid #ffffff;color:#ffffff;font-size:10px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.25);">
        ${sequence}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function createViaStopIcon() {
  return L.divIcon({
    className: 'rec-via-stop-icon',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#ffffff;border:3px dashed #64748b;color:#475569;font-size:11px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.2);">
        ○
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createCollegeIcon() {
  return L.divIcon({
    className: 'rec-college-stop-icon',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;background:#059669;border:3px solid #ffffff;color:#ffffff;font-size:14px;font-weight:900;box-shadow:0 3px 10px rgba(0,0,0,0.35);">
        🎓
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function createBusIcon(busNumber: string, heading: number = 0) {
  return L.divIcon({
    className: 'rec-moving-bus-icon',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:42px;height:42px;border-radius:50%;background:rgba(16,185,129,0.35);animation:pulse 1.5s infinite;"></div>
        <div style="position:relative;width:32px;height:32px;border-radius:50%;background:#10b981;border:3px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);">
          <span style="font-size:12px;font-weight:900;">🚌</span>
        </div>
        <div style="position:absolute;bottom:-18px;background:#0f172a;color:#ffffff;font-size:9px;font-weight:900;padding:1px 6px;border-radius:9999px;white-space:nowrap;border:1px solid rgba(255,255,255,0.4);box-shadow:0 2px 4px rgba(0,0,0,0.3);">
          BUS #${busNumber}
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

/**
 * Controller inside MapContainer to dynamically fit bounds and invalidate size on route changes
 */
function MapBoundsAndCameraController({
  route,
  busPosition,
}: {
  route: RecRoute | null;
  busPosition?: { latitude: number; longitude: number } | null;
}) {
  const map = useMap();
  const lastRouteIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Invalidate map size to prevent rendering issues in dynamic tabs/containers
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (!route || route.stops.length === 0) return;

    // Calculate bounds from all route stops
    const bounds = L.latLngBounds(
      route.stops.map((s) => [s.lat, s.lng] as [number, number])
    );

    // Also include route path waypoints in the bounds
    if (route.path && route.path.length > 0) {
      route.path.forEach((pt) => bounds.extend(pt));
    }

    // Include moving bus position if present
    if (busPosition) {
      bounds.extend([busPosition.latitude, busPosition.longitude]);
    }

    // Fit bounds on route change or initial load
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 15,
        animate: lastRouteIdRef.current === route.id,
      });
      lastRouteIdRef.current = route.id;
    }
  }, [map, route, busPosition]);

  return null;
}

export interface MapViewProps {
  route: RecRoute | null;
  busPosition?: { latitude: number; longitude: number; heading?: number | null } | null;
  selectedBoardingStopId?: string | null;
  heightClassName?: string;
  isSimulatedRoute?: boolean;
}

export function MapView({
  route,
  busPosition = null,
  selectedBoardingStopId = null,
  heightClassName = 'h-[520px] min-h-[460px]',
  isSimulatedRoute = false,
}: MapViewProps) {
  // If no route is provided
  if (!route) {
    return (
      <div className={`flex items-center justify-center rounded-[24px] border border-border bg-card p-6 text-center text-sm font-bold text-muted-foreground ${heightClassName}`}>
        No bus route selected. Choose a route to view its map and stops.
      </div>
    );
  }

  // Calculate initial center from route stops
  const initialCenter: [number, number] = useMemo(() => {
    if (route.stops.length > 0) {
      const mid = Math.floor(route.stops.length / 2);
      return [route.stops[mid].lat, route.stops[mid].lng];
    }
    return [13.0084, 80.0033]; // College Campus
  }, [route]);

  // Separate path into traveled and remaining if simulated bus is on Route 18
  const { traveledPath, remainingPath } = useMemo(() => {
    if (!isSimulatedRoute || !busPosition || !route.path || route.path.length === 0) {
      return { traveledPath: [], remainingPath: route.path };
    }

    // Find closest index on path to current bus location
    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < route.path.length; i++) {
      const pt = route.path[i];
      const d =
        Math.pow(pt[0] - busPosition.latitude, 2) +
        Math.pow(pt[1] - busPosition.longitude, 2);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    const traveled = route.path.slice(0, closestIdx + 1);
    const busCoord: [number, number] = [busPosition.latitude, busPosition.longitude];
    const remaining = [busCoord, ...route.path.slice(closestIdx)];

    return { traveledPath: traveled, remainingPath: remaining };
  }, [isSimulatedRoute, busPosition, route.path]);

  return (
    <div className={`relative w-full overflow-hidden rounded-[24px] border border-border bg-card shadow-sm ${heightClassName}`}>
      <MapContainer
        key={route.id}
        center={initialCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsAndCameraController route={route} busPosition={busPosition} />

        {/* 1. Route Polyline: Traveled portion (slate) if simulated, else full path */}
        {traveledPath.length > 1 && (
          <Polyline
            positions={traveledPath}
            pathOptions={{
              color: '#64748b',
              weight: 5,
              opacity: 0.65,
              dashArray: '4 6',
            }}
          />
        )}

        {/* 2. Route Polyline: Active/Remaining portion (teal/blue) */}
        {remainingPath.length > 1 && (
          <Polyline
            positions={remainingPath}
            pathOptions={{
              color: isSimulatedRoute ? '#059669' : '#0284c7',
              weight: 6,
              opacity: 0.95,
            }}
          />
        )}

        {/* 3. Render all route stops with exact markers */}
        {route.stops.map((stop) => {
          const isSelected =
            Boolean(selectedBoardingStopId) &&
            (stop.id === selectedBoardingStopId ||
              stop.name.toLowerCase() === selectedBoardingStopId?.toLowerCase());

          const icon = stop.isCollege
            ? createCollegeIcon()
            : stop.isVia
            ? createViaStopIcon()
            : createStopIcon(stop.sequence, isSelected);

          return (
            <Marker
              key={`${route.id}-${stop.id}`}
              position={[stop.lat, stop.lng]}
              icon={icon}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.96}>
                <div className="p-1 text-xs">
                  <div className="font-extrabold text-foreground">
                    {stop.name}
                  </div>
                  {stop.isCollege ? (
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      College Destination · {stop.time}
                    </div>
                  ) : stop.isVia ? (
                    <div className="text-[11px] font-bold text-muted-foreground">
                      ○ VIA / NON-STOP POINT
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      Approx. arrival: <span className="font-bold text-foreground">{stop.time}</span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="mt-1 inline-block rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                      ★ YOUR BOARDING STOP
                    </div>
                  )}
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* 4. Render moving bus marker ONLY if this route is simulated (Route 18) and position is available */}
        {isSimulatedRoute && busPosition && (
          <Marker
            position={[busPosition.latitude, busPosition.longitude]}
            icon={createBusIcon(route.routeNumber, busPosition.heading || 0)}
          >
            <Tooltip direction="top" offset={[0, -20]} permanent={false} opacity={0.98}>
              <div className="p-1 text-xs">
                <div className="font-black text-emerald-600 dark:text-emerald-400">
                  ● Bus #{route.routeNumber} (Moving)
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Simulated live onboard GPS
                </div>
              </div>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
