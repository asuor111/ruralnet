'use client';

// Tabbed report shell for a resolved place: Overview / Infrastructure /
// Connectivity / Facilities / Map / Sources, plus JSON/CSV export and
// Print-to-PDF.

import { useEffect, useState } from 'react';
import type { ResearchReport } from '@/domain/types';
import { querySlug } from '@/domain/normalize';
import ProfileMap from './ProfileMap';
import { PanelSources } from './PanelSources';
import { PanelLocation, PanelPopulation } from './ReportPanels';
import { PanelOverviewStats, PanelScore } from './ReportPanelsOverview2';
import { PanelCoverage, PanelElectricity, PanelFibre, PanelInternet } from './ReportPanelsConnectivity';
import { PanelGaps, PanelPriorities } from './ReportPanelsAnalysis';
import { PanelFacilities, PanelDigitalInfrastructure } from './ReportPanelsFacilities';

const TABS = [
  ['overview', 'Overview'],
  ['infrastructure', 'Infrastructure'],
  ['connectivity', 'Connectivity'],
  ['facilities', 'Facilities'],
  ['map', 'Map'],
  ['sources', 'Sources'],
] as const;

export default function ReportView({ report }: { report: ResearchReport }) {
  const [tab, setTab] = useState<string>('overview');

  useEffect(() => {
    document.title = `${report.location.name} — RuralNet`;
  }, [report]);

  async function download(format: 'json' | 'csv') {
    try {
      const res = await fetch(`/api/export?q=${encodeURIComponent(report.location.query)}&format=${format}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${querySlug(report.location.query)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Swallow: the profile remains viewable on screen.
    }
  }

  return (
    <div id="print-area">
      {/* Header */}
      <div className="print-hide border-b border-[#2a2a2a] pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl leading-none">{report.location.name}</h1>
          {report.mode === 'mock' ? (
            <span className="rounded border border-[#7c3aed]/50 bg-[#7c3aed]/10 px-2 py-0.5 text-[10px] text-[#c9a3ff]">
              MOCK DATA
            </span>
          ) : null}
        </div>
        <p className="text-sm text-[#bdbdbd] mt-1">
          {report.location.displayName ?? report.location.name} · Profile generated {new Date(report.generatedAt).toLocaleString('en-GB')} · Mode: {report.mode}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 print-hide">
          <button type="button" onClick={() => void download('json')} className="rounded border border-[#3a3a3a] px-3 py-1.5 text-xs text-[#e6e6e6] hover:border-[#7c3aed]">
            Export JSON
          </button>
          <button type="button" onClick={() => void download('csv')} className="rounded border border-[#3a3a3a] px-3 py-1.5 text-xs text-[#e6e6e6] hover:border-[#7c3aed]">
            Export CSV
          </button>
          <button type="button" onClick={() => window.print()} className="rounded border border-[#3a3a3a] px-3 py-1.5 text-xs text-[#e6e6e6] hover:border-[#7c3aed]">
            Print / PDF
          </button>
          <a href={`/api/research?q=${encodeURIComponent(report.location.query)}&refresh=1`} className="rounded border border-[#3a3a3a] px-3 py-1.5 text-xs text-[#e6e6e6] hover:border-[#7c3aed]">
            ⟳ Refresh data
          </a>
        </div>
      </div>

      {/* Tabs */}
      <nav aria-label="Profile sections" className="print-hide mt-4 flex flex-wrap gap-1 border-b border-[#2a2a2a]">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm ${tab === key ? 'text-white border-b-2 border-[#7c3aed]' : 'text-[#8e8e8e] border-b border-transparent hover:text-[#c8c8c8]'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-4">
        {tab === 'overview' ? (
          <>
            <PanelLocation report={report} />
            <PanelPopulation report={report} />
            <PanelScore report={report} />
            <PanelOverviewStats report={report} />
          </>
        ) : null}
        {tab === 'infrastructure' ? <PanelDigitalInfrastructure report={report} /> : null}
        {tab === 'connectivity' ? (
          <>
            <PanelCoverage report={report} />
            <PanelInternet report={report} />
            <PanelFibre report={report} />
            <PanelElectricity report={report} />
            <PanelGaps report={report} />
            <PanelPriorities report={report} />
          </>
        ) : null}
        {tab === 'facilities' ? <PanelFacilities report={report} /> : null}
        {tab === 'map' ? <ProfileMap report={report} /> : null}
        {tab === 'sources' ? <PanelSources report={report} /> : null}
      </div>

      <p className="mt-8 text-xs text-[#8e8e8e]">{report.disclaimer}</p>
    </div>
  );
}