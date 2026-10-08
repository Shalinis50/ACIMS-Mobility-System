import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BusFront,
  Clock,
  Edit2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { naturalBusSort } from '@/lib/naturalSort';
import 'leaflet/dist/leaflet.css';

const CHENNAI_CENTER: [number, number] = [13.0489, 80.12];

export type BusStopItem = {
  id: string;
  name: string;
  time?: string;
  latitude?: number | null;
  longitude?: number | null;
  sequence: number;
  active?: boolean;
};

export type BusWithStops = {
  id: string;
  busNumber: string;
  routeId: string;
  routeName: string;
  displayName: string;
  driverName?: string | null;
  driverPhone?: string | null;
  stopCount: number;
  stops: BusStopItem[];
  active: boolean;
};

function createNumberedStopIcon(seq: number) {
  return L.divIcon({
    className: 'custom-pickup-marker',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;background:#0284c7;border:2px solid white;border-radius:50%;color:white;font-size:11px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${seq}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function MapViewUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export function AdminPickupPoints() {
  const queryClient = useQueryClient();
  const [viewTab, setViewTab] = useState<'BUS_STOPS' | 'COMMON_POINTS'>('BUS_STOPS');
  const [busSearch, setBusSearch] = useState('');
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [showAllStops, setShowAllStops] = useState(false);

  // Common Pickup Points modals
  const [commonSearch, setCommonSearch] = useState('');
  const [showAddCommonModal, setShowAddCommonModal] = useState(false);
  const [newCommonName, setNewCommonName] = useState('');
  const [newCommonTime, setNewCommonTime] = useState('');
  const [newCommonSelectedBuses, setNewCommonSelectedBuses] = useState<Set<string>>(new Set());

  // Edit / Assign Buses for Common Point
  const [editingCommonPoint, setEditingCommonPoint] = useState<{
    originalName: string;
    currentName: string;
    assignedBusIds: Set<string>;
    defaultTime: string;
  } | null>(null);

  // Edit stops modal
  const [editingBus, setEditingBus] = useState<BusWithStops | null>(null);
  const [editableStops, setEditableStops] = useState<Array<BusStopItem & { active: boolean }>>([]);
  const [newStopName, setNewStopName] = useState('');
  const [newStopTime, setNewStopTime] = useState('');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const busesQuery = useQuery({
    queryKey: ['admin', 'buses-and-routes'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/buses-and-routes');
      if (!res.ok) throw new Error('Unable to load this information.');
      return (await res.json()) as BusWithStops[];
    },
  });

  const isLoading = busesQuery.isLoading && !busesQuery.data;
  const isError = busesQuery.isError && !busesQuery.data;

  const rawBuses = busesQuery.data ?? [];

  // Filter out MTC and sort naturally by bus number
  const buses = useMemo(() => {
    return rawBuses
      .filter((b) => !b.busNumber.toUpperCase().includes('MTC') && !b.displayName.toUpperCase().includes('MTC'))
      .sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));
  }, [rawBuses]);

  const selectedBus = useMemo(() => {
    if (!selectedBusId) return null;
    return buses.find((b) => b.id === selectedBusId) ?? null;
  }, [buses, selectedBusId]);

  const filteredBuses = useMemo(() => {
    if (!busSearch.trim()) return buses;
    const q = busSearch.toLowerCase();
    return buses.filter(
      (b) =>
        b.busNumber.toLowerCase().includes(q) ||
        b.routeName.toLowerCase().includes(q) ||
        b.displayName.toLowerCase().includes(q)
    );
  }, [buses, busSearch]);

  // Stops to show on the map:
  // Under Section 13: By default, ONLY show selected bus's stops. If none selected, show empty or all only if toggled.
  const mapStops = useMemo(() => {
    if (showAllStops) {
      const all: Array<BusStopItem & { busDisplayName?: string }> = [];
      for (const b of buses) {
        for (const s of b.stops) {
          if (s.latitude != null && s.longitude != null) {
            all.push({ ...s, busDisplayName: b.displayName });
          }
        }
      }
      return all;
    }
    if (selectedBus) {
      return selectedBus.stops
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({ ...s, busDisplayName: selectedBus.displayName }));
    }
    return [];
  }, [selectedBus, showAllStops, buses]);

  const { mapCenter, mapZoom } = useMemo(() => {
    if (selectedBus && selectedBus.stops.length > 0) {
      const withCoords = selectedBus.stops.find((s) => s.latitude != null && s.longitude != null);
      if (withCoords && withCoords.latitude != null && withCoords.longitude != null) {
        return { mapCenter: [withCoords.latitude, withCoords.longitude] as [number, number], mapZoom: 12 };
      }
    }
    return { mapCenter: CHENNAI_CENTER, mapZoom: 11 };
  }, [selectedBus]);

  // Aggregated Common Campus Pickup Points across all REC buses (Section 9)
  const commonPickupPoints = useMemo(() => {
    const pointMap = new Map<
      string,
      {
        displayName: string;
        servedBuses: Array<{
          busId: string;
          busNumber: string;
          routeName: string;
          time?: string;
        }>;
      }
    >();

    for (const b of buses) {
      for (const s of b.stops) {
        const key = s.name.trim().toUpperCase();
        if (!key) continue;
        if (!pointMap.has(key)) {
          pointMap.set(key, {
            displayName: s.name.trim(),
            servedBuses: [],
          });
        }
        const entry = pointMap.get(key)!;
        if (!entry.servedBuses.some((sb) => sb.busId === b.id)) {
          entry.servedBuses.push({
            busId: b.id,
            busNumber: b.busNumber,
            routeName: b.routeName,
            time: s.time,
          });
        }
      }
    }

    const list = Array.from(pointMap.entries()).map(([key, data]) => ({
      key,
      name: data.displayName,
      servedBuses: data.servedBuses.sort((a, b) => naturalBusSort(a.busNumber, b.busNumber)),
    }));

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [buses]);

  const filteredCommonPoints = useMemo(() => {
    if (!commonSearch.trim()) return commonPickupPoints;
    const q = commonSearch.toLowerCase();
    return commonPickupPoints.filter(
      (cp) =>
        cp.name.toLowerCase().includes(q) ||
        cp.servedBuses.some((sb) => sb.busNumber.toLowerCase().includes(q) || sb.routeName.toLowerCase().includes(q))
    );
  }, [commonPickupPoints, commonSearch]);

  // Add common pickup point to selected buses
  const handleCreateCommonPoint = async () => {
    if (!newCommonName.trim() || newCommonSelectedBuses.size === 0) return;
    setSaving(true);
    try {
      const cleanName = newCommonName.trim();
      const timeVal = newCommonTime.trim() || 'Scheduled';

      for (const busId of Array.from(newCommonSelectedBuses)) {
        const targetBus = buses.find((b) => b.id === busId);
        if (!targetBus) continue;
        const exists = targetBus.stops.some((s) => s.name.trim().toUpperCase() === cleanName.toUpperCase());
        if (exists) continue;

        const nextStops = [
          ...targetBus.stops,
          {
            id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: cleanName,
            time: timeVal,
            sequence: targetBus.stops.length + 1,
            active: true,
          },
        ];

        await mobilityAdminFetch(`/admin/buses-and-routes/${busId}/stops`, {
          method: 'PUT',
          body: JSON.stringify({ stops: nextStops }),
        });
      }

      setToast(`Pickup point "${cleanName}" added and assigned to buses.`);
      setShowAddCommonModal(false);
      setNewCommonName('');
      setNewCommonTime('');
      setNewCommonSelectedBuses(new Set());
      void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'live-buses'] });
    } catch {
      setToast('Failed to create pickup point.');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Save edit / assign buses for common pickup point
  const handleSaveEditCommonPoint = async () => {
    if (!editingCommonPoint) return;
    setSaving(true);
    try {
      const { originalName, currentName, assignedBusIds, defaultTime } = editingCommonPoint;
      const cleanOrig = originalName.trim().toUpperCase();
      const cleanNew = currentName.trim();

      for (const b of buses) {
        const hasOriginal = b.stops.some((s) => s.name.trim().toUpperCase() === cleanOrig);
        const shouldHave = assignedBusIds.has(b.id);

        if (hasOriginal && !shouldHave) {
          // Remove stop from bus
          const updatedStops = b.stops.filter((s) => s.name.trim().toUpperCase() !== cleanOrig);
          await mobilityAdminFetch(`/admin/buses-and-routes/${b.id}/stops`, {
            method: 'PUT',
            body: JSON.stringify({ stops: updatedStops }),
          });
        } else if (hasOriginal && shouldHave) {
          // Rename stop if name changed
          if (cleanOrig !== cleanNew.toUpperCase()) {
            const updatedStops = b.stops.map((s) =>
              s.name.trim().toUpperCase() === cleanOrig ? { ...s, name: cleanNew } : s
            );
            await mobilityAdminFetch(`/admin/buses-and-routes/${b.id}/stops`, {
              method: 'PUT',
              body: JSON.stringify({ stops: updatedStops }),
            });
          }
        } else if (!hasOriginal && shouldHave) {
          // Add stop to bus
          const updatedStops = [
            ...b.stops,
            {
              id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: cleanNew,
              time: defaultTime || 'Scheduled',
              sequence: b.stops.length + 1,
            },
          ];
          await mobilityAdminFetch(`/admin/buses-and-routes/${b.id}/stops`, {
            method: 'PUT',
            body: JSON.stringify({ stops: updatedStops }),
          });
        }
      }

      setToast(`Updated pickup point "${cleanNew}".`);
      setEditingCommonPoint(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'live-buses'] });
    } catch {
      setToast('Failed to update pickup point.');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Delete common pickup point from all buses
  const handleDeleteCommonPoint = async (pointName: string) => {
    if (!confirm(`Are you sure you want to remove pickup point "${pointName}" from all campus buses?`)) return;
    setSaving(true);
    try {
      const cleanTarget = pointName.trim().toUpperCase();
      for (const b of buses) {
        if (b.stops.some((s) => s.name.trim().toUpperCase() === cleanTarget)) {
          const updatedStops = b.stops.filter((s) => s.name.trim().toUpperCase() !== cleanTarget);
          await mobilityAdminFetch(`/admin/buses-and-routes/${b.id}/stops`, {
            method: 'PUT',
            body: JSON.stringify({ stops: updatedStops }),
          });
        }
      }
      setToast(`Removed pickup point "${pointName}".`);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'live-buses'] });
    } catch {
      setToast('Failed to delete pickup point.');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Handle Edit Stops Modal
  const handleOpenEditStops = (bus: BusWithStops) => {
    setEditingBus(bus);
    setEditableStops(
      bus.stops.map((s, idx) => ({
        id: s.id,
        name: s.name,
        time: s.time || 'Scheduled',
        latitude: s.latitude,
        longitude: s.longitude,
        sequence: idx + 1,
        active: s.active !== false,
      }))
    );
    setNewStopName('');
    setNewStopTime('');
  };

  const toggleStopActive = (idx: number) => {
    setEditableStops((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, active: !s.active } : s))
    );
  };

  const handleMoveStop = (idx: number, dir: 'UP' | 'DOWN') => {
    const nextList = [...editableStops];
    const targetIdx = dir === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= nextList.length) return;
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    nextList.forEach((s, i) => (s.sequence = i + 1));
    setEditableStops(nextList);
  };

  const handleRemoveStop = (idx: number) => {
    const nextList = editableStops.filter((_, i) => i !== idx);
    nextList.forEach((s, i) => (s.sequence = i + 1));
    setEditableStops(nextList);
  };

  const handleAddStop = () => {
    if (!newStopName.trim()) return;
    setEditableStops((prev) => [
      ...prev,
      {
        id: `stop-${Date.now()}`,
        name: newStopName.trim(),
        time: newStopTime.trim() || 'Scheduled',
        sequence: prev.length + 1,
        active: true,
      },
    ]);
    setNewStopName('');
    setNewStopTime('');
  };

  const handleUpdateStopDetail = (idx: number, field: 'name' | 'time', val: string) => {
    setEditableStops((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    );
  };

  const handleSaveStops = async () => {
    if (!editingBus) return;
    setSaving(true);
    try {
      const stopsToSave = editableStops
        .filter((s) => s.active)
        .map((s, idx) => ({
          id: s.id,
          name: s.name.trim(),
          time: s.time?.trim() || 'Scheduled',
          latitude: s.latitude,
          longitude: s.longitude,
          sequence: idx + 1,
        }));

      const res = await mobilityAdminFetch(`/admin/buses-and-routes/${editingBus.id}/stops`, {
        method: 'PUT',
        body: JSON.stringify({ stops: stopsToSave }),
      });

      if (res.ok) {
        setToast(`Pickup points saved for BUS ${editingBus.busNumber} · ${editingBus.routeName}.`);
        setEditingBus(null);
        void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'live-buses'] });
      }
    } catch {
      setToast('Failed to save pickup points.');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  // ERROR STATE
  if (isError) {
    return (
      <div className="rounded-[28px] border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-foreground">
            Unable to load this information.
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Could not retrieve pickup points data from the database.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => void busesQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-95"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-border bg-card p-12 text-center space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <RefreshCw size={16} className="animate-spin text-primary" />
          Loading pickup points...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Official Boarding Stations
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground">
              {selectedBus ? `BUS ${selectedBus.busNumber} · ${selectedBus.routeName} Pickup Points` : 'Pickup Points'}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedBus
                ? 'Showing map pickup points and configured stop list for this bus line.'
                : 'Pickup points grouped by campus bus. Click any bus to inspect its stops on the map and edit stop configuration.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedBus && (
              <button
                type="button"
                onClick={() => setSelectedBusId(null)}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-muted"
              >
                <ArrowLeft size={13} /> All Buses
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAllStops(!showAllStops)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                showAllStops ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300' : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {showAllStops ? '✓ All stops on map' : 'Show all stops'}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          {toast}
        </div>
      )}

      {/* Segmented Control: Grouped by Bus (Section 12/13) vs Common Pickup Points (Section 9) */}
      {!selectedBus && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex rounded-xl border border-border bg-muted/40 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewTab('BUS_STOPS')}
              data-testid="tab-grouped-by-bus"
              className={`rounded-lg px-3.5 py-1.5 transition ${
                viewTab === 'BUS_STOPS'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Grouped by Bus
            </button>
            <button
              type="button"
              onClick={() => setViewTab('COMMON_POINTS')}
              data-testid="tab-common-pickup-points"
              className={`rounded-lg px-3.5 py-1.5 transition ${
                viewTab === 'COMMON_POINTS'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Common Pickup Points ({commonPickupPoints.length})
            </button>
          </div>

          {viewTab === 'COMMON_POINTS' && (
            <button
              type="button"
              onClick={() => {
                setNewCommonName('');
                setNewCommonTime('');
                setNewCommonSelectedBuses(new Set());
                setShowAddCommonModal(true);
              }}
              data-testid="button-add-pickup-point"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-extrabold text-primary-foreground shadow-xs hover:opacity-95"
            >
              <Plus size={14} /> Add Pickup Point
            </button>
          )}
        </div>
      )}

      {/* VIEW: COMMON PICKUP POINTS (Section 9: AVADI, ENNORE, KOYAMBEDU, TAMBARAM, POONAMALLEE, REDHILLS) */}
      {!selectedBus && viewTab === 'COMMON_POINTS' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search pickup point or bus (e.g. Poonamallee or Avadi)..."
              value={commonSearch}
              onChange={(e) => setCommonSearch(e.target.value)}
              className="admin-input h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-xs font-semibold"
            />
          </div>

          {filteredCommonPoints.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
              No pickup points found. Click "+ Add Pickup Point" to create one.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCommonPoints.map((point) => (
                <div
                  key={point.key}
                  data-testid={`card-common-point-${point.key}`}
                  className="rounded-[24px] border border-border bg-card p-5 flex flex-col justify-between transition hover:border-primary/40 shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                          <MapPin size={16} />
                        </span>
                        <div>
                          <h3 className="display-font text-base font-extrabold text-foreground">
                            {point.name}
                          </h3>
                          <span className="text-[11px] font-bold text-muted-foreground">
                            Served by {point.servedBuses.length} {point.servedBuses.length === 1 ? 'bus' : 'buses'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SERVED BY BUSES (Section 9 Example: POONAMALLEE -> BUS 18, BUS 4) */}
                    <div className="mt-4 rounded-2xl bg-muted/30 p-3 space-y-1.5 text-xs">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                        Served by Buses
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {point.servedBuses.map((sb) => (
                          <span
                            key={sb.busId}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-extrabold text-foreground"
                          >
                            <BusFront size={11} className="text-primary" />
                            BUS {sb.busNumber}
                            {sb.time && <span className="text-[10px] text-muted-foreground">({sb.time})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Assign Buses, Edit, Delete */}
                  <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingCommonPoint({
                          originalName: point.name,
                          currentName: point.name,
                          assignedBusIds: new Set(point.servedBuses.map((b) => b.busId)),
                          defaultTime: point.servedBuses[0]?.time || '7:00 AM',
                        })
                      }
                      data-testid={`button-assign-buses-${point.key}`}
                      className="rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      <Edit2 size={12} className="inline mr-1" /> Edit / Assign
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCommonPoint(point.name)}
                      data-testid={`button-delete-point-${point.key}`}
                      className="rounded-xl p-2 text-destructive hover:bg-destructive/10"
                      title="Delete pickup point"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 1: BUS LIST (DEFAULT VIEW) - Grouped by Bus (Section 12) */}
      {!selectedBus && viewTab === 'BUS_STOPS' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bus or route (e.g. 18 or Avadi)..."
              value={busSearch}
              onChange={(e) => setBusSearch(e.target.value)}
              className="admin-input h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-xs font-semibold"
            />
          </div>

          {filteredBuses.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
              No buses assigned yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBuses.map((bus) => (
                <div
                  key={bus.id}
                  data-testid={`card-pickup-bus-${bus.id}`}
                  className="rounded-[24px] border border-border bg-card p-5 flex flex-col justify-between transition hover:border-primary/40 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted font-mono font-extrabold text-sm text-foreground">
                      {bus.busNumber}
                    </span>
                    <div>
                      <h3 className="display-font text-base font-extrabold text-foreground">
                        BUS {bus.busNumber} · {bus.routeName}
                      </h3>
                      <div className="text-xs font-bold text-muted-foreground mt-0.5">
                        {bus.stops.length} stops
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditStops(bus)}
                      className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-bold hover:bg-muted"
                    >
                      <Edit2 size={12} className="inline mr-1" /> Edit Stops
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedBusId(bus.id)}
                      data-testid={`button-view-stops-${bus.id}`}
                      className="rounded-xl bg-primary/10 px-4 py-2 text-xs font-extrabold text-primary hover:bg-primary/20"
                    >
                      View stops
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SELECTED BUS MAP & STOPS (Section 13) */}
      {selectedBus && (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] animate-in fade-in">
          {/* Map showing ONLY selected bus's stops */}
          <div className="rounded-[28px] border border-border bg-card overflow-hidden h-[500px] shadow-sm flex flex-col">
            <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between text-xs font-bold">
              <span className="text-foreground flex items-center gap-1.5">
                <MapPin size={14} className="text-sky-500" />
                Map Pickup Points: {selectedBus.displayName} ({mapStops.length} on map)
              </span>
              <span className="text-[11px] text-muted-foreground">Numbered in route order</span>
            </div>
            <div className="flex-1 w-full relative">
              <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full" scrollWheelZoom>
                <MapViewUpdater center={mapCenter} zoom={mapZoom} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {mapStops.map((stop) => {
                  if (stop.latitude == null || stop.longitude == null) return null;
                  return (
                    <Marker
                      key={stop.id}
                      position={[stop.latitude, stop.longitude]}
                      icon={createNumberedStopIcon(stop.sequence)}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <div className="font-extrabold text-foreground">
                            {stop.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Stop #{stop.sequence} · Time: {stop.time || 'Scheduled'}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          {/* Stops List + Actions */}
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <div className="mono text-[10px] uppercase font-bold text-muted-foreground">
                    Stop Checklist
                  </div>
                  <h3 className="display-font text-lg font-extrabold text-foreground">
                    BUS {selectedBus.busNumber} · {selectedBus.routeName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenEditStops(selectedBus)}
                  className="rounded-xl bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground hover:opacity-95"
                >
                  <Edit2 size={12} className="inline mr-1" /> Edit Stops
                </button>
              </div>

              {selectedBus.stops.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No stops configured for this bus yet. Click Edit Stops to add.
                </div>
              ) : (
                <div className="mt-3 max-h-[360px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
                  {selectedBus.stops.map((stop) => (
                    <div
                      key={stop.id}
                      className="flex items-center justify-between pt-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 place-items-center rounded-md bg-muted font-mono text-[10px] font-extrabold text-foreground">
                          {stop.sequence}
                        </span>
                        <div>
                          <div className="font-extrabold text-foreground">
                            {stop.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {stop.latitude != null ? '📍 Map point active' : 'Coordinates not configured'}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        {stop.time || 'Scheduled'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedBusId(null)}
                className="w-full rounded-xl border border-border bg-background py-2 text-center text-xs font-bold text-foreground hover:bg-muted"
              >
                ← Back to All Buses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STOP EDITING MODAL (Section 14) */}
      {editingBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="mono text-[10px] uppercase font-bold text-muted-foreground">
                  Stop Editing
                </span>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  BUS {editingBus.busNumber} · {editingBus.routeName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select/deselect, edit timing, reorder, add, or remove stops.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBus(null)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Editable stops list */}
            <div className="flex-1 overflow-y-auto space-y-2 my-4 pr-1 divide-y divide-border/40">
              {editableStops.map((stop, idx) => (
                <div
                  key={stop.id}
                  className={`flex items-center justify-between py-2.5 px-2 rounded-xl text-xs transition ${
                    stop.active ? 'bg-background' : 'bg-muted/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={stop.active}
                      onChange={() => toggleStopActive(idx)}
                      className="h-4 w-4 rounded text-primary focus:ring-primary shrink-0 cursor-pointer"
                      title={stop.active ? 'Deselect stop' : 'Select stop'}
                    />

                    <span className="grid h-6 w-6 place-items-center rounded-md bg-muted font-mono font-bold text-[10px] shrink-0">
                      {idx + 1}
                    </span>

                    <input
                      type="text"
                      value={stop.name}
                      onChange={(e) => handleUpdateStopDetail(idx, 'name', e.target.value)}
                      className="admin-input h-7 flex-1 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                    />

                    <input
                      type="text"
                      value={stop.time}
                      onChange={(e) => handleUpdateStopDetail(idx, 'time', e.target.value)}
                      placeholder="e.g. 6:40 AM"
                      className="admin-input h-7 w-24 rounded-lg border border-border bg-background px-2 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStop(idx, 'UP')}
                      className="rounded-md p-1 border border-border hover:bg-muted disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === editableStops.length - 1}
                      onClick={() => handleMoveStop(idx, 'DOWN')}
                      className="rounded-md p-1 border border-border hover:bg-muted disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(idx)}
                      className="rounded-md p-1 text-destructive hover:bg-destructive/10"
                      title="Remove stop"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Inline Add Stop */}
            <div className="border-t border-border pt-3">
              <span className="text-[11px] font-extrabold text-muted-foreground block mb-1.5">
                + Add Stop to Route
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Stop name (e.g. Poonamallee Bypass)"
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  className="admin-input flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Time (e.g. 7:15 AM)"
                  value={newStopTime}
                  onChange={(e) => setNewStopTime(e.target.value)}
                  className="admin-input w-28 rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="rounded-xl bg-secondary px-3.5 py-2 text-xs font-extrabold text-secondary-foreground hover:opacity-90"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setEditingBus(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveStops}
                data-testid="button-save-pickup-stops"
                className="rounded-xl bg-primary px-5 py-2 text-xs font-extrabold text-primary-foreground hover:opacity-95"
              >
                {saving ? 'Saving…' : 'Save Stops'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD COMMON PICKUP POINT MODAL (Section 9) */}
      {showAddCommonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="display-font text-xl font-extrabold text-foreground">
                + Add Pickup Point
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCommonModal(false)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Pickup Point Name</label>
                <input
                  type="text"
                  placeholder="e.g. POONAMALLEE or AVADI"
                  value={newCommonName}
                  onChange={(e) => setNewCommonName(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Approximate Time</label>
                <input
                  type="text"
                  placeholder="e.g. 7:15 AM"
                  value={newCommonTime}
                  onChange={(e) => setNewCommonTime(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">
                  Assign Buses that Serve this Station
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-border bg-background p-2">
                  {buses.map((b) => {
                    const isChecked = newCommonSelectedBuses.has(b.id);
                    return (
                      <label
                        key={b.id}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const next = new Set(newCommonSelectedBuses);
                            if (isChecked) next.delete(b.id);
                            else next.add(b.id);
                            setNewCommonSelectedBuses(next);
                          }}
                          className="h-4 w-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="font-bold text-xs text-foreground">
                          BUS {b.busNumber} · {b.routeName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowAddCommonModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !newCommonName.trim() || newCommonSelectedBuses.size === 0}
                onClick={handleCreateCommonPoint}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-extrabold text-primary-foreground hover:opacity-95 disabled:opacity-40"
              >
                {saving ? 'Adding…' : 'Add Pickup Point'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / ASSIGN BUSES FOR COMMON POINT MODAL (Section 9) */}
      {editingCommonPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="mono text-[10px] uppercase font-bold text-muted-foreground">
                  Official Pickup Point
                </span>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  {editingCommonPoint.originalName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCommonPoint(null)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Pickup Point Name</label>
                <input
                  type="text"
                  value={editingCommonPoint.currentName}
                  onChange={(e) =>
                    setEditingCommonPoint({
                      ...editingCommonPoint,
                      currentName: e.target.value,
                    })
                  }
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">
                  Assign Buses Serving This Station
                </label>
                <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl border border-border bg-background p-2">
                  {buses.map((b) => {
                    const isChecked = editingCommonPoint.assignedBusIds.has(b.id);
                    return (
                      <label
                        key={b.id}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const next = new Set(editingCommonPoint.assignedBusIds);
                            if (isChecked) next.delete(b.id);
                            else next.add(b.id);
                            setEditingCommonPoint({
                              ...editingCommonPoint,
                              assignedBusIds: next,
                            });
                          }}
                          className="h-4 w-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="font-bold text-xs text-foreground">
                          BUS {b.busNumber} · {b.routeName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setEditingCommonPoint(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !editingCommonPoint.currentName.trim()}
                onClick={handleSaveEditCommonPoint}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-extrabold text-primary-foreground hover:opacity-95 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
