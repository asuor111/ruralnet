// Geographic calculations used across RuralNet.
// All distances are great-circle (haversine) on a spherical Earth, which is
// more than adequate at Nigerian community/LGA scales and keeps the tool
// dependency-free. Methodology is documented in /methodology.

import type { BBox, LatLng } from './types';

export const EARTH_RADIUS_KM = 6371.0088;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const la1 = toRad(a.latitude);
  const la2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Minimum great-circle distance (km) from a point to a set of points. */
export function nearestDistanceKm(point: LatLng, candidates: LatLng[]): number | null {
  let best: number | null = null;
  for (const c of candidates) {
    try {
      const d = haversineKm(point, c);
      if (best === null || d < best) best = d;
    } catch {
      // skip malformed candidate
    }
  }
  return best;
}

/** South/west/north/east box around a center for a given radius. */
export function boundingBoxAround(center: LatLng, radiusKm: number): BBox {
  const latDelta = toDeg(radiusKm / EARTH_RADIUS_KM);
  // Longitude degrees shrink away from the equator.
  const lonDelta = toDeg(radiusKm / EARTH_RADIUS_KM / Math.max(0.3, Math.cos(toRad(center.latitude))));
  return [
    center.latitude - latDelta,
    center.longitude - lonDelta,
    center.latitude + latDelta,
    center.longitude + lonDelta,
  ];
}

/**
 * Equirectangular projection of a segment endpoint relative to the point of
 * interest, valid for short segments (the scale RuralNet works at).
 */
function project(origin: LatLng, p: LatLng): [x: number, y: number] {
  const cosLat = Math.max(0.3, Math.cos(toRad(origin.latitude)));
  return [(p.longitude - origin.longitude) * cosLat * 111.32, (p.latitude - origin.latitude) * 110.574];
}

/** Distance (km) from a point to a finite segment (a->b), planar approx. */
export function distanceToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  const [ax, ay] = project(a, a);
  const [bx, by] = project(a, b);
  const [px, py] = project(a, p);
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return haversineKm(p, a);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Distance (km) from a point to the nearest point on GeoJSON LineString /
 * MultiLineString geometry. Used for "distance to mapped fibre".
 * Throws for unsupported geometry types so callers can treat them as missing.
 */
export function nearestDistanceToLineGeojsonKm(
  point: LatLng,
  geometry: { type: string; coordinates: unknown },
): number {
  switch (geometry.type) {
    case 'LineString': {
      const coords = geometry.coordinates as number[][];
      return nearestToMultiLine(point, [coords]);
    }
    case 'MultiLineString': {
      const lines = geometry.coordinates as number[][][];
      return nearestToMultiLine(point, lines);
    }
    case 'Point': {
      const [lon, lat] = geometry.coordinates as number[];
      return haversineKm(point, { latitude: lat, longitude: lon });
    }
    case 'MultiPoint': {
      const pts = geometry.coordinates as number[][];
      return nearestDistanceKm(point, pts.map(([lon, lat]) => ({ latitude: lat, longitude: lon }))) ?? Infinity;
    }
    default:
      throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }
}

function nearestToMultiLine(point: LatLng, lines: number[][][]): number {
  let best = Infinity;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const [lon1, lat1] = line[i];
      const [lon2, lat2] = line[i + 1];
      const d = distanceToSegmentKm(point, { latitude: lat1, longitude: lon1 }, { latitude: lat2, longitude: lon2 });
      if (d < best) best = d;
    }
  }
  return best;
}

/**
 * Ray-casting point-in-polygon test. Ring is an array of [lon, lat] pairs or
 * {latitude, longitude} objects.
 */
export function pointInPolygon(
  point: LatLng,
  ring: Array<[number, number] | LatLng>,
): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = coord(ring[i]);
    const [xj, yj] = coord(ring[j]);
    // Coordinates here are [lon, lat] (GeoJSON order).
    const intersects =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function coord(item: [number, number] | LatLng): [number, number] {
  if (Array.isArray(item)) return [item[0], item[1]];
  return [item.longitude, item.latitude];
}

export function midpointKm(km: number): string {
  return formatKm(km);
}

export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) return '< 1 km';
  if (km < 10) return `${km.toFixed(1)} km`;
  if (km < 100) return `${Math.round(km)} km`;
  if (km < 1000) return `${Math.round(km)} km`;
  return `${(km / 1000).toFixed(1)} km`;
}