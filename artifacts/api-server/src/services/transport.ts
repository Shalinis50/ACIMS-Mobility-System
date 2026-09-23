import { getBuses } from "./busTracking";

export type TransportProvider = {
  id: string;
  name: string;
  category: string;
  status: string;
  dataLabel: string;
};

export type PublicTransportJourney = {
  id: string;
  providerId: string;
  transportType: string;
  route: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  transfers: number;
  walkingDistanceKm: number;
  availability: string;
  dataLabel: string;
};

const providers: TransportProvider[] = [
  {
    id: "acims-campus",
    name: "ACIMS campus fleet",
    category: "college-bus",
    status: "live",
    dataLabel: "REAL ACIMS DATA",
  },
  {
    id: "development-external",
    name: "External transport adapter",
    category: "bus/train/metro",
    status: "not-connected",
    dataLabel: "DEVELOPMENT/MOCK EXTERNAL DATA — not live",
  },
];

const developmentJourneys: PublicTransportJourney[] = [
  {
    id: "mock-public-bus",
    providerId: "development-external",
    transportType: "Public bus",
    route: "Tambaram local connection",
    departure: "Not live",
    arrival: "Not live",
    durationMinutes: 12,
    transfers: 0,
    walkingDistanceKm: 0.4,
    availability: "Development sample — not live",
    dataLabel: "DEVELOPMENT/MOCK EXTERNAL DATA",
  },
  {
    id: "mock-train",
    providerId: "development-external",
    transportType: "Train",
    route: "Tambaram rail connection",
    departure: "Not live",
    arrival: "Not live",
    durationMinutes: 18,
    transfers: 1,
    walkingDistanceKm: 0.8,
    availability: "Development sample — not live",
    dataLabel: "DEVELOPMENT/MOCK EXTERNAL DATA",
  },
  {
    id: "mock-metro",
    providerId: "development-external",
    transportType: "Metro",
    route: "Future provider connection",
    departure: "Not live",
    arrival: "Not live",
    durationMinutes: 26,
    transfers: 1,
    walkingDistanceKm: 1.2,
    availability: "Development sample — not live",
    dataLabel: "DEVELOPMENT/MOCK EXTERNAL DATA",
  },
];

export function listProviders() {
  return providers.map((provider) => ({ ...provider }));
}

export function listJourneys() {
  return developmentJourneys.map((journey) => ({ ...journey }));
}

export function searchJourneys(start: string, destination: string) {
  const bus = getBuses()[0];
  if (!bus) return developmentJourneys.map((journey) => ({ ...journey }));
  const collegeBus: PublicTransportJourney = {
    id: `acims-${bus.id}`,
    providerId: "acims-campus",
    transportType: "College bus",
    route: `${bus.origin} → ${bus.destination}`,
    departure: "Now",
    arrival: `${bus.etaMinutes} min to next stop`,
    durationMinutes: bus.etaMinutes,
    transfers: 0,
    walkingDistanceKm: 0.2,
    availability: bus.currentOccupancy < bus.capacity ? `${bus.capacity - bus.currentOccupancy} seats available` : "Queue required",
    dataLabel: "REAL ACIMS DATA",
  };
  return [
    { ...collegeBus, route: `${start} → ${destination} via ${collegeBus.route}` },
    ...developmentJourneys.map((journey) => ({ ...journey })),
  ];
}