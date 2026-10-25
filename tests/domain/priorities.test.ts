import { describe, expect, it } from 'vitest';
import { findGaps } from '@/domain/gaps';
import { findPriorities } from '@/domain/priorities';
import {
  fixtureCoverage,
  fixtureFacilities,
  fixtureFibre,
  fixtureInternet,
  fixturePopulation,
  fixtureReport,
} from '../helpers/fixture';

describe('findPriorities', () => {
  it('suggests investigating broadband when internet data is weak', () => {
    const report = fixtureReport({ internet: fixtureInternet({ status: 'unavailable', points: [] }) });
    const priorities = findPriorities(report, findGaps(report));
    expect(priorities.some((p) => p.id === 'investigate-broadband')).toBe(true);
  });

  it('suggests fibre backhaul assessment for distant fibre', () => {
    const report = fixtureReport({ fibre: fixtureFibre({ nearestDistanceKm: 40 }) });
    const priorities = findPriorities(report, findGaps(report));
    expect(priorities.some((p) => p.id === 'fibre-backhaul')).toBe(true);
  });

  it('suggests school connectivity assessment with evidence counts', () => {
    const report = fixtureReport({
      facilities: fixtureFacilities(),
      internet: fixtureInternet({ status: 'unavailable', points: [] }),
    });
    const priorities = findPriorities(report, findGaps(report));
    const item = priorities.find((p) => p.id === 'school-connectivity');
    expect(item).toBeDefined();
    expect(item!.why).toContain('3');
  });

  it('suggests health connectivity assessment', () => {
    const report = fixtureReport({
      facilities: fixtureFacilities(),
      internet: fixtureInternet({ status: 'unavailable', points: [] }),
    });
    expect(findPriorities(report, findGaps(report)).some((p) => p.id === 'health-connectivity')).toBe(true);
  });

  it('suggests electricity investigation when access is low', () => {
    const report = fixtureReport({
      electricity: { status: 'ok', accessPct: 25, accessScope: 'national', accessYear: 2024, accessQuality: 'reported', substations: [], source: {} as never },
    });
    expect(findPriorities(report, findGaps(report)).some((p) => p.id === 'electricity')).toBe(true);
  });

  it('suggests last-mile review when towers are sparse and population high', () => {
    const towerSource = {
      id: 'osm:overpass',
      provider: 'test',
      dataset: 'test',
      url: 'https://example.com',
      retrievedAt: '2026-09-28',
      scope: 'test',
    };
    const report = fixtureReport({
      population: fixturePopulation({ population: 400_000 }),
      coverage: fixtureCoverage({
        technologies: [],
        towers: [{ id: 't1', kind: 'telecom_tower', latitude: 5.6, longitude: 6.1, source: towerSource }],
      }),
    });
    const priorities = findPriorities(report, findGaps(report));
    expect(priorities.some((p) => p.id === 'last-mile-access')).toBe(true);
  });

  it('returns an empty list for a fully-served fixture without strong triggers', () => {
    const report = fixtureReport({
      internet: fixtureInternet({ points: [{ ...fixtureInternet().points[0]!, value: 55 }] }),
      facilities: fixtureFacilities({ schools: [], health: [] }),
      electricity: { status: 'ok', accessPct: 70, accessScope: 'national', accessYear: 2024, accessQuality: 'reported', substations: [], source: {} as never },
    });
    const priorities = findPriorities(report, findGaps(report));
    expect(priorities.length).toBe(0);
  });
});