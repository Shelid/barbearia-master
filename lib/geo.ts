import { geohashForLocation } from 'geofire-common';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type ShopGeoFields = {
  latitude: number | null;
  longitude: number | null;
  geohash: string;
  hasExactLocation: boolean;
  googleMapsUrl: string;
};

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function toOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function hasValidCoordinates(latitude: unknown, longitude: unknown) {
  return (
    isFiniteCoordinate(latitude) &&
    isFiniteCoordinate(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function createShopGeoFields(latitude: unknown, longitude: unknown): ShopGeoFields {
  const lat = toOptionalNumber(latitude);
  const lng = toOptionalNumber(longitude);

  if (!hasValidCoordinates(lat, lng)) {
    return {
      latitude: lat,
      longitude: lng,
      geohash: '',
      hasExactLocation: false,
      googleMapsUrl: '',
    };
  }

  const roundedLatitude = Number((lat as number).toFixed(6));
  const roundedLongitude = Number((lng as number).toFixed(6));

  return {
    latitude: roundedLatitude,
    longitude: roundedLongitude,
    geohash: geohashForLocation([roundedLatitude, roundedLongitude]),
    hasExactLocation: true,
    googleMapsUrl: buildGoogleMapsDirectionsUrl({
      latitude: roundedLatitude,
      longitude: roundedLongitude,
    }),
  };
}

export function buildGoogleMapsDirectionsUrl(input: {
  latitude?: unknown;
  longitude?: unknown;
  address?: string | null;
  label?: string | null;
}) {
  const lat = toOptionalNumber(input.latitude);
  const lng = toOptionalNumber(input.longitude);

  if (hasValidCoordinates(lat, lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat as number},${lng as number}`;
  }

  const queryParts = [input.label?.trim(), input.address?.trim()].filter(Boolean);
  const query = queryParts.join(', ');

  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : '';
}

export function formatCoordinates(latitude: unknown, longitude: unknown) {
  const lat = toOptionalNumber(latitude);
  const lng = toOptionalNumber(longitude);

  if (!hasValidCoordinates(lat, lng)) {
    return '';
  }

  return `${(lat as number).toFixed(6)}, ${(lng as number).toFixed(6)}`;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;

  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitude) * Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function formatDistanceKm(distanceKm: number) {
  if (!Number.isFinite(distanceKm)) return '';

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(distanceKm >= 10 ? 0 : 1)} km`;
}
