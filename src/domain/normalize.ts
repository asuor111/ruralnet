// Location query normalization.
// RuralNet accepts free-text queries like "Oghara, Delta State" or
// "Warri South West LGA". This module cleans and validates the input before
// any provider is contacted, protecting the API against malicious input.

export interface NormalizedQuery {
  raw: string;
  /** Trimmed, whitespace-collapsed form of the raw query. */
  cleaned: string;
  /** Lower-cased word tokens. */
  tokens: string[];
  /** Nigerian states detected in the query (formal names). */
  states: string[];
  countryDetected: boolean;
  adminLevelHint: 'state' | 'lga' | 'community' | 'unknown';
}

export interface QueryValidation {
  ok: boolean;
  reason?: string;
}

export const QUERY_MIN_LENGTH = 2;
export const QUERY_MAX_LENGTH = 120;

// Allowed characters: unicode letters/numbers, spaces, and a small set of
// punctuation that appears in Nigerian place names.
const QUERY_CHARS = /^[\p{L}\p{N} .,'’()\-/]+$/u;

/** Nigerian states plus the Federal Capital Territory (36 + 1). */
export const NIGERIA_STATES: { name: string; aliases: string[] }[] = [
  { name: 'Abia', aliases: [] },
  { name: 'Adamawa', aliases: [] },
  { name: 'Akwa Ibom', aliases: ['akwaibom'] },
  { name: 'Anambra', aliases: [] },
  { name: 'Bauchi', aliases: [] },
  { name: 'Bayelsa', aliases: [] },
  { name: 'Benue', aliases: [] },
  { name: 'Borno', aliases: [] },
  { name: 'Cross River', aliases: ['crossriver'] },
  { name: 'Delta', aliases: [] },
  { name: 'Ebonyi', aliases: [] },
  { name: 'Edo', aliases: [] },
  { name: 'Ekiti', aliases: [] },
  { name: 'Enugu', aliases: [] },
  { name: 'Federal Capital Territory', aliases: ['fct'] },
  { name: 'Gombe', aliases: [] },
  { name: 'Imo', aliases: [] },
  { name: 'Jigawa', aliases: [] },
  { name: 'Kaduna', aliases: [] },
  { name: 'Kano', aliases: [] },
  { name: 'Katsina', aliases: [] },
  { name: 'Kebbi', aliases: [] },
  { name: 'Kogi', aliases: [] },
  { name: 'Kwara', aliases: [] },
  { name: 'Lagos', aliases: [] },
  { name: 'Nasarawa', aliases: ['nassarawa'] },
  { name: 'Niger', aliases: [] },
  { name: 'Ogun', aliases: [] },
  { name: 'Ondo', aliases: [] },
  { name: 'Osun', aliases: [] },
  { name: 'Oyo', aliases: [] },
  { name: 'Plateau', aliases: [] },
  { name: 'Rivers', aliases: [] },
  { name: 'Sokoto', aliases: [] },
  { name: 'Taraba', aliases: [] },
  { name: 'Yobe', aliases: [] },
  { name: 'Zamfara', aliases: [] },
];

export const NIGERIA_COUNTRY_NAMES = ['nigeria', 'ng', 'nga', 'federal republic of nigeria'];

const STATE_BY_ALIAS = new Map<string, string>();
for (const st of NIGERIA_STATES) {
  STATE_BY_ALIAS.set(st.name.toLowerCase(), st.name);
  for (const a of st.aliases) STATE_BY_ALIAS.set(a, st.name);
}

export function validateQuery(raw: unknown): QueryValidation {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return { ok: false, reason: 'Enter a community or LGA name.' };
  }
  const cleaned = raw.trim();
  if (cleaned.length < QUERY_MIN_LENGTH || cleaned.length > QUERY_MAX_LENGTH) {
    return {
      ok: false,
      reason: `Query must be between ${QUERY_MIN_LENGTH} and ${QUERY_MAX_LENGTH} characters.`,
    };
  }
  if (!QUERY_CHARS.test(cleaned)) {
    return {
      ok: false,
      reason: 'Query contains unsupported characters. Use letters, numbers, spaces, commas, periods, hyphens or parentheses.',
    };
  }
  const lower = cleaned.toLowerCase();
  if (/https?:\/\/|www\.|mailto:/i.test(lower)) {
    return { ok: false, reason: 'URLs and contact details are not valid location queries.' };
  }
  if (/script|select|insert|delete|union|drop\s+table/i.test(lower)) {
    return { ok: false, reason: 'That query looks like it is not a real place name.' };
  }
  return { ok: true };
}

export function normalizeQuery(raw: string): NormalizedQuery {
  const validation = validateQuery(raw);
  if (!validation.ok) {
    throw new NormalizationError(validation.reason ?? 'Invalid query');
  }
  const cleaned = raw.trim().replace(/\s+/g, ' ').replace(/，/g, ',');
  const lower = cleaned.toLowerCase();
  const tokens = cleaned
    .toLowerCase()
    .split(/[\s,()/]+/)
    .map((t) => t.replace(/[^a-z0-9'’]/g, ''))
    .filter((t) => t.length > 0);

  const statesSeen = new Set<string>();
  for (const token of tokens) {
    const state = STATE_BY_ALIAS.get(token);
    if (state) statesSeen.add(state);
  }
  // Multi-word states are matched as full phrases ("cross river",
  // "akwa ibom", "federal capital territory") anywhere in the query.
  const lowerJoined = lower;
  for (const st of NIGERIA_STATES) {
    if (statesSeen.has(st.name)) continue;
    if (lowerJoined.includes(st.name.toLowerCase())) statesSeen.add(st.name);
    if (lowerJoined.includes('fct')) statesSeen.add('Federal Capital Territory');
  }

  const states = Array.from(statesSeen);
  const countryDetected = NIGERIA_COUNTRY_NAMES.some((name) => lower.includes(name));
  const lgaHint = /lga|local government/i.test(cleaned) || cleaned.includes(',');

  let adminLevelHint: NormalizedQuery['adminLevelHint'] = 'community';
  if (states.length === 1 && tokens.length <= 2 && !lgaHint) {
    adminLevelHint = 'state';
  } else if (lgaHint) {
    adminLevelHint = 'lga';
  }

  return {
    raw,
    cleaned,
    tokens,
    states,
    countryDetected,
    adminLevelHint,
  };
}

export class NormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NormalizationError';
  }
}

/** Stable single-word key used for caching and URL slugs. */
export function querySlug(cleaned: string): string {
  return cleaned
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}