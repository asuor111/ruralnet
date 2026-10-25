// Shared domain types for RuralNet.
// The domain layer is intentionally free of I/O and framework imports so it
// can be tested exhaustively and reused by providers, services and the UI.

export type RunMode = 'mock' | 'live';

/** Data origin classification. Never present estimates as facts. */
export type Quality =
  | 'measured' // direct observation / measurement
  | 'reported' // reported by an authoritative source
  | 'estimated' // modelled/projected value with a clear methodology
  | 'calculated' // derived by RuralNet from documented inputs
  | 'unavailable'; // no compatible public dataset was available

export const QUALITY_LABELS: Record<Quality, string> = {
  measured: 'Measured',
  reported: 'Reported',
  estimated: 'Estimated',
  calculated: 'Calculated',
  unavailable: 'Data unavailable',
};

export interface SourceRef {
  /** Stable identifier, e.g. "worldbank:sp.pop.totl". */
  id: string;
  /** Organisation/API which published the data. */
  provider: string;
  /** Dataset / indicator name. */
  dataset: string;
  /** Public URL of the dataset or API. */
  url: string;
  /** ISO-8601 date the data was retrieved. */
  retrievedAt: string;
  /** Geographic scope of the record, e.g. "Nigeria (national)". */
  scope: string;
  /** Licence when known, e.g. "ODbL 1.0". */
  licence?: string;
}

/** One user-facing truth line with full provenance. */
export interface EvidenceLine {
  label: string;
  value: string;
  source?: SourceRef;
  quality?: Quality;
}

export type AdminLevel = 'community' | 'town' | 'lga' | 'state' | 'unknown';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export type BBox = [south: number, west: number, north: number, east: number];

export interface ResolvedLocation extends LatLng {
  id: string;
  /** Normalized query that produced this location. */
  query: string;
  name: string;
  adminLevel: AdminLevel;
  parentName?: string;
  /** Nigerian state when resolved, e.g. "Delta State". */
  state?: string;
  /** LGA when resolved, e.g. "Ughelli North". */
  admin2Name?: string;
  country: string;
  boundingBox: BBox;
  geocoder: string;
  geocoderUrl?: string;
  displayName?: string;
  quality: Quality;
}

export type ResearchDomain =
  | 'population'
  | 'coverage'
  | 'internet'
  | 'fibre'
  | 'electricity'
  | 'facilities';

export interface ProviderStatus {
  providerId: string;
  providerLabel: string;
  domain: ResearchDomain;
  status: 'ok' | 'unavailable' | 'error';
  source?: SourceRef;
  note?: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Provider result shapes (normalized)
// ---------------------------------------------------------------------------

export interface ProviderResult<T> {
  status: 'ok' | 'unavailable' | 'error';
  /** Present when status === 'ok'. */
  data?: T;
  source?: SourceRef;
  note?: string;
}

export interface PopulationSection {
  status: 'ok' | 'unavailable' | 'error';
  population?: number;
  year?: number;
  geographicLevel: string;
  quality: Quality;
  source?: SourceRef;
  note?: string;
}

export interface CoverageTechnology {
  tech: '2G' | '3G' | '4G' | '5G';
  /** % of households/population within coverage, when the dataset measures it. */
  coveragePct?: number;
  operator?: string;
  quality: Quality;
}

export interface CoverageSection {
  status: 'ok' | 'unavailable' | 'error';
  /** Coverage percentages when a coverage dataset exists (e.g. import). */
  technologies: CoverageTechnology[];
  /**
   * Mapped telecom towers found near the location (OSM / OpenCelliD import).
   * A tower is infrastructure evidence, NOT proof of service coverage.
   */
  towers: InfrastructureItem[];
  source?: SourceRef;
  note?: string;
}

export type InternetMetric =
  | 'internet_users_pct'
  | 'fixed_broadband_total'
  | 'mobile_subscriptions_p100'
  | 'active_mobile_broadband_p100';

export interface InternetPoint {
  metric: InternetMetric;
  label: string;
  value: number;
  unit?: string;
  year?: number;
  scope: string;
  quality: Quality;
  source: SourceRef;
}

export interface InternetSection {
  status: 'ok' | 'unavailable' | 'error';
  points: InternetPoint[];
  note?: string;
}

export interface FibreSection {
  status: 'ok' | 'unavailable' | 'error';
  /** Distance from the location to the nearest mapped fibre infrastructure. */
  nearestDistanceKm?: number;
  nearestName?: string;
  /** How the nearest feature was found. */
  mode?: 'osm-mapped' | 'osm-subsea' | 'imported-dataset' | 'mock';
  /** Number of fibre features found within the search radius. */
  featuresWithinRadius: number;
  radiusKm: number;
  geometry?: unknown; // GeoJSON Feature/FeatureCollection, used by the map
  source?: SourceRef;
  note?: string;
}

export interface ElectricitySection {
  status: 'ok' | 'unavailable' | 'error';
  /** % of population with access to electricity, when the dataset measures it. */
  accessPct?: number;
  accessScope?: string;
  accessYear?: number;
  accessQuality: Quality;
  substations: InfrastructureItem[];
  source?: SourceRef;
  note?: string;
}

export type FacilityType = 'school' | 'health' | 'government' | 'telecom' | 'other';

export interface FacilityItem extends LatLng {
  id: string;
  name?: string;
  type: FacilityType;
  subtype?: string;
  source: SourceRef;
}

export type InfrastructureKind =
  | 'telecom_tower'
  | 'fibre'
  | 'substation'
  | 'ict_centre'
  | 'other';

export interface InfrastructureItem extends LatLng {
  id: string;
  kind: InfrastructureKind;
  name?: string;
  source: SourceRef;
}

export interface FacilitiesSection {
  status: 'ok' | 'unavailable' | 'error';
  withinRadiusKm: number;
  schools: FacilityItem[];
  health: FacilityItem[];
  government: FacilityItem[];
  /**
   * Other mapped infrastructure collected by the same query
   * (telecom towers, substations, ICT centres).
   */
  infrastructure: InfrastructureItem[];
  note?: string;
}

/** Aggregated "existing digital infrastructure" view. */
export interface InfrastructureSection {
  towers: InfrastructureItem[];
  towersSource?: SourceRef;
  substations: InfrastructureItem[];
  substationsSource?: SourceRef;
  ictCentres: InfrastructureItem[];
  ictCentresSource?: SourceRef;
  fibre: {
    featuresWithinRadius: number;
    nearestDistanceKm?: number;
    source?: SourceRef;
    note?: string;
  };
  note?: string;
}

// ---------------------------------------------------------------------------
// Analysis results
// ---------------------------------------------------------------------------

export type GapCategory =
  | 'demand'
  | 'broadband'
  | 'fibre'
  | 'schools'
  | 'health'
  | 'electricity'
  | 'telecom'
  | 'data';

export type Severity = 'info' | 'low' | 'medium' | 'high';

export interface GapFinding {
  id: string;
  title: string;
  category: GapCategory;
  severity: Severity;
  /** What the available data suggests. */
  concern: string;
  /** Which data caused this observation. */
  explanation: string;
  evidence: EvidenceLine[];
}

export interface PriorityItem {
  id: string;
  title: string;
  why: string;
  evidence: EvidenceLine[];
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface ScoreComponent {
  key: string;
  label: string;
  /** Fixed methodology weight (0-1). */
  weight: number;
  /** 0-100 when sufficient data exists, otherwise null. */
  score: number | null;
  /** Short human explanation of how this component was derived. */
  basis: string;
  quality: Quality;
}

export interface ConnectivityScore {
  /** Weighted indicator, 0-100. Null when no component has sufficient data. */
  indicator: number | null;
  components: ScoreComponent[];
  /** Sum of weights of components that actually contributed. 0-100. */
  dataCompletenessPct: number;
  missingDatasets: string[];
}

// ---------------------------------------------------------------------------
// Full research report
// ---------------------------------------------------------------------------

export interface SourceUsage {
  source: SourceRef;
  usedBy: ResearchDomain[];
}

export interface ResearchReport {
  schemaVersion: number;
  generatedAt: string;
  mode: RunMode;
  location: ResolvedLocation;
  sections: {
    population: PopulationSection;
    coverage: CoverageSection;
    internet: InternetSection;
    fibre: FibreSection;
    electricity: ElectricitySection;
    facilities: FacilitiesSection;
    infrastructure: InfrastructureSection;
  };
  analysis: {
    gaps: GapFinding[];
    priorities: PriorityItem[];
    score: ConnectivityScore;
  };
  sources: SourceUsage[];
  providers: ProviderStatus[];
  warnings: string[];
  disclaimer: string;
}