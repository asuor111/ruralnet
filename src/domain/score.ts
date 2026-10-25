// Transparent Connectivity Infrastructure Indicator.
//
// The indicator is a weighted composite of up to six components. Components
// without sufficient data are EXCLUDED, never guessed at, and the resulting
// "data completeness" percentage is reported alongside the indicator.
//
// Weights (documented in /methodology#connectivity-infrastructure-indicator)
//   Population / demand      20%
//   Telecom coverage         20%
//   Internet availability    20%
//   Fibre proximity          15%
//   Electricity              10%
//   Facility connectivity    15%

import { clamp } from './format';
import type { ConnectivityScore, Quality, ResearchReport, ScoreComponent } from './types';

export const SCORE_COMPONENTS: { key: string; label: string; weight: number }[] = [
  { key: 'population', label: 'Population / demand', weight: 0.2 },
  { key: 'telecom', label: 'Telecom coverage', weight: 0.2 },
  { key: 'internet', label: 'Internet availability', weight: 0.2 },
  { key: 'fibre', label: 'Fibre proximity', weight: 0.15 },
  { key: 'electricity', label: 'Electricity', weight: 0.1 },
  { key: 'facilities', label: 'Facility connectivity indicators', weight: 0.15 },
];

export function computeScore(report: ResearchReport): ConnectivityScore {
  const s = report.sections;
  const components: ScoreComponent[] = [];
  const missingDatasets: string[] = [];

  // --- Population / demand -------------------------------------------------
  {
    const { status, population, year, geographicLevel, quality } = s.population;
    if (status === 'ok' && population && population > 0) {
      // Logarithmic demand signal: 1 -> 0, 1,000,000 -> 100.
      const demand = Math.round(clamp(Math.log10(population) / 6, 0, 1) * 100);
      components.push({
        key: 'population',
        label: 'Population / demand',
        weight: SCORE_COMPONENTS[0].weight,
        score: demand,
        basis: `Population ${population.toLocaleString('en-US')} (${geographicLevel}, ${year ?? 'year unknown'}). Demand signal = log10(population)/6, capped at 100.`,
        quality,
      });
    } else {
      missingDatasets.push('LGA/local population');
      components.push({
        key: 'population',
        label: 'Population / demand',
        weight: SCORE_COMPONENTS[0].weight,
        score: null,
        basis: 'No population dataset was available for this location.',
        quality: status === 'ok' ? quality : 'unavailable',
      });
    }
  }

  // --- Telecom coverage ------------------------------------------------------
  {
    const techs = s.coverage.technologies;
    const towerCount = s.coverage.towers.length;
    let score: number | null = null;
    let basis = '';
    let quality: Quality = 'unavailable';
    if (techs.length > 0 && techs.some((t) => t.coveragePct !== undefined)) {
      const pcts = techs.filter((t) => t.coveragePct !== undefined).map((t) => t.coveragePct!);
      score = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
      basis = `Average of reported coverage across ${pcts.length} technology band(s): ${pcts
        .map((p) => `${Math.round(p)}%`)
        .join(', ')}.`;
      quality = techs[0].quality;
    } else if (towerCount > 0) {
      score = Math.min(100, towerCount * 20);
      basis = `No coverage percentages available; ${towerCount} mapped telecom tower(s) used as an infrastructure presence proxy (capped at 5+ towers = 100).`;
      quality = 'reported';
    }
    if (score === null) {
      missingDatasets.push('Telecom coverage / towers');
      basis = 'No telecom coverage or mapped-tower dataset was available.';
    }
    components.push({
      key: 'telecom',
      label: 'Telecom coverage',
      weight: SCORE_COMPONENTS[1].weight,
      score,
      basis,
      quality,
    });
  }

  // --- Internet availability -------------------------------------------------
  {
    const users = s.internet.points.find((p) => p.metric === 'internet_users_pct');
    if (users) {
      components.push({
        key: 'internet',
        label: 'Internet availability',
        weight: SCORE_COMPONENTS[2].weight,
        score: Math.round(clamp(users.value, 0, 100)),
        basis: `Individuals using the Internet: ${users.value.toFixed(1)}% (scope: ${users.scope}, ${users.year ?? 'year unknown'}).`,
        quality: users.quality,
      });
    } else {
      missingDatasets.push('Internet availability / usage');
      components.push({
        key: 'internet',
        label: 'Internet availability',
        weight: SCORE_COMPONENTS[2].weight,
        score: null,
        basis: 'No internet availability dataset was available.',
        quality: 'unavailable',
      });
    }
  }

  // --- Fibre proximity --------------------------------------------------------
  {
    const fibre = s.fibre;
    if (fibre.status === 'ok' && fibre.nearestDistanceKm !== undefined) {
      const score = Math.max(0, 100 - Math.round(fibre.nearestDistanceKm * 8));
      components.push({
        key: 'fibre',
        label: 'Fibre proximity',
        weight: SCORE_COMPONENTS[3].weight,
        score,
        basis: `Nearest mapped fibre is ${fibre.nearestDistanceKm.toFixed(1)} km away. Score = max(0, 100 - km * 8). Proximity indicates distance, not service availability.`,
        quality: 'measured',
      });
    } else if (fibre.status === 'ok' && fibre.featuresWithinRadius === 0) {
      missingDatasets.push('Mapped fibre within search radius');
      components.push({
        key: 'fibre',
        label: 'Fibre proximity',
        weight: SCORE_COMPONENTS[3].weight,
        score: null,
        basis: `No mapped fibre found within ${Math.round(fibre.radiusKm)} km. Excluded because absence from open data is not proof of absence.`,
        quality: 'unavailable',
      });
    } else {
      missingDatasets.push('Mapped fibre within search radius');
      components.push({
        key: 'fibre',
        label: 'Fibre proximity',
        weight: SCORE_COMPONENTS[3].weight,
        score: null,
        basis: 'No fibre dataset was available for this location.',
        quality: 'unavailable',
      });
    }
  }

  // --- Electricity --------------------------------------------------------------
  {
    const elec = s.electricity;
    if (elec.status === 'ok' && elec.accessPct !== undefined) {
      components.push({
        key: 'electricity',
        label: 'Electricity',
        weight: SCORE_COMPONENTS[4].weight,
        score: Math.round(clamp(elec.accessPct, 0, 100)),
        basis: `Access to electricity: ${elec.accessPct.toFixed(1)}% (scope: ${elec.accessScope ?? 'unknown'}, ${elec.accessYear ?? 'year unknown'}). Measures access, not reliability.`,
        quality: elec.accessQuality,
      });
    } else {
      missingDatasets.push('Electricity access');
      components.push({
        key: 'electricity',
        label: 'Electricity',
        weight: SCORE_COMPONENTS[4].weight,
        score: null,
        basis: 'No electricity access dataset was available.',
        quality: 'unavailable',
      });
    }
  }

  // --- Facility connectivity indicators ----------------------------------------
  {
    const fac = s.facilities;
    if (fac.status === 'ok') {
      const schoolsScore = Math.min(100, fac.schools.length * 5);
      const healthScore = Math.min(100, fac.health.length * 10);
      const score = Math.round((schoolsScore + healthScore) / 2);
      components.push({
        key: 'facilities',
        label: 'Facility connectivity indicators',
        weight: SCORE_COMPONENTS[5].weight,
        score,
        basis: `${fac.schools.length} school(s) (score min(100, n*5)) and ${fac.health.length} health facilit(ies) (score min(100, n*10)) within ${Math.round(fac.withinRadiusKm)} km; averaged. Facilities are potential connectivity anchors.`,
        quality: 'reported',
      });
    } else {
      missingDatasets.push('Schools & health facilities');
      components.push({
        key: 'facilities',
        label: 'Facility connectivity indicators',
        weight: SCORE_COMPONENTS[5].weight,
        score: null,
        basis: 'No facility dataset was available.',
        quality: 'unavailable',
      });
    }
  }

  const included = components.filter((c) => c.score !== null);
  const dataCompletenessPct = Math.round(included.reduce((a, c) => a + c.weight, 0) * 100);
  const indicator =
    included.length === 0
      ? null
      : Math.round(
          included.reduce((a, c) => a + (c.score ?? 0) * c.weight, 0) /
            included.reduce((a, c) => a + c.weight, 0),
        );

  return {
    indicator,
    components,
    dataCompletenessPct,
    missingDatasets,
  };
}