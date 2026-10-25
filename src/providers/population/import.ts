// Imported LGA population provider.
//
// Reads data/generated/population-lga.json, produced by
//   npm run import:population -- --path=<csv>
// from the HDX "Nigeria — Subnational Population Statistics" (COD-PS)
// dataset. When no import is present the provider reports the dataset as
// unavailable — it never fabricates LGA numbers.

import type { PopulationSection, ProviderResult } from '@/domain/types';
import { makeSource } from '@/domain/sources';
import { getConfig } from '@/services/config';
import type { PopulationProvider, ProviderContext } from '../types';
import { nameMatches, readJsonFileIfExists } from '../import/utils';

export interface LgaPopulationRow {
  name: string;
  state?: string;
  population: number;
  year: number;
}

export function matchLgaRow(
  rows: LgaPopulationRow[],
  names: Array<string | undefined>,
): LgaPopulationRow | null {
  for (const n of names) {
    if (!n) continue;
    const exact = rows.find((r) => nameMatches(r.name, n));
    if (exact) return exact;
  }
  // Fall back to the first row whose name is contained in the queried LGA.
  const target = names.filter(Boolean).join(' ');
  if (target.length > 0) {
    const partial = rows.find((r) => nameMatches(target, r.name));
    if (partial) return partial;
  }
  return null;
}

export class ImportPopulationProvider implements PopulationProvider {
  readonly id = 'population/import';
  readonly label = 'HDX COD-PS (imported)';

  async fetch(ctx: ProviderContext): Promise<ProviderResult<PopulationSection>> {
    const cfg = getConfig();
    const raw = readJsonFileIfExists(`${cfg.dataDir}/generated/population-lga.json`);
    if (!raw || !Array.isArray(raw)) {
      return {
        status: 'unavailable',
        note: 'No imported LGA population file found. Run `npm run import:population` after downloading the HDX COD-PS dataset (see README).',
      };
    }
    const rows = (raw as unknown[]).filter(isRow);
    const matched = matchLgaRow(rows, [ctx.location.admin2Name, ctx.location.parentName, ctx.location.name]);
    if (!matched) {
      return {
        status: 'unavailable',
        note: `No LGA population row matched "${ctx.location.admin2Name || ctx.location.name}". The lookup is by LGA name; an imported file may use different names or spellings.`,
      };
    }
    const scope = `LGA "${matched.name}" (${matched.state ?? 'state unknown'})`;
    return {
      status: 'ok',
      data: {
        status: 'ok',
        population: matched.population,
        year: matched.year,
        geographicLevel: 'LGA',
        quality: 'reported',
        source: makeSource('hdx:cod-ps-nga', scope, ctx.retrievedAt),
        note: `Population from the imported COD-PS snapshot (${matched.year}). LGA-level figure, matched by name on the geocoded location.`,
      },
    };
  }
}

function isRow(x: unknown): x is LgaPopulationRow {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.name === 'string' &&
    typeof r.population === 'number' &&
    typeof r.year === 'number'
  );
}