'use client';

// Location search box with live suggestions.
// Calls GET /api/search and deep-links to /place/<query>.

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ResolvedLocation } from '@/domain/types';

interface SearchResult {
  name: string;
  admin2Name?: string;
  state?: string;
  country: string;
  displayName?: string;
}

interface Suggestion {
  results: SearchResult[];
}

const ttlCache = new Map<string, Suggestion>();

export default function SearchBox({ id = 'q', autoFocus = false }: { id?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  function goTo(query: string) {
    if (!query.trim()) return;
    router.push(`/place/${encodeURIComponent(query.trim())}`);
  }

  function search(term: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const cached = ttlCache.get(term.trim().toLowerCase());
      if (cached) {
        setSuggestions(cached.results);
        setOpen(cached.results.length > 0);
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term.trim())}`);
        const body = (await res.json()) as { results?: SearchResult[]; error?: string };
        if (!res.ok) {
          setError(body.error ?? 'Search failed.');
          setSuggestions([]);
          setOpen(false);
          return;
        }
        const results = body.results ?? [];
        ttlCache.set(term.trim().toLowerCase(), { results });
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setError('Search service unavailable. Try again in a moment.');
      } finally {
        setBusy(false);
      }
    }, 350);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        role="search"
        className="flex w-full items-center"
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(false);
          goTo(value);
        }}
      >
        <input
          id={id}
          type="text"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search a community or LGA — e.g. Oghara, Delta State"
          className="h-12 w-full rounded-md border border-[#3a3a3a] bg-[#111111] px-4 text-base text-[#f4f2ee] placeholder:text-[#6f6f6f] focus:border-[#7c3aed] focus:outline-none"
          onChange={(e) => {
            setValue(e.target.value);
            search(e.target.value);
          }}
        />
        <button
          type="submit"
          className="h-12 shrink-0 rounded-md border border-[#3a3a3a] bg-[#7c3aed] px-5 text-sm font-semibold text-white hover:bg-[#6c2fd1]"
        >
          Search
        </button>
      </form>
      {busy ? <div className="absolute -bottom-6 text-xs text-[#8e8e8e]">Resolving…</div> : null}
      {error ? <div className="absolute left-0 -bottom-8 text-xs text-amber-300">{error}</div> : null}
      {open && suggestions.length > 0 ? (
        <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 mt-1 rounded-md border border-[#2a2a2a] bg-[#121212] text-sm shadow-lg">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                className="block w-full px-4 py-2.5 text-left hover:bg-[#1c1c1c]"
                onClick={() => {
                  setOpen(false);
                  goTo(s.displayName ?? `${s.name}${s.state ? `, ${s.state}` : ''}`);
                }}
              >
                <span className="text-[#f4f2ee]">{s.name}</span>
                {s.admin2Name ? <span className="text-[#9a9a9a]"> · {s.admin2Name}</span> : null}
                {s.state ? <span className="text-[#9a9a9a]"> · {s.state}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}