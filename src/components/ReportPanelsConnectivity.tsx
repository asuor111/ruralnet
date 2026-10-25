// Report panels — Connectivity tab (coverage, internet, fibre, electricity).

import type { ResearchReport } from '@/domain/types';
import { formatKm, formatNumber, formatPct } from '@/domain/format';
import { DataUnavailable, Kicker, QualityTag, SourceLine } from './ui';

export function PanelCoverage({ report }: { report: ResearchReport }) {
  const c = report.sections.coverage;
  return (
    <section className="panel p-6">
      <Kicker>Telecom coverage</Kicker>
      <h3 className="font-label text-lg">Mobile network coverage</h3>
      {c.technologies.length > 0 ? (
        <div className="mt-3 space-y-3">
          {c.technologies.map((t) => (
            <div key={t.tech} className="flex items-center gap-4">
              <span className="w-8 font-label text-sm text-[#f4f2ee]">{t.tech}</span>
              <div className="h-2 flex-1 rounded bg-[#2a2a2a]">
                <div className="h-2 rounded bg-[#7c3aed]" style={{ width: `${t.coveragePct ?? 0}%` }} />
              </div>
              <span className="w-14 text-right text-sm text-[#f4f2ee]">
                {t.coveragePct !== undefined ? formatPct(t.coveragePct, 0) : '—'}
              </span>
            </div>
          ))}
          <p className="text-xs text-[#8e8e8e] mt-1">
            Coverage percentages come from the configured coverage dataset. These are availability figures, not
            measured service quality. Operator-level comparison appears when operator data is present.
          </p>
        </div>
      ) : c.towers.length > 0 ? (
        <p className="text-sm text-[#bdbdbd] mt-2">
          No coverage-percentage dataset is configured for this location. {c.towers.length} mapped telecom tower(s)
          provide infrastructure-presence evidence only — they do not prove coverage.
        </p>
      ) : (
        <DataUnavailable
          why="No compatible public telecom coverage dataset was available for this location."
          note={c.note}
        />
      )}
      <SourceLine source={c.source} prefix="Source:" />
    </section>
  );
}

export function PanelInternet({ report }: { report: ResearchReport }) {
  const net = report.sections.internet;
  if (net.status !== 'ok' || net.points.length === 0) {
    return (
      <section className="panel p-6">
        <Kicker>Internet availability</Kicker>
        <DataUnavailable
          why="No compatible public internet availability dataset was available for this location."
          note={net.note}
        />
      </section>
    );
  }
  return (
    <section className="panel p-6">
      <Kicker>Internet availability</Kicker>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[#8e8e8e] text-xs">
            <th className="pb-2">Indicator</th>
            <th className="pb-2 text-right">Value</th>
            <th className="pb-2 text-right">Year</th>
          </tr>
        </thead>
        <tbody>
          {net.points.map((p) => (
            <tr key={p.metric} className="border-b border-[#2a2a2a]">
              <td className="py-2">
                <div className="text-[#f4f2ee]">{p.label}</div>
                <div className="text-[11px] text-[#8e8e8e] mt-0.5">Scope: {p.scope}</div>
              </td>
              <td className="py-2 text-right font-label text-[#f4f2ee]">
                {formatNumber(p.value)}
                {p.unit ? ` ${p.unit}` : ''}
              </td>
              <td className="py-2 text-right text-[#bdbdbd]">{p.year ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-[#8e8e8e]">
        These figures describe national availability/adoption, not whether this specific community is served.
        RuralNet distinguishes availability data from actual usage or adoption.
      </p>
      <SourceLine source={net.points[0].source} prefix="Source:" />
    </section>
  );
}

export function PanelFibre({ report }: { report: ResearchReport }) {
  const f = report.sections.fibre;
  if (f.status !== 'ok') {
    return (
      <section className="panel p-6">
        <Kicker>Fibre proximity</Kicker>
        <DataUnavailable
          why="No compatible public fibre-infrastructure dataset was available for this location."
          note={f.note}
        />
      </section>
    );
  }
  return (
    <section className="panel p-6">
      <Kicker>Fibre proximity</Kicker>
      {f.nearestDistanceKm !== undefined ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-4xl leading-none">{formatKm(f.nearestDistanceKm)}</span>
          <QualityTag quality="measured" />
          <span className="text-sm text-[#8e8e8e]">Distance to mapped fibre infrastructure</span>
        </div>
      ) : (
        <p className="text-sm text-[#bdbdbd] mt-2">
          No fibre infrastructure is mapped within {Math.round(f.radiusKm)} km of this location.
        </p>
      )}
      <p className="mt-2 text-xs text-[#8e8e8e]">
        {f.featuresWithinRadius} mapped fibre feature(s) within the {Math.round(f.radiusKm)} km search radius.
        <strong> Proximity does not equal service availability.</strong> {f.note ?? ''}
      </p>
      <SourceLine source={f.source} prefix="Source:" />
    </section>
  );
}

export function PanelElectricity({ report }: { report: ResearchReport }) {
  const e = report.sections.electricity;
  if (e.status !== 'ok' && e.substations.length === 0) {
    return (
      <section className="panel p-6">
        <Kicker>Electricity</Kicker>
        <DataUnavailable
          why="No compatible public electricity dataset was available for this location."
          note={e.note}
        />
      </section>
    );
  }
  return (
    <section className="panel p-6">
      <Kicker>Electricity</Kicker>
      <dl className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        {e.accessPct !== undefined ? (
          <>
            <dt className="text-[#8e8e8e]">Access to electricity</dt>
            <dd className="text-right text-[#f4f2ee]">{formatPct(e.accessPct)}</dd>
            <dt className="text-[#8e8e8e]">Scope / year</dt>
            <dd className="text-right text-[#f4f2ee]">
              {e.accessScope ?? '—'} · {e.accessYear ?? '—'}
            </dd>
          </>
        ) : (
          <div className="col-span-2 text-[#9a9a9a]">No electricity access percentage is available for this location.</div>
        )}
        <dt className="text-[#8e8e8e]">Mapped substations</dt>
        <dd className="text-right text-[#f4f2ee]">{e.substations.length}</dd>
      </dl>
      <p className="mt-2 text-xs text-[#8e8e8e]">
        Where given, access measures grid access — not reliability. Local reliability data is not part of the
        current datasets.
      </p>
      <SourceLine source={e.source} prefix="Source:" />
    </section>
  );
}