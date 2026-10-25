import { NextRequest, NextResponse } from 'next/server';
import { runResearch } from '@/services/research';
import { LocationNotFoundError } from '@/services/research';
import { NormalizationError, validateQuery } from '@/domain/normalize';
import { isRateLimited, callerKey } from '@/services/rateLimit';

/**
 * GET /api/research?q=Oghara&refresh=1
 * Runs (or reuses) the full research pipeline and returns a sourced profile.
 *
 * Long-running in live mode (public APIs can be slow); responses are cached
 * server-side by default. `refresh=1` forces a new run.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const refresh = req.nextUrl.searchParams.get('refresh') === '1';

  const validation = validateQuery(q);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  if (isRateLimited(callerKey(req.headers.get('x-forwarded-for')), 20, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again shortly.' }, { status: 429 });
  }

  try {
    const report = await runResearch(q, { refresh });
    return NextResponse.json({ report, cached: !refresh }, { status: 200 });
  } catch (err) {
    if (err instanceof NormalizationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof LocationNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Research run failed. One or more providers may be unavailable; try again shortly or run in mock mode locally.' },
      { status: 503 },
    );
  }
}