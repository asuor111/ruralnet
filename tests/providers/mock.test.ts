import { describe, expect, it } from 'vitest';
import { normalizeQuery } from '@/domain/normalize';
import { MockGeocodingProvider } from '@/providers/mock/geocoding';
import {
  MockCoverageProvider,
  MockElectricityProvider,
  MockFacilitiesProvider,
  MockFibreProvider,
  MockInternetProvider,
  MockPopulationProvider,
} from '@/providers/mock/data';
import type { ProviderContext } from '@/providers/types';
import type { ResolvedLocation } from '@/domain/types';
import { fixtureLocation } from '../helpers/fixture';

interface MockLoc extends ResolvedLocation {
  mockPopulation?: number;
}

const ctx = (location?: ResolvedLocation): ProviderContext => {
  const loc: MockLoc = { ...fixtureLocation(), mockPopulation: 194_000, ...location };
  return { location: loc, retrievedAt: '2026-09-28' };
};

describe('mock providers', () => {
  it('geocodes a known place deterministically', async () => {
    const provider = new MockGeocodingProvider();
    const results = await provider.search(normalizeQuery('Oghara, Delta State'));
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Oghara');
    expect(results[0].state).toBe('Delta State');
    expect(results[0].quality).toBe('estimated');
  });

  it('returns no candidates for unknown places', async () => {
    const provider = new MockGeocodingProvider();
    expect(await provider.search(normalizeQuery('Kxyzq Wzvzq Qq'))).toEqual([]);
  });

  it('labels every mock dataset with the mock source', async () => {
    const p = await new MockPopulationProvider().fetch(ctx());
    expect(p.status).toBe('ok');
    expect(p.data!.source!.id).toBe('mock:ruralnet');
    expect(p.data!.quality).toBe('estimated');
  });

  it('produces the demo profile shape (17 schools / 4 health / 3 towers)', async () => {
    const facilities = await new MockFacilitiesProvider().fetch(ctx());
    expect(facilities.data!.schools).toHaveLength(17);
    expect(facilities.data!.health).toHaveLength(4);

    const coverage = await new MockCoverageProvider().fetch(ctx());
    expect(coverage.data!.towers).toHaveLength(3);
    const techs = coverage.data!.technologies.map((t) => t.tech);
    expect(techs).toContain('2G');
    expect(techs).toContain('4G');
  });

  it('computes a fibre distance around the README example (8.4 km)', async () => {
    const fibre = await new MockFibreProvider().fetch(ctx());
    expect(fibre.status).toBe('ok');
    expect(fibre.data!.nearestDistanceKm).toBeGreaterThan(7.5);
    expect(fibre.data!.nearestDistanceKm).toBeLessThan(9.5);
  });

  it('is deterministic for the same location', async () => {
    const a = await new MockFacilitiesProvider().fetch(ctx());
    const b = await new MockFacilitiesProvider().fetch(ctx());
    expect(a.data!.schools[0].latitude).toBe(b.data!.schools[0].latitude);
  });

  it('keeps electricity and internet normalized', async () => {
    const electricity = await new MockElectricityProvider().fetch(ctx());
    expect(electricity.data!.accessPct).toBe(58);
    expect(electricity.data!.substations.length).toBe(2);

    const internet = await new MockInternetProvider().fetch(ctx());
    expect(internet.data!.points.some((p) => p.metric === 'internet_users_pct')).toBe(true);
  });
});