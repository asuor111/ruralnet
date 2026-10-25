// In-memory TTL result cache.
// The database (when configured) acts as a second cache level; this map keeps
// recent runs fast even when Postgres is not configured. Reports are only
// reused for the configured TTL and never across a mode switch (mock/live).

import type { ResearchReport } from '@/domain/types';
import type { RuntimeConfig } from './config';

const CACHE_TTL_MS = 60 * 60 * 1000; // upper bound fallback; real TTL comes from config

interface Entry {
  report: ResearchReport;
  storedAt: number;
}

const store = new Map<string, Entry>();

export function cacheKeyFor(query: string, mode: string): string {
  return `${mode}:${query.toLowerCase()}`;
}

export function getCachedReport(key: string, ttlSeconds: number): ResearchReport | null {
  const entry = store.get(key);
  if (!entry) return null;
  const maxAgeMs = (ttlSeconds > 0 ? ttlSeconds * 1000 : CACHE_TTL_MS);
  if (Date.now() - entry.storedAt > maxAgeMs) {
    store.delete(key);
    return null;
  }
  return entry.report;
}

export function setCachedReport(key: string, report: ResearchReport): void {
  store.set(key, { report, storedAt: Date.now() });
  // Bound memory: drop the oldest half when the map grows large.
  if (store.size > 200) {
    const keys = Array.from(store.keys());
    for (let i = 0; i < keys.length / 2; i++) store.delete(keys[i]);
  }
}

export function makeCacheKey(cfg: RuntimeConfig, query: string): string {
  return cacheKeyFor(query.trim(), cfg.mode);
}