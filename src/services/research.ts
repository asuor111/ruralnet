// Research orchestration: turns a free-text Nigerian place query into a fully
// sourced ResearchReport.
//
// Order of work:
//   1. normalize + validate the query
//   2. resolve to a geographic location (geocoding provider)
//   3. run all domain providers with bounded concurrency
//   4. merge provider results into one profile
//   5. run the deterministic analysis engine (gaps, priorities, score)
//   6. aggregate sources, cache (memory + Postgres when configured), persist
//
// Failure isolation: a failing provider only affects its own section, which
// is reported as "Data unavailable" with the provider's note.

import type {
  ResearchDomain,
  ResearchReport,
  ResolvedLocation,
  SourceRef,
  InfrastructureItem,
  ProviderStatus,
  PopulationSection,
  CoverageSection,
  InternetSection,
  FibreSection,
  ElectricitySection,
  FacilitiesSection,
  FacilityItem,
} from '@/domain/types';
import { normalizeQuery, validateQuery, NormalizationError } from '@/domain/normalize';
import { computeScore } from '@/domain/score';
import { findGaps } from '@/domain/gaps';
import { findPriorities } from '@/domain/priorities';
import { collectSources, todayIso } from '@/domain/sources';
import { DISCLAIMER } from '@/domain/format';
import { getConfig } from './config';
import { getCachedReport, setCachedReport, makeCacheKey } from './cache';
import { findCachedReport as findDbCached, saveResearchRun } from './db';
import { buildProviderSet } from '@/providers/registry';
import type { ProviderContext } from '@/providers/types';

/** Bounded-concurrency runner so external requests never fire uncontrolled. */
export class Semaphore {
  private available: number;
  private queue: Array<() => void> = [];

  constructor(private readonly limit: number) {
    this.available = limit;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.available > 0) {
      this.available--;
      try {
        return await fn();
      } finally {
        this.available++;
        this.drain();
      }
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    return this.run(fn);
  }

  private drain(): void {
    while (this.available > 0 && this.queue.length > 0) {
      this.available--;
      this.queue.shift()!();
    }
  }
}

export interface Fetcher {
  id: string;
  label: string;
  fetch(ctx: ProviderContext): Promise<{ status: 'ok' | 'unavailable' | 'error'; source?: SourceRef; note?: string; data?: unknown }>;
}

export interface Outcome {
  domain: ResearchDomain;
  providerId: string;
  providerLabel: string;
  status: 'ok' | 'unavailable' | 'error';
  source?: SourceRef;
  note?: string;
  data?: unknown;
  durationMs: number;
}

export async function fetchOne(domain: ResearchDomain, provider: Fetcher, ctx: ProviderContext): Promise<Outcome> {
  const start = Date.now();
  try {
    const res = await provider.fetch(ctx);
    return {
      domain,
      providerId: provider.id,
      providerLabel: provider.label,
      status: res.status,
      source: res.source,
      note: res.note,
      data: res.data,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      domain,
      providerId: provider.id,
      providerLabel: provider.label,
      status: 'error',
      note: `Provider failed: ${safeMessage(err)}`,
      durationMs: Date.now() - start,
    };
  }
}

export interface ResearchOptions {
  refresh?: boolean;
}

export async function runResearch(rawQuery: string, options: ResearchOptions = {}): Promise<ResearchReport> {
  const validation = validateQuery(rawQuery);
  if (!validation.ok) throw new NormalizationError(validation.reason ?? 'Invalid query');
  const normalized = normalizeQuery(rawQuery);
  const cfg = getConfig();
  const cacheKey = makeCacheKey(cfg, normalized.cleaned);

  if (!options.refresh) {
    const fromMemory = getCachedReport(cacheKey, cfg.research.cacheTtlSeconds);
    if (fromMemory) return fromMemory;
    const fromDb = await findDbCached(normalized.cleaned, cfg.mode, cfg.research.cacheTtlSeconds);
    if (fromDb) {
      setCachedReport(cacheKey, fromDb);
      return fromDb;
    }
  }

  const providers = buildProviderSet(cfg.mode);
  const found = await providers.geocoding.search(normalized);
  if (!found || found.length === 0) throw new LocationNotFoundError(normalized.cleaned);
  const location = found[0];
  const ctx: ProviderContext = { location, retrievedAt: todayIso() };

  // Run every provider with bounded concurrency; failures stay in their own section.
  const semaphore = new Semaphore(cfg.research.concurrency);
  const jobs: Array<Promise<Outcome>> = [];
  for (const [domain, list] of Object.entries(providerJobs(providers))) {
    for (const inst of list) {
      const fetcher = inst as unknown as Fetcher;
      jobs.push(semaphore.run(() => fetchOne(domain as ResearchDomain, fetcher, ctx)));
    }
  }
  const outcomes = await Promise.all(jobs);

  const { sections, warnings } = assembleSections(outcomes, ctx);
  const asReport = { location, sections, mode: cfg.mode } as ResearchReport;
  const score = computeScore(asReport);
  const gaps = findGaps({ ...asReport, providers: toStatus(outcomes) } as ResearchReport);
  const priorities = findPriorities(asReport, gaps);

  const draft: ResearchReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: cfg.mode,
    location,
    sections,
    analysis: { gaps, priorities, score },
    sources: [],
    providers: toStatus(outcomes),
    warnings,
    disclaimer: DISCLAIMER,
  };

  const report: ResearchReport = { ...draft, sources: collectSources(draft) };
  setCachedReport(cacheKey, report);
  void saveResearchRun(report); // never block the response on the DB
  return report;
}

// ---------------------------------------------------------------------------
// Merging helpers
// ---------------------------------------------------------------------------

type SectionShape = ResearchReport['sections'];

function providerJobs(providers: ReturnType<typeof buildProviderSet>): Record<ResearchDomain, Fetcher[]> {
  return {
    population: providers.population as unknown as Fetcher[],
    coverage: providers.coverage as unknown as Fetcher[],
    internet: providers.internet as unknown as Fetcher[],
    fibre: providers.fibre as unknown as Fetcher[],
    electricity: providers.electricity as unknown as Fetcher[],
    facilities: providers.facilities as unknown as Fetcher[],
  };
}

export function assembleSections(
  outcomes: Outcome[],
  ctx: ProviderContext,
): { sections: SectionShape; warnings: string[] } {
  const warnings: string[] = [];
  for (const o of outcomes) {
    if (o.status !== 'ok' && o.note) warnings.push(`${o.providerLabel}: ${o.note}`);
  }

  // Population: first successful provider wins (import before World Bank).
  const pop = firstOk(outcomes, 'population');
  const population: PopulationSection =
    (pop?.data as PopulationSection | undefined) ?? {
      status: 'unavailable',
      geographicLevel: 'unknown',
      quality: 'unavailable',
      note: firstNote(outcomes, 'population'),
    };

  // Coverage: merge technologies + towers across contributing providers.
  const coverageOks = okOutcomes(outcomes, 'coverage');
  const coverageTechs = coverageOks.flatMap((o) => (o.data as CoverageSection).technologies ?? []);
  const coverageTowers = dedupeById<InfrastructureItem>(coverageOks.flatMap((o) => (o.data as CoverageSection).towers ?? []), (i) => i.id);
  const coverage: CoverageSection = coverageOks.length > 0
    ? { status: 'ok', technologies: coverageTechs, towers: coverageTowers, source: coverageOks[0].source, note: joinNotes(coverageOks) }
    : { status: 'unavailable', technologies: [], towers: [], note: firstNote(outcomes, 'coverage') };

  // Internet: merge indicator points (dedupe by metric).
  const internetOks = okOutcomes(outcomes, 'internet');
  const internetPoints = dedupeById(
    internetOks.flatMap((o) => (o.data as InternetSection).points ?? []),
    (p) => p.metric,
  );
  const internet: InternetSection = internetPoints.length > 0
    ? { status: 'ok', points: internetPoints, note: joinNotes(internetOks) }
    : { status: 'unavailable', points: [], note: firstNote(outcomes, 'internet') };

  // Fibre: first successful provider wins (import before Overpass).
  const fibreOk = firstOk(outcomes, 'fibre');
  const fibre: FibreSection = (fibreOk?.data as FibreSection | undefined) ?? {
    status: 'unavailable',
    featuresWithinRadius: 0,
    radiusKm: getConfig().research.fibreSearchRadiusKm,
    note: firstNote(outcomes, 'fibre'),
  };

  // Electricity: access rate from the first dataset that has one + substations.
  const elecOks = okOutcomes(outcomes, 'electricity');
  const accessRow = elecOks.map((o) => o.data as ElectricitySection).find((d) => d.accessPct !== undefined);
  const substations = dedupeById<InfrastructureItem>(elecOks.flatMap((o) => (o.data as ElectricitySection).substations ?? []), (i) => i.id);
  const electricity: ElectricitySection = accessRow || substations.length > 0
    ? {
        status: 'ok',
        accessPct: accessRow?.accessPct,
        accessScope: accessRow?.accessScope,
        accessYear: accessRow?.accessYear,
        accessQuality: (accessRow?.accessQuality ?? 'reported') as ElectricitySection['accessQuality'],
        substations,
        source: accessRow?.source ?? elecOks[0].source,
        note: joinNotes(elecOks),
      }
    : { status: 'unavailable', accessQuality: 'unavailable', substations: [], note: firstNote(outcomes, 'electricity') };

  // Facilities: merge lists from all contributing providers.
  const facOks = okOutcomes(outcomes, 'facilities');
  const facData = facOks.map((o) => o.data as FacilitiesSection);
  const schools = dedupeById<FacilityItem>(facData.flatMap((d) => d.schools ?? []), (i) => i.id);
  const health = dedupeById<FacilityItem>(facData.flatMap((d) => d.health ?? []), (i) => i.id);
  const government = dedupeById<FacilityItem>(facData.flatMap((d) => d.government ?? []), (i) => i.id);
  const facInfra = dedupeById<InfrastructureItem>(facData.flatMap((d) => d.infrastructure ?? []), (i) => i.id);
  const hasFacilities = schools.length > 0 || health.length > 0 || government.length > 0 || facInfra.length > 0;
  const facilities: FacilitiesSection = hasFacilities || facOks.length > 0
    ? {
        status: 'ok',
        withinRadiusKm: Math.max(...facData.map((d) => d.withinRadiusKm).filter((r) => r > 0), getConfig().research.facilitiesRadiusKm),
        schools,
        health,
        government,
        infrastructure: facInfra,
        note: joinNotes(facOks),
      }
    : {
        status: 'unavailable',
        withinRadiusKm: getConfig().research.facilitiesRadiusKm,
        schools: [],
        health: [],
        government: [],
        infrastructure: [],
        note: firstNote(outcomes, 'facilities'),
      };

  // Infrastructure: aggregate towers/substations/ICT centres + fibre digest.
  const facTowers = facInfra.filter((i) => i.kind === 'telecom_tower');
  const facSubs = facInfra.filter((i) => i.kind === 'substation');
  const facIct = facInfra.filter((i) => i.kind === 'ict_centre');
  const infrastructure: SectionShape['infrastructure'] = {
    towers: dedupeById<InfrastructureItem>([...coverageTowers, ...facTowers], (i) => i.id),
    towersSource: coverage.source,
    substations: dedupeById<InfrastructureItem>([...substations, ...facSubs], (i) => i.id),
    substationsSource: electricity.source,
    ictCentres: facIct,
    ictCentresSource: facIct[0]?.source ?? facilities.schools[0]?.source ?? facilities.health[0]?.source,
    fibre: {
      featuresWithinRadius: fibre.featuresWithinRadius ?? 0,
      nearestDistanceKm: fibre.nearestDistanceKm,
      source: fibre.source,
      note: fibre.note,
    },
    note: 'Infrastructure is aggregated from mapped public datasets. Presence of an item is not a guarantee of operation.',
  };

  return {
    sections: {
      population,
      coverage,
      internet,
      fibre,
      electricity,
      facilities,
      infrastructure,
    },
    warnings,
  };
}

export function toStatus(outcomes: Outcome[]): ProviderStatus[] {
  return outcomes.map((o) => ({
    providerId: o.providerId,
    providerLabel: o.providerLabel,
    domain: o.domain,
    status: o.status,
    source: o.source,
    note: o.note,
    durationMs: o.durationMs,
  }));
}

function okOutcomes(outcomes: Outcome[], domain: ResearchDomain): Outcome[] {
  return outcomes.filter((o) => o.domain === domain && o.status === 'ok' && o.data !== undefined);
}

function firstOk(outcomes: Outcome[], domain: ResearchDomain): Outcome | undefined {
  return okOutcomes(outcomes, domain)[0];
}

function firstNote(outcomes: Outcome[], domain: ResearchDomain): string | undefined {
  return outcomes.find((o) => o.domain === domain)?.note;
}

function joinNotes(outcomes: Outcome[]): string | undefined {
  const notes = outcomes
    .map((o) => o.note)
    .filter((n) => typeof n === 'string' && n.length > 0);
  return notes.length > 0 ? notes.join(' ') : undefined;
}

function dedupeById<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export class LocationNotFoundError extends Error {
  constructor(query: string) {
    super(
      `No location could be resolved for "${query}" using the configured geocoder. Check the name or add the state (e.g. "Oghara, Delta State").`,
    );
    this.name = 'LocationNotFoundError';
  }
}

export async function searchLocations(rawQuery: string): Promise<ResolvedLocation[]> {
  const validation = validateQuery(rawQuery);
  if (!validation.ok) throw new NormalizationError(validation.reason ?? 'Invalid query');
  const normalized = normalizeQuery(rawQuery);
  const providers = buildProviderSet(getConfig().mode);
  const results = await providers.geocoding.search(normalized);
  return results.slice(0, 5);
}

function safeMessage(err: unknown): string {
  if (typeof err === 'string') return err.slice(0, 200);
  if (err instanceof Error) return (err.message ?? 'unknown error').slice(0, 200);
  return 'unknown error';
}