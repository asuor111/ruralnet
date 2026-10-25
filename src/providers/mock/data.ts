// MOCK data providers for development.
//
// These datasets are realistic in shape but contain NO real Nigerian
// measurements — the source is explicitly "RuralNet Mock Provider" and the
// interface shows a DEVELOPMENT / MOCK DATA banner. The pipeline logic them
// the same way it treats real providers, so the whole stack can be developed
// and tested without external services.

import type {
  CoverageSection,
  ElectricitySection,
  FacilitiesSection,
  FacilityItem,
  FibreSection,
  InfrastructureItem,
  InternetSection,
  LatLng,
  PopulationSection,
  ProviderResult,
} from '@/domain/types';
import { nearestDistanceToLineGeojsonKm } from '@/domain/geo';
import { makeSource } from '@/domain/sources';
import { getConfig } from '@/services/config';
import type { ProviderContext } from '../types';
import type { MockLocation } from './geocoding';

const MOCK_NOTE = 'MOCK dataset — development only. Not real Nigerian data.';

export function mockSource(retrievedAt: string, scope: string) {
  return makeSource('mock:ruralnet', scope, retrievedAt);
}

/** Deterministic pseudo-random sequence from a location. */
export function makeRng(location: LatLng): () => number {
  const seedRaw = Math.sin(location.latitude * 127.1 + location.longitude * 311.7) * 43758.5453;
  let state = Math.floor((seedRaw - Math.floor(seedRaw)) * 2_147_483_647) || 987_654_321;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

/** Uniform-ish scatter of points inside a radius (disk). */
export function diskPoints(center: LatLng, count: number, radiusKm: number, rng: () => number): LatLng[] {
  const cosLat = Math.cos((center.latitude * Math.PI) / 180);
  const points: LatLng[] = [];
  for (let i = 0; i < count; i++) {
    const r = radiusKm * Math.sqrt(rng() * 0.92);
    const theta = rng() * 2 * Math.PI;
    const dLat = (r * Math.sin(theta)) / 111.32;
    const dLon = (r * Math.cos(theta)) / (111.32 * Math.max(0.3, cosLat));
    points.push({ latitude: center.latitude + dLat, longitude: center.longitude + dLon });
  }
  return points;
}

export class MockPopulationProvider {
  readonly id = 'population/mock';
  readonly label = 'RuralNet Mock Provider';

  async fetch(ctx: ProviderContext): Promise<ProviderResult<PopulationSection>> {
    const mockLocation = ctx.location as MockLocation;
    const population = mockLocation.mockPopulation ?? 120_000;
    return {
      status: 'ok',
      data: {
        status: 'ok',
        population,
        year: 2024,
        geographicLevel: 'LGA',
        quality: 'estimated',
        source: mockSource(ctx.retrievedAt, `Development value for ${ctx.location.name}`),
        note: MOCK_NOTE,
      },
    };
  }
}

export class MockCoverageProvider {
  readonly id = 'coverage/mock';
  readonly label = 'RuralNet Mock Provider';

  async fetch(ctx: ProviderContext): Promise<ProviderResult<CoverageSection>> {
    const rng = makeRng(ctx.location);
    const shift = () => Math.round(rng() * 6) - 3;
    const technologies = [
      { tech: '2G' as const, coveragePct: 95 + shift(), quality: 'estimated' as const },
      { tech: '3G' as const, coveragePct: 88 + shift(), quality: 'estimated' as const },
      { tech: '4G' as const, coveragePct: 72 + shift(), quality: 'estimated' as const },
      { tech: '5G' as const, coveragePct: 12 + shift(), quality: 'estimated' as const },
    ].filter((t) => t.coveragePct >= 0 && t.coveragePct <= 100);
    const source = mockSource(ctx.retrievedAt, `Development value for ${ctx.location.name}`);
    const towers: InfrastructureItem[] = diskPoints(ctx.location, 3, 8, rng).map((p, i) => ({
      id: `mock-tower-${i}`,
      kind: 'telecom_tower',
      name: `Mock tower ${i + 1}`,
      latitude: p.latitude,
      longitude: p.longitude,
      source,
    }));
    return {
      status: 'ok',
      data: {
        status: 'ok',
        technologies,
        towers,
        source,
        note: MOCK_NOTE,
      },
    };
  }
}

export class MockInternetProvider {
  readonly id = 'internet/mock';
  readonly label = 'RuralNet Mock Provider';

  async fetch(ctx: ProviderContext): Promise<ProviderResult<InternetSection>> {
    const source = mockSource(ctx.retrievedAt, 'Development value (national)');
    return {
      status: 'ok',
      data: {
        status: 'ok',
        points: [
          {
            metric: 'internet_users_pct',
            label: 'Individuals using the Internet',
            value: 24.6,
            unit: '% of population',
            year: 2024,
            scope: 'Nigeria (national) — MOCK',
            quality: 'estimated',
            source,
          },
          {
            metric: 'fixed_broadband_total',
            label: 'Fixed broadband subscriptions',
            value: 98_400,
            unit: 'subscriptions',
            year: 2023,
            scope: 'Nigeria (national) — MOCK',
            quality: 'estimated',
            source,
          },
        ],
        note: MOCK_NOTE,
      },
    };
  }
}

export class MockFibreProvider {
  readonly id = 'fibre/mock';
  readonly label = 'RuralNet Mock Provider';

  constructor(private readonly radiusKm?: number) {}

  async fetch(ctx: ProviderContext): Promise<ProviderResult<FibreSection>> {
    const radius = this.radiusKm ?? 25;
    // Build a line that passes ~8.4 km from the location so the distribution
    // of the demo profile matches the README example.
    const targetKm = 8.4;
    const cosLat = Math.cos((ctx.location.latitude * Math.PI) / 180);
    const bearing = (135 * Math.PI) / 180;
    const dLat = (targetKm * Math.sin(bearing)) / 111.32;
    const dLon = (targetKm * Math.cos(bearing)) / (111.32 * Math.max(0.3, cosLat));
    const anchor = { latitude: ctx.location.latitude + dLat, longitude: ctx.location.longitude + dLon };

    const lineKm = 3;
    const perp = (((135 + 90) % 360) * Math.PI) / 180;
    const seg = [
      {
        latitude: anchor.latitude + (lineKm * Math.sin(perp)) / 111.32,
        longitude: anchor.longitude + (lineKm * Math.cos(perp)) / (111.32 * Math.max(0.3, cosLat)),
      },
      {
        latitude: anchor.latitude - (lineKm * Math.sin(perp)) / 111.32,
        longitude: anchor.longitude - (lineKm * Math.cos(perp)) / (111.32 * Math.max(0.3, cosLat)),
      },
    ];

    const geometry = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: { name: 'Mock fibre route', tags: { name: 'Mock fibre route' } },
          geometry: {
            type: 'LineString' as const,
            coordinates: seg.map((p) => [p.longitude, p.latitude] as [number, number]),
          },
        },
      ],
    };
    const nearest = nearestDistanceToLineGeojsonKm(ctx.location, geometry.features[0].geometry);

    return {
      status: 'ok',
      data: {
        status: 'ok',
        nearestDistanceKm: nearest,
        nearestName: 'Mock fibre route',
        mode: 'mock',
        featuresWithinRadius: 1,
        radiusKm: radius,
        geometry,
        source: mockSource(ctx.retrievedAt, `Development value for ${ctx.location.name}`),
        note: MOCK_NOTE,
      },
    };
  }
}

export class MockElectricityProvider {
  readonly id = 'electricity/mock';
  readonly label = 'RuralNet Mock Provider';

  async fetch(ctx: ProviderContext): Promise<ProviderResult<ElectricitySection>> {
    const rng = makeRng(ctx.location);
    const source = mockSource(ctx.retrievedAt, `Development value for ${ctx.location.name}`);
    const substations: InfrastructureItem[] = diskPoints(ctx.location, 2, 7, rng).map((p, i) => ({
      id: `mock-substation-${i}`,
      kind: 'substation',
      name: `Mock substation ${i + 1}`,
      latitude: p.latitude,
      longitude: p.longitude,
      source,
    }));
    return {
      status: 'ok',
      data: {
        status: 'ok',
        accessPct: 58,
        accessScope: 'Nigeria (national) — MOCK',
        accessYear: 2024,
        accessQuality: 'estimated',
        substations,
        source,
        note: MOCK_NOTE,
      },
    };
  }
}

export class MockFacilitiesProvider {
  readonly id = 'facilities/mock';
  readonly label = 'RuralNet Mock Provider';

  constructor(private readonly radiusKm?: number) {}

  async fetch(ctx: ProviderContext): Promise<ProviderResult<FacilitiesSection>> {
    const cfg = getConfig();
    const radius = this.radiusKm ?? cfg.research.facilitiesRadiusKm;
    const rng = makeRng(ctx.location);
    const source = mockSource(ctx.retrievedAt, `Development value for ${ctx.location.name}`);
    const schools = makeFacilities('school', 17, ctx.location, radius, rng, source);
    const health = makeFacilities('health', 4, ctx.location, radius, rng, source);
    const government = makeFacilities('government', 3, ctx.location, radius, rng, source);

    return {
      status: 'ok',
      data: {
        status: 'ok',
        withinRadiusKm: radius,
        schools,
        health,
        government,
        infrastructure: [],
        note: MOCK_NOTE,
      },
    };
  }
}

function makeFacilities(
  type: FacilityItem['type'],
  count: number,
  center: LatLng,
  radiusKm: number,
  rng: () => number,
  source: ReturnType<typeof mockSource>,
): FacilityItem[] {
  const label = type === 'school' ? 'School' : type === 'health' ? 'Health facility' : 'Government office';
  return diskPoints(center, count, radiusKm, rng).map((p, i) => ({
    id: `mock-${type}-${i}`,
    type,
    subtype: type,
    name: `${label} ${i + 1}`,
    latitude: p.latitude,
    longitude: p.longitude,
    source,
  }));
}