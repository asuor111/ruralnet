// Report panels — Overview tab (part 2): headline stats + score panel.

import type { ResearchReport } from '@/domain/types';
import { formatKm, formatPct } from '@/domain/format';
import { Kicker, ScoreRing, StatCell } from './ui';

export function PanelOverviewStats({ report }: { report: ResearchReport }) {
  const s = report.sections;
  const stats: Array<{ label: string; value: string; sub?: string }> = [
    {
      label: 'Telecom coverage',
      value:
        s.coverage.technologies.length > 0
          ? s.coverage.technologies
              .filter((t) => t.coveragePct !== undefined)
              .map((t) => `${Math.round(t.coveragePct!)}%`)
              .join(' / ') || '—'
          : s.coverage.towers.length > 0
            ? `${s.coverage.towers.length} towers mapped`
            : 'Data unavailable',
      sub: s.coverage.status === 'ok' ? 'coverage datasets or mapped towers' : undefined,
    },
    {
      label: 'Internet availability',
      value: internetHeadline(s) ?? 'Data unavailable',
      sub: 'national reference where used',
    },
    {
      label: 'Nearest fibre',
      value: s.fibre.nearestDistanceKm !== undefined ? formatKm(s.fibre.nearestDistanceKm) : 'None mapped',
      sub: `within ${Math.round(s.fibre.radiusKm)} km search radius`,
    },
    {
      label: 'Electricity access',
      value: s.electricity.accessPct !== undefined ? formatPct(s.electricity.accessPct) : 'Data unavailable',
    },
  ];
  const facilityStats: Array<{ label: string; value: string }> = [
    { label: 'Schools', value: String(s.facilities.schools.length) },
    { label: 'Health facilities', value: String(s.facilities.health.length) },
    { label: 'Towers', value: String(s.infrastructure.towers.length) },
    { label: 'Substations', value: String(s.infrastructure.substations.length) },
  ];
  return (
    <>
      <h3 className="font-label text-xl mt-10 mb-4">Overview</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((st) => (
          <StatCell key={st.label} label={st.label} value={st.value} sub={st.sub} />
        ))}
      </div>
      <h3 className="font-label text-xl mt-10 mb-4">
        Facilities &amp; infrastructure within {Math.round(s.facilities.withinRadiusKm)} km
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facilityStats.map((st) => (
          <StatCell key={st.label} label={st.label} value={st.value} />
        ))}
      </div>
    </>
  );
}

export function PanelScore({ report }: { report: ResearchReport }) {
  const score = report.analysis.score;
  return (
    <section className="panel p-6">
      <Kicker>Summary indicator</Kicker>
      <h3 className="font-label text-xl mb-1">Connectivity Infrastructure Indicator</h3>
      <div className="mt-2 grid gap-4 md:grid-cols-[auto_1fr]">
        <ScoreRing value={score.indicator} completeness={score.dataCompletenessPct} />
        <div className="text-sm text-[#bdbdbd] min-w-0">
          <p>
            A transparent composite of the components below, calculated by the documented methodology. It is an
            indicator of infrastructure evidence in public data — not a coverage guarantee and not an investment score.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[#8e8e8e]">Data completeness:</span>
            <span className="font-label">{score.dataCompletenessPct}%</span>
          </div>
          {score.missingDatasets.length > 0 ? (
            <p className="text-xs text-[#8e8e8e] mt-2">The score excludes: {score.missingDatasets.join('; ')}.</p>
          ) : null}
          <a className="src-link text-xs mt-2 inline-block" href="/methodology#connectivity-infrastructure-indicator">
            Read the scoring methodology →
          </a>
        </div>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="text-left text-[#8e8e8e] text-xs">
            <th className="pb-2">Component</th>
            <th className="pb-2 text-right">Weight</th>
            <th className="pb-2 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {score.components.map((c) => (
            <tr key={c.key} className="border-b border-[#2a2a2a]">
              <td className="py-2">
                <div className="text-[#f4f2ee]">{c.label}</div>
                <div className="text-[11px] text-[#8e8e8e] mt-0.5">{c.basis}</div>
              </td>
              <td className="py-2 text-right text-[#bdbdbd]">{Math.round(c.weight * 100)}%</td>
              <td className="py-2 text-right">
                {c.score === null ? (
                  <span className="text-[#8e8e8e]">excluded</span>
                ) : (
                  <span className="font-label">{c.score}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function internetHeadline(s: ResearchReport['sections']): string | null {
  const users = s.internet.points.find((p) => p.metric === 'internet_users_pct');
  return users ? formatPct(users.value) : null;
}