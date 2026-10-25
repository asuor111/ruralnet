// Best-effort PostgreSQL persistence through Prisma.
//
// The database is a cache and audit store: it persists research runs so that
// repeated queries for the same location skip expensive provider calls. When
// DATABASE_URL is unset — or Postgres is unreachable — every function here
// degrades to a no-op and the application keeps working in memory/mock mode.
//
// NOTE: importing this module requires `npx prisma generate` to have run once
// (it generates the typed client). See README "Database setup".

import { Prisma, PrismaClient } from '@prisma/client';
import type { ResearchReport } from '@/domain/types';
import { getConfig } from './config';

let client: PrismaClient | null | undefined;

function getClient(): PrismaClient | null {
  if (client !== undefined) return client;
  const cfg = getConfig();
  if (!cfg.databaseUrl) {
    client = null;
    return null;
  }
  client = new PrismaClient();
  return client;
}

export async function isDbAvailable(): Promise<boolean> {
  const p = getClient();
  if (!p) return false;
  try {
    await p.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  if (client) {
    try {
      await client.$disconnect();
    } catch {
      // ignore
    }
    client = undefined;
  }
}

// ---------------------------------------------------------------------------
// Cache + audit persistence
// ---------------------------------------------------------------------------

export async function saveResearchRun(report: ResearchReport): Promise<boolean> {
  const p = getClient();
  if (!p) return false;
  const loc = report.location;

  try {
    await p.researchRun.create({
      data: {
        query: loc.query,
        mode: report.mode,
        status: 'complete',
        startedAt: new Date(report.generatedAt),
        completedAt: new Date(),
        scoreJson: JSON.parse(JSON.stringify(report.analysis.score)),
        completenessPct: report.analysis.score.dataCompletenessPct,
        providerStatus: JSON.parse(JSON.stringify(report.providers)),
        errors: JSON.parse(JSON.stringify(report.warnings)),
        reportJson: JSON.parse(JSON.stringify(report)),
        location: {
          connectOrCreate: {
            where: { slug: loc.id },
            create: {
              slug: loc.id,
              query: loc.query,
              name: loc.name,
              adminLevel: loc.adminLevel,
              parentName: loc.parentName,
              state: loc.state,
              country: loc.country,
              latitude: loc.latitude,
              longitude: loc.longitude,
              boundingBox: loc.boundingBox,
              geocoder: loc.geocoder,
              geocoderUrl: loc.geocoderUrl,
            },
          },
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Reuse a previously persisted report when it exists, is fresh and matches. */
export async function findCachedReport(
  query: string,
  mode: string,
  ttlSeconds: number,
): Promise<ResearchReport | null> {
  const p = getClient();
  if (!p) return null;
  const since = new Date(Date.now() - ttlSeconds * 1000);
  try {
    const run = await p.researchRun.findFirst({
      where: {
        query: query.trim(),
        mode,
        status: 'complete',
        completedAt: { gte: since },
        reportJson: { not: Prisma.DbNull },
      },
      orderBy: { completedAt: 'desc' },
      select: { reportJson: true },
    });
    return run?.reportJson as ResearchReport | null;
  } catch {
    return null;
  }
}