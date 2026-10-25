// Imported telecom coverage/tower snapshot provider.
//
// Reads data/generated/coverage.json:
//   {
//     "technologies": [ { "tech": "4G", "coveragePct": 65, "operator": "..." } ],
//     "towers": [ { "lat": 5.6, "lon": 6.1, "name": "..." } ]
//   }
// Produced from OpenCelliD snapshots or trusted CSV exports. Without an
// import, live mode honestly reports the coverage domain as unavailable.

import type { CoverageSection, CoverageTechnology, InfrastructureItem, ProviderResult } from '@/domain/types';
import { makeSource } from '@/domain/sources';
import { getConfig } from '@/services/config';
import type { CoverageProvider, ProviderContext } from '../types';
import { readJsonFileIfExists } from '../import/utils';

interface CoverageImport {
  technologies?: Array<{ tech: string; coveragePct: number; operator?: string; quality?: string }>;
  towers?: Array<{ lat: number; lon: number; name?: string }>;
}

export class ImportCoverageProvider implements CoverageProvider {
  readonly id = 'coverage/import';
  readonly label = 'Imported coverage/tower snapshot';

  async fetch(ctx: ProviderContext): Promise<ProviderResult<CoverageSection>> {
    const cfg = getConfig();
    const raw = readJsonFileIfExists(`${cfg.dataDir}/generated/coverage.json`);
    const data = raw as CoverageImport | null;
    if (!data) {
      return {
        status: 'unavailable',
        note: 'No imported coverage snapshot found (see README "Importing datasets" for the OpenCelliD path).',
      };
    }

    const technologies: CoverageTechnology[] = (data.technologies ?? [])
      .filter((t) => ['2G', '3G', '4G', '5G'].includes(t.tech) && t.coveragePct !== undefined)
      .map((t) => ({
        tech: t.tech as CoverageTechnology['tech'],
        coveragePct: t.coveragePct,
        operator: t.operator,
        quality: (t.quality as CoverageTechnology['quality']) ?? 'reported',
      }));

    const towers: InfrastructureItem[] = (data.towers ?? [])
      .filter((t) => typeof t.lat === 'number' && typeof t.lon === 'number')
      .map((t, i) => ({
        id: `import-tower-${i}`,
        kind: 'telecom_tower' as const,
        name: t.name,
        latitude: t.lat,
        longitude: t.lon,
        source: makeSource('user:coverage-import', `Around ${ctx.location.name}`, ctx.retrievedAt),
      }));

    if (technologies.length === 0 && towers.length === 0) {
      return { status: 'unavailable', note: 'Imported coverage snapshot contains no usable records.' };
    }

    return {
      status: 'ok',
      data: {
        status: 'ok',
        technologies,
        towers,
        source: makeSource('user:coverage-import', `Around ${ctx.location.name}`, ctx.retrievedAt),
        note:
          technologies.length === 0
            ? 'Coverage percentages are not in the import; mapped towers provide infrastructure-presence evidence only.'
            : 'Coverage values come from the imported snapshot and may not reflect real-time service.',
      },
    };
  }
}