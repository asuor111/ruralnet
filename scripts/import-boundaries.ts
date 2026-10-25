// Import a single LGA boundary from the HDX "Nigeria — Subnational
// Administrative Boundaries" (COD-AB) GeoJSON export and store it for the
// map layer.
//
// Usage:
//   unzip -jo downloads/nga_admin_boundaries.geojson.zip -d downloads/
//   npm run import:boundaries -- --path=./downloads/nga_admin_boundaries.geojson --name="Ughelli North"
//
// The output is data/generated/boundaries/<slug>.geojson and is served with
// the map once the boundary import is present.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from './_args';

const [, flags] = parseArgs(process.argv.slice(2));
const geoPath = flags.path ?? flags.file;
const lgaName = flags.name;
if (!geoPath || !lgaName) {
  console.error('Usage: tsx scripts/import-boundaries.ts --path=<file.geojson> --name="<LGA name>"');
  process.exit(1);
}
if (!existsSync(geoPath)) {
  console.error(`File not found: ${geoPath}`);
  process.exit(1);
}

const collection = JSON.parse(readFileSync(geoPath, 'utf8')) as {
  type: string;
  features: Array<{ type: 'Feature'; properties?: Record<string, unknown>; geometry?: unknown }>;
};
if (!collection || !Array.isArray(collection.features)) {
  console.error('Input is not a GeoJSON FeatureCollection.');
  process.exit(1);
}

const needle = normalizeName(lgaName);
const match = collection.features.filter((f) => {
  const props = f.properties ?? {};
  const candidate = `${props.ADM2_NAME ?? props.NAME_2 ?? props.name ?? ''} ${props.ADM1_NAME ?? props.NAME_1 ?? props.state ?? ''}`;
  return normalizeName(candidate).includes(needle) || normalizeName(String(props.ADM2_NAME ?? '')).includes(needle);
});

if (match.length === 0) {
  console.error(`No feature matched "${lgaName}". Check the name against the dataset's ADM2_NAME values.`);
  process.exit(1);
}

const featureCollection = { type: 'FeatureCollection', features: match };
const slug = lgaName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const outDir = path.join('data', 'generated', 'boundaries');
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${slug}.geojson`);
writeFileSync(outPath, JSON.stringify(featureCollection, null, 1), 'utf8');
console.log(`Exported ${match.length} matching feature(s) -> ${outPath}`);

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}