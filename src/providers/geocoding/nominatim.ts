// OpenStreetMap Nominatim geocoder.
// Verified working: "Oghara, Delta State, Nigeria" -> ok (2026-09-28).
// Respects OSM's usage policy: rate-limited to ~1 request/second and sends a
// descriptive User-Agent.

import type { AdminLevel, BBox, ResolvedLocation } from '@/domain/types';
import { NIGERIA_STATES, querySlug } from '@/domain/normalize';
import { makeSource } from '@/domain/sources';
import { getConfig } from '@/services/config';
import { FetchError, fetchJson } from '../http';
import type { GeocodingProvider, ProviderContext } from '../types';
import type { NormalizedQuery } from '@/domain/normalize';

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  type: string;
  name: string;
  display_name: string;
  boundingbox: [string, string, string, string];
}

const NOMINATIM_ALLOWED_HOSTS = ['nominatim.openstreetmap.org', 'localhost', '127.0.0.1'];

let lastRequestAt = 0;

function sleep(minIntervalMs: number): Promise<void> {
  const wait = Math.max(0, lastRequestAt + minIntervalMs - Date.now());
  lastRequestAt = Date.now();
  return wait > 0 ? new Promise((r) => setTimeout(r, wait)) : Promise.resolve();
}

function resolveAdminLevel(type: string, name: string): AdminLevel {
  switch (type) {
    case 'city':
    case 'town':
      return 'town';
    case 'state':
      return 'state';
    case 'county':
    case 'local_government_area':
    case 'administrative':
      return name.toUpperCase().includes('LGA') ? 'lga' : 'town';
    default:
      return 'community';
  }
}

export function parseNominatimParts(displayName: string): { state?: string; admin2?: string } {
  const parts = displayName.split(',').map((p) => p.trim()).filter(Boolean);
  const stateParts = NIGERIA_STATES.filter((st) => st.name !== 'Federal Capital Territory').map((st) => st.name.toLowerCase());
  let stateIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    const lower = parts[i].toLowerCase();
    if (lower === 'federal capital territory') {
      stateIndex = i;
      break;
    }
    const bare = lower.replace(/ state$/, '').replace(/\s+/g, ' ');
    if (stateParts.includes(bare) || stateParts.includes(lower)) {
      stateIndex = i;
      break;
    }
  }
  const state = stateIndex >= 0 ? parts[stateIndex] : undefined;
  // admin2 = the administrative part immediately before the state part.
  const admin2 = stateIndex > 0 ? parts.slice(1, stateIndex).join(' ') : undefined;
  return { state, admin2: admin2 && admin2.length > 0 ? admin2 : undefined };
}

export function nominatimResultToLocation(r: NominatimResult, query: NormalizedQuery): ResolvedLocation {
  const { state, admin2 } = parseNominatimParts(r.display_name);
  const bboxRaw = r.boundingbox;
  const south = parseFloat(bboxRaw[0]);
  const west = parseFloat(bboxRaw[2]);
  const north = parseFloat(bboxRaw[1]);
  const east = parseFloat(bboxRaw[3]);
  const bbox: BBox = [south, west, north, east];
  const parts = r.display_name.split(',').map((p) => p.trim()).filter(Boolean);
  return {
    id: querySlug(`${r.name}-${state ?? ''}`),
    query: query.cleaned,
    name: r.name || parts[0] || query.cleaned,
    adminLevel: resolveAdminLevel(r.type, r.name || ''),
    parentName: admin2,
    state,
    admin2Name: admin2,
    country: parts[parts.length - 1] ?? 'Nigeria',
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    boundingBox: bbox,
    geocoder: 'OpenStreetMap Nominatim',
    geocoderUrl: 'https://nominatim.openstreetmap.org/',
    displayName: r.display_name,
    quality: 'reported',
  };
}

export class NominatimGeocodingProvider implements GeocodingProvider {
  readonly id = 'geocoding/nominatim';
  readonly label = 'OpenStreetMap Nominatim';

  async search(query: NormalizedQuery): Promise<ResolvedLocation[]> {
    const cfg = getConfig();
    await sleep(cfg.nominatim.minIntervalMs);
    const base = cfg.nominatim.baseUrl;
    // Full query text; countrycodes=ng keeps results inside Nigeria.
    const url = `${base}/search?format=jsonv2&limit=5&accept-language=en&countrycodes=ng&q=${encodeURIComponent(query.cleaned)}`;
    try {
      const data = await fetchJson<NominatimResult[]>(url, {
        timeoutMs: 12_000,
        headers: { 'User-Agent': `RuralNet/0.1 (research; ${cfg.nominatim.email})` },
      }, NOMINATIM_ALLOWED_HOSTS);
      return data.map((r) => nominatimResultToLocation(r, query));
    } catch (err) {
      if (err instanceof FetchError) {
        if (err.status === 403) {
          throw new Error(
            'Geocoding service rejected this request (HTTP 403). OpenStreetMap Nominatim blocks some networks and requires a descriptive User-Agent. Set NOMINATIM_EMAIL in .env, or use RURALNET_MODE=mock, or point NOMINATIM_BASE_URL at a self-hosted Nominatim instance.',
          );
        }
        throw new Error(`Geocoding service unavailable (${err.message})`);
      }
      throw err;
    }
  }
}