// Import LGA population from the HDX "Nigeria — Subnational Population
// Statistics" (COD-PS) CSV export.
//
// Usage:
//   npm run import:population -- --path=./downloads/nga_admpop_adm2_2022.csv
//   (optional) --columns="name,state,population,year"
//
// Supported column names cover COD-PS conventions (ADM2_NAME / ADM1_NAME /
// TOT_P / YEAR) and common alternatives. The YEAR column is used when
// present; otherwise the year from --year (default 2022).
// Output: data/generated/population-lga.json

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from './_args';

const [, flags] = parseArgs(process.argv.slice(2));
const csvPath = flags.path ?? flags.file;
if (!csvPath) {
  console.error('Usage: tsx scripts/import-population.ts --path=<file.csv>');
  process.exit(1);
}
if (!existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

interface Row {
  name: string;
  state?: string;
  population: number;
  year: number;
}
const rows: Row[] = [];
let skipped = 0;

const raw = readFileSync(csvPath, 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
if (lines.length < 2) {
  console.error('CSV has no data rows.');
  process.exit(1);
}

const header = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ''));
const findCol = (candidates: Array<string | undefined>) => {
  const lower = candidates.filter(Boolean).map((c) => c!.toLowerCase());
  const at = header.findIndex((h) => lower.includes(h.toLowerCase()));
  return at >= 0 ? at : null;
};

const nameIdx = findCol([flags.nameCol, 'ADM2_NAME', 'name_2', 'LGA', 'admin2name', 'adm2']);
const stateIdx = findCol([flags.stateCol, 'ADM1_NAME', 'name_1', 'state', 'admin1name']);
const popIdx = findCol([flags.popCol, 'TOT_P', 'POP', 'population', 'total']);
const yearIdx = header.findIndex((h) => h.toUpperCase().includes('YEAR'));
const defaultYear = parseYear(flags.year ?? '2022');

if (nameIdx === null || popIdx === null) {
  console.error(`Could not find name/population columns. Header: ${header.join(', ')}`);
  process.exit(1);
}

for (let i = 1; i < lines.length; i++) {
  const cells = splitCsvLine(lines[i]);
  const name = cells[nameIdx]?.trim().replace(/^"|"$/g, '');
  const population = parseFloat((cells[popIdx] ?? '').replace(/[^0-9.]/g, ''));
  if (!name || !Number.isFinite(population) || name.toLowerCase() === 'total') {
    skipped++;
    continue;
  }
  const state = stateIdx !== null && cells[stateIdx] ? cells[stateIdx].trim().replace(/^"|"$/g, '') : undefined;
  const year = yearIdx >= 0 && cells[yearIdx] ? parseYear(cells[yearIdx]) : defaultYear;
  rows.push({ name, state, population: Math.round(population), year });
}

const outDir = path.join('data', 'generated');
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'population-lga.json');
writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf8');
console.log(`Imported ${rows.length} LGA rows -> ${outPath} (${skipped} rows skipped)`);

function parseYear(v: string): number {
  const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 1900 && n < 2100 ? n : 2022;
}

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