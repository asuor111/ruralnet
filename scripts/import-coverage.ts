// Import a coverage/tower snapshot.
//
// Usage (from an OpenCelliD cells.csv snapshot or any CSV with lat/lon):
//   npm run import:coverage -- --path=./downloads/cells.csv
//   (optional) --tech-col=technology --coverage-col=coverage --name-col=name
//
// Output: data/generated/coverage.json, read by the live coverage provider.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from './_args';

const [, flags] = parseArgs(process.argv.slice(2));
const csvPath = flags.path ?? flags.file;
if (!csvPath) {
  console.error('Usage: tsx scripts/import-coverage.ts --path=<file.csv>');
  process.exit(1);
}
if (!existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

const lines = readFileSync(csvPath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
if (lines.length < 2) {
  console.error('CSV has no data rows.');
  process.exit(1);
}
const header = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ''));
const findCol = (candidates: string[]) => {
  const lower = candidates.map((c) => c.toLowerCase());
  const at = header.findIndex((h) => lower.includes(h.toLowerCase()));
  return at >= 0 ? at : null;
};

const latIdx = findCol([flags.latCol, 'lat', 'latitude', 'LAT']);
const lonIdx = findCol([flags.lonCol, 'lon', 'lng', 'longitude', 'LON']);
const techIdx = findCol([flags.techCol, 'tech', 'technology', 'network', 'radio']);
const coverageIdx = findCol([flags.coverageCol, 'coverage', 'coverage_pct', 'pct']);
const nameIdx = findCol([flags.nameCol, 'name', 'site', 'operator']);
if (latIdx === null || lonIdx === null) {
  console.error(`Could not find lat/lon columns. Header: ${header.join(', ')}`);
  process.exit(1);
}

const towers: Array<{ lat: number; lon: number; name?: string }> = [];
let skipped = 0;
for (let i = 1; i < lines.length; i++) {
  const cells = splitCsvLine(lines[i]);
  const lat = parseFloat(cells[latIdx] ?? '');
  const lon = parseFloat(cells[lonIdx] ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    skipped++;
    continue;
  }
  towers.push({
    lat,
    lon,
    name: nameIdx !== null && cells[nameIdx] ? cells[nameIdx].trim().replace(/^"|"$/g, '') : undefined,
  });
}

// Coverage percentages: aggregate per technology when a tech column exists.
const techCounts = new Map<string, { coveragePct?: number; operator?: string }>();
if (techIdx !== null) {
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const tech = (cells[techIdx] ?? '').trim().toUpperCase();
    if (!['2G', '3G', '4G', '5G'].includes(tech)) continue;
    const previous = techCounts.get(tech) ?? {};
    if (coverageIdx !== null && coverageIdx < cells.length) {
      const v = parseFloat(cells[coverageIdx] ?? '');
      if (Number.isFinite(v)) previous.coveragePct = Math.round(v);
    }
    if (nameIdx !== null && nameIdx < cells.length && cells[nameIdx]?.trim()) {
      previous.operator = cells[nameIdx].trim().replace(/^"|"$/g, '');
    }
    techCounts.set(tech, previous);
  }
}

const technologies = Array.from(techCounts.entries()).map(([tech, t]) => ({
  tech: tech as '2G' | '3G' | '4G' | '5G',
  coveragePct: t.coveragePct,
  operator: t.operator,
}));

const outPath = path.join('data', 'generated', 'coverage.json');
mkdirSync(path.join('data', 'generated'), { recursive: true });
writeFileSync(outPath, JSON.stringify({ technologies, towers }, null, 1), 'utf8');
console.log(`Imported ${towers.length} tower point(s), ${technologies.length} technology band(s) -> ${outPath} (${skipped} rows skipped)`);

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}