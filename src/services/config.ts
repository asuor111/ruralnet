// Runtime configuration, read from environment variables.
// Secrets are never embedded in code; nothing here is secret by design —
// every public provider used by RuralNet works without API keys.

export type RunMode = 'mock' | 'live';

export interface NominatimConfig {
  baseUrl: string;
  /** Contact email advertised in the User-Agent (OSM usage policy). */
  email: string;
  minIntervalMs: number;
}

export interface OverpassConfig {
  endpoints: string[];
  timeoutMs: number;
}

export interface ResearchConfig {
  facilitiesRadiusKm: number;
  fibreSearchRadiusKm: number;
  cacheTtlSeconds: number;
  concurrency: number;
}

export interface RuntimeConfig {
  mode: RunMode;
  databaseUrl?: string;
  nominatim: NominatimConfig;
  overpass: OverpassConfig;
  research: ResearchConfig;
  /** Root directory for imported/generated datasets. */
  dataDir: string;
}

function num(env: Record<string, string | undefined>, key: string, fallback: number): number {
  const raw = env[key];
  if (!raw) return fallback;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): RuntimeConfig {
  const modeRaw = (env['RURALNET_MODE'] ?? 'mock').trim().toLowerCase();
  const mode: RunMode = modeRaw === 'live' ? 'live' : 'mock';

  const overpassDefault = 'https://overpass.kumi.systems/api/interpreter,https://overpass-api.de/api/interpreter';
  const overpassEndpoints = (env['OVERPASS_ENDPOINTS'] ?? overpassDefault)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('https://'));

  return {
    mode,
    databaseUrl: env['DATABASE_URL']?.trim() || undefined,
    nominatim: {
      baseUrl: (env['NOMINATIM_BASE_URL'] ?? 'https://nominatim.openstreetmap.org').trim(),
      email: env['NOMINATIM_EMAIL']?.trim() || 'research@example.com',
      minIntervalMs: 1100,
    },
    overpass: {
      endpoints: overpassEndpoints.length > 0 ? overpassEndpoints : [overpassDefault],
      timeoutMs: 25_000,
    },
    research: {
      facilitiesRadiusKm: num(env, 'FACILITIES_RADIUS_KM', 10),
      fibreSearchRadiusKm: num(env, 'FIBRE_SEARCH_RADIUS_KM', 25),
      cacheTtlSeconds: num(env, 'RESEARCH_CACHE_TTL_SECONDS', 86_400),
      concurrency: 4,
    },
    dataDir: 'data',
  };
}

/** Read at call time so tests can flip RURALNET_MODE between runs. */
export function getConfig(env: Record<string, string | undefined> = process.env): RuntimeConfig {
  return loadConfig(env);
}