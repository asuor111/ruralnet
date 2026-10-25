import { NextResponse } from 'next/server';
import { getConfig } from '@/services/config';
import { isDbAvailable } from '@/services/db';

/** GET /api/health — basic readiness probe (used by CI and deployments). */
export async function GET() {
  const cfg = getConfig();
  let dbAvailable = false;
  try {
    dbAvailable = await isDbAvailable();
  } catch {
    dbAvailable = false;
  }
  return NextResponse.json(
    {
      ok: true,
      app: 'ruralnet',
      mode: cfg.mode,
      database: dbAvailable ? 'connected' : 'not-configured-or-unreachable',
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}