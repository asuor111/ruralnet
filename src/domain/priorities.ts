// Deterministic infrastructure priority indicators.
//
// These answer "what should be investigated next" — they are NOT investment
// instructions. Priorities are derived purely from the assembled data using
// documented rules, and each carries the evidence that triggered it.

import { ANALYSIS_THRESHOLDS as T } from './analysisConfig';
import { formatKm, formatNumber, formatPct } from './format';
import type { EvidenceLine, GapFinding, PriorityItem, ResearchReport } from './types';

export function findPriorities(report: ResearchReport, gaps: GapFinding[]): PriorityItem[] {
  const priorities: PriorityItem[] = [];
  const s = report.sections;

  // 1. Investigate broadband availability -----------------------------------
  const internetWeak =
    s.internet.status !== 'ok' ||
    s.internet.points.length === 0 ||
    (s.internet.points.find((p) => p.metric === 'internet_users_pct')?.value ?? 100) < T.internetLowPct;
  if (internetWeak) {
    priorities.push({
      id: 'investigate-broadband',
      title: 'Investigate broadband availability',
      why:
        'Available internet availability data is absent or indicates low uptake, while no local broadband inventory is present in the configured datasets. A field/desk review should establish which operators and services actually reach this area.',
      evidence: internetEvidence(s),
    });
  }

  // 2. Fibre backhaul feasibility -------------------------------------------
  const fibre = s.fibre;
  if (fibre.status === 'ok') {
    const far = fibre.nearestDistanceKm !== undefined && fibre.nearestDistanceKm >= T.fibreWarnKm;
    const nothingMapped = fibre.featuresWithinRadius === 0;
    if (far || nothingMapped) {
      priorities.push({
        id: 'fibre-backhaul',
        title: 'Assess fibre backhaul feasibility',
        why: nothingMapped
          ? `No fibre infrastructure is mapped within ${Math.round(fibre.radiusKm)} km in open data. Backhaul options (microwave, satellite, new build) merit assessment.`
          : `The nearest mapped fibre is ${formatKm(fibre.nearestDistanceKm)} away. Assess whether extending from that route is feasible and what distance implies for cost.`,
        evidence: [
          {
            label: 'Nearest mapped fibre',
            value: fibre.nearestDistanceKm !== undefined ? formatKm(fibre.nearestDistanceKm) : 'None within radius',
            source: fibre.source,
          },
          { label: 'Search radius', value: `${Math.round(fibre.radiusKm)} km` },
        ],
      });
    }
  } else if (gaps.some((g) => g.id === 'fibre-none-mapped')) {
    priorities.push({
      id: 'fibre-backhaul',
      title: 'Assess fibre backhaul feasibility',
      why: 'No mapped fibre was found within the search radius in open data.',
      evidence: [{ label: 'Mapped fibre', value: 'None within radius' }],
    });
  }

  // 3. School connectivity ---------------------------------------------------
  const schools = s.facilities.schools.length;
  const coverageWeak = s.coverage.status !== 'ok';
  if (schools > 0 && (internetWeak || coverageWeak)) {
    priorities.push({
      id: 'school-connectivity',
      title: 'Assess connectivity at schools',
      why:
        `${schools} school(s) were identified within the selected area, while available connectivity data indicates limited broadband availability. Schools are a common anchor point for community connectivity programmes.`,
      evidence: [{ label: 'Schools within radius', value: String(schools) }, ...internetEvidence(s)],
    });
  }

  // 4. Health facility connectivity -----------------------------------------
  const health = s.facilities.health.length;
  if (health > 0 && (internetWeak || coverageWeak)) {
    priorities.push({
      id: 'health-connectivity',
      title: 'Assess connectivity at health facilities',
      why:
        `${health} health facilit(ies) were identified within the selected area, while available connectivity data indicates limited broadband availability. Connectivity at health facilities is a documented priority for rural digital inclusion.`,
      evidence: [{ label: 'Health facilities within radius', value: String(health) }, ...internetEvidence(s)],
    });
  }

  // 5. Electricity constraints ----------------------------------------------
  const elec = s.electricity;
  if (elec.status === 'ok' && elec.accessPct !== undefined && elec.accessPct < T.electricityLowPct) {
    priorities.push({
      id: 'electricity',
      title: 'Investigate electricity constraints',
      why:
        `Reported electricity access is ${formatPct(elec.accessPct)} (${elec.accessScope ?? 'scope unknown'}). Power availability constrains fixed and mobile network operations.`,
      evidence: [{ label: 'Electricity access', value: formatPct(elec.accessPct), source: elec.source }],
    });
  } else if (elec.status !== 'ok' && (schools > 0 || health > 0)) {
    priorities.push({
      id: 'electricity',
      title: 'Investigate electricity constraints',
      why:
        'No electricity access dataset was available, while mapped facilities exist. Power availability should be confirmed before assuming network equipment can operate.',
      evidence: [{ label: 'Mapped facilities', value: String(schools + health) }],
    });
  }

  // 6. Last-mile access gap -------------------------------------------------
  const pop = s.population.population;
  if (
    pop &&
    pop >= T.highPopulation &&
    s.coverage.status === 'ok' &&
    s.coverage.technologies.length === 0 &&
    s.coverage.towers.length < T.sparseTowers
  ) {
    priorities.push({
      id: 'last-mile-access',
      title: 'Assess the last-mile access gap',
      why:
        `${s.coverage.towers.length} mapped tower(s) serve a population centre of ${formatNumber(pop)}. A targeted review of where towers/access points are actually needed may be warranted.`,
      evidence: [
        { label: 'Mapped towers', value: String(s.coverage.towers.length) },
        { label: 'Population', value: formatNumber(pop), source: s.population.source },
      ],
    });
  }

  return priorities;
}

function internetEvidence(s: ResearchReport['sections']): EvidenceLine[] {
  const users = s.internet.points.find((p) => p.metric === 'internet_users_pct');
  const fixed = s.internet.points.find((p) => p.metric === 'fixed_broadband_total');
  const lines: EvidenceLine[] = [];
  if (users) {
    lines.push({ label: 'Internet usage (national)', value: formatPct(users.value), source: users.source });
  } else {
    lines.push({ label: 'Internet availability data', value: 'Data unavailable' });
  }
  if (fixed) {
    lines.push({ label: 'Fixed broadband subscriptions (national)', value: formatNumber(fixed.value), source: fixed.source });
  }
  return lines;
}