// Report panels — Overview tab: location resolution, population with
// provenance, headline stats and the transparent connectivity indicator.

import type { ResearchReport } from '@/domain/types';
import { formatKm, formatNumber, formatPct } from '@/domain/format';
import {
  DataUnavailable,
  Kicker,
  QualityTag,
  ScoreRing,
  SourceLine,
  StatCell,
  StatusPill,
} from './ui';
import { locationBreadcrumb, locationCoords } from './reportHelpers';

export function PanelLocation({ report }: { report: ResearchReport }) {
  const loc = report.location;
  return (
    <section className="panel p-6">
      <Kicker>Location</Kicker>
      <h2 className="font-display text-3xl leading-tight">{loc.name}</h2>
      <p className="text-sm text-[#bdbdbd] mt-1">{locationBreadcrumb(loc)}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <dt className="text-[#8e8e8e]">Latitude</dt>
        <dd className="text-right text-[#f4f2ee]">{loc.latitude.toFixed(5)}</dd>
        <dt className="text-[#8e8e8e]">Longitude</dt>
        <dd className="text-right text-[#f4f2ee]">{loc.longitude.toFixed(5)}</dd>
      </dl>
      <p className="text-xs text-[#8e8e8e] mt-4">
        {locationCoords(loc)} Resolved with {loc.geocoder}. Coordinates are the geocoder&apos;s reference point, not a surveyed centroid.
      </p>
    </section>
  );
}

export function PanelPopulation({ report }: { report: ResearchReport }) {
  const pop = report.sections.population;
  if (pop.status !== 'ok' || pop.population === undefined) {
    return (
      <section className="panel p-6">
        <Kicker>Population</Kicker>
        <DataUnavailable why="No compatible public population dataset was available for this location." note={pop.note} />
      </section>
    );
  }
  const perBars = Math.round((pop.population / 250_000) * 10);
  return (
    <section className="panel p-6">
      <Kicker>Population</Kicker>
      <div className="value-row items-baseline">
        <span className="font-display text-4xl leading-none">{formatNumber(pop.population)}</span>
        <QualityTag quality={pop.quality} />
        <StatusPill status={pop.status} label="available" />
      </div>
      <div className="mt-2 flex items-center gap-1" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`h-3 w-2 ${i < Math.max(1, perBars) ? 'bg-[#7c3aed]' : 'bg-[#2a2a2a]'}`} />
        ))}
      </div>
      <p className="text-sm text-[#bdbdbd] mt-1">
        {pop.geographicLevel} figure · {pop.year ?? 'year not stated'} · {pop.note}
      </p>
      <SourceLine source={pop.source} prefix="Source:" />
    </section>
  );
}