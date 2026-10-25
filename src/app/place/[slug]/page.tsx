// Place research page.
// Fetches GET /api/research?q=<slug> and renders the tabbed profile.
// Works fully server-free: the page is a client component calling the API.

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ResearchReport } from '@/domain/types';
import ReportView from '@/components/ReportView';
import SearchBox from '@/components/SearchBox';

const STEPS = [
  'Resolving location…',
  'Collecting public datasets…',
  'Checking fibre, electricity and facilities…',
  'Analysing connectivity gaps…',
];

interface ApiBody {
  report?: ResearchReport;
  error?: string;
}

export default function PlacePage() {
  const params = useParams<{ slug?: string }>();
  const slug = params?.slug ?? '';
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (tick < STEPS.length - 1) {
      const t = setTimeout(() => setTick(tick + 1), 1400);
      return () => clearTimeout(t);
    }
  }, [tick]);

  useEffect(() => {
    if (!slug) {
      setError('No location was provided.');
      setState('error');
      return;
    }
    setState('loading');
    setError(null);
    setTick(0);
    let cancelled = false;
    fetch(`/api/research?q=${encodeURIComponent(slug)}`)
      .then((res) => res.json() as Promise<ApiBody>)
      .then((body) => {
        if (cancelled) return;
        if (!body.report) {
          setError(body.error ?? 'Research run failed.');
          setState('error');
          return;
        }
        setReport(body.report);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setError('The research service did not respond. Try again shortly.');
          setState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="mt-10 max-w-3xl">
        <h1 className="font-display text-3xl">{slug}</h1>
        <p className="mt-2 text-sm text-[#9a9a9a]">
          {STEPS[Math.min(tick, STEPS.length - 1)]}
        </p>
        <div className="mt-6 h-1 w-full bg-[#2a2a2a]">
          <div className="h-1 w-1/3 bg-[#7c3aed] animate-pulse" />
        </div>
        <p className="mt-4 text-xs text-[#8e8e8e]">
          This can take a while in live mode (public APIs can be slow). In mock mode it is instant, and clearly
          labelled as development data.
        </p>
      </div>
    );
  }

  if (state === 'error' || !report) {
    return (
      <div className="mt-10 max-w-3xl">
        <h1 className="font-display text-3xl">Location could not be researched</h1>
        <p className="mt-3 text-sm text-[#bdbdbd]">{error}</p>
        <div className="mt-6">
          <SearchBox />
        </div>
        <p className="mt-4 text-xs text-[#8e8e8e]">
          Tip: add the state to your query, e.g. “Oghara, Delta State”. In development, run with RURALNET_MODE=mock
          for instant, labelled mock results.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4 max-w-xl">
        <SearchBox />
      </div>
      <ReportView report={report} />
    </div>
  );
}