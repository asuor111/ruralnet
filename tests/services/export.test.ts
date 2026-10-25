import { describe, expect, it } from 'vitest';
import { reportToCsv, reportToJson, toCsv } from '@/services/export';
import { fixtureReport } from '../helpers/fixture';

describe('reportToJson', () => {
  it('serializes the full report including provenance', () => {
    const report = fixtureReport();
    const parsed = JSON.parse(reportToJson(report)) as typeof report;
    expect(parsed.location.name).toBe('Oghara');
    expect(parsed.sections.population.population).toBe(125_000);
    expect(parsed.disclaimer.length).toBeGreaterThan(0);
  });
});

describe('reportToCsv', () => {
  it('writes a header row and populated data rows', () => {
    const csv = reportToCsv(fixtureReport());
    const lines = csv.split(/\r?\n/);
    expect(lines[0]).toContain('section');
    expect(csv).toContain('population,Population,125000');
    expect(csv).toContain('Connectivity Infrastructure Indicator');
  });

  it('keeps source columns for exported values', () => {
    const csv = reportToCsv(fixtureReport());
    expect(csv).toContain('World Bank Open Data API');
    expect(csv).toContain('SP.POP.TOTL');
    expect(csv).toContain('https://api.worldbank.org/v2/country/NGA/indicator/SP.POP.TOTL');
  });
});

describe('toCsv', () => {
  it('escapes quotes, commas and newlines', () => {
    const out = toCsv([
      ['a', 'has, comma'],
      ['b', 'has "quotes" and\nnewline'],
    ]);
    expect(out).toContain('"has, comma"');
    expect(out).toContain('"has ""quotes"" and\nnewline"');
  });
});