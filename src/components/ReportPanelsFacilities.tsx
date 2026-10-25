// Report panels — Facilities tab.

import type { FacilityItem, ResearchReport } from '@/domain/types';
import { formatKm, formatNumber } from '@/domain/format';
import { DataUnavailable, Kicker, SourceLine } from './ui';

function FacilityTable({ items, empty }: { items: FacilityItem[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-[#8e8e8e] mt-2">{empty}</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[#8e8e8e] text-xs">
          <th className="pb-2">Name</th>
          <th className="pb-2">Type</th>
          <th className="pb-2 text-right">Lat</th>
          <th className="pb-2 text-right">Lon</th>
        </tr>
      </thead>
      <tbody>
        {items.slice(0, 100).map((f) => (
          <tr key={f.id} className="border-b border-[#2a2a2a]">
            <td className="py-1.5 text-[#e6e6e6]">{f.name ?? 'Unnamed'}</td>
            <td className="py-1.5 text-[#9a9a9a]">{f.subtype ?? f.type}</td>
            <td className="py-1.5 text-right text-[#bdbdbd]">{f.latitude.toFixed(4)}</td>
            <td className="py-1.5 text-right text-[#bdbdbd]">{f.longitude.toFixed(4)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PanelFacilities({ report }: { report: ResearchReport }) {
  const f = report.sections.facilities;
  if (f.status !== 'ok') {
    return (
      <section className="panel p-6">
        <Kicker>Schools &amp; health facilities</Kicker>
        <DataUnavailable
          why="No compatible public facility dataset was available for this location."
          note={f.note}
        />
      </section>
    );
  }
  const pop = report.sections.population.population;
  const schoolsPer10k = pop ? (f.schools.length / pop) * 10_000 : null;
  const healthPer10k = pop ? (f.health.length / pop) * 10_000 : null;
  return (
    <section className="panel p-6">
      <Kicker>Schools &amp; health facilities</Kicker>
      <p className="text-sm text-[#bdbdbd] mt-1">
        Mapped within {Math.round(f.withinRadiusKm)} km of the selected location.
        {f.note ? ` ${f.note}` : ''}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-x-8 gap-y-1 text-sm">
        <dt className="text-[#8e8e8e]">Schools</dt>
        <dd className="text-right text-[#f4f2ee] font-label">{f.schools.length}</dd>
        <dt className="text-[#8e8e8e]">Health facilities</dt>
        <dd className="text-right text-[#f4f2ee] font-label">{f.health.length}</dd>
        <dt className="text-[#8e8e8e]">Government</dt>
        <dd className="text-right text-[#f4f2ee] font-label">{f.government.length}</dd>
      </dl>
      {pop ? (
        <p className="mt-2 text-xs text-[#8e8e8e]">
          Population-to-facility indicator (per 10,000 people, within {Math.round(f.withinRadiusKm)} km): about{' '}
          {schoolsPer10k !== null ? formatNumber(Math.round(schoolsPer10k)) : '—'} school(s) and{' '}
          {healthPer10k !== null ? formatNumber(Math.round(healthPer10k)) : '—'} health facilit(ies). Uses the
          population figure from the Overview tab.
        </p>
      ) : null}
      <h4 className="font-label text-sm mt-5">Schools</h4>
      <FacilityTable items={f.schools} empty="No schools mapped in the available dataset for this radius." />
      <h4 className="font-label text-sm mt-5">Health facilities</h4>
      <FacilityTable items={f.health} empty="No health facilities mapped in the available dataset for this radius." />
      <h4 className="font-label text-sm mt-5">Government facilities</h4>
      <FacilityTable items={f.government} empty="No government facilities mapped in the available dataset for this radius." />
      <SourceLine source={f.schools[0]?.source ?? f.health[0]?.source} prefix="Source:" />
    </section>
  );
}

export function PanelDigitalInfrastructure({ report }: { report: ResearchReport }) {
  const infra = report.sections.infrastructure;
  return (
    <section className="panel p-6">
      <Kicker>Existing digital infrastructure</Kicker>
      <p className="text-sm text-[#bdbdbd] mt-1">
        Mapped infrastructure from the assembled public datasets. {infra.note}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <dt className="text-[#8e8e8e]">Telecom towers</dt>
        <dd className="text-right text-[#f4f2ee] font-label">{infra.towers.length}</dd>
        <dt className="text-[#8e8e8e]">Electricity substations</dt>
        <dd className="text-right text-[#f4f2ee] font-label">{infra.substations.length}</dd>
        <dt className="text-[#8e8e8e]">Public ICT centres</dt>
        <dd className="text-right text-[#f4f2ee] font-label">{infra.ictCentres.length}</dd>
        <dt className="text-[#8e8e8e]">Fibre features in radius</dt>
        <dd className="text-right text-[#f4f2ee] font-label">{infra.fibre.featuresWithinRadius}</dd>
      </dl>
      <h4 className="font-label text-sm mt-5">Telecom towers ({infra.towers.length})</h4>
      <InfraTable
        items={infra.towers.map((t) => ({ id: t.id, name: t.name, subtype: 'telecom tower', latitude: t.latitude, longitude: t.longitude }))}
      />
      <h4 className="font-label text-sm mt-5">Electricity substations ({infra.substations.length})</h4>
      <InfraTable
        items={infra.substations.map((t) => ({ id: t.id, name: t.name, subtype: 'substation', latitude: t.latitude, longitude: t.longitude }))}
      />
      <h4 className="font-label text-sm mt-5">Public ICT centres ({infra.ictCentres.length})</h4>
      <InfraTable
        items={infra.ictCentres.map((t) => ({ id: t.id, name: t.name, subtype: 'ICT centre', latitude: t.latitude, longitude: t.longitude }))}
      />
      <h4 className="font-label text-sm mt-5">Fibre</h4>
      <p className="text-sm text-[#bdbdbd] mt-1">
        {infra.fibre.featuresWithinRadius > 0
          ? `${infra.fibre.featuresWithinRadius} mapped feature(s) within the search radius${infra.fibre.nearestDistanceKm !== undefined ? `; nearest at ${formatKm(infra.fibre.nearestDistanceKm)}` : ''}.`
          : 'No fibre mapped in the available datasets within the search radius.'}
      </p>
      <SourceLine source={infra.towersSource} prefix="Towers source:" />
      <SourceLine source={infra.substationsSource} prefix="Substations source:" />
      <SourceLine source={infra.fibre.source} prefix="Fibre source:" />
    </section>
  );
}

interface InfraRow {
  id: string;
  name?: string;
  subtype: string;
  latitude: number;
  longitude: number;
}

function InfraTable({ items }: { items: InfraRow[] }) {
  const rows = items.slice(0, 60);
  if (rows.length === 0) return <p className="text-sm text-[#8e8e8e] mt-2">None mapped in the available datasets.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[#8e8e8e] text-xs">
          <th className="pb-2">Name</th>
          <th className="pb-2">Kind</th>
          <th className="pb-2 text-right">Lat</th>
          <th className="pb-2 text-right">Lon</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((f) => (
          <tr key={f.id} className="border-b border-[#2a2a2a]">
            <td className="py-1.5 text-[#e6e6e6]">{f.name ?? 'Unnamed'}</td>
            <td className="py-1.5 text-[#9a9a9a]">{f.subtype}</td>
            <td className="py-1.5 text-right text-[#bdbdbd]">{f.latitude.toFixed(4)}</td>
            <td className="py-1.5 text-right text-[#bdbdbd]">{f.longitude.toFixed(4)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}