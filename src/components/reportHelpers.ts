// Small helpers shared by report panels (kept free of client state).

import type { ResolvedLocation } from '@/domain/types';

export function locationBreadcrumb(loc: ResolvedLocation): string {
  const parts: string[] = [];
  if (loc.admin2Name) parts.push(loc.admin2Name);
  if (loc.state) parts.push(loc.state);
  else if (loc.country) parts.push(loc.country);
  if (loc.state && loc.country) parts.push(loc.country);
  return parts.join(' · ');
}

export function locationCoords(loc: ResolvedLocation): string {
  return `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`;
}