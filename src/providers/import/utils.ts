// Helpers for imported/generated dataset files under ./data.
// These files are produced by the scripts in /scripts (see README
// "Importing datasets") from public downloads such as HDX COD-PS (LGA
// population) or open fibre/site GeoJSON exports.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function resolveDataPath(relPath: string): string | null {
  const candidates = [relPath, relPath.replace('data/', 'data/import/')];
  for (const c of candidates) {
    const full = path.resolve(process.cwd(), c);
    if (existsSync(full)) return full;
  }
  return null;
}

export function readJsonFileIfExists(relPath: string): unknown | null {
  const full = resolveDataPath(relPath);
  if (!full) return null;
  try {
    return JSON.parse(readFileSync(full, 'utf8'));
  } catch {
    return null;
  }
}

/** Lower-cased, accent-stripped, punctuation-removed comparable form. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Loose but safe name equality used to match dataset rows to locations. */
export function nameMatches(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}