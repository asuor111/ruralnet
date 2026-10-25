// Report panel — Sources tab: every external dataset with provenance,
// the list of providers that executed, and any warnings.

import type { ResearchReport } from '@/domain/types';
import { formatDate } from '@/domain/format';
import { Kicker, SourceLink, StatusPill } from './ui';

export function PanelSources({ report }: { report: ResearchReport }) {
  const { sources, providers, warnings } = report;
  return (
    <>
      <section className="panel p-6">
        <Kicker>Sources</Kicker>
        <h3 className="font-label text-lg">Datasets used in this profile</h3>
        <p className="text-xs text-[#8e8e8e] mt-1">
          Every external data point in this profile is traceable to one of these datasets. Retrieval dates are
          stamped per run.
        </p>
        {sources.length === 0 ? (
          <p className="text-sm text-[#bdbdbd] mt-3">No external datasets contributed usable data to this profile.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[#8e8e8e] text-xs">
                <th className="pb-2">Provider / dataset</th>
                <th className="pb-2">Scope</th>
                <th className="pb-2">Licence</th>
                <th className="pb-2">Retrieved</th>
                <th className="pb-2">Used in</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((entry) => (
                <tr key={entry.source.id} className="border-b border-[#2a2a2a]">
                  <td className="py-2">
                    <div className="text-[#e6e6e6]">{entry.source.provider}</div>
                    <div className="text-[11px] text-[#8e8e8e] mt-0.5">
                      {entry.source.dataset} {' '}
                      <SourceLink source={entry.source} />
                    </div>
                  </td>
                  <td className="py-2 text-[#bdbdbd]">{entry.source.scope}</td>
                  <td className="py-2 text-[#bdbdbd]">{entry.source.licence ?? '—'}</td>
                  <td className="py-2 text-[#bdbdbd]">{formatDate(entry.source.retrievedAt)}</td>
                  <td className="py-2 text-[#bdbdbd]">{entry.usedBy.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel p-6">
        <Kicker>Provider run</Kicker>
        <h3 className="font-label text-lg">How this profile was assembled</h3>
        <p className="text-xs text-[#8e8e8e] mt-1">
          One failed provider does not fail the research run: its section reports “Data unavailable”.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {providers.map((p) => (
            <li key={p.providerId} className="flex items-baseline justify-between gap-4 border-b border-[#2a2a2a] py-2">
              <span className="text-[#e6e6e6]">
                {p.providerLabel}
                <span className="ml-2 text-[11px] text-[#8e8e8e]">{p.domain}</span>
              </span>
              <span className="flex items-center gap-2">
                {p.note ? <span className="text-[10px] text-[#8e8e8e] max-w-[420px] truncate" title={p.note}>{p.note}</span> : null}
                <StatusPill status={p.status} />
                <span className="text-[11px] text-[#8e8e8e]">{p.durationMs} ms</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {warnings.length > 0 ? (
        <section className="panel p-6">
          <Kicker>Warnings</Kicker>
          <ul className="mt-2 space-y-2 text-sm text-[#bdbdbd]">
            {warnings.map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}