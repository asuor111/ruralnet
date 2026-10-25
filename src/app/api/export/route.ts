import { NextRequest, NextResponse } from 'next/server';
import { runResearch } from '@/services/research';
import { reportToCsv, reportToJson } from '@/services/export';
import { querySlug, validateQuery } from '@/domain/normalize';
import { isRateLimited, callerKey } from '@/services/rateLimit';

/**
 * GET /api/export?q=Oghara&format=json|csv
 * Returns the location profile as a downloadable JSON or CSV file. The export
 * preserves every source reference so profiles stay auditable outside RuralNet.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const format = (req.nextUrl.searchParams.get('format') ?? 'json').toLowerCase();

  const validation = validateQuery(q);
  if (!validation.ok) return NextResponse.json({ error: validation.reason }, { status: 400 });
  if (format !== 'json' && format !== 'csv') {
    return NextResponse.json({ error: 'format must be "json" or "csv".' }, { status: 400 });
  }
  if (isRateLimited(callerKey(req.headers.get('x-forwarded-for')), 30, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again shortly.' }, { status: 429 });
  }

  try {
    const report = await runResearch(q, {});
    const filename = `${querySlug(q.trim())}.${format}`;
    const body = format === 'json' ? reportToJson(report) : reportToCsv(report);
    const contentType = format === 'json' ? 'application/json' : 'text/csv; charset=utf-8';
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Could not export this profile. The research run failed.' }, { status: 503 });
  }
}