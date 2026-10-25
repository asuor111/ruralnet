import { describe, expect, it } from 'vitest';
import { collectSources } from '@/domain/sources';
import { fixtureFacilities, fixtureInternet, fixtureReport } from '../helpers/fixture';

describe('collectSources', () => {
  it('aggregates unique datasets with the sections that used them', () => {
    const report = fixtureReport();
    const sources = collectSources(report);
    const byId = new Map(sources.map((s) => [s.source.id, s]));
    expect(byId.has('worldbank:population')).toBe(true);
    expect(byId.has('osm:overpass')).toBe(true);
    expect(byId.get('osm:overpass')!.usedBy).toContain('facilities');
    expect(byId.get('osm:overpass')!.usedBy).toContain('fibre');
  });

  it('includes internet point sources', () => {
    const report = fixtureReport();
    const sources = collectSources(report);
    const internet = sources.find((s) => s.source.id === 'worldbank:internet-users');
    expect(internet).toBeDefined();
    expect(internet!.usedBy).toContain('internet');
  });

  it('never duplicates the same source id', () => {
    const report = fixtureReport({
      facilities: fixtureFacilities(),
    });
    const ids = collectSources(report).map((s) => s.source.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('records every source with retrievable provenance', () => {
    for (const { source } of collectSources(fixtureReport())) {
      expect(source.provider.length).toBeGreaterThan(0);
      expect(source.dataset.length).toBeGreaterThan(0);
      expect(source.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});