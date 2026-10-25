// Deterministic connectivity gap identification.
//
// Gaps are *observations about the available data*, not conclusions about the
// ground truth. Every finding links back to the exact data that caused it.
// Wording follows the spec: "Potential connectivity gap", "data suggests",
// "based on available public datasets".

import { ANALYSIS_THRESHOLDS as T } from './analysisConfig';
import { formatKm, formatNumber, formatPct } from './format';
import type { GapFinding, ResearchReport, ResearchReport as R } from './types';

type Sections = R['sections'];

export function findGaps(report: ResearchReport): GapFinding[] {
  const gaps: GapFinding[] = [];
  const s = report.sections;

  // --- 1. High population + limited broadband evidence ---------------------
  const popOk = s.population.status === 'ok' && s.population.population !== undefined;
  const pop = s.population.population ?? 0;
  if (popOk && pop >= T.highPopulation) {
    const internetLow =
      s.internet.status !== 'ok' ||
      s.internet.points.length === 0 ||
      (internetUsersPct(s) !== null && internetUsersPct(s)! < T.internetLowPct);
    const coverageLow =
      s.coverage.status !== 'ok' ||
      (mappedTowersCount(s) === 0 && s.coverage.technologies.length === 0);

    if (internetLow || coverageLow) {
      gaps.push({
        id: 'high-population-low-broadband',
        title: 'High population centre with limited mapped broadband infrastructure',
        category: 'broadband',
        severity: 'high',
        concern:
          'Data suggests a population centre whose mapped connectivity infrastructure is limited relative to its size.',
        explanation:
          'The available data shows a large population while broadband availability evidence is low or absent.',
        evidence: [
          { label: 'Population', value: formatNumber(pop), source: s.population.source, quality: s.population.quality },
          { label: 'Mapped telecom towers within radius', value: String(mappedTowersCount(s)), quality: 'reported' },
          {
            label: 'Internet availability data',
            value: internetUsersPct(s) !== null ? formatPct(internetUsersPct(s)) : 'Data unavailable',
            quality: 'reported',
          },
        ],
      });
    }
  }

  // --- 2. Fibre distance ----------------------------------------------------
  const fibre = s.fibre;
  if (fibre.status === 'ok' && fibre.nearestDistanceKm !== undefined) {
    if (fibre.nearestDistanceKm >= T.fibreWarnKm) {
      gaps.push({
        id: 'fibre-distance',
        title: 'Population centre is distant from mapped fibre infrastructure',
        category: 'fibre',
        severity: fibre.nearestDistanceKm >= T.fibreWarnKm * 2 ? 'high' : 'medium',
        concern:
          'The location is far from the nearest fibre route present in open mapping data. Proximity to mapped fibre does not mean service availability — but a large distance makes backhaul a material question.',
        explanation:
          `The nearest fibre infrastructure mapped in the available dataset is ${formatKm(fibre.nearestDistanceKm)} away (search radius ${Math.round(fibre.radiusKm)} km). ${fibre.featuresWithinRadius} fibre feature(s) were found within the radius.`,
        evidence: [
          { label: 'Nearest mapped fibre', value: formatKm(fibre.nearestDistanceKm), source: fibre.source, quality: 'measured' },
          { label: 'Features within radius', value: String(fibre.featuresWithinRadius), source: fibre.source },
          { label: 'Search radius', value: `${Math.round(fibre.radiusKm)} km` },
        ],
      });
    }
  } else if (fibre.status === 'ok' && fibre.featuresWithinRadius === 0) {
    gaps.push({
      id: 'fibre-none-mapped',
      title: 'No mapped fibre infrastructure within the search radius',
      category: 'fibre',
      severity: 'medium',
      concern:
        'Open mapping data contains no fibre route within the search radius. Absence from open data is not proof that none exists.',
      explanation: `The fibre dataset returned no features within ${Math.round(fibre.radiusKm)} km of the location.`,
      evidence: [
        { label: 'Features within radius', value: 'None', source: fibre.source },
        { label: 'Search radius', value: `${Math.round(fibre.radiusKm)} km` },
      ],
    });
  }

  // --- 3 & 4. Schools & health without connectivity evidence ---------------
  const schoolCount = s.facilities.schools.length;
  if (schoolCount > 0 && broadbandEvidenceWeak(s)) {
    gaps.push({
      id: 'schools-connectivity',
      title: 'Schools exist but connectivity at schools is not evidenced',
      category: 'schools',
      severity: 'medium',
      concern:
        'Several schools were identified, while available connectivity data indicates limited or unknown broadband availability in the area.',
      explanation: `${schoolCount} school(s) were identified within the search radius. No dataset in this run evidences broadband connectivity at these schools.`,
      evidence: [
        { label: 'Schools within radius', value: String(schoolCount), quality: 'reported' },
        { label: 'Broadband availability', value: broadbandStatusLabel(s), quality: 'reported' },
      ],
    });
  }
  const healthCount = s.facilities.health.length;
  if (healthCount > 0 && broadbandEvidenceWeak(s)) {
    gaps.push({
      id: 'health-connectivity',
      title: 'Health facilities exist but connectivity at health facilities is not evidenced',
      category: 'health',
      severity: 'medium',
      concern:
        'Health facilities were identified in the area, while connectivity data indicates limited or unknown broadband availability.',
      explanation: `${healthCount} health facilit(ies) were identified within the search radius. No dataset in this run evidences connectivity at these facilities.`,
      evidence: [
        { label: 'Health facilities within radius', value: String(healthCount), quality: 'reported' },
        { label: 'Broadband availability', value: broadbandStatusLabel(s), quality: 'reported' },
      ],
    });
  }

  // --- 5. Electricity -------------------------------------------------------
  const elec = s.electricity;
  if (elec.status === 'ok' && elec.accessPct !== undefined) {
    if (elec.accessPct < T.electricityLowPct) {
      gaps.push({
        id: 'electricity-access',
        title: 'Electricity access is below the indicator threshold',
        category: 'electricity',
        severity: 'high',
        concern:
          'Reported electricity access is low. Network equipment and devices depend on available power.',
        explanation:
          `The electricity dataset reports ${formatPct(elec.accessPct)} access (${elec.accessScope ?? 'unknown scope'}, ${elec.accessYear ?? 'unknown year'}). Note this measures access, not reliability.`,
        evidence: [
          { label: 'Electricity access', value: formatPct(elec.accessPct), source: elec.source, quality: elec.accessQuality },
          { label: 'Scope', value: elec.accessScope ?? 'Data unavailable' },
        ],
      });
    }
  } else if (facilitiesFound(s) && elec.status !== 'ok') {
    gaps.push({
      id: 'electricity-data-missing',
      title: 'Electricity data unavailable while facilities are present',
      category: 'electricity',
      severity: 'low',
      concern:
        'No electricity access dataset was available for this location, so electricity constraints cannot be ruled in or out.',
      explanation:
        'Electricity access data was not available from the configured datasets, while mapped facilities exist in the area.',
      evidence: [
        { label: 'Mapped facilities', value: String(s.facilities.schools.length + s.facilities.health.length) },
      ],
    });
  }

  // --- 6. Tower sparsity ----------------------------------------------------
  if (popOk && pop > 0 && s.coverage.status === 'ok' && s.coverage.technologies.length === 0) {
    const towers = mappedTowersCount(s);
    if (towers < T.sparseTowers) {
      gaps.push({
        id: 'tower-sparse',
        title: 'Very few mapped telecom towers near this population centre',
        category: 'telecom',
        severity: 'medium',
        concern:
          'A population centre was identified while very few telecom towers are mapped nearby. This is an observation about mapped infrastructure, not a statement about actual coverage.',
        explanation: `${towers} telecom tower(s) were found within the facility search radius for a location with population ${formatNumber(pop)}.`,
        evidence: [
          { label: 'Mapped towers', value: String(towers), quality: 'reported' },
          { label: 'Population', value: formatNumber(pop), source: s.population.source, quality: s.population.quality },
        ],
      });
    }
  }

  // --- 7. Data sparsity -----------------------------------------------------
  const okDomains = report.providers.filter((p) => p.status === 'ok').length;
  const totalDomains = report.providers.length;
  if (totalDomains > 0 && okDomains / totalDomains < 0.35) {
    gaps.push({
      id: 'data-sparse',
      title: 'Public dataset coverage is limited for this location',
      category: 'data',
      severity: 'info',
      concern:
        'RuralNet could only assemble a small share of its standard datasets for this location. Treat all results as partial.',
      explanation: `${okDomains} of ${totalDomains} configured dataset providers returned usable data.`,
      evidence: [{ label: 'Datasets available', value: `${okDomains}/${totalDomains}` }],
    });
  }

  return gaps;
}

// --- helpers ---------------------------------------------------------------

function mappedTowersCount(s: Sections): number {
  return s.coverage.towers.length;
}

function internetUsersPct(s: Sections): number | null {
  const pt = s.internet.points.find((p) => p.metric === 'internet_users_pct');
  return pt ? pt.value : null;
}

function broadbandEvidenceWeak(s: Sections): boolean {
  const users = internetUsersPct(s);
  if (s.internet.status !== 'ok' || s.internet.points.length === 0) return true;
  if (users !== null && users < T.internetLowPct) return true;
  const broadbandLike = s.internet.points.filter(
    (p) => p.metric === 'fixed_broadband_total' || p.metric === 'active_mobile_broadband_p100',
  );
  return broadbandLike.length === 0;
}

function broadbandStatusLabel(s: Sections): string {
  const users = internetUsersPct(s);
  if (users !== null) return `${formatPct(users)} internet usage (national reference)`;
  return s.internet.status === 'ok' ? 'Internet dataset present but no usage figures' : 'Data unavailable';
}

function facilitiesFound(s: Sections): boolean {
  return s.facilities.schools.length > 0 || s.facilities.health.length > 0 || s.facilities.government.length > 0;
}