import { describe, expect, it } from 'vitest';
import { findGaps } from '@/domain/gaps';
import {
  fixtureFacilities,
  fixtureFibre,
  fixtureInternet,
  fixturePopulation,
  fixtureReport,
} from '../helpers/fixture';

describe('findGaps', () => {
  it('flags a high-population centre with weak broadband evidence', () => {
    const report = fixtureReport({
      population: fixturePopulation({ population: 900_000 }),
      internet: fixtureInternet({ status: 'unavailable', points: [] }),
    });
    const gaps = findGaps(report);
    expect(gaps.some((g) => g.id === 'high-population-low-broadband')).toBe(true);
    const gap = gaps.find((g) => g.id === 'high-population-low-broadband')!;
    expect(gap.severity).toBe('high');
    expect(gap.evidence.length).toBeGreaterThan(0);
  });

  it('does not flag demand when internet/coverage evidence is strong', () => {
    const report = fixtureReport({
      population: fixturePopulation({ population: 900_000 }),
      internet: fixtureInternet({ points: [{ ...fixtureInternet().points[0]!, value: 60 }] }),
    });
    const gaps = findGaps(report);
    expect(gaps.some((g) => g.id === 'high-population-low-broadband')).toBe(false);
  });

  it('flags distant mapped fibre', () => {
    const report = fixtureReport({ fibre: fixtureFibre({ nearestDistanceKm: 30 }) });
    expect(findGaps(report).some((g) => g.id === 'fibre-distance')).toBe(true);
  });

  it('flags when no fibre is mapped within the radius', () => {
    const report = fixtureReport({ fibre: fixtureFibre({ nearestDistanceKm: undefined, featuresWithinRadius: 0 }) });
    expect(findGaps(report).some((g) => g.id === 'fibre-none-mapped')).toBe(true);
  });

  it('flags schools without connectivity evidence', () => {
    const report = fixtureReport({
      facilities: fixtureFacilities({ schools: Array.from({ length: 4 }, (_, i) => ({
        id: `s${i}`,
        type: 'school',
        name: `S${i}`,
        latitude: 5.6,
        longitude: 6.1,
        source: { id: 'osm:overpass', provider: 'test', dataset: 'test', url: 'https://example.com', retrievedAt: '2026-09-28', scope: 'test' },
      })) }),
      internet: fixtureInternet({ status: 'unavailable', points: [] }),
    });
    const gaps = findGaps(report);
    expect(gaps.some((g) => g.id === 'schools-connectivity')).toBe(true);
  });

  it('flags low electricity access', () => {
    const report = fixtureReport({
      electricity: { status: 'ok', accessPct: 30, accessScope: 'national', accessYear: 2024, accessQuality: 'reported', substations: [], source: { } as never },
    });
    expect(findGaps(report).some((g) => g.id === 'electricity-access')).toBe(true);
  });

  it('flags sparse towers only when population is known', () => {
    const report = fixtureReport();
    expect(findGaps(report).some((g) => g.id === 'tower-sparse')).toBe(false); // no towers AND coverage ok with technology data
  });

  it('reports data sparsity when most providers fail', () => {
    const report = fixtureReport({
      providers: [
        { providerId: 'a', providerLabel: 'a', domain: 'population', status: 'unavailable', durationMs: 1 },
        { providerId: 'b', providerLabel: 'b', domain: 'coverage', status: 'unavailable', durationMs: 1 },
        { providerId: 'c', providerLabel: 'c', domain: 'internet', status: 'unavailable', durationMs: 1 },
        { providerId: 'd', providerLabel: 'd', domain: 'fibre', status: 'error', durationMs: 1 },
      ],
    });
    expect(findGaps(report).some((g) => g.id === 'data-sparse')).toBe(true);
  });
});