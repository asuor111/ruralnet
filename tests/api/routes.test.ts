import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as searchGET } from '@/app/api/search/route';
import { GET as researchGET } from '@/app/api/research/route';
import { GET as exportGET } from '@/app/api/export/route';
import { GET as healthGET } from '@/app/api/health/route';

describe('GET /api/search', () => {
  it('returns candidate locations for a valid query', async () => {
    const res = await searchGET(new NextRequest('http://localhost/api/search?q=Oghara'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results?: Array<{ name: string }> };
    expect(body.results!.length).toBeGreaterThan(0);
    expect(body.results![0].name).toBe('Oghara');
  });

  it('rejects invalid queries with 400', async () => {
    const res = await searchGET(new NextRequest('http://localhost/api/search?q=http://evil'));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/research', () => {
  it('returns a full report', async () => {
    const res = await researchGET(new NextRequest('http://localhost/api/research?q=Oghara%2C%20Delta%20State'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { report?: { analysis?: { score?: { indicator?: number | null } }; location?: { name?: string } } };
    expect(body.report!.location!.name).toBe('Oghara');
    expect(body.report!.analysis!.score!.indicator).not.toBeNull();
  });

  it('returns 404 for unresolvable locations', async () => {
    const res = await researchGET(new NextRequest('http://localhost/api/research?q=Kxyzq%20Abcde'));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/export', () => {
  it('exports CSV with attachment headers', async () => {
    const res = await exportGET(new NextRequest('http://localhost/api/export?q=Oghara&format=csv'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    const text = await res.text();
    expect(text).toContain('section,metric');
  });

  it('rejects unknown formats', async () => {
    const res = await exportGET(new NextRequest('http://localhost/api/export?q=Oghara&format=xlsx'));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/health', () => {
  it('reports mode and database status', async () => {
    const res = await healthGET();
    const body = (await res.json()) as { ok: boolean; mode: string };
    expect(body.ok).toBe(true);
    expect(['mock', 'live']).toContain(body.mode);
  });
});