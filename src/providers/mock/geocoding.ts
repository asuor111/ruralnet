// MOCK geocoding provider for development.
//
// Resolves a small catalogue of real Nigerian places to the coordinates used
// throughout the README and the flow demo. Every result is annotated with the
// mock source; the dev banner ("DEVELOPMENT / MOCK DATA") is shown by the UI
// whenever mode=mock. Never used in production mode.

import type { ResolvedLocation } from '@/domain/types';
import { querySlug } from '@/domain/normalize';
import type { NormalizedQuery } from '@/domain/normalize';
import type { GeocodingProvider } from '../types';

export interface MockPlace {
  name: string;
  admin2Name?: string;
  state?: string;
  latitude: number;
  longitude: number;
  population?: number;
}

// Approximate coordinates for development use only — they mirror the places
// used in the README's worked example.
export const MOCK_PLACES: MockPlace[] = [
  { name: 'Oghara', admin2Name: 'Ughelli North', state: 'Delta State', latitude: 5.5898, longitude: 6.0998, population: 194_000 },
  { name: 'Warri', admin2Name: 'Warri South West', state: 'Delta State', latitude: 5.5167, longitude: 5.75, population: 110_000 },
  { name: 'Asaba', admin2Name: 'Oshimili North', state: 'Delta State', latitude: 6.1986, longitude: 6.7142, population: 82_000 },
  { name: 'Benin City', admin2Name: 'Oredo', state: 'Edo State', latitude: 6.3176, longitude: 5.6145, population: 1_100_000 },
  { name: 'Sokoto', admin2Name: 'Sokoto North', state: 'Sokoto State', latitude: 13.05, longitude: 5.24, population: 708_000 },
  { name: 'Kano', admin2Name: 'Kano Municipal', state: 'Kano State', latitude: 12.0029, longitude: 8.5919, population: 3_400_000 },
  { name: 'Makurdi', admin2Name: 'Makurdi', state: 'Benue State', latitude: 7.7326, longitude: 8.5365, population: 420_000 },
  { name: 'Gombe', admin2Name: 'Gombe', state: 'Gombe State', latitude: 10.2847, longitude: 11.1783, population: 150_000 },
];

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

export function scorePlace(query: NormalizedQuery, place: MockPlace): number {
  const qt = new Set(query.tokens);
  const nameTs = tokens(place.name);
  const stateTs = tokens(place.state ?? '');
  const admin2Ts = tokens(place.admin2Name ?? '');
  let score = 0;
  for (const t of qt) {
    if (nameTs.includes(t)) score += 3;
    if (stateTs.includes(t)) score += 2;
    if (admin2Ts.includes(t)) score += 1;
  }
  return score;
}

export class MockGeocodingProvider implements GeocodingProvider {
  readonly id = 'geocoding/mock';
  readonly label = 'RuralNet Mock Geocoder';

  async search(query: NormalizedQuery): Promise<MockLocation[]> {
    const scored = MOCK_PLACES
      .map((p) => ({ p, s: scorePlace(query, p) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5);

    return scored.map(({ p }) => this.toLocation(p, query));
  }

  private toLocation(p: MockPlace, query: NormalizedQuery): MockLocation {
    const retrievedAt = new Date().toISOString().slice(0, 10);
    return {
      id: querySlug(`${p.name}-${p.state ?? ''}`),
      query: query.cleaned,
      name: p.name,
      adminLevel: 'town',
      parentName: p.admin2Name,
      state: p.state,
      admin2Name: p.admin2Name,
      country: 'Nigeria',
      latitude: p.latitude,
      longitude: p.longitude,
      boundingBox: [p.latitude - 0.02, p.longitude - 0.02, p.latitude + 0.02, p.longitude + 0.02],
      geocoder: 'RuralNet Mock Geocoder (development only)',
      geocoderUrl: '',
      displayName: `${p.name}, ${p.admin2Name ?? ''}, ${p.state ?? ''}, Nigeria`,
      quality: 'estimated',
      mockPopulation: p.population,
    };
  }
}

/** ResolvedLocation extension used only by mock providers. */
export interface MockLocation extends ResolvedLocation {
  mockPopulation?: number;
}