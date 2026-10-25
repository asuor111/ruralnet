import { describe, expect, it } from 'vitest';
import { computeScore } from '@/domain/score';
import { fixtureCoverage, fixtureFibre, fixtureInternet, fixturePopulation, fixtureReport } from '../helpers/fixture';

describe('computeScore', () => {
  it('computes a full-data indicator with 100% completeness', () => {
    const score = computeScore(fixtureReport());
    expect(score.indicator).toBeGreaterThanOrEqual(0);
    expect(score.indicator).toBeLessThanOrEqual(100);
    expect(score.dataCompletenessPct).toBe(100);
    expect(score.components).toHaveLength(6);
    expect(score.missingDatasets).toEqual([]);
  });

  it('excludes missing components instead of guessing', () => {
    const score = computeScore(
      fixtureReport({
        internet: fixtureInternet({ status: 'unavailable', points: [] }),
        fibre: fixtureFibre({ nearestDistanceKm: undefined, featuresWithinRadius: 0 }),
      }),
    );
    expect(score.dataCompletenessPct).toBe(65); // 20+20+10+15
    expect(score.missingDatasets).toContain('Internet availability / usage');
    expect(score.missingDatasets).toContain('Mapped fibre within search radius');
    const internetComponent = score.components.find((c) => c.key === 'internet')!;
    expect(internetComponent.score).toBeNull();
  });

  it('returns null indicator when no component has data', () => {
    const score = computeScore(
      fixtureReport({
        population: fixturePopulation({ status: 'unavailable' }),
        coverage: fixtureCoverage({ status: 'unavailable', technologies: [], towers: [] }),
        internet: fixtureInternet({ status: 'unavailable', points: [] }),
        fibre: fixtureFibre({ status: 'unavailable', featuresWithinRadius: 0, radiusKm: 25 }),
        electricity: { status: 'unavailable', accessQuality: 'unavailable', substations: [] },
        facilities: { status: 'unavailable', withinRadiusKm: 10, schools: [], health: [], government: [], infrastructure: [] },
      }),
    );
    expect(score.indicator).toBeNull();
    expect(score.dataCompletenessPct).toBe(0);
  });

  it('uses towers as a coverage proxy when percentages are absent', () => {
    const score = computeScore(
      fixtureReport({
        coverage: fixtureCoverage({
          technologies: [],
          towers: [
            { id: 't1', kind: 'telecom_tower', latitude: 5.6, longitude: 6.1, source: {} as never },
            { id: 't2', kind: 'telecom_tower', latitude: 5.7, longitude: 6.2, source: {} as never },
            { id: 't3', kind: 'telecom_tower', latitude: 5.8, longitude: 6.3, source: {} as never },
          ],
        }),
      }),
    );
    const telecom = score.components.find((c) => c.key === 'telecom')!;
    expect(telecom.score).toBe(60);
    expect(telecom.basis).toContain('proxy');
  });

  it('keeps weights constant and documented', () => {
    const score = computeScore(fixtureReport());
    const weights = score.components.map((c) => c.weight).reduce((a, b) => a + b, 0);
    expect(weights).toBeCloseTo(1.0, 2);
  });
});