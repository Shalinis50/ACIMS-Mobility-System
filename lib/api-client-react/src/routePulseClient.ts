import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface RegisteredStop {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  sequenceOrder: number;
  address?: string;
  createdAt: string;
}

export interface StudentProfileData {
  id: string;
  userId: string;
  regNumber: string;
  department: string;
  pickupStopId: string | null;
  name: string;
  email: string;
  pickupStop: RegisteredStop | null;
  createdAt: string;
  updatedAt: string;
}

export interface NearestStopResult {
  stop: RegisteredStop;
  distanceKm: number;
}

export interface LiveStudentLocation {
  id: string;
  studentId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  source: string;
  recordedAt: string;
}

export interface StudentLocationResponse {
  success: boolean;
  hasLocation?: boolean;
  studentId: string;
  location: LiveStudentLocation | null;
  pickupStop: RegisteredStop | null;
  nearestStop?: RegisteredStop | null;
  distanceToPickupKm: number | null;
  distanceToPickupMeters: number | null;
  walkingMinutes: number | null;
  isAtPickupStop: boolean;
  message?: string;
}

export interface LiveBusLocationData {
  busId: string;
  busNumber?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  source: string;
  trackingStatus: "TRACKING_ACTIVE" | "TRACKING_STALE" | "OFFLINE";
  recordedAt?: string;
  updatedAt: string;
  nextStopId?: string;
  nextStop?: string;
  etaMinutes?: number;
  lastUpdateSecondsAgo?: number;
  isRealPhoneGps?: boolean;
}

export interface RoutePulseData {
  hasPickupStop: boolean;
  hasActiveRoute: boolean;
  hasActiveBus: boolean;
  hasLiveLocation: boolean;
  trackingStatus?: "TRACKING_ACTIVE" | "TRACKING_STALE" | "OFFLINE";
  busAccuracy?: number;
  student: {
    id: string;
    name: string;
    pickupStopId: string | null;
  };
  studentLocation?: LiveStudentLocation | null;
  studentToPickupKm?: number | null;
  studentWalkingMinutes?: number | null;
  pickupStop: RegisteredStop | null;
  route: {
    id: string;
    name: string;
    code: string;
    origin: string;
    destination: string;
    active: boolean;
  } | null;
  trip: {
    id: string;
    scheduledStartTime: string;
    status: string;
  } | null;
  bus: {
    id: string;
    busNumber: string;
    plateNumber?: string;
    status: string;
    origin: string;
    destination: string;
    routeLabel: string;
    nextStop: string;
    nextStopId: string;
    etaMinutes: number;
    updatedAt: string;
  } | null;
  liveLocation: {
    id: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed: number;
    heading: number;
    source: string;
    recordedAt: string;
    trackingStatus?: "TRACKING_ACTIVE" | "TRACKING_STALE" | "OFFLINE";
  } | null;
  etaMinutes: number | null;
  distanceKm?: number;
  routeProgressPercentage: number | null;
  status: string;
  lastUpdated: string | null;
  message: string;
}

export const getRoutePulseQueryKey = () => ["routePulse"] as const;
export const getStudentProfileQueryKey = () => ["studentProfile"] as const;
export const getRegisteredStopsQueryKey = () => ["registeredStops"] as const;
export const getStudentLocationQueryKey = (studentId = "student-20418") => ["studentLocation", studentId] as const;
export const getBusLiveLocationQueryKey = (busId: string) => ["busLiveLocation", busId] as const;

export async function fetchRoutePulse(studentId = "student-20418"): Promise<RoutePulseData> {
  return customFetch<RoutePulseData>(`/api/route-pulse?studentId=${encodeURIComponent(studentId)}`);
}

export async function fetchStudentProfile(studentId = "student-20418"): Promise<StudentProfileData> {
  return customFetch<StudentProfileData>(`/api/student/profile?studentId=${encodeURIComponent(studentId)}`);
}

export async function updatePickupStop(stopId: string | null, studentId = "student-20418"): Promise<StudentProfileData> {
  return customFetch<StudentProfileData>(`/api/student/pickup-stop`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stopId, studentId }),
  });
}

export async function fetchRegisteredStops(): Promise<RegisteredStop[]> {
  return customFetch<RegisteredStop[]>("/api/stops");
}

export async function fetchNearestStop(latitude: number, longitude: number): Promise<NearestStopResult> {
  return customFetch<NearestStopResult>(`/api/stops/nearest?latitude=${latitude}&longitude=${longitude}`);
}

// Student Real GPS API
export async function postStudentLocation(payload: {
  studentId?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
  timestamp?: string;
}): Promise<StudentLocationResponse> {
  return customFetch<StudentLocationResponse>("/api/location/student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchStudentLocation(studentId = "student-20418"): Promise<StudentLocationResponse> {
  return customFetch<StudentLocationResponse>(`/api/location/student?studentId=${encodeURIComponent(studentId)}`);
}

// Driver / Bus Real GPS API
export async function postBusLocation(payload: {
  bus_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
  driverId?: string;
  driverName?: string;
}): Promise<{ success: boolean; busId: string; trackingStatus: string; location: LiveBusLocationData }> {
  return customFetch("/api/location/bus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function postBusLocationBatch(payload: {
  bus_id: string;
  locations: Array<{
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    timestamp?: string;
  }>;
}): Promise<{ success: boolean; busId: string; syncedPoints: number; latestLocation: LiveBusLocationData }> {
  return customFetch("/api/location/bus/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function startBusTracking(bus_id: string, driverId?: string, driverName?: string): Promise<any> {
  return customFetch("/api/location/bus/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bus_id, driverId, driverName }),
  });
}

export async function stopBusTracking(bus_id: string): Promise<any> {
  return customFetch("/api/location/bus/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bus_id }),
  });
}

export async function fetchBusLiveLocation(busId: string): Promise<LiveBusLocationData> {
  return customFetch<LiveBusLocationData>(`/api/buses/${encodeURIComponent(busId)}/location`);
}

export function useRoutePulse(options?: { refetchInterval?: number; query?: Partial<UseQueryOptions<RoutePulseData>> }) {
  return useQuery<RoutePulseData>({
    queryKey: getRoutePulseQueryKey(),
    queryFn: () => fetchRoutePulse(),
    refetchInterval: options?.refetchInterval ?? 5000,
    ...options?.query,
  });
}

export function useStudentProfile(options?: { query?: Partial<UseQueryOptions<StudentProfileData>> }) {
  return useQuery<StudentProfileData>({
    queryKey: getStudentProfileQueryKey(),
    queryFn: () => fetchStudentProfile(),
    ...options?.query,
  });
}

export function useRegisteredStops(options?: { query?: Partial<UseQueryOptions<RegisteredStop[]>> }) {
  return useQuery<RegisteredStop[]>({
    queryKey: getRegisteredStopsQueryKey(),
    queryFn: () => fetchRegisteredStops(),
    ...options?.query,
  });
}

export function useUpdatePickupStop(options?: { mutation?: UseMutationOptions<StudentProfileData, Error, { stopId: string | null; studentId?: string }> }) {
  return useMutation<StudentProfileData, Error, { stopId: string | null; studentId?: string }>({
    mutationFn: ({ stopId, studentId }) => updatePickupStop(stopId, studentId),
    ...options?.mutation,
  });
}

export function useStudentLocationQuery(studentId = "student-20418", options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery<StudentLocationResponse>({
    queryKey: getStudentLocationQueryKey(studentId),
    queryFn: () => fetchStudentLocation(studentId),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 10000,
  });
}

export function useBusLiveLocationQuery(busId: string, options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery<LiveBusLocationData>({
    queryKey: getBusLiveLocationQueryKey(busId),
    queryFn: () => fetchBusLiveLocation(busId),
    enabled: !!busId && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? 4000,
  });
}
