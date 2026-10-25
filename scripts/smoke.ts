// Smoke test — verifies a running RuralNet instance end to end.
// Used by CI after `next start`. Expects a server on RURALNET_BASE_URL
// (default http://localhost:3000).

const BASE = (process.env.RURALNET_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const QUERY = process.env.RURALNET_SMOKE_QUERY ?? 'Oghara, Delta State';

interface ApiResponse {
  status: number;
  body: Record<string, unknown> | null;
  text: string;
}

async function main() {
  const started = Date.now();

  const health = await get('/api/health');
  if (health.status !== 200) fail('health endpoint', health.status);
  console.log(`[1/4] health ok (mode=${health.body?.mode}, db=${health.body?.database})`);

  const search = await get(`/api/search?q=${encodeURIComponent('Oghara')}`);
  const searchResults = search.body?.results as Array<Record<string, unknown>> | null | undefined;
  if (search.status !== 200 || !searchResults?.length) fail('search endpoint', search.status);
  console.log(`[2/4] search ok (${searchResults.length} candidate(s))`);

  const research = await get(`/api/research?q=${encodeURIComponent(QUERY)}`);
  const report = research.body?.report as Record<string, any> | null | undefined;
  if (research.status !== 200 || !report?.location) fail('research endpoint', research.status);
  const location = report.location as Record<string, any>;
  const sections = report.sections as Record<string, any>;
  console.log(
    `[3/4] research ok for "${QUERY}" -> ${location.name}, ${location.state ?? '?'} (population=${sections.population.status}, schools=${sections.facilities.schools.length})`,
  );

  const exportCsv = await get(`/api/export?q=${encodeURIComponent(QUERY)}&format=csv`);
  if (exportCsv.status !== 200) fail('export endpoint', exportCsv.status);
  console.log(`[4/4] export ok (${exportCsv.text.split(/\r?\n/).length} CSV rows)`);

  console.log(`\nAll smoke checks passed in ${Date.now() - started} ms.`);
  process.exit(0);
}

async function get(pathname: string): Promise<ApiResponse> {
  const res = await fetch(`${BASE}${pathname}`, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let body: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(text);
    body = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    body = null;
  }
  return { status: res.status, body, text };
}

function fail(what: string, status: number): never {
  console.error(`SMOKE FAILURE: ${what} returned HTTP ${status}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`SMOKE FAILURE: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});