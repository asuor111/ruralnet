// Central catalogue of every external dataset RuralNet can reference.
// Each entry is verified public data. If a dataset cannot be reached at run
// time, providers return "unavailable" — nothing here is ever fabricated.
//
// Verified 2026-09-28:
//   - World Bank Indicators API (population, electricity, internet, broadband)
//   - OpenStreetMap Nominatim geocoder ("Oghara, Delta State, Nigeria")
//   - OpenStreetMap Overpass API (schools / health / towers / substations)
//   - HDX cod-ps-nga (LGA population) and cod-ab-nga (LGA boundaries) - imports

import type { ResearchDomain, ResearchReport, SourceRef, SourceUsage } from './types';

export interface SourceMeta {
  id: string;
  provider: string;
  dataset: string;
  url: string;
  licence?: string;
  /** Default geographic scope; overridden per record. */
  scope: string;
}

export const SOURCE_CATALOG: Record<string, SourceMeta> = {
  'worldbank:population': {
    id: 'worldbank:population',
    provider: 'World Bank Open Data API',
    dataset: 'SP.POP.TOTL — Population, total (Nigeria)',
    url: 'https://api.worldbank.org/v2/country/NGA/indicator/SP.POP.TOTL?format=json&per_page=1',
    licence: 'CC BY-4.0',
    scope: 'Nigeria (national)',
  },
  'worldbank:electricity': {
    id: 'worldbank:electricity',
    provider: 'World Bank Open Data API',
    dataset: 'EG.ELC.ACCS.ZS — Access to electricity (% of population)',
    url: 'https://api.worldbank.org/v2/country/NGA/indicator/EG.ELC.ACCS.ZS?format=json&per_page=1',
    licence: 'CC BY-4.0',
    scope: 'Nigeria (national)',
  },
  'worldbank:internet-users': {
    id: 'worldbank:internet-users',
    provider: 'World Bank Open Data API',
    dataset: 'IT.NET.USER.ZS — Individuals using the Internet (% of population)',
    url: 'https://api.worldbank.org/v2/country/NGA/indicator/IT.NET.USER.ZS?format=json&per_page=1',
    licence: 'CC BY-4.0',
    scope: 'Nigeria (national)',
  },
  'worldbank:broadband': {
    id: 'worldbank:broadband',
    provider: 'World Bank Open Data API',
    dataset: 'IT.NET.BBND — Fixed broadband subscriptions',
    url: 'https://api.worldbank.org/v2/country/NGA/indicator/IT.NET.BBND?format=json&per_page=1',
    licence: 'CC BY-4.0',
    scope: 'Nigeria (national)',
  },
  'osm:nominatim': {
    id: 'osm:nominatim',
    provider: 'OpenStreetMap Nominatim',
    dataset: 'Geocoding API (v2 JSON)',
    url: 'https://nominatim.openstreetmap.org/',
    licence: 'ODbL 1.0',
    scope: 'Geographic resolution',
  },
  'osm:overpass': {
    id: 'osm:overpass',
    provider: 'OpenStreetMap Overpass API',
    dataset: 'Mapped facilities & infrastructure (schools, health, towers, substations, fibre)',
    url: 'https://overpass-api.de/',
    licence: 'ODbL 1.0',
    scope: 'Surroundings of the selected location',
  },
  'hdx:cod-ps-nga': {
    id: 'hdx:cod-ps-nga',
    provider: 'Humanitarian Data Exchange (OCHA)',
    dataset: 'Nigeria — Subnational Population Statistics (COD-PS)',
    url: 'https://data.humdata.org/dataset/cod-ps-nga',
    licence: 'CC-BY',
    scope: 'Nigeria (subnational)',
  },
  'hdx:cod-ab-nga': {
    id: 'hdx:cod-ab-nga',
    provider: 'Humanitarian Data Exchange (OCHA)',
    dataset: 'Nigeria — Subnational Administrative Boundaries (COD-AB)',
    url: 'https://data.humdata.org/dataset/cod-ab-nga',
    licence: 'CC-BY',
    scope: 'Nigeria (subnational)',
  },
  'opencellid:import': {
    id: 'opencellid:import',
    provider: 'OpenCelliD (imported snapshot)',
    dataset: 'Crowd-sourced cell tower locations (cells.csv snapshot)',
    url: 'https://opencellid.org/',
    licence: 'CC BY-SA',
    scope: 'Surroundings of the selected location',
  },
  'user:fibre-import': {
    id: 'user:fibre-import',
    provider: 'Imported public dataset',
    dataset: 'Fibre route export (GeoJSON) supplied by the operator',
    url: '',
    licence: '—',
    scope: 'Local import',
  },
  'user:coverage-import': {
    id: 'user:coverage-import',
    provider: 'Imported public dataset',
    dataset: 'Coverage / tower snapshot supplied by the operator',
    url: '',
    licence: '—',
    scope: 'Local import',
  },
  'mock:ruralnet': {
    id: 'mock:ruralnet',
    provider: 'RuralNet Mock Provider',
    dataset: 'Development mock dataset — NOT real Nigerian data',
    url: 'https://github.com/',
    licence: '—',
    scope: 'Development only',
  },
};

/** ISO date (YYYY-MM-DD) for "retrieved" stamps. */
export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function makeSource(
  id: string,
  scope: string,
  retrievedAt = todayIso(),
): SourceRef {
  const meta = SOURCE_CATALOG[id];
  if (!meta) {
    throw new Error(`Unknown source id: ${id}`);
  }
  return {
    id: meta.id,
    provider: meta.provider,
    dataset: meta.dataset,
    url: meta.url,
    retrievedAt,
    scope: scope || meta.scope,
    licence: meta.licence,
  };
}

/**
 * Aggregates every unique source referenced anywhere in a report, with the
 * sections that used it. Used by the export and the Sources tab.
 */
export function collectSources(report: ResearchReport): SourceUsage[] {
  const map = new Map<string, SourceUsage>();

  const add = (source: SourceRef | undefined, domain: ResearchDomain) => {
    if (!source) return;
    const existing = map.get(source.id);
    if (existing) {
      if (!existing.usedBy.includes(domain)) existing.usedBy.push(domain);
      return;
    }
    map.set(source.id, { source, usedBy: [domain] });
  };

  const s = report.sections;
  const p = report.providers;

  if (s.population.source) add(s.population.source, 'population');
  if (s.coverage.source) add(s.coverage.source, 'coverage');
  for (const pt of s.internet.points) add(pt.source, 'internet');
  if (s.fibre.source) add(s.fibre.source, 'fibre');
  if (s.electricity.source) add(s.electricity.source, 'electricity');
  for (const f of [...s.facilities.schools, ...s.facilities.health, ...s.facilities.government]) {
    add(f.source, 'facilities');
  }
  for (const t of s.coverage.towers) add(t.source, 'coverage');
  for (const sub of s.electricity.substations) add(sub.source, 'electricity');
  if (s.infrastructure.ictCentresSource) add(s.infrastructure.ictCentresSource, 'facilities');
  for (const pr of p) {
    if (pr.source) add(pr.source, pr.domain);
  }

  return Array.from(map.values());
}