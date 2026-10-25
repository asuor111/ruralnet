// World Bank Open Data API provider.
// Indicators verified live 2026-09-28 (mrv=1 returns the most recent value):
//   SP.POP.TOTL        population, total        -> 232,679,478 (2024)
//   EG.ELC.ACCS.ZS     access to electricity %  -> 62.5 (2024)
//   IT.NET.USER.ZS     internet users %         -> 41.2 (2024)
//   IT.NET.BBND        fixed broadband subs     -> 116,867 (2023)
// These are NATIONAL aggregates and are always labelled as such, never
// presented as local values.

import { makeSource } from '@/domain/sources';
import type {
  CoverageSection,
  ElectricitySection,
  InternetPoint,
  InternetSection,
  PopulationSection,
  ProviderResult,
} from '@/domain/types';
import { fetchJson } from './http';
import type { ProviderContext } from './types';

const WB_HOSTS = ['api.worldbank.org', 'data.worldbank.org', 'localhost', '127.0.0.1'];
const WB_BASE = 'https://api.worldbank.org/v2/country/NGA/indicator';

interface WbRow {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
}

async function fetchIndicator(indicator: string, timeoutMs = 20_000): Promise<WbRow | null> {
  const url = `${WB_BASE}/${indicator}?format=json&mrv=1`;
  const [, rows] = await fetchJson<[unknown, WbRow[]]>(url, { timeoutMs }, WB_HOSTS);
  const row = rows?.[0];
  if (!row || row.value === null || row.value === undefined) return null;
  return row;
}

export class WorldBankPopulationProvider {
  readonly id = 'population/worldbank';
  readonly label = 'World Bank Open Data API';
  readonly opts: { note?: string };

  constructor(opts: { note?: string } = {}) {
    this.opts = opts;
  }

  async fetch(ctx: ProviderContext): Promise<ProviderResult<PopulationSection>> {
    try {
      const row = await fetchIndicator('SP.POP.TOTL');
      if (!row || row.value === null) {
        return { status: 'unavailable', note: 'World Bank returned no population figure for Nigeria.' };
      }
      const year = parseInt(row.date, 10);
      return {
        status: 'ok',
        data: {
          status: 'ok',
          population: Math.round(row.value),
          year,
          geographicLevel: 'National',
          quality: 'reported',
          source: makeSource('worldbank:population', 'Nigeria (national)', ctx.retrievedAt),
          note:
            this.opts.note ??
            `National reference from the World Bank (${year}). Does not describe the LGA's own population; import the COD-PS dataset for LGA-level figures (see README).`,
        },
      };
    } catch {
      return { status: 'unavailable', note: 'World Bank population API could not be reached.' };
    }
  }
}

export class WorldBankInternetProvider {
  readonly id = 'internet/worldbank';
  readonly label = 'World Bank Open Data API';

  async fetch(ctx: ProviderContext): Promise<ProviderResult<InternetSection>> {
    const points: InternetPoint[] = [];

    try {
      const users = await fetchIndicator('IT.NET.USER.ZS');
      if (users?.value !== null && users?.value !== undefined) {
        points.push({
          metric: 'internet_users_pct',
          label: 'Individuals using the Internet',
          value: users.value,
          unit: '% of population',
          year: parseInt(users.date, 10),
          scope: 'Nigeria (national)',
          quality: 'reported',
          source: makeSource('worldbank:internet-users', 'Nigeria (national)', ctx.retrievedAt),
        });
      }
    } catch {
      // partial failure tolerated
    }
    try {
      const fixed = await fetchIndicator('IT.NET.BBND');
      if (fixed?.value !== null && fixed?.value !== undefined) {
        points.push({
          metric: 'fixed_broadband_total',
          label: 'Fixed broadband subscriptions',
          value: fixed.value,
          unit: 'subscriptions',
          year: parseInt(fixed.date, 10),
          scope: 'Nigeria (national)',
          quality: 'reported',
          source: makeSource('worldbank:broadband', 'Nigeria (national)', ctx.retrievedAt),
        });
      }
    } catch {
      // partial failure tolerated
    }

    if (points.length === 0) {
      return { status: 'unavailable', note: 'No internet availability indicators could be retrieved.' };
    }
    return {
      status: 'ok',
      data: {
        status: 'ok',
        points,
        note: 'National aggregates. Availability for a specific community is not measured by these indicators.',
      },
    };
  }
}

export class WorldBankElectricityProvider {
  readonly id = 'electricity/worldbank';
  readonly label = 'World Bank Open Data API';

  async fetch(ctx: ProviderContext): Promise<ProviderResult<ElectricitySection>> {
    try {
      const row = await fetchIndicator('EG.ELC.ACCS.ZS');
      if (!row || row.value === null) {
        return { status: 'unavailable', note: 'World Bank returned no electricity access figure for Nigeria.' };
      }
      const year = parseInt(row.date, 10);
      return {
        status: 'ok',
        data: {
          status: 'ok',
          accessPct: Math.round(row.value * 10) / 10,
          accessScope: 'Nigeria (national)',
          accessYear: year,
          accessQuality: 'reported',
          substations: [],
          source: makeSource('worldbank:electricity', 'Nigeria (national)', ctx.retrievedAt),
          note: 'National access rate (World Bank). Measures access, not reliability. Local grid data is not part of this indicator.',
        },
      };
    } catch {
      return { status: 'unavailable', note: 'World Bank electricity API could not be reached.' };
    }
  }
}

/** Live mode default for telecom coverage: honest "unavailable" status. */
export class CoverageUnavailableProvider {
  readonly id = 'coverage/unavailable';
  readonly label = 'No configured coverage dataset';

  async fetch(_ctx: ProviderContext): Promise<ProviderResult<CoverageSection>> {
    return {
      status: 'unavailable',
      note:
        'No per-location public telecom coverage dataset is configured. Import an OpenCelliD snapshot or a coverage CSV (see README "Importing datasets") to populate this section.',
    };
  }
}