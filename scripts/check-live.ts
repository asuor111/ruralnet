// Live-mode diagnostics: runs one research query with real providers and
// prints the assembled section statuses. Useful when operating in live mode.
//
//   RURALNET_MODE=live npx tsx scripts/check-live.ts
//
// Note: OpenStreetMap Nominatim blocks some networks (HTTP 403). In that case
// set NOMINATIM_EMAIL, self-host Nominatim (NOMINATIM_BASE_URL), or use mock
// mode for development.

import { runResearch } from '../src/services/research';

process.env.RURALNET_MODE = 'live';

const report = await runResearch('Oghara, Delta State', { refresh: true });
const s = report.sections;
console.log(`location: ${report.location.name} (${report.location.latitude}, ${report.location.longitude}) via ${report.location.geocoder}`);
console.log(`population: ${s.population.status}${s.population.population ? ` -> ${s.population.population} (${s.population.geographicLevel}, ${s.population.year})` : ''}`);
console.log(`internet: ${s.internet.status} (${s.internet.points.map((p) => `${p.metric}=${p.value}`).join(', ') || 'no points'})`);
console.log(`electricity: ${s.electricity.status}${s.electricity.accessPct !== undefined ? ` -> ${s.electricity.accessPct}%` : ''}`);
console.log(`coverage: ${s.coverage.status} (towers=${s.coverage.towers.length})`);
console.log(`fibre: ${s.fibre.status}${s.fibre.nearestDistanceKm !== undefined ? ` -> ${s.fibre.nearestDistanceKm.toFixed(1)} km` : ''}`);
console.log(`facilities: ${s.facilities.status} (schools=${s.facilities.schools.length}, health=${s.facilities.health.length})`);
console.log(`sources: ${report.sources.map((x) => x.source.id).join(', ')}`);
console.log(`indicator: ${report.analysis.score.indicator} (${report.analysis.score.dataCompletenessPct}% complete)`);
console.log(`warnings: ${report.warnings.length}`);

process.exit(0);