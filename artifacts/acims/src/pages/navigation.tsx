import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import {
  Compass,
  Footprints,
  Info,
  LocateFixed,
  MapPin,
  Navigation as NavigationIcon,
  Route as RouteIcon,
  Timer,
} from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { PageHeading } from '@/components/acims-ui';
import { useNetworkStatus } from '@/hooks/use-network';
import {
  REC_BUILDINGS,
  REC_CAMPUS_STOPS,
  REC_POINTS_OF_INTEREST,
  REC_CAMPUS_PATHS,
  REC_CAMPUS_CENTER,
  REC_CAMPUS_BOUNDS,
  calculateCampusWalkingRoute,
  type CampusCoordinate,
} from '@/../../api-server/src/services/campusData';
import 'leaflet/dist/leaflet.css';

interface CampusLocationItem {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  description?: string;
  code?: string;
}

/**
 * Inline local error boundary so any Leaflet / Canvas failure never crashes the Navigation page
 */
class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Map rendering caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[420px] w-full flex-col items-center justify-center rounded-[22px] bg-muted/40 p-6 text-center text-xs text-muted-foreground">
          <p className="font-extrabold text-foreground">Campus Map Display Unavailable</p>
          <p className="mt-1 max-w-sm">Walking distance and itinerary calculations remain fully active.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Controller to smoothly fit map bounds to start and destination with strict safety checks
 */
function NavigationMapController({
  bounds,
  center,
}: {
  bounds?: [number, number][];
  center: [number, number];
}) {
  const map = useMap();
  const prevBoundsRef = useRef<string>('');

  useEffect(() => {
    try {
      map.invalidateSize();
    } catch {
      // Safe no-op if map container is not yet ready
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;
    try {
      const size = map.getSize();
      // Ensure map container has non-zero measured dimensions before attempting fitBounds
      if (bounds && bounds.length >= 2 && size.x > 100 && size.y > 100) {
        const key = JSON.stringify(bounds);
        if (key !== prevBoundsRef.current) {
          prevBoundsRef.current = key;
          map.fitBounds(bounds as [[number, number], [number, number]], {
            padding: [40, 40],
            maxZoom: 17,
          });
        }
      } else if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
        map.setView(center, 16);
      }
    } catch (err) {
      console.warn('NavigationMapController bounds adjustment caught:', err);
      try {
        if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
          map.setView(center, 16);
        }
      } catch {
        // Safe no-op
      }
    }
  }, [map, bounds, center]);

  return null;
}

export default function NavigationPage() {
  const { isOnline } = useNetworkStatus();

  // Combine campus buildings, stops, and points of interest into unified searchable locations
  const campusLocations: CampusLocationItem[] = useMemo(() => {
    const stops: CampusLocationItem[] = REC_CAMPUS_STOPS.map((s) => ({
      id: s.id,
      name: s.name,
      category: 'Transit & Gates',
      latitude: s.latitude,
      longitude: s.longitude,
      description: s.description,
    }));

    const buildings: CampusLocationItem[] = REC_BUILDINGS.map((b) => ({
      id: b.id,
      name: b.name,
      category:
        b.category === 'academic'
          ? 'Academic Buildings'
          : b.category === 'admin'
            ? 'Administrative'
            : b.category === 'hostel'
              ? 'Hostels & Residences'
              : 'Facilities & Labs',
      latitude: b.latitude,
      longitude: b.longitude,
      description: b.description,
      code: b.code,
    }));

    const pois: CampusLocationItem[] = REC_POINTS_OF_INTEREST.map((p) => ({
      id: p.id,
      name: p.name,
      category: 'Food & Services',
      latitude: p.latitude,
      longitude: p.longitude,
      description: `Near ${p.landmarkNear}`,
    }));

    return [...stops, ...buildings, ...pois];
  }, []);

  // Helper to find location with flexible ID matching
  const findLocation = (id: string): CampusLocationItem | undefined => {
    return campusLocations.find(
      (l) =>
        l.id === id ||
        l.id === `${id}-stop` ||
        l.id === `poi-${id}` ||
        id === `${l.id}-stop` ||
        id === `poi-${l.id}` ||
        l.id.replace(/^(poi-|rec-)/, '') === id.replace(/^(poi-|rec-)/, '')
    );
  };

  // Origin (FROM) selection - Defaults to verified campus stop
  const [startId, setStartId] = useState<string>('rec-main-gate-stop');
  const [customStartCoords, setCustomStartCoords] = useState<CampusCoordinate | null>(null);
  const [gpsNote, setGpsNote] = useState<string>('');

  // Destination (TO) selection - Defaults to Central Academic Block
  const [destId, setDestId] = useState<string>('rec-central-college');

  // Check if destination was passed from Campus Map or other pages
  useEffect(() => {
    try {
      const savedDest = localStorage.getItem('acims-nav-destination');
      if (savedDest) {
        const found = findLocation(savedDest);
        if (found) {
          setDestId(found.id);
          localStorage.removeItem('acims-nav-destination');
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [campusLocations]);

  // Resolve start location safely
  const startLocation = useMemo<CampusLocationItem>(() => {
    if (customStartCoords) {
      return {
        id: 'custom-gps',
        name: gpsNote || 'My Current GPS Location',
        category: 'Device Location',
        latitude: customStartCoords.latitude,
        longitude: customStartCoords.longitude,
      };
    }
    return (
      findLocation(startId) ??
      campusLocations[0] ?? {
        id: 'rec-main-gate-stop',
        name: 'REC Main Gate Terminal',
        category: 'Transit & Gates',
        latitude: REC_CAMPUS_CENTER.latitude,
        longitude: REC_CAMPUS_CENTER.longitude,
      }
    );
  }, [campusLocations, startId, customStartCoords, gpsNote]);

  // Resolve destination location safely
  const destLocation = useMemo<CampusLocationItem>(() => {
    return (
      findLocation(destId) ??
      campusLocations[1] ?? {
        id: 'rec-central-college',
        name: 'Central Academic Block',
        category: 'Academic Buildings',
        latitude: REC_CAMPUS_CENTER.latitude,
        longitude: REC_CAMPUS_CENTER.longitude,
      }
    );
  }, [campusLocations, destId]);

  // Calculate walking route using existing campus path data
  const walkingRoute = useMemo(() => {
    if (!startLocation || !destLocation) return null;

    if (startLocation.id === destLocation.id) {
      return {
        isSameLocation: true,
        start: startLocation,
        destination: destLocation,
        distanceMeters: 0,
        distanceKm: 0,
        walkingMinutes: 0,
        pathWaypoints: [
          { latitude: startLocation.latitude, longitude: startLocation.longitude },
        ],
      };
    }

    try {
      const route = calculateCampusWalkingRoute(startLocation.id, destLocation.id);
      if (route && Array.isArray(route.pathWaypoints) && route.pathWaypoints.length > 0) {
        return {
          isSameLocation: false,
          start: route.start || startLocation,
          destination: route.destination || destLocation,
          distanceMeters: typeof route.distanceMeters === 'number' ? route.distanceMeters : 0,
          distanceKm: typeof route.distanceMeters === 'number' ? Number((route.distanceMeters / 1000).toFixed(2)) : 0,
          walkingMinutes: typeof route.walkingMinutes === 'number' ? route.walkingMinutes : 1,
          pathWaypoints: route.pathWaypoints,
        };
      }
    } catch (err) {
      console.warn('Campus walking route calculation warning:', err);
    }

    return null;
  }, [startLocation, destLocation]);

  // Request browser GPS position
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setGpsNote('Geolocation is not supported by your browser.');
      return;
    }

    setGpsNote('Detecting current GPS coordinates…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomStartCoords({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        setGpsNote(`My GPS Location (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setCustomStartCoords(null);
        setGpsNote(`Location unavailable: ${err.message}. Using selected location.`);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  // Group locations by category for clean dropdown rendering
  const groupedLocations = useMemo(() => {
    const groups: Record<string, CampusLocationItem[]> = {};
    for (const loc of campusLocations) {
      if (!groups[loc.category]) {
        groups[loc.category] = [];
      }
      groups[loc.category].push(loc);
    }
    return groups;
  }, [campusLocations]);

  // Compute map bounds safely
  const mapBounds: [number, number][] | undefined = useMemo(() => {
    if (walkingRoute && walkingRoute.pathWaypoints && walkingRoute.pathWaypoints.length >= 2) {
      return walkingRoute.pathWaypoints.map((p) => [p.latitude, p.longitude] as [number, number]);
    }
    if (startLocation && destLocation && startLocation.id !== destLocation.id) {
      return [
        [startLocation.latitude, startLocation.longitude],
        [destLocation.latitude, destLocation.longitude],
      ];
    }
    return undefined;
  }, [walkingRoute, startLocation, destLocation]);

  // Compute map center safely
  const mapCenter: [number, number] = useMemo(() => {
    const lat = (startLocation.latitude + destLocation.latitude) / 2;
    const lng = (startLocation.longitude + destLocation.longitude) / 2;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [lat, lng];
    }
    return [REC_CAMPUS_CENTER.latitude, REC_CAMPUS_CENTER.longitude];
  }, [startLocation.latitude, startLocation.longitude, destLocation.latitude, destLocation.longitude]);

  return (
    <div className="page-in min-h-[calc(100vh-80px)]">
      <PageHeading
        eyebrow="Adaptive campus mobility"
        title="Campus Navigation"
        description="Select any two campus buildings, stops, or landmarks to calculate walking distance, travel time, and pathway guidance."
      />

      {/* Quick Destination Presets */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mr-1">
          Quick destinations:
        </span>
        {campusLocations.slice(0, 5).map((d) => (
          <button
            key={d.id}
            type="button"
            data-testid={`preset-dest-${d.id}`}
            onClick={() => setDestId(d.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
              destLocation?.id === d.id
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card hover:bg-muted text-foreground'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <section className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
        {/* Controls Card */}
        <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8 space-y-5">
          <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
            Plan a Campus Trip
          </div>

          {/* FROM: Start Location */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-foreground" htmlFor="select-start-location">
                FROM: Starting Location
              </label>
              <button
                type="button"
                onClick={handleUseGPS}
                data-testid="button-use-gps-origin"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-foreground hover:underline"
              >
                <LocateFixed size={12} />
                <span>Use Device GPS</span>
              </button>
            </div>

            {customStartCoords ? (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-accent bg-accent/10 px-3.5 py-3 text-xs font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <LocateFixed size={14} className="text-accent-foreground" />
                  <span className="truncate">{gpsNote || 'Device GPS Position'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartCoords(null);
                    setGpsNote('');
                  }}
                  className="text-[11px] underline text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              </div>
            ) : (
              <select
                id="select-start-location"
                data-testid="select-navigation-start"
                value={startLocation.id}
                onChange={(e) => setStartId(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(groupedLocations).map(([category, items]) => (
                  <optgroup key={category} label={category}>
                    {items.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.code ? `(${loc.code})` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          {/* TO: Destination Location */}
          <div>
            <label className="block text-xs font-extrabold text-foreground" htmlFor="select-dest-location">
              TO: Destination Location
            </label>
            <select
              id="select-dest-location"
              data-testid="select-navigation-destination"
              value={destLocation.id}
              onChange={(e) => setDestId(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(groupedLocations).map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.code ? `(${loc.code})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Quick Swap Button */}
          <div className="pt-1">
            <button
              type="button"
              data-testid="button-swap-locations"
              onClick={() => {
                if (customStartCoords) {
                  setCustomStartCoords(null);
                  setGpsNote('');
                }
                const oldStart = startLocation.id;
                const oldDest = destLocation.id;
                setStartId(oldDest);
                setDestId(oldStart);
              }}
              className="w-full rounded-xl border border-border/70 bg-muted/40 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              ⇅ Swap Starting Point &amp; Destination
            </button>
          </div>

          {/* Path Status & Summary Box */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
              <RouteIcon size={14} className="text-accent-foreground" />
              <span>Campus Pathway Navigation</span>
            </div>

            {walkingRoute ? (
              walkingRoute.isSameLocation ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Start and destination are the same location. You are already at{' '}
                  <strong className="text-foreground">{destLocation.name}</strong>.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Walking Distance:</span>
                    <strong className="text-foreground font-extrabold">
                      {walkingRoute.distanceMeters} m ({walkingRoute.distanceKm} km)
                    </strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Approx. Walking Time:</span>
                    <strong className="text-foreground font-extrabold">
                      ~{walkingRoute.walkingMinutes} min (at 5 km/h)
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Path Type:</span>
                    <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                      Illuminated Internal Walkway
                    </span>
                  </div>
                </div>
              )
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>Walking route data is currently unavailable for these locations.</span>
              </div>
            )}
          </div>
        </div>

        {/* Map & Results Panel */}
        <div className="min-h-[560px] rounded-[28px] border border-border bg-secondary/35 p-3 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="relative overflow-hidden rounded-[22px] border border-border bg-card shadow-sm flex-1 min-h-[380px]">
            <MapErrorBoundary>
              <MapContainer
                center={mapCenter}
                zoom={16}
                scrollWheelZoom={false}
                className="h-[420px] min-h-[380px] w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <NavigationMapController bounds={mapBounds} center={mapCenter} />

                {/* Campus background pathways */}
                {REC_CAMPUS_PATHS.map((path) => (
                  <Polyline
                    key={path.id}
                    positions={path.coordinates.map((c) => [c.latitude, c.longitude] as [number, number])}
                    pathOptions={{
                      color: '#94a3b8',
                      weight: 3,
                      dashArray: '4, 6',
                      opacity: 0.5,
                    }}
                  />
                ))}

                {/* Walking route polyline */}
                {walkingRoute && walkingRoute.pathWaypoints && walkingRoute.pathWaypoints.length > 1 && (
                  <Polyline
                    positions={walkingRoute.pathWaypoints.map((p) => [p.latitude, p.longitude] as [number, number])}
                    pathOptions={{
                      color: '#0284c7',
                      weight: 6,
                      opacity: 0.9,
                    }}
                  />
                )}

                {/* Start Marker */}
                <CircleMarker
                  center={[startLocation.latitude, startLocation.longitude]}
                  radius={9}
                  pathOptions={{
                    color: '#047857',
                    fillColor: '#10b981',
                    fillOpacity: 1,
                    weight: 3,
                  }}
                >
                  <Tooltip permanent direction="top">
                    <span className="font-extrabold text-[11px]">Start: {startLocation.name}</span>
                  </Tooltip>
                </CircleMarker>

                {/* Destination Marker */}
                <Marker
                  position={[destLocation.latitude, destLocation.longitude]}
                  icon={divIcon({
                    className: 'acims-dest-marker',
                    html: '<div style="display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:#dc2626;color:white;font-weight:900;font-size:16px;box-shadow:0 3px 8px rgba(0,0,0,0.35)">📍</div>',
                    iconSize: [34, 34],
                    iconAnchor: [17, 17],
                  })}
                >
                  <Tooltip permanent direction="bottom">
                    <span className="font-extrabold text-[11px]">Destination: {destLocation.name}</span>
                  </Tooltip>
                </Marker>
              </MapContainer>
            </MapErrorBoundary>
          </div>

          {/* Metric Tiles and Step Itinerary */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">
                  Selected Journey
                </div>
                <h2 className="mt-1 text-base sm:text-lg font-extrabold text-foreground">
                  {startLocation.name} → {destLocation.name}
                </h2>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-extrabold uppercase">
                Pedestrian Walkway
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted/60 p-3">
                <MapPin size={14} className="text-muted-foreground" />
                <div className="mono mt-2 text-[9px] uppercase tracking-[.12em] text-muted-foreground">
                  Total Distance
                </div>
                <div className="mt-1 truncate text-xs font-extrabold text-foreground">
                  {walkingRoute ? `${walkingRoute.distanceMeters} m` : 'Unavailable'}
                </div>
              </div>

              <div className="rounded-xl bg-muted/60 p-3">
                <Timer size={14} className="text-muted-foreground" />
                <div className="mono mt-2 text-[9px] uppercase tracking-[.12em] text-muted-foreground">
                  Est. Walking Time
                </div>
                <div className="mt-1 truncate text-xs font-extrabold text-foreground">
                  {walkingRoute ? `~${walkingRoute.walkingMinutes} min` : 'Unavailable'}
                </div>
              </div>

              <div className="rounded-xl bg-muted/60 p-3">
                <Footprints size={14} className="text-muted-foreground" />
                <div className="mono mt-2 text-[9px] uppercase tracking-[.12em] text-muted-foreground">
                  Pace
                </div>
                <div className="mt-1 truncate text-xs font-extrabold text-foreground">
                  Normal (~80 m/min)
                </div>
              </div>
            </div>

            {/* Step Guidance */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs text-muted-foreground space-y-1.5">
              <div className="font-extrabold text-foreground text-[11px] uppercase tracking-wider">
                Walking Guidance:
              </div>
              <p>
                1. Depart from <strong className="text-foreground">{startLocation.name}</strong> along the designated campus pedestrian avenue.
              </p>
              <p>
                2. Follow lit central pathways toward <strong className="text-foreground">{destLocation.name}</strong> ({destLocation.category}).
              </p>
              <p>
                3. Arrive at building entrance. Emergency security call pillars are stationed along the quad.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
