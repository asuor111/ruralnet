import { describe, expect, it } from 'vitest';
import { runResearch, searchLocations, assembleSections, LocationNotFoundError } from '@/services/research';
import { NormalizationError } from '@/domain/normalize';
import { makeSource } from '@/domain/sources';
import type { ProviderContext } from '@/providers/types';
import { fixtureLocation } from '../helpers/fixture';

describe('runResearch (mock mode)', () => {
  it('produces a complete, sourced report for Oghara', async () => {
    const report = await runResearch('Oghara, Delta State');
    expect(report.mode).toBe('mock');
    expect(report.location.name).toBe('Oghara');
    expect(report.location.state).toBe('Delta State');
    expect(report.sections.population.status).toBe('ok');
    expect(report.sections.facilities.schools.length).toBeGreaterThan(0);
    expect(report.sections.fibre.featuresWithinRadius).toBe(1);
    expect(report.sources.length).toBeGreaterThan(0);
    expect(report.analysis.score.indicator).not.toBeNull();
    expect(report.analysis.gaps).toBeInstanceOf(Array);
    expect(report.disclaimer.length).toBeGreaterThan(0);
  });

  it('marks every provider status and never fails the whole run', async () => {
    const report = await runResearch('Oghara, Delta State');
    expect(report.providers.length).toBe(6);
    expect(report.providers.every((p) => p.status === 'ok')).toBe(true);
  });

  it('caches repeated queries within the TTL', async () => {
    const first = await runResearch('Oghara, Delta State');
    const second = await runResearch('Oghara, Delta State');
    expect(second.generatedAt).toBe(first.generatedAt);
    expect(second.location.id).toBe(first.location.id);
  });

  it('re-runs with refresh', async () => {
    const first = await runResearch('Oghara, Delta State', { refresh: true });
    expect(first.generatedAt.length).toBeGreaterThan(0);
  });

  it('throws a helpful error for unknown locations', async () => {
    expect(() => runResearch('Kxyzq Abcde Qq')).rejects.toBeInstanceOf(LocationNotFoundError);
  });

  it('rejects invalid input with a NormalizationError', async () => {
    expect(() => runResearch('http://bad.example')).rejects.toBeInstanceOf(NormalizationError);
  });
});

describe('searchLocations (mock mode)', () => {
  it('returns candidate locations', async () => {
    const results = await searchLocations('Oghara, Delta State');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].latitude).not.toBe(0);
  });
});

describe('assembleSections', () => {
  it('isolates one failing provider without affecting others', () => {
    const source = makeSource('mock:ruralnet', 'Test');
    const outcomes = [
      {
        domain: 'population' as const,
        providerId: 'population/mock',
        providerLabel: 'Mock population',
        status: 'error' as const,
        note: 'boom',
        durationMs: 2,
      },
      {
        domain: 'facilities' as const,
        providerId: 'facilities/mock',
        providerLabel: 'Mock facilities',
        status: 'ok' as const,
        data: {
          status: 'ok' as const,
          withinRadiusKm: 10,
          schools: [],
          health: [],
          government: [],
          infrastructure: [],
        },
        source,
        durationMs: 1,
      },
      {
        domain: 'fibre' as const,
        providerId: 'fibre/mock',
        providerLabel: 'Mock fibre',
        status: 'unavailable' as const,
        note: 'no data',
        durationMs: 1,
      },
    ];
    const { sections, warnings } = assembleSections(outcomes, { location: fixtureLocation(), retrievedAt: '2026-09-28' } satisfies ProviderContext);
    expect(sections.population.status).toBe('unavailable');
    expect(sections.facilities.status).toBe('ok');
    expect(sections.fibre.status).toBe('unavailable');
    expect(warnings.length).toBe(2);
  });
});