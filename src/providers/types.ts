// Provider contracts. Every data source behind RuralNet implements one of
// these interfaces and returns *normalized* domain types, so providers can be
// swapped between mock, live API and imported-dataset implementations without
// touching the research engine or the UI.

import type { NormalizedQuery } from '@/domain/normalize';
import type {
  CoverageSection,
  ElectricitySection,
  FacilitiesSection,
  FibreSection,
  InternetSection,
  PopulationSection,
  ProviderResult,
  ResolvedLocation,
} from '@/domain/types';

/** Context handed to every provider for a given research run. */
export interface ProviderContext {
  location: ResolvedLocation;
  /** ISO date (YYYY-MM-DD) of the retrieval, stamped consistently. */
  retrievedAt: string;
}

export interface GeocodingProvider {
  id: string;
  label: string;
  /** Resolve a normalized query to candidate locations. */
  search(query: NormalizedQuery): Promise<ResolvedLocation[]>;
}

export interface PopulationProvider {
  id: string;
  label: string;
  fetch(ctx: ProviderContext): Promise<ProviderResult<PopulationSection>>;
}

export interface CoverageProvider {
  id: string;
  label: string;
  fetch(ctx: ProviderContext): Promise<ProviderResult<CoverageSection>>;
}

export interface InternetProvider {
  id: string;
  label: string;
  fetch(ctx: ProviderContext): Promise<ProviderResult<InternetSection>>;
}

export interface FibreProvider {
  id: string;
  label: string;
  fetch(ctx: ProviderContext): Promise<ProviderResult<FibreSection>>;
}

export interface ElectricityProvider {
  id: string;
  label: string;
  fetch(ctx: ProviderContext): Promise<ProviderResult<ElectricitySection>>;
}

export interface FacilitiesProvider {
  id: string;
  label: string;
  fetch(ctx: ProviderContext): Promise<ProviderResult<FacilitiesSection>>;
}

export interface ProviderSet {
  geocoding: GeocodingProvider;
  population: PopulationProvider[];
  coverage: CoverageProvider[];
  internet: InternetProvider[];
  fibre: FibreProvider[];
  electricity: ElectricityProvider[];
  facilities: FacilitiesProvider[];
}