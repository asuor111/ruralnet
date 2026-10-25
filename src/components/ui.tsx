// Small shared UI primitives used across the report pages.
// These components are pure markup (no client state) so they render anywhere.

import type { Quality, SourceRef } from '@/domain/types';
import { formatDate, qualityLabel } from '@/domain/format';

export function safeHref(url: string | undefined | null): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:')) {
    return url.length <= 2048 ? url : null;
  }
  return null;
}

export function SourceLink({ source }: { source: SourceRef | undefined | null }) {
  const href = source ? safeHref(source.url) : null;
  if (!source) return null;
  if (!href) {
    return (
      <span className="text-[#b8b8b8] text-xs" title={source.url}>
        {source.provider}
      </span>
    );
  }
  return (
    <a className="src-link text-xs" href={href} target="_blank" rel="noopener noreferrer">
      {source.provider}
    </a>
  );
}

export function SourceLine({ source, prefix }: { source: SourceRef | undefined | null; prefix?: string }) {
  if (!source) {
    return (
      <div className="text-xs text-[#8e8e8e]">
        {prefix ? `${prefix} ` : ''}No public source is attached to this record.
      </div>
    );
  }
  return (
    <div className="text-xs text-[#8e8e8e] mt-1">
      {prefix ? <span className="font-label">{prefix} </span> : null}
      <SourceLink source={source} />
      {' '}· {source.dataset}
      {' '}· Retrieved {formatDate(source.retrievedAt)}
      {source.scope ? ` · ${source.scope}` : ''}
    </div>
  );
}

export function StatusPill({ status, label }: { status: 'ok' | 'unavailable' | 'error'; label?: string }) {
  const color =
    status === 'ok'
      ? 'text-emerald-300 bg-emerald-300/10 border-emerald-300/30'
      : status === 'unavailable'
        ? 'text-[#9a9a9a] bg-[#9a9a9a]/10 border-[#9a9a9a]/30'
        : 'text-amber-300 bg-amber-300/10 border-amber-300/30';
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${color}`}>
      {label ?? status}
    </span>
  );
}

export function QualityTag({ quality }: { quality: Quality }) {
  const q = quality ?? 'unavailable';
  const color =
    q === 'measured'
      ? 'text-[#7c3aed] border-[#7c3aed]/50 bg-[#7c3aed]/10'
      : q === 'reported'
        ? 'text-sky-400 border-sky-400/40 bg-sky-400/10'
        : q === 'estimated' || q === 'calculated'
          ? 'text-amber-300 border-amber-300/40 bg-amber-300/10'
          : 'text-[#8e8e8e] border-[#8e8e8e]/40 bg-[#8e8e8e]/10';
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] ${color}`}>
      {qualityLabel(q)}
    </span>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <div className="kicker mb-1">{children}</div>;
}

export function DataUnavailable({ why, note }: { why: string; note?: string }) {
  return (
    <div className="panel-flat p-4">
      <div className="font-label text-sm text-[#e6e6e6]">Data unavailable</div>
      <div className="text-sm text-[#9a9a9a] mt-1">{why}</div>
      {note ? <div className="text-xs text-[#8e8e8e] mt-1">{note}</div> : null}
    </div>
  );
}

export function EvidenceList({ items }: { items: Array<{ label: string; value: string; source?: SourceRef | null; quality?: Quality | null }> }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-1 space-y-1 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex items-baseline justify-between gap-3">
          <span className="text-[#bdbdbd]">{item.label}</span>
          <span className="text-right text-[#f4f2ee]">
            {item.value}
            {item.quality && item.quality !== 'reported' ? (
              <span className="ml-1">
                <QualityTag quality={item.quality} />
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StatCell({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <div className="kicker">{label}</div>
      <div className="font-display text-2xl mt-1 leading-tight">{value}</div>
      {sub ? <div className="text-xs text-[#8e8e8e] mt-1">{sub}</div> : null}
    </div>
  );
}

/** Circular progress ring used for the indicator. */
export function ScoreRing({ value, completeness }: { value: number | null; completeness: number }) {
  const v = value ?? 0;
  const r = 56;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, v / 100));
  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 128 128" className="h-40 w-40" role="img" aria-label="Connectivity Infrastructure Indicator">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#2a2a2a" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="10"
          strokeLinecap="square"
          strokeDasharray={`${c * frac} ${c}`}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-3xl leading-none">{value === null ? '—' : String(value)}</div>
          <div className="text-[10px] text-[#8e8e8e] mt-1">/ 100</div>
        </div>
      </div>
    </div>
  );
}