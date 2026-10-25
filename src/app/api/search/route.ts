import { NextRequest, NextResponse } from 'next/server';
import { searchLocations } from '@/services/research';
import { NormalizationError, validateQuery } from '@/domain/normalize';
import { isRateLimited, callerKey } from '@/services/rateLimit';

/**
 * GET /api/search?q=Oghara&limit=5
 * Resolves a place/LGA query to candidate geographic locations.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const validation = validateQuery(q);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  if (isRateLimited(callerKey(req.headers.get('x-forwarded-for')), 60, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again shortly.' }, { status: 429 });
  }

  try {
    const results = await searchLocations(q);
    return NextResponse.json({ query: q.trim(), results }, { status: 200 });
  } catch (err) {
    if (err instanceof NormalizationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Search service is temporarily unavailable. Try again later.' }, { status: 503 });
  }
}