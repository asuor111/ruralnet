// Imported fibre infrastructure provider (GeoJSON lines).
//
// Reads data/generated/fibre.geojson, produced by
//   npm run import:fibre -- --path=<file.geojson>
// from any open fibre-route or cable GeoJSON export the operator trusts.
// Distances are computed to the imported geometry and labelled as such.

import type { FibreSection, ProviderResult } from '@/domain/types';
import { nearestDistanceToLineGeojsonKm } from '@/domain/geo';
import { makeSource } from '@/domain/sources';
import { getConfig } from '@/services/config';
import type { FibreProvider, ProviderContext } from '../types';
import { readJsonFileIfExists } from '../import/utils';

interface GeoJsonFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: unknown };
  properties?: Record<string, unknown>;
}

interface GeoJsonCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

function isLineFeature(f: GeoJsonFeature): boolean {
  return f.type === 'Feature' && (f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString');
}

export class ImportFibreProvider implements FibreProvider {
  readonly id = 'fibre/import';
  readonly label = 'Imported fibre dataset';

  constructor(private readonly radiusKm?: number) {}

  async fetch(ctx: ProviderContext): Promise<ProviderResult<FibreSection>> {
    const cfg = getConfig();
    const radius = this.radiusKm ?? cfg.research.fibreSearchRadiusKm;
    const raw = readJsonFileIfExists(`${cfg.dataDir}/generated/fibre.geojson`);
    const collection = raw as GeoJsonCollection | null;
    if (!collection || collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
      return {
        status: 'unavailable',
        note: 'No imported fibre GeoJSON found. Run `npm run import:fibre` with a GeoJSON line export (see README).',
      };
    }

    const features = collection.features.filter(isLineFeature);
    const geometry = { type: 'FeatureCollection', features };
    let best: { distanceKm: number; name?: string } | null = null;

    for (const f of features) {
      try {
        const d = nearestDistanceToLineGeojsonKm(ctx.location, f.geometry);
        if (best === null || d < best.distanceKm) {
          const name = typeof f.properties?.name === 'string' ? f.properties.name : undefined;
          best = { distanceKm: d, name };
        }
      } catch {
        // unsupported geometry in import — skip that feature
      }
    }

    const source = makeSource('user:fibre-import', `Imported fibre dataset near ${ctx.location.name}`, ctx.retrievedAt);
    return {
      status: 'ok',
      data: {
        status: 'ok',
        nearestDistanceKm: best?.distanceKm,
        nearestName: best?.name,
        mode: 'imported-dataset',
        featuresWithinRadius: features.length,
        radiusKm: radius,
        geometry,
        source,
        note:
          features.length === 0
            ? 'The imported dataset contains no line features relevant to this location.'
            : 'Distance measured to the nearest imported fibre line. Proximity does not imply service availability.',
      },
    };
  }
}