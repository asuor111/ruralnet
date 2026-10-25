// Test fixture: builds a complete, all-available ResearchReport so the rules
// engine can be tested deterministically without network or providers.

import type {
  CoverageSection,
  ElectricitySection,
  FacilitiesSection,
  FibreSection,
  InternetSection,
  PopulationSection,
  ResearchReport,
  ResolvedLocation,
  SourceRef,
} from '@/domain/types';
import { makeSource } from '@/domain/sources';

export const RETRIEVED = '2026-09-28';

export function fixtureSource(id: string = 'worldbank:population'): SourceRef {
  return makeSource(id, 'Test fixture', RETRIEVED);
}

export function fixtureLocation(overrides: Partial<ResolvedLocation> = {}): ResolvedLocation {
  return {
    id: 'oghara-delta-state',
    query: 'Oghara, Delta State',
    name: 'Oghara',
    adminLevel: 'community',
    parentName: 'Ughelli North',
    admin2Name: 'Ughelli North',
    state: 'Delta State',
    country: 'Nigeria',
    latitude: 5.5897,
    longitude: 6.0998,
    boundingBox: [5.5696798, 6.0797825, 5.6096798, 6.1197825],
    geocoder: 'Test geocoder',
    quality: 'reported',
    ...overrides,
  };
}

export function fixturePopulation(overrides: Partial<PopulationSection> = {}): PopulationSection {
  return {
    status: 'ok',
    population: 125_000,
    year: 2024,
    geographicLevel: 'LGA',
    quality: 'reported',
    source: fixtureSource('worldbank:population'),
    note: 'Fixture population',
    ...overrides,
  };
}

export function fixtureCoverage(overrides: Partial<CoverageSection> = {}): CoverageSection {
  return {
    status: 'ok',
    technologies: [
      { tech: '4G', coveragePct: 72, quality: 'reported' },
      { tech: '3G', coveragePct: 88, quality: 'reported' },
    ],
    towers: [],
    source: fixtureSource('user:coverage-import'),
    ...overrides,
  };
}

export function fixtureInternet(overrides: Partial<InternetSection> = {}): InternetSection {
  return {
    status: 'ok',
    points: [
      {
        metric: 'internet_users_pct',
        label: 'Individuals using the Internet',
        value: 41.2,
        unit: '% of population',
        year: 2024,
        scope: 'Nigeria (national)',
        quality: 'reported',
        source: fixtureSource('worldbank:internet-users'),
      },
    ],
    ...overrides,
  };
}

export function fixtureFibre(overrides: Partial<FibreSection> = {}): FibreSection {
  return {
    status: 'ok',
    nearestDistanceKm: 8.4,
    mode: 'osm-mapped',
    featuresWithinRadius: 1,
    radiusKm: 25,
    source: fixtureSource('osm:overpass'),
    ...overrides,
  };
}

export function fixtureElectricity(overrides: Partial<ElectricitySection> = {}): ElectricitySection {
  return {
    status: 'ok',
    accessPct: 62.5,
    accessScope: 'Nigeria (national)',
    accessYear: 2024,
    accessQuality: 'reported',
    substations: [],
    source: fixtureSource('worldbank:electricity'),
    ...overrides,
  };
}

export function fixtureFacilities(overrides: Partial<FacilitiesSection> = {}): FacilitiesSection {
  const source = fixtureSource('osm:overpass');
  return {
    status: 'ok',
    withinRadiusKm: 10,
    schools: Array.from({ length: 3 }, (_, i) => ({
      id: `school-${i}`,
      type: 'school' as const,
      name: `School ${i}`,
      latitude: 5.58 + i * 0.01,
      longitude: 6.09,
      source,
    })),
    health: Array.from({ length: 2 }, (_, i) => ({
      id: `health-${i}`,
      type: 'health' as const,
      name: `Clinic ${i}`,
      latitude: 5.6 + i * 0.01,
      longitude: 6.1,
      source,
    })),
    government: [],
    infrastructure: [],
    ...overrides,
  };
}

export function fixtureReport(overrides: {
  population?: PopulationSection;
  coverage?: CoverageSection;
  internet?: InternetSection;
  fibre?: FibreSection;
  electricity?: ElectricitySection;
  facilities?: FacilitiesSection;
  location?: ResolvedLocation;
  providers?: ResearchReport['providers'];
} = {}): ResearchReport {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-28T12:00:00.000Z',
    mode: 'mock',
    location: overrides.location ?? fixtureLocation(),
    sections: {
      population: overrides.population ?? fixturePopulation(),
      coverage: overrides.coverage ?? fixtureCoverage(),
      internet: overrides.internet ?? fixtureInternet(),
      fibre: overrides.fibre ?? fixtureFibre(),
      electricity: overrides.electricity ?? fixtureElectricity(),
      facilities: overrides.facilities ?? fixtureFacilities(),
      infrastructure: {
        towers: [],
        substations: [],
        ictCentres: [],
        fibre: { featuresWithinRadius: 1, nearestDistanceKm: 8.4, source: fixtureSource('osm:overpass') },
      },
    },
    analysis: { gaps: [], priorities: [], score: { indicator: null, components: [], dataCompletenessPct: 0, missingDatasets: [] } },
    sources: [],
    providers: overrides.providers ?? ALL_OK_PROVIDERS,
    warnings: [],
    disclaimer: 'Test disclaimer',
  };
}

export const ALL_OK_PROVIDERS: ResearchReport['providers'] = [
  { providerId: 'population/mock', providerLabel: 'Mock population', domain: 'population', status: 'ok', durationMs: 1 },
  { providerId: 'coverage/mock', providerLabel: 'Mock coverage', domain: 'coverage', status: 'ok', durationMs: 1 },
  { providerId: 'internet/mock', providerLabel: 'Mock internet', domain: 'internet', status: 'ok', durationMs: 1 },
  { providerId: 'fibre/mock', providerLabel: 'Mock fibre', domain: 'fibre', status: 'ok', durationMs: 1 },
  { providerId: 'electricity/mock', providerLabel: 'Mock electricity', domain: 'electricity', status: 'ok', durationMs: 1 },
  { providerId: 'facilities/mock', providerLabel: 'Mock facilities', domain: 'facilities', status: 'ok', durationMs: 1 },
];