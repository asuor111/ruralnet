// Fibre proximity provider based on OpenStreetMap (Overpass) route mapping.
//
// IMPORTANT semantic: "distance to mapped fibre" is a *geographic distance to
// infrastructure mapped in an open dataset*. It is NOT a statement that fibre
// service is available at the location. The UI and export carry the same
// disclaimer.

import type { FibreSection, ProviderResult } from '@/domain/types';
import { nearestDistanceToLineGeojsonKm } from '@/domain/geo';
import { makeSource } from '@/domain/sources';
import { getConfig, type OverpassConfig } from '@/services/config';
import { FetchError, fetchJsonWithFallback } from '../http';
import type { FibreProvider, ProviderContext } from '../types';
import { allowedHostsForOverpass, buildOverpassUrls } from '../facilities/overpassShared';

interface FibreElement {
  type: 'way';
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface FibreResponse {
  elements: FibreElement[];
}

export function buildFibreQuery(radiusM: number, lat: number, lon: number): string {
  return `[out:json][timeout:25];(
  way["telecom"="fibre"](around:${radiusM},${lat},${lon});
  way["man_made"="subsea_cable"](around:${radiusM},${lat},${lon});
  way["communication"="fibre"](around:${radiusM},${lat},${lon});
  way["power"="line"]["cables"="fibre"](around:${radiusM},${lat},${lon});
);out tags geom 200;`;
}

export function elementToLineGeojson(el: FibreElement): { type: 'Feature'; properties: { name?: string; tags: Record<string, string> }; geometry: { type: 'LineString'; coordinates: number[][] } } {
  const coordinates = (el.geometry ?? []).map((p) => [p.lon, p.lat] as [number, number]);
  return {
    type: 'Feature',
    properties: { name: el.tags?.name, tags: el.tags ?? {} },
    geometry: { type: 'LineString', coordinates },
  };
}

export function computeNearestFibre(
  location: { latitude: number; longitude: number },
  elements: FibreElement[],
): { distanceKm: number; name?: string; mode: 'osm-mapped' } | null {
  let best: { distanceKm: number; name?: string } | null = null;
  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 2) continue;
    const line = elementToLineGeojson(el);
    const d = nearestDistanceToLineGeojsonKm(location, line.geometry);
    if (best === null || d < best.distanceKm) {
      best = { distanceKm: d, name: el.tags?.name };
    }
  }
  return best === null ? null : { ...best, mode: 'osm-mapped' };
}

export class OverpassFibreProvider implements FibreProvider {
  readonly id = 'fibre/overpass';
  readonly label = 'OpenStreetMap (Overpass)';

  constructor(private readonly radiusKm?: number) {}

  async fetch(ctx: ProviderContext): Promise<ProviderResult<FibreSection>> {
    const cfg = getConfig();
    const radius = this.radiusKm ?? cfg.research.fibreSearchRadiusKm;
    const query = buildFibreQuery(Math.round(radius * 1000), ctx.location.latitude, ctx.location.longitude);
    const source = makeSource('osm:overpass', `Fibre routes within ${radius} km of ${ctx.location.name}`, ctx.retrievedAt);
    try {
      const data = await fetchJsonWithFallback<FibreResponse>(
        buildOverpassUrls(cfg.overpass, query),
        { timeoutMs: cfg.overpass.timeoutMs },
        allowedHostsForOverpass(cfg.overpass),
      );
      const elements = data.elements ?? [];
      const nearest = computeNearestFibre(ctx.location, elements);
      const features = elements
        .filter((el) => el.geometry && el.geometry.length >= 2)
        .map(elementToLineGeojson);
      const geometry =
        features.length > 0
          ? { type: 'FeatureCollection', features }
          : undefined;

      return {
        status: 'ok',
        data: {
          status: 'ok',
          nearestDistanceKm: nearest?.distanceKm,
          nearestName: nearest?.name,
          mode: nearest?.mode,
          featuresWithinRadius: features.length,
          radiusKm: radius,
          geometry,
          source,
          note:
            features.length === 0
              ? 'No fibre routes are mapped in OpenStreetMap within the search radius. Absence from open data does not prove absence on the ground.'
              : 'Distance measured to the nearest mapped fibre route. Proximity does not imply service availability.',
        },
      };
    } catch (err) {
      return {
        status: 'unavailable',
        note: `Overpass API unavailable: ${err instanceof FetchError ? err.message : 'unknown error'}`,
      };
    }
  }
}