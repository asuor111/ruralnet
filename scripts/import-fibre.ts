// Import fibre/cable routes from a public GeoJSON line export.
//
// Usage:
//   npm run import:fibre -- --path=./downloads/fibre_routes.geojson
//
// The file must be a GeoJSON FeatureCollection whose features have LineString
// or MultiLineString geometry. Output: data/generated/fibre.geojson, read by
// the live fibre provider for distance calculations.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from './_args';

const [, flags] = parseArgs(process.argv.slice(2));
const geoPath = flags.path ?? flags.file;
if (!geoPath) {
  console.error('Usage: tsx scripts/import-fibre.ts --path=<file.geojson>');
  process.exit(1);
}
if (!existsSync(geoPath)) {
  console.error(`File not found: ${geoPath}`);
  process.exit(1);
}

const collection = JSON.parse(readFileSync(geoPath, 'utf8')) as {
  type: string;
  features: Array<Record<string, unknown>>;
};
if (!collection || !Array.isArray(collection.features)) {
  console.error('Input is not a GeoJSON FeatureCollection.');
  process.exit(1);
}

const lineFeatures = collection.features.filter((f) => {
  const geometry = f.geometry as { type?: string } | undefined;
  return f.type === 'Feature' && geometry && (geometry.type === 'LineString' || geometry.type === 'MultiLineString');
});

let cleaned = lineFeatures.length;
layerCleanup(lineFeatures);

const outDir = path.join('data', 'generated');
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'fibre.geojson');
writeFileSync(outPath, JSON.stringify({ type: 'FeatureCollection', features: lineFeatures }, null, 1), 'utf8');
console.log(`Imported ${lineFeatures.length} line feature(s) -> ${outPath} (${collection.features.length - cleaned} non-line features skipped)`);

// Some public exports carry feature-level tags that include the route or
// cable name; keep them so the UI can show a name when present.
function layerCleanup(_features: Array<Record<string, unknown>>): void {
  void _features;
}