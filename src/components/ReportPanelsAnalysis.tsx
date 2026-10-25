// Report panels — Connectivity tab (part 2): gap analysis and priorities.

import type { ResearchReport } from '@/domain/types';
import { EvidenceList, Kicker } from './ui';

export function PanelGaps({ report }: { report: ResearchReport }) {
  const gaps = report.analysis.gaps;
  return (
    <section className="panel p-6">
      <Kicker>Connectivity gaps</Kicker>
      <h3 className="font-label text-lg">Potential connectivity gaps</h3>
      {gaps.length === 0 ? (
        <p className="text-sm text-[#bdbdbd] mt-2">
          No observable connectivity gaps could be identified from the available datasets.
        </p>
      ) : (
        <ol className="mt-2 space-y-4">
          {gaps.map((g) => (
            <li key={g.id} className="rounded border border-[#2a2a2a] bg-[#141414] p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-label text-sm text-[#f4f2ee]">{g.title}</h4>
                <span className="text-[10px] uppercase text-[#8e8e8e]">{g.severity}</span>
              </div>
              <p className="text-sm text-[#bdbdbd] mt-2">{g.concern}</p>
              <p className="text-xs text-[#8e8e8e] mt-1">
                <span className="font-label">Indicator.</span> {g.explanation}
              </p>
              <EvidenceList items={g.evidence} />
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-[#8e8e8e] mt-3">
        Gaps are observations derived from the available public datasets using deterministic rules. They are not
        absolute conclusions about the ground truth.
      </p>
    </section>
  );
}

export function PanelPriorities({ report }: { report: ResearchReport }) {
  const priorities = report.analysis.priorities;
  return (
    <section className="panel p-6">
      <Kicker>Infrastructure priorities</Kicker>
      <h3 className="font-label text-lg">Potential infrastructure priorities</h3>
      <p className="text-xs text-[#8e8e8e] mt-1">
        Deterministic suggestions for what to investigate next — not investment instructions.
      </p>
      {priorities.length === 0 ? (
        <p className="text-sm text-[#bdbdbd] mt-2">No priority indicators were triggered by the available data.</p>
      ) : (
        <ol className="mt-2 space-y-3 list-decimal pl-5 marker:text-[#7c3aed]">
          {priorities.map((p) => (
            <li key={p.id}>
              <h4 className="font-label text-sm text-[#f4f2ee]">{p.title}</h4>
              <p className="text-sm text-[#bdbdbd] mt-1">{p.why}</p>
              <EvidenceList items={p.evidence} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}