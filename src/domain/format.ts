// Small display formatting helpers shared by services and the UI.

import type { Quality } from './types';
import { QUALITY_LABELS } from './types';

/** 1250000 -> "1,250,000" */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined || Number.isNaN(km)) return '—';
  if (km < 1) return '< 1 km';
  if (km < 10) return `${km.toFixed(1)} km`;
  if (km < 1000) return `${Math.round(km)} km`;
  return `${(km / 1000).toFixed(1)} km`;
}

export function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function qualityLabel(q: Quality): string {
  return QUALITY_LABELS[q] ?? 'Unknown';
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export const DISCLAIMER =
  'RuralNet provides data-supported indicators assembled from public datasets. It is not an engineering survey, a telecom coverage guarantee, investment advice, or an infrastructure feasibility study. Where a dataset is missing, RuralNet reports "Data unavailable" rather than inventing a value.';