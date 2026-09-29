import { useMemo, useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  BusFront, 
  Compass, 
  MapPin, 
  Navigation, 
  Search, 
  Utensils, 
  Footprints, 
  Coffee, 
  ShieldCheck, 
  GraduationCap, 
  Layers, 
  LocateFixed, 
  Info,
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  WifiOff
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
  type CampusBuilding,
  type CampusBusStop,
  type PointOfInterest,
  type CampusCoordinate
} from '@/../../api-server/src/services/campusData';
import 'leaflet/dist/leaflet.css';

type SelectedItem = 
  | { type: 'building'; data: CampusBuilding }
  | { type: 'stop'; data: CampusBusStop }
  | { type: 'poi'; data: PointOfInterest }
  | null;

/**
 * Camera controller to fit bounds or pan to selected landmark
 */
function CampusMapController({ 
  selectedCoord, 
  walkingPath,
  campusBounds 
}: { 
  selectedCoord: [number, number] | null; 
  walkingPath: [number, number][];
  campusBounds: [[number, number], [number, number]];
}) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      map.fitBounds(campusBounds, { padding: [25, 25], maxZoom: 17 });
      initializedRef.current = true;
    }
  }, [map, campusBounds]);

  useEffect(() => {
    if (walkingPath.length > 1) {
      map.fitBounds(walkingPath, { padding: [50, 50], maxZoom: 18 });
    } else if (selectedCoord) {
      map.flyTo(selectedCoord, 17, { duration: 1.0 });
    }
  }, [map, selectedCoord, walkingPath]);

  return null;
}

export default function CampusMapPage() {
  const { isOnline } = useNetworkStatus();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'academic' | 'stops' | 'food' | 'hostel' | 'facility'>('all');
  
  // Selection
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);

  // Navigation state (From -> To)
  const [startLocationId, setStartLocationId] = useState<string>('rec-main-gate');
  const [destLocationId, setDestLocationId] = useState<string>('rec-central-college');
  const [activeRoute, setActiveRoute] = useState<ReturnType<typeof calculateCampusWalkingRoute> | null>(null);

  // User location
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locatingStatus, setLocatingStatus] = useState<string>('');

  // Combined searchable campus items
  const allLocations = useMemo(() => {
    const buildings = REC_BUILDINGS.map((b) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      description: b.description,
      latitude: b.latitude,
      longitude: b.longitude,
      itemType: 'building' as const,
      raw: b,
    }));

    const stops = REC_CAMPUS_STOPS.map((s) => ({
      id: s.id,
      name: s.name,
      category: 'stops',
      description: `Bus stops served: ${s.servedRoutes.join(', ')}`,
      latitude: s.latitude,
      longitude: s.longitude,
      itemType: 'stop' as const,
      raw: s,
    }));

    const pois = REC_POINTS_OF_INTEREST.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category === 'food' ? 'food' : 'facility',
      description: `Near ${p.landmarkNear}`,
      latitude: p.latitude,
      longitude: p.longitude,
      itemType: 'poi' as const,
      raw: p,
    }));

    return [...buildings, ...stops, ...pois];
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allLocations.filter((item) => {
      // Category filter
      if (activeCategory === 'academic' && item.category !== 'academic' && item.category !== 'lab') return false;
      if (activeCategory === 'stops' && item.itemType !== 'stop') return false;
      if (activeCategory === 'food' && item.category !== 'food') return false;
      if (activeCategory === 'hostel' && item.category !== 'hostel') return false;
      if (activeCategory === 'facility' && item.category !== 'facility' && item.category !== 'admin') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allLocations, activeCategory, searchQuery]);

  // Handle Find Route
  const handleFindRoute = () => {
    if (!startLocationId || !destLocationId) return;
    const result = calculateCampusWalkingRoute(startLocationId, destLocationId);
    setActiveRoute(result);
    if (result) {
      setSelectedItem({
        type: 'building',
        data: REC_BUILDINGS.find((b) => b.id === destLocationId) ?? {
          id: destLocationId,
          name: result.destination.name,
          category: 'academic',
          description: 'Destination',
          latitude: result.destination.latitude,
          longitude: result.destination.longitude,
        },
      });
    }
  };

  // Clear walking route
  const handleClearRoute = () => {
    setActiveRoute(null);
  };

  // Convert active route waypoints to Leaflet polyline format
  const walkingPolylineCoords = useMemo(() => {
    if (!activeRoute?.pathWaypoints) return [];
    return activeRoute.pathWaypoints.map((p) => [p.latitude, p.longitude] as [number, number]);
  }, [activeRoute]);

  const selectedCoord: [number, number] | null = useMemo(() => {
    if (selectedItem) {
      return [selectedItem.data.latitude, selectedItem.data.longitude];
    }
    return null;
  }, [selectedItem]);

  // Request browser geolocation for walking navigation
  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocatingStatus('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingStatus('Locating your position on campus…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords([pos.coords.latitude, pos.coords.longitude]);
        setLocatingStatus('Your location is visible on the REC campus map.');
      },
      (err) => {
        setLocatingStatus(`Position unavailable (${err.message}). Centering on Main Gate.`);
      },
      { timeout: 7000 }
    );
  };

  return (
    <div className="page-in space-y-6">
      {/* Top Header */}
      <PageHeading
        eyebrow="Campus Mobility · Satellite Layout"
        title="REC Campus Mobility"
        description="Visual spatial guide of Rajalakshmi Engineering College (REC) campus, internal roadways, pedestrian walking pathways, and college bus stops."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!isOnline && (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                <WifiOff size={13} />
                <span>Offline Campus Mode</span>
              </span>
            )}
            <button
              type="button"
              onClick={locateMe}
              data-testid="button-campus-locate"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm transition hover:bg-muted"
            >
              <LocateFixed size={14} className="text-primary" />
              <span>{userCoords ? 'My Position Active' : 'Locate Me'}</span>
            </button>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-bold text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Thandalam Campus</span>
            </div>
          </div>
        }
      />

      {locatingStatus && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          {locatingStatus}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left Control Panel: Search & Walking Navigation */}
        <div className="flex flex-col gap-5">
          {/* Search Box */}
          <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
            <label htmlFor="campus-search-input" className="mono flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <Search size={14} /> Search campus location
            </label>
            <div className="relative mt-2.5">
              <input
                id="campus-search-input"
                data-testid="input-campus-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Main Block, Architecture, Hostel, Domino's…"
                className="h-11 w-full rounded-xl border border-input bg-background pl-3.5 pr-8 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'academic', label: 'Buildings' },
                { id: 'stops', label: 'Bus Stops' },
                { id: 'food', label: 'Food' },
                { id: 'hostel', label: 'Hostels' },
                { id: 'facility', label: 'Facilities' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    activeCategory === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campus Walking Navigation Module */}
          <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-foreground">
                <Footprints size={16} className="text-primary" />
                <span>Internal Campus Walking Route</span>
              </div>
              {activeRoute && (
                <button
                  type="button"
                  onClick={handleClearRoute}
                  className="text-[11px] font-bold text-destructive hover:underline"
                >
                  Clear Route
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mono block text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                  From:
                </label>
                <select
                  data-testid="select-nav-from"
                  aria-label="Select campus starting point"
                  value={startLocationId}
                  onChange={(e) => setStartLocationId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="rec-main-gate">REC Main Gate (மெயின் கேட்)</option>
                  {allLocations.map((loc) => (
                    <option key={`from-${loc.id}`} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mono block text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                  To:
                </label>
                <select
                  data-testid="select-nav-to"
                  aria-label="Select campus destination"
                  value={destLocationId}
                  onChange={(e) => setDestLocationId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {allLocations.map((loc) => (
                    <option key={`to-${loc.id}`} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleFindRoute}
                data-testid="button-find-route"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                <Navigation size={14} />
                <span>Find Route</span>
              </button>
            </div>

            {/* Walking Route Results Display */}
            {activeRoute && (
              <div className="mt-4 rounded-2xl border-2 border-primary/20 bg-secondary/20 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                      Destination
                    </div>
                    <div className="mt-0.5 text-sm font-black text-foreground">
                      {activeRoute.destination.name}
                    </div>
                  </div>
                  <span className="rounded-full bg-accent/40 px-2 py-0.5 text-[10px] font-black text-accent-foreground">
                    Walk
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                  <div className="flex items-center gap-2">
                    <Footprints size={14} className="text-primary" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Walking distance</div>
                      <div className="text-xs font-extrabold text-foreground">
                        {activeRoute.distanceMeters} meters
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-primary" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Est. walking time</div>
                      <div className="text-xs font-extrabold text-primary dark:text-accent">
                        ~{activeRoute.walkingMinutes} min
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                  Follow the highlighted blue walking route along internal campus pathways.
                </p>
              </div>
            )}
          </div>

          {/* Search Results / Landmark Directory List */}
          <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-bold">
                Nearby Locations ({filteredItems.length})
              </span>
            </div>

            <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.data.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`card-campus-item-${item.id}`}
                    onClick={() => {
                      if (item.itemType === 'building') {
                        setSelectedItem({ type: 'building', data: item.raw as CampusBuilding });
                      } else if (item.itemType === 'stop') {
                        setSelectedItem({ type: 'stop', data: item.raw as CampusBusStop });
                      } else {
                        setSelectedItem({ type: 'poi', data: item.raw as PointOfInterest });
                      }
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                      isSelected
                        ? 'border-2 border-primary bg-primary/10 shadow-sm'
                        : 'border border-border/80 bg-muted/30 hover:bg-muted'
                    }`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      item.itemType === 'stop'
                        ? 'bg-blue-600 text-white'
                        : item.category === 'food'
                        ? 'bg-amber-500 text-white'
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      {item.itemType === 'stop' ? (
                        <BusFront size={16} />
                      ) : item.category === 'food' ? (
                        <Utensils size={15} />
                      ) : (
                        <Building2 size={16} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-black text-foreground">
                          {item.name}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive REC Leaflet Map Canvas */}
        <div className="flex flex-col gap-4">
          <div className="relative min-h-[580px] overflow-hidden rounded-[28px] border-2 border-border bg-secondary/35 p-3 sm:p-5">
            {/* Top Campus Landmark Badge */}
            <div className="absolute left-6 top-6 z-[500] flex flex-col gap-1 rounded-2xl border border-border bg-card/90 px-4 py-2.5 shadow-md backdrop-blur-md">
              <div className="mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-bold">
                Campus Mobility Layer
              </div>
              <div className="flex items-center gap-2 text-sm font-black text-foreground">
                <GraduationCap size={18} className="text-primary" />
                <span>Rajalakshmi Engineering College (REC)</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-semibold">
                Thandalam, Chennai · NH4 Highway
              </div>
            </div>

            {/* Leaflet Map */}
            <MapContainer
              center={[REC_CAMPUS_CENTER.latitude, REC_CAMPUS_CENTER.longitude]}
              zoom={16}
              scrollWheelZoom={false}
              className="h-[540px] min-h-[500px] w-full rounded-[22px]"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <CampusMapController
                selectedCoord={selectedCoord}
                walkingPath={walkingPolylineCoords}
                campusBounds={REC_CAMPUS_BOUNDS}
              />

              {/* 1. Internal Campus Road Network (Visible roads in satellite reference) */}
              {REC_CAMPUS_PATHS.map((path) => (
                <Polyline
                  key={path.id}
                  positions={path.coordinates.map((c) => [c.latitude, c.longitude] as [number, number])}
                  pathOptions={{
                    color: path.type === 'road' ? '#94a3b8' : '#cbd5e1',
                    weight: path.type === 'road' ? 7 : 4,
                    opacity: 0.85,
                  }}
                >
                  <Tooltip direction="top">{path.name}</Tooltip>
                </Polyline>
              ))}

              {/* 2. Highlighted Walking Navigation Route (When Find Route is pressed) */}
              {walkingPolylineCoords.length > 1 && (
                <Polyline
                  positions={walkingPolylineCoords}
                  pathOptions={{
                    color: '#2563eb', // Vibrant blue for active pedestrian navigation
                    weight: 6,
                    opacity: 0.95,
                    dashArray: '6 8',
                  }}
                >
                  <Tooltip direction="top" permanent>
                    Walking Route: {activeRoute?.distanceMeters}m (~{activeRoute?.walkingMinutes} min)
                  </Tooltip>
                </Polyline>
              )}

              {/* 3. REC Campus Buildings (Markers) */}
              {REC_BUILDINGS.map((building) => {
                const isSelected = selectedItem?.data.id === building.id;
                return (
                  <Marker
                    key={building.id}
                    position={[building.latitude, building.longitude]}
                    eventHandlers={{
                      click: () => setSelectedItem({ type: 'building', data: building }),
                    }}
                    icon={divIcon({
                      className: 'rec-building-marker',
                      html: `
                        <div style="
                          position: relative;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          width: ${isSelected ? '38px' : '30px'};
                          height: ${isSelected ? '38px' : '30px'};
                          background: ${isSelected ? 'hsl(67, 100%, 69%)' : 'hsl(195, 40%, 20%)'};
                          color: ${isSelected ? 'hsl(195, 40%, 20%)' : 'white'};
                          border: 2px solid white;
                          border-radius: 9px;
                          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                          font-weight: 800;
                          font-size: 11px;
                        ">
                          ${building.code || 'REC'}
                        </div>
                      `,
                      iconSize: isSelected ? [38, 38] : [30, 30],
                      iconAnchor: isSelected ? [19, 19] : [15, 15],
                    })}
                  >
                    <Tooltip direction="top" offset={[0, -14]}>
                      <div className="font-sans text-xs">
                        <strong>{building.name}</strong>
                        <div className="text-[10px] text-slate-500 uppercase">{building.category}</div>
                      </div>
                    </Tooltip>
                  </Marker>
                );
              })}

              {/* 4. REC Campus Bus Stops (Visually Distinct Transit Badges) */}
              {REC_CAMPUS_STOPS.map((stop) => {
                const isSelected = selectedItem?.data.id === stop.id;
                return (
                  <Marker
                    key={stop.id}
                    position={[stop.latitude, stop.longitude]}
                    eventHandlers={{
                      click: () => setSelectedItem({ type: 'stop', data: stop }),
                    }}
                    icon={divIcon({
                      className: 'rec-stop-marker',
                      html: `
                        <div style="
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          width: ${isSelected ? '36px' : '30px'};
                          height: ${isSelected ? '36px' : '30px'};
                          background: #2563eb;
                          color: white;
                          border: 2.5px solid #60a5fa;
                          border-radius: 50%;
                          box-shadow: 0 0 12px rgba(37,99,235,0.7);
                          font-weight: 900;
                        ">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6 2 7"/><path d="M10 6h4"/><path d="m22 7-2-1"/><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 19v2"/><path d="M18 19v2"/></svg>
                        </div>
                      `,
                      iconSize: isSelected ? [36, 36] : [30, 30],
                      iconAnchor: isSelected ? [18, 18] : [15, 15],
                    })}
                  >
                    <Tooltip direction="top" offset={[0, -16]}>
                      <div className="font-sans text-xs">
                        <strong>🚌 {stop.name}</strong>
                        <div className="text-[10px] text-blue-600 font-bold">Campus Bus Stop</div>
                      </div>
                    </Tooltip>
                  </Marker>
                );
              })}

              {/* 5. Points of Interest (Food, CCD, Domino's, Sports Field) */}
              {REC_POINTS_OF_INTEREST.map((poi) => (
                <CircleMarker
                  key={poi.id}
                  center={[poi.latitude, poi.longitude]}
                  radius={7}
                  eventHandlers={{
                    click: () => setSelectedItem({ type: 'poi', data: poi }),
                  }}
                  pathOptions={{
                    color: poi.category === 'food' ? '#f59e0b' : '#10b981',
                    fillColor: poi.category === 'food' ? '#fbbf24' : '#34d399',
                    fillOpacity: 1,
                    weight: 2.5,
                  }}
                >
                  <Tooltip direction="top">
                    <div className="font-sans text-xs">
                      <strong>{poi.name}</strong>
                      <div className="text-[10px] text-slate-500">{poi.landmarkNear}</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}

              {/* 6. User Position (When Geolocation is active) */}
              {userCoords && (
                <Marker
                  position={userCoords}
                  icon={divIcon({
                    className: 'user-marker',
                    html: `
                      <div style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 32px;
                        height: 32px;
                        background: #10b981;
                        border: 3px solid white;
                        border-radius: 50%;
                        box-shadow: 0 0 16px rgba(16,185,129,0.8);
                      ">
                        <span style="width: 8px; height: 8px; background: white; border-radius: 50%;"></span>
                      </div>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  })}
                >
                  <Tooltip direction="top" permanent>Your Position</Tooltip>
                </Marker>
              )}
            </MapContainer>

            {/* Map Legend */}
            <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-[500] flex flex-wrap items-center gap-3.5 rounded-2xl border border-border bg-card/90 px-4 py-2.5 text-[11px] font-bold shadow-md backdrop-blur-md">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-primary text-white" />
                <span>REC Building</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-white text-[9px]">
                  <BusFront size={9} />
                </span>
                <span>Campus Bus Stop</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span>Food / Cafe</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-6 rounded-full bg-slate-400" />
                <span>Internal Campus Road</span>
              </span>
              {activeRoute && (
                <span className="flex items-center gap-1.5 text-blue-600 font-black">
                  <span className="h-2 w-6 rounded-full border border-dashed border-blue-600 bg-blue-500" />
                  <span>Walking Route ({activeRoute.walkingMinutes} min)</span>
                </span>
              )}
            </div>
          </div>

          {/* Selected Item Detail Inspector Card */}
          {selectedItem && (
            <div className="rounded-[24px] border-2 border-primary/20 bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold text-white ${
                    selectedItem.type === 'stop'
                      ? 'bg-blue-600'
                      : selectedItem.data.category === 'food'
                      ? 'bg-amber-500'
                      : 'bg-primary'
                  }`}>
                    {selectedItem.type === 'stop' ? (
                      <BusFront size={20} />
                    ) : selectedItem.data.category === 'food' ? (
                      <Utensils size={18} />
                    ) : (
                      <Building2 size={20} />
                    )}
                  </span>
                  <div>
                    <div className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {selectedItem.type === 'stop'
                        ? 'REC Campus Bus Stop'
                        : selectedItem.type === 'building'
                        ? `Building · ${(selectedItem.data as CampusBuilding).category.toUpperCase()}`
                        : 'Point of Interest'}
                    </div>
                    <h3 className="text-base font-black text-foreground">
                      {selectedItem.data.name}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-lg p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              {/* Specific Content for Bus Stop vs Building */}
              {selectedItem.type === 'stop' ? (
                <div className="mt-3.5 space-y-2 text-xs">
                  <p className="text-muted-foreground leading-5">
                    {selectedItem.data.description}
                  </p>
                  <div>
                    <span className="font-extrabold text-foreground">Routes serving this campus stop:</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {selectedItem.data.servedRoutes.map((r) => (
                        <span key={r} className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : selectedItem.type === 'building' ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {(selectedItem.data as CampusBuilding).description}
                </p>
              ) : (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Located near {(selectedItem.data as PointOfInterest).landmarkNear}.
                </p>
              )}

              {/* Action Buttons to Set as Start / Destination */}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setStartLocationId(selectedItem.data.id);
                    if (destLocationId !== selectedItem.data.id) {
                      const res = calculateCampusWalkingRoute(selectedItem.data.id, destLocationId);
                      setActiveRoute(res);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                >
                  <MapPin size={13} /> Set as Start Point
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDestLocationId(selectedItem.data.id);
                    const res = calculateCampusWalkingRoute(startLocationId, selectedItem.data.id);
                    setActiveRoute(res);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
                >
                  <Navigation size={13} /> Navigate to this Location
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}