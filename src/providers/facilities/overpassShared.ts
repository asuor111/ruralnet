// Shared Overpass helpers: query building, element classification and
// normalization. Kept separate from the provider class so tests can exercise
// the parsing logic without network access.

import type { FacilitiesSection, FacilityItem, InfrastructureItem, SourceRef } from '@/domain/types';
import type { OverpassConfig } from '@/services/config';

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

const HEALTH_AMENITIES = new Set(['hospital', 'clinic', 'doctors', 'health_centre']);
const HEALTH_CARE = new Set(['hospital', 'clinic', 'doctor', 'health_centre', 'dentist']);

export interface Classification {
  kind: 'school' | 'health' | 'government' | 'tower' | 'substation' | 'ict' | 'other';
  subtype?: string;
}

export function classifyOverpass(tags: Record<string, string>): Classification {
  const amenity = tags['amenity'] ?? '';
  const healthcare = tags['healthcare'] ?? '';
  if (['school', 'kindergarten', 'college', 'university'].includes(amenity)) {
    return { kind: 'school', subtype: amenity };
  }
  if (HEALTH_AMENITIES.has(amenity) || HEALTH_CARE.has(healthcare)) {
    return { kind: 'health', subtype: healthcare || amenity };
  }
  if (amenity === 'townhall' || tags['office'] === 'government' || amenity === 'government') {
    return { kind: 'government', subtype: amenity === 'townhall' ? 'town hall' : 'government office' };
  }
  if (tags['power'] === 'substation' || tags['power'] === 'generator') {
    return { kind: 'substation', subtype: tags['power'] };
  }
  if (tags['tower:type'] === 'communication' || tags['communication:mobile'] === 'yes') {
    return { kind: 'tower', subtype: 'telecom tower' };
  }
  if (amenity === 'telephone_office' || amenity === 'telephone') {
    return { kind: 'ict', subtype: 'public ICT/telephone office' };
  }
  if (tags['man_made'] === 'tower') {
    return { kind: 'tower', subtype: 'tower' };
  }
  return { kind: 'other', subtype: amenity || undefined };
}

export function buildFacilitiesQuery(radiusM: number, lat: number, lon: number): string {
  return `[out:json][timeout:25];(
  nwr["amenity"="school"](around:${radiusM},${lat},${lon});
  nwr["amenity"~"^(kindergarten|college|university)$"](around:${radiusM},${lat},${lon});
  nwr["amenity"~"^(hospital|clinic|doctors)$"](around:${radiusM},${lat},${lon});
  nwr["healthcare"~"^(hospital|clinic|doctor|health_centre|dentist)$"](around:${radiusM},${lat},${lon});
  nwr["amenity"~"^(townhall|government)$"](around:${radiusM},${lat},${lon});
  nwr["office"="government"](around:${radiusM},${lat},${lon});
  nwr["power"="substation"](around:${radiusM},${lat},${lon});
  nwr["man_made"="tower"]["tower:type"="communication"](around:${radiusM},${lat},${lon});
  nwr["communication:mobile"="yes"](around:${radiusM},${lat},${lon});
  nwr["amenity"="telephone_office"](around:${radiusM},${lat},${lon});
);out tags center 2500;`;
}

export function buildOverpassUrls(cfg: OverpassConfig, query: string): string[] {
  return cfg.endpoints.map((e) => `${e}?data=${encodeURIComponent(query).replace(/%20/g, '+')}`);
}

export function allowedHostsForOverpass(cfg: OverpassConfig): string[] {
  const hosts = new Set<string>();
  for (const e of cfg.endpoints) {
    try {
      hosts.add(new URL(e).hostname);
    } catch {
      // ignore malformed endpoint
    }
  }
  return Array.from(hosts);
}

function latLon(el: OverpassElement): { latitude: number; longitude: number } | null {
  if (el.lat !== undefined && el.lon !== undefined) return { latitude: el.lat, longitude: el.lon };
  if (el.center) return { latitude: el.center.lat, longitude: el.center.lon };
  return null;
}

export function categorizeElements(
  elements: OverpassElement[],
  radiusKm: number,
  source: SourceRef,
): FacilitiesSection {
  const schools: FacilityItem[] = [];
  const health: FacilityItem[] = [];
  const government: FacilityItem[] = [];
  const infrastructure: InfrastructureItem[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const ll = latLon(el);
    if (!ll) continue;
    const tags = el.tags ?? {};
    const classification = classifyOverpass(tags);
    const key = `${classification.kind}:${el.type}:${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const entryName = tags['name']?.trim() || undefined;
    const itemId = `osm-${el.type}-${el.id}`;

    switch (classification.kind) {
      case 'school':
      case 'health':
      case 'government': {
        const list = classification.kind === 'school' ? schools : classification.kind === 'health' ? health : government;
        list.push({
          id: itemId,
          name: entryName,
          type: classification.kind,
          subtype: classification.subtype,
          latitude: ll.latitude,
          longitude: ll.longitude,
          source,
        });
        break;
      }
      case 'tower':
        infrastructure.push({ id: itemId, kind: 'telecom_tower', name: entryName, latitude: ll.latitude, longitude: ll.longitude, source });
        break;
      case 'substation':
        infrastructure.push({ id: itemId, kind: 'substation', name: entryName, latitude: ll.latitude, longitude: ll.longitude, source });
        break;
      case 'ict':
        infrastructure.push({ id: itemId, kind: 'ict_centre', name: entryName, latitude: ll.latitude, longitude: ll.longitude, source });
        break;
      default:
        break;
    }
  }

  return {
    status: 'ok',
    withinRadiusKm: radiusKm,
    schools,
    health,
    government,
    infrastructure,
    note: 'OpenStreetMap mapping completeness varies by area; counts are minima, not authoritative inventories.',
  };
}