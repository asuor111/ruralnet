import { describe, expect, it } from 'vitest';
import { NormalizationError, NIGERIA_STATES, normalizeQuery, querySlug, validateQuery } from '@/domain/normalize';

describe('validateQuery', () => {
  it('accepts a normal Nigerian place query', () => {
    expect(validateQuery('Oghara, Delta State').ok).toBe(true);
  });

  it('rejects empty and too-short queries', () => {
    expect(validateQuery('').ok).toBe(false);
    expect(validateQuery('  ').ok).toBe(false);
    expect(validateQuery('a').ok).toBe(false);
  });

  it('rejects overly long queries', () => {
    expect(validateQuery('x'.repeat(200)).ok).toBe(false);
  });

  it('rejects URLs and contact details', () => {
    expect(validateQuery('http://evil.example.com/lga').ok).toBe(false);
    expect(validateQuery('mailto:attacker@example.com').ok).toBe(false);
  });

  it('rejects suspicious script-shaped input', () => {
    expect(validateQuery('<script>alert(1)</script>').ok).toBe(false);
    expect(validateQuery('SELECT * FROM locations').ok).toBe(false);
  });

  it('rejects unsupported characters', () => {
    expect(validateQuery('Oghara; DROP TABLE').ok).toBe(false);
  });
});

describe('normalizeQuery', () => {
  it('resolves states and tokens for "Oghara, Delta State"', () => {
    const normalized = normalizeQuery('Oghara, Delta State');
    expect(normalized.cleaned).toBe('Oghara, Delta State');
    expect(normalized.states).toContain('Delta');
    expect(normalized.tokens).toContain('oghara');
    expect(normalized.tokens).toContain('state');
  });

  it('collapses whitespace and full-width commas', () => {
    const normalized = normalizeQuery('  Warri ,  South   West  ');
    expect(normalized.cleaned).toContain('Warri');
    expect(normalized.tokens.join(' ')).toMatch(/warri/);
  });

  it('detects the Federal Capital Territory alias', () => {
    const normalized = normalizeQuery('Lafia, FCT');
    expect(normalized.states).toContain('Federal Capital Territory');
  });

  it('detects multi-word states', () => {
    const normalized = normalizeQuery('Ikombe, Akwa Ibom');
    expect(normalized.states).toContain('Akwa Ibom');
  });

  it('marks LGA hints', () => {
    expect(normalizeQuery('Warri South West LGA').adminLevelHint).toBe('lga');
    expect(normalizeQuery('Oghara, Delta State').adminLevelHint).toBe('lga');
    expect(normalizeQuery('Delta State').adminLevelHint).toBe('state');
  });

  it('throws NormalizationError for invalid input', () => {
    expect(() => normalizeQuery('http://x')).toThrow(NormalizationError);
  });
});

describe('catalog integrity', () => {
  it('lists the 36 states plus the FCT', () => {
    expect(NIGERIA_STATES.length).toBeGreaterThanOrEqual(37);
    expect(NIGERIA_STATES.some((s) => s.name === 'Delta')).toBe(true);
    expect(NIGERIA_STATES.some((s) => s.name === 'Federal Capital Territory')).toBe(true);
  });
});

describe('querySlug', () => {
  it('produces stable URL-safe slugs', () => {
    expect(querySlug('Oghara, Delta State')).toBe('oghara-delta-state');
    expect(querySlug('  Oghara, Delta State  ')).toBe('oghara-delta-state');
  });
});