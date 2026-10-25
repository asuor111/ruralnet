// Overpass providers: facilities (schools/health/government/towers/
// substations/ICT centres) and fibre routes.
//
// Live Overpass instances can be slow or flaky (verified 2026-09-28), so the
// providers try configured mirrors in order and return an honest
// "unavailable" status instead of failing the research run.

import type { FacilitiesSection, ProviderResult } from '@/domain/types';
import { makeSource } from '@/domain/sources';
import { getConfig } from '@/services/config';
import { FetchError, fetchJsonWithFallback } from '../http';
import type { FacilitiesProvider, ProviderContext } from '../types';
import { allowedHostsForOverpass, buildFacilitiesQuery, buildOverpassUrls, categorizeElements } from './overpassShared';

export class OverpassFacilitiesProvider implements FacilitiesProvider {
  readonly id = 'facilities/overpass';
  readonly label = 'OpenStreetMap (Overpass)';

  constructor(private readonly radiusKm?: number) {}

  async fetch(ctx: ProviderContext): Promise<ProviderResult<FacilitiesSection>> {
    const cfg = getConfig();
    const radius = this.radiusKm ?? cfg.research.facilitiesRadiusKm;
    const query = buildFacilitiesQuery(Math.round(radius * 1000), ctx.location.latitude, ctx.location.longitude);
    const source = makeSource('osm:overpass', `Within ${radius} km of ${ctx.location.name}`, ctx.retrievedAt);
    try {
      const data = await fetchJsonWithFallback<{ elements: unknown[] }>(
        buildOverpassUrls(cfg.overpass, query),
        { timeoutMs: cfg.overpass.timeoutMs },
        allowedHostsForOverpass(cfg.overpass),
      );
      return { status: 'ok', data: categorizeElements(data.elements as never[], radius, source) };
    } catch (err) {
      return {
        status: 'unavailable',
        note: `Overpass API unavailable: ${err instanceof FetchError ? err.message : 'unknown error'}`,
      };
    }
  }
}