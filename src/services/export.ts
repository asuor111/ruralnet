// Profile export: JSON (the full report with provenance) and CSV (flattened
// data points that preserve source information). Used by /api/export and the
// "Export JSON / Export CSV" buttons on a location profile.

import type { ResearchReport } from '@/domain/types';

export function reportToJson(report: ResearchReport): string {
  return JSON.stringify(report, null, 2);
}

type CsvRow = Array<string | number>;

const HEADER: CsvRow = [
  'section',
  'metric',
  'value',
  'unit',
  'quality',
  'year',
  'scope',
  'source_provider',
  'source_dataset',
  'source_url',
  'retrieved',
];

export function reportToCsv(report: ResearchReport): string {
  const rows: CsvRow[] = [HEADER];
  const s = report.sections;

  const push = (row: CsvRow) => rows.push(row);

  if (s.population.status === 'ok' && s.population.population) {
    push(['population', 'Population', s.population.population, 'people', s.population.quality, s.population.year ?? '', s.population.geographicLevel, ...src(s.population.source)]);
  }

  for (const t of s.coverage.technologies) {
    push(['coverage', `${t.tech} coverage`, t.coveragePct ?? '', '%', t.quality, '', s.coverage.source?.scope ?? '', ...src(s.coverage.source)]);
  }
  for (const t of s.coverage.towers) {
    push(['coverage', 'Mapped telecom tower', `${t.latitude.toFixed(5)}, ${t.longitude.toFixed(5)}`, 'lat, lon', 'reported', '', '', ...src(t.source)]);
  }

  for (const p of s.internet.points) {
    push(['internet', p.label, p.value, p.unit ?? '', p.quality, p.year ?? '', p.scope, ...src(p.source)]);
  }

  if (s.fibre.status === 'ok') {
    if (s.fibre.nearestDistanceKm !== undefined) {
      push(['fibre', 'Nearest mapped fibre (distance)', s.fibre.nearestDistanceKm, 'km', 'measured', '', report.location.name, ...src(s.fibre.source)]);
    }
    push(['fibre', 'Mapped fibre features within radius', s.fibre.featuresWithinRadius, 'features', 'measured', '', `${Math.round(s.fibre.radiusKm)} km`, ...src(s.fibre.source)]);
  }

  if (s.electricity.accessPct !== undefined) {
    push(['electricity', 'Access to electricity', s.electricity.accessPct, '%', s.electricity.accessQuality, s.electricity.accessYear ?? '', s.electricity.accessScope ?? '', ...src(s.electricity.source)]);
  }
  for (const sub of s.electricity.substations) {
    push(['electricity', 'Mapped substation', `${sub.latitude.toFixed(5)}, ${sub.longitude.toFixed(5)}`, 'lat, lon', 'reported', '', '', ...src(sub.source)]);
  }

  push(['facilities', 'Schools within radius', s.facilities.schools.length, 'count', 'reported', '', `${Math.round(s.facilities.withinRadiusKm)} km`]);
  push(['facilities', 'Health facilities within radius', s.facilities.health.length, 'count', 'reported', '', `${Math.round(s.facilities.withinRadiusKm)} km`]);
  push(['facilities', 'Government facilities within radius', s.facilities.government.length, 'count', 'reported', '', `${Math.round(s.facilities.withinRadiusKm)} km`]);

  for (const gap of report.analysis.gaps) {
    push(['analysis', `Gap: ${gap.title}`, gap.concern, 'text', 'calculated', '', '', '', '', '']);
  }
  for (const p of report.analysis.priorities) {
    push(['analysis', `Priority: ${p.title}`, p.why, 'text', 'calculated', '', '', '', '', '']);
  }
  for (const c of report.analysis.score.components) {
    push(['score', `Component: ${c.label}`, c.score ?? 'n/a', '0-100', c.quality, '', c.basis, '', '', '']);
  }
  push(['score', 'Connectivity Infrastructure Indicator', report.analysis.score.indicator ?? 'n/a', '0-100', 'calculated', '', `Data completeness: ${report.analysis.score.dataCompletenessPct}%`]);
  push(['meta', 'Mode', report.mode, '', '', '', '', '', '', '']);
  push(['meta', 'Generated at', report.generatedAt, '', '', '', '', '', '', '']);
  push(['meta', 'Location', report.location.displayName ?? report.location.name, '', '', '', '', ...src(undefined)]);

  return toCsv(rows);
}

function src(source: { provider?: string; dataset?: string; url?: string; retrievedAt?: string } | undefined): CsvRow {
  if (!source) return ['', '', '', ''];
  return [source.provider ?? '', source.dataset ?? '', source.url ?? '', source.retrievedAt ?? ''];
}

export function toCsv(rows: CsvRow[]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function csvCell(value: string | number): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}