// Database operations tests (opt-in).
//
// Postgres is not required for the unit/API suite. Set TEST_DATABASE_URL to a
// reachable, migrated database to enable these tests:
//
//   TEST_DATABASE_URL=postgresql://ruralnet:ruralnet@localhost:5432/ruralnet_test npm run test
//
// The CI workflow provides this via a Postgres service container.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findCachedReport, isDbAvailable, saveResearchRun } from '@/services/db';
import { fixtureReport } from '../helpers/fixture';

const TEST_URL = process.env['TEST_DATABASE_URL'] ?? '';

describe.skipIf(!TEST_URL)('database operations', () => {
  beforeAll(() => {
    process.env['DATABASE_URL'] = TEST_URL;
  });

  afterAll(async () => {
    const { closeDb } = await import('@/services/db');
    closeDb();
  });

  it('detects a reachable database', async () => {
    expect(await isDbAvailable()).toBe(true);
  });

  it('persists and retrieves a research run', async () => {
    const report = fixtureReport();
    report.location.query = 'Oghara, Delta State';
    const saved = await saveResearchRun(report);
    expect(saved).toBe(true);

    const cached = await findCachedReport('Oghara, Delta State', 'mock', 86400);
    expect(cached).not.toBeNull();
    expect(cached!.location.name).toBe('Oghara');
    expect(cached!.sections.population.population).toBe(125_000);
  });

  it('ignores mismatched mode when retrieving', async () => {
    const cached = await findCachedReport('Oghara, Delta State', 'live', 86400);
    expect(cached).toBeNull();
  });
});